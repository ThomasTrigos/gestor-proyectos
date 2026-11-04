import math
from decimal import Decimal
from typing import Dict, Any, Optional
from django.utils import timezone
from datetime import timedelta


def normalizar_escala(valor: float, min_val: float, max_val: float) -> float:
    """Normaliza un valor al intervalo [0.0, 1.0]."""
    if max_val <= min_val:
        return 0.5
    v = (valor - min_val) / (max_val - min_val)
    return max(0.0, min(1.0, v))


def calcular_phs_dia0(dia0_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Calcula el prior calibrado P_0 (Día 0) usando la regresión logística
    basada en Strang & Vajjhala (2014) y Gemino et al. (2007).
    Prior bayesiano inicial: P(Éxito) = 0.89 (~89%).
    """
    # Prior logit base: ln(0.89 / 0.11) ≈ 2.089
    logit = 2.089

    # 1. Experiencia del PM (Predictor #1: β = -1.441 en fracaso -> efecto positivo en éxito)
    pm_anios = float(dia0_data.get('pm_experiencia_anios', 3) or 3)
    z_pm = (pm_anios - 3.0) / 3.0  # Centrado en 3 años
    logit += min(1.5, max(-1.0, z_pm * 0.45))

    # 2. Modalidad de contratación (Strang & Vajjhala β = +0.869 para Outsourced con precio fijo)
    modalidad = dia0_data.get('modalidad_contratacion', 'IN_HOUSE')
    if modalidad == 'OUTSOURCED':
        logit += 0.40
    elif modalidad == 'MIXTO':
        logit += 0.15
    elif modalidad == 'IN_HOUSE':
        logit += 0.00

    # 3. Categoría del proyecto (Strang & Vajjhala: proyectos de soporte y core menor riesgo que transversales/innovación)
    categoria = dia0_data.get('categoria_proyecto', 'PRODUCTO_CORE')
    if categoria == 'PRODUCTO_CORE':
        logit += 0.15
    elif categoria == 'SOPORTE_INTERNO':
        logit += 0.25
    elif categoria == 'INNOVACION':
        logit -= 0.30
    elif categoria == 'TRANSVERSAL':
        logit -= 0.50

    # 4. Presupuesto base (Strang & Vajjhala β = +0.744 sobre fracaso -> mayor presupuesto = mayor riesgo estructural)
    presupuesto = float(dia0_data.get('presupuesto_base', 0) or 0)
    if presupuesto > 0:
        log_presupuesto = math.log10(max(1000.0, presupuesto))
        # Centrado alrededor de $30,000 (log10 ≈ 4.5)
        z_presupuesto = (log_presupuesto - 4.5)
        logit -= min(0.6, max(-0.4, z_presupuesto * 0.25))

    # 5. Recursos de conocimiento (Gemino et al.)
    certeza = float(dia0_data.get('certeza_requerimientos', 3) or 3)  # 1 a 5
    logit += (certeza - 3.0) * 0.18

    competencia = float(dia0_data.get('competencia_equipo_pct', 75.0) or 75.0)  # 0 a 100
    logit += ((competencia - 75.0) / 25.0) * 0.25

    sponsor = float(dia0_data.get('conocimiento_sponsor', 2) or 2)  # 1 a 3
    logit += (sponsor - 2.0) * 0.18

    # 6. Riesgo estructural (Gemino et al.)
    complejidad = float(dia0_data.get('complejidad_tecnica', 3) or 3)  # 1 a 5
    logit -= (complejidad - 3.0) * 0.20

    duracion = float(dia0_data.get('duracion_estimada_dias', 90) or 90)
    if duracion > 180:
        logit -= 0.20
    if duracion > 365:
        logit -= 0.25

    # Función sigmoide
    p_0 = 1.0 / (1.0 + math.exp(-logit))
    # Acotar a [0.10, 0.98]
    p_0 = max(0.10, min(0.98, p_0))
    phs_inicial = int(round(p_0 * 100))

    return {
        'p_0': round(p_0, 4),
        'phs_inicial': phs_inicial,
        'logit': round(logit, 3)
    }


def calcular_metricas_evm(pv: float, ev: float, ac: float, presupuesto_base: float = 0.0) -> Dict[str, Any]:
    """
    Calcula SPI, CPI y CSI según las fórmulas de Earned Value Management (EVM).
    - PV: % de trabajo planificado a la fecha (0-100)
    - EV: % de trabajo completado real (0-100)
    - AC: Gasto real acumulado (monetario o porcentaje)
    """
    # SPI = EV / PV
    if pv > 0:
        spi = ev / pv
    else:
        spi = 1.0 if ev == 0 else 1.2
    spi = round(max(0.05, min(2.5, spi)), 3)

    # CPI = EV / AC%
    if presupuesto_base > 0 and ac > 100:
        # Si AC es monto monetario y tenemos presupuesto_base
        ac_pct = (ac / presupuesto_base) * 100.0
    else:
        # Si AC se ingresó directamente como % o monto representativo
        ac_pct = ac

    if ac_pct > 0:
        cpi = ev / ac_pct
    else:
        cpi = 1.0 if ev == 0 else 1.2
    cpi = round(max(0.05, min(2.5, cpi)), 3)

    # CSI = CPI * SPI
    csi = round(spi * cpi, 3)

    # Interpretación de recuperación según CSI (Eddoug et al.)
    if csi >= 0.90:
        csi_estado = 'RECUPERABLE'
        csi_alerta = 'Normal: Proyecto recuperable sin intervención mayor.'
    elif csi >= 0.70:
        csi_estado = 'ALERTA_AMARILLA'
        csi_alerta = 'Alerta Amarilla: Requiere ajuste de cronograma o recursos.'
    else:
        csi_estado = 'PUNTO_NO_RETORNO'
        csi_alerta = 'Alerta Roja: Punto de no retorno cercano. Difícilmente recuperable sin recorte de alcance.'

    return {
        'spi': spi,
        'cpi': cpi,
        'csi': csi,
        'csi_estado': csi_estado,
        'csi_alerta': csi_alerta
    }


def calcular_metricas_friccion(
    reuniones_reales: int,
    reuniones_planificadas: int,
    dias_retraso_total: int,
    dias_retraso_cliente: int,
    duracion_estimada_dias: int
) -> Dict[str, Any]:
    """
    Calcula métricas de fricción con stakeholders:
    - Ratio de Contacto (C1)
    - RFC (Ratio de Fricción del Cliente, C4)
    - Índice de Desviación (C3)
    """
    plan = max(1, reuniones_planificadas)
    ratio_contacto = round(reuniones_reales / plan, 3)

    if dias_retraso_total > 0:
        rfc = round(min(1.0, max(0.0, dias_retraso_cliente / dias_retraso_total)), 3)
    else:
        rfc = 0.0

    duracion = max(1, duracion_estimada_dias)
    indice_desviacion = round(max(0.0, dias_retraso_total / duracion), 3)

    return {
        'ratio_contacto': ratio_contacto,
        'rfc': rfc,
        'indice_desviacion': indice_desviacion
    }


def calcular_indice_operativo(evm: Dict[str, Any], friccion: Dict[str, Any], tasa_tareas_vencidas: float = 0.0) -> float:
    """
    Sub-componente B1: Índice Operativo [0.0, 1.0]
    Fórmula determinista:
    I_operativo = 0.30 * norm(SPI) + 0.25 * norm(CPI) + 0.20 * norm(CSI) + 0.15 * (1 - RFC) + 0.10 * norm(RatioContacto)
    """
    # Normalización: 1.0 de SPI/CPI se mapea a ~0.80; 1.25 a 1.0
    norm_spi = min(1.0, max(0.0, evm['spi'] / 1.25))
    norm_cpi = min(1.0, max(0.0, evm['cpi'] / 1.25))
    norm_csi = min(1.0, max(0.0, evm['csi'] / 1.50))
    rfc_factor = max(0.0, 1.0 - friccion['rfc'])
    contacto_factor = min(1.0, max(0.0, friccion['ratio_contacto']))

    i_operativo = (
        0.30 * norm_spi +
        0.25 * norm_cpi +
        0.20 * norm_csi +
        0.15 * rfc_factor +
        0.10 * contacto_factor
    )

    # Penalización adicional por tareas vencidas (> 25% penaliza gradualmente hasta -0.10)
    if tasa_tareas_vencidas > 25.0:
        penalizacion = min(0.10, ((tasa_tareas_vencidas - 25.0) / 75.0) * 0.10)
        i_operativo -= penalizacion

    return round(max(0.05, min(1.0, i_operativo)), 4)


def calcular_indice_nlp(nlp_data: Dict[str, Any]) -> float:
    """
    Sub-componente B2: Índice NLP [0.0, 1.0]
    I_NLP = 0.35 * N4 + 0.25 * N6 + 0.20 * norm(S_cliente) + 0.12 * N5 + 0.08 * (1 - N7) + ΔS_ajuste
    """
    n4 = float(nlp_data.get('n4_empoderamiento', 0.70))
    n6 = float(nlp_data.get('n6_participacion_cliente', 0.50))
    s_cli = float(nlp_data.get('s_cliente', 0.20))
    n5 = float(nlp_data.get('n5_claridad_hitos', 0.70))
    n7 = float(nlp_data.get('n7_tension', 0.05))
    delta_s = float(nlp_data.get('delta_s', 0.00))

    norm_s_cliente = (s_cli + 1.0) / 2.0  # Mapea [-1.0, 1.0] a [0.0, 1.0]
    ajuste_delta = max(-0.08, min(0.08, delta_s * 0.10))

    i_nlp = (
        0.35 * n4 +
        0.25 * n6 +
        0.20 * norm_s_cliente +
        0.12 * n5 +
        0.08 * (1.0 - n7) +
        ajuste_delta
    )

    return round(max(0.05, min(1.0, i_nlp)), 4)


def generar_desglose_shap(
    phs_final: int,
    score_a_priori: int,
    evm: Dict[str, Any],
    friccion: Dict[str, Any],
    nlp: Dict[str, Any],
    dia0: Optional[Dict[str, Any]] = None
) -> list:
    """
    Genera el desglose explicable (estilo SHAP Waterfall) con impactos positivos y negativos en puntos.
    """
    factores = []
    base_score = 75  # Línea base para la descomposición

    # Factor 1: Día 0 / Experiencia PM
    if dia0:
        exp = int(dia0.get('pm_experiencia_anios', 3) or 3)
        imp_exp = min(12, max(-8, (exp - 3) * 2))
        factores.append({
            'variable': 'Experiencia del PM',
            'valor_real': f"{exp} años",
            'impacto': imp_exp,
            'signo': 'positivo' if imp_exp > 0 else ('negativo' if imp_exp < 0 else 'neutral'),
            'explicacion': 'Predictor clave de gobernanza y capacidad de respuesta.'
        })

    # Factor 2: Desempeño EVM / CSI
    csi = evm['csi']
    if csi >= 1.0:
        imp_csi = min(12, int((csi - 1.0) * 20))
    else:
        imp_csi = max(-22, int((csi - 1.0) * 35))
    factores.append({
        'variable': 'Índice de Recuperabilidad (CSI = CPI × SPI)',
        'valor_real': f"CSI: {csi:.2f} (SPI: {evm['spi']:.2f}, CPI: {evm['cpi']:.2f})",
        'impacto': imp_csi,
        'signo': 'positivo' if imp_csi > 0 else ('negativo' if imp_csi < 0 else 'neutral'),
        'explicacion': 'Determina la probabilidad matemática de revertir desviaciones.'
    })

    # Factor 3: Fricción del Cliente (RFC)
    rfc = friccion['rfc']
    if rfc > 0.40:
        imp_rfc = -int(rfc * 20)
    elif rfc == 0.0 and friccion.get('dias_retraso_total', 0) == 0:
        imp_rfc = +4
    else:
        imp_rfc = -int(rfc * 10)
    factores.append({
        'variable': 'Fricción con Cliente (RFC)',
        'valor_real': f"{int(rfc * 100)}% del retraso atribuible al cliente",
        'impacto': imp_rfc,
        'signo': 'positivo' if imp_rfc > 0 else ('negativo' if imp_rfc < 0 else 'neutral'),
        'explicacion': 'Alerta de demoras externas en validaciones o dependencias.'
    })

    # Factor 4: Empoderamiento Psicológico (N4)
    n4 = nlp.get('n4_empoderamiento', 0.70)
    imp_n4 = int((n4 - 0.60) * 20)
    factores.append({
        'variable': 'Empoderamiento del Equipo (NLP N4)',
        'valor_real': f"{int(n4 * 100)}% autonomía resolutiva",
        'impacto': imp_n4,
        'signo': 'positivo' if imp_n4 > 0 else ('negativo' if imp_n4 < 0 else 'neutral'),
        'explicacion': 'Predictor humano #1 (β=0.663, Ahmad et al.): proactividad vs bloqueo.'
    })

    # Factor 5: Participación del Cliente (N6)
    n6 = nlp.get('n6_participacion_cliente', 0.50)
    imp_n6 = int((n6 - 0.50) * 15)
    factores.append({
        'variable': 'Participación Activa del Cliente (NLP N6)',
        'valor_real': f"{int(n6 * 100)}% involucramiento constructivo",
        'impacto': imp_n6,
        'signo': 'positivo' if imp_n6 > 0 else ('negativo' if imp_n6 < 0 else 'neutral'),
        'explicacion': 'Nivel de compromiso e implicación directa del sponsor.'
    })

    # Factor 6: Tensión o Tendencia de Sentimiento (N7 / ΔS)
    n7 = nlp.get('n7_tension', 0.05)
    delta_s = nlp.get('delta_s', 0.0)
    imp_tension = 0
    if n7 > 0.20:
        imp_tension -= int(n7 * 18)
    if delta_s < -0.15:
        imp_tension -= 5
    elif delta_s > 0.15:
        imp_tension += 3

    if imp_tension != 0:
        factores.append({
            'variable': 'Clima y Tensión de Reuniones (NLP N7 / ΔS)',
            'valor_real': f"Tensión: {n7:.2f} | Tendencia: {delta_s:+.2f}",
            'impacto': imp_tension,
            'signo': 'positivo' if imp_tension > 0 else 'negativo',
            'explicacion': 'Frecuencia de términos de fricción o variación de polaridad.'
        })

    # Factor 7: Ratio de Contacto
    contacto = friccion['ratio_contacto']
    if contacto < 0.60:
        imp_contacto = -6
    elif contacto >= 1.0:
        imp_contacto = +4
    else:
        imp_contacto = 0
    if imp_contacto != 0:
        factores.append({
            'variable': 'Cadencia de Contacto (C1)',
            'valor_real': f"{friccion.get('reuniones_reales', 1)}/{friccion.get('reuniones_planificadas', 1)} reuniones",
            'impacto': imp_contacto,
            'signo': 'positivo' if imp_contacto > 0 else 'negativo',
            'explicacion': 'Frecuencia de sincronización respecto a lo programado.'
        })

    return {
        'puntaje_base': base_score,
        'phs_resultado': phs_final,
        'factores': factores
    }


def redactar_accion_recomendada(
    phs: int,
    nivel_riesgo: str,
    evm: Dict[str, Any],
    friccion: Dict[str, Any],
    nlp: Dict[str, Any]
) -> str:
    """
    Redacta una recomendación prescriptiva en lenguaje natural clara y accionable.
    """
    recomendaciones = []

    # 1. Diagnóstico de fricción con el cliente
    rfc = friccion.get('rfc', 0.0)
    if rfc >= 0.65:
        recomendaciones.append(
            f"El {int(rfc*100)}% del retraso registrado es atribuible a aprobaciones o dependencias del cliente. "
            "Acción urgente: Convocar una reunión de alineación con el sponsor para transparentar el cronograma "
            "y formalizar acuerdos de tiempo de respuesta (SLA de validaciones)."
        )
    elif rfc >= 0.45:
        recomendaciones.append(
            "Se detectan demoras en la respuesta del cliente. Conviene registrar por escrito las solicitudes pendientes."
        )

    # 2. Diagnóstico operativo EVM / CSI
    csi = evm.get('csi', 1.0)
    spi = evm.get('spi', 1.0)
    cpi = evm.get('cpi', 1.0)
    if csi < 0.70:
        recomendaciones.append(
            f"El Cost-Schedule Index (CSI = {csi:.2f}) se encuentra en zona crítica (< 0.70). Matemáticamente "
            "es muy difícil recuperar tiempo y costo simultáneamente sin una intervención estructural. "
            "Acción sugerida: Negociar recorte de alcance o reprogramación formal de hitos."
        )
    elif spi < 0.85:
        recomendaciones.append(
            f"El cronograma presenta atraso relevante (SPI = {spi:.2f}). Se recomienda priorizar el backlog "
            "y desestimar temporalmente tareas de baja urgencia."
        )
    elif cpi < 0.85:
        recomendaciones.append(
            f"Existe sobrecosto operativo (CPI = {cpi:.2f}). Revisar horas insumidas y costos de infraestructura."
        )

    # 3. Diagnóstico humano / NLP
    n4 = nlp.get('n4_empoderamiento', 0.70)
    if n4 < 0.45:
        recomendaciones.append(
            "El equipo técnico muestra bajo empoderamiento y dependencia constante de aprobaciones externas. "
            "Acción: Otorgar mayor autonomía en decisiones técnicas y destrabar cuellos de botella de gestión."
        )

    n7 = nlp.get('n7_tension', 0.0)
    if n7 >= 0.25:
        recomendaciones.append(
            "Se registraron términos de tensión, reclamos o riesgo contractual en las reuniones recientes. "
            "Acción: Conducir una sesión de retrospectiva interna y asegurar que el alcance pactado no tenga ambigüedades."
        )

    # Si todo está saludable
    if not recomendaciones:
        if phs >= 75:
            recomendaciones.append(
                "El proyecto muestra un desempeño saludable en todas sus dimensiones (EVM equilibrado, buena sincronización "
                "y clima positivo en el equipo). Mantener la cadencia semanal de seguimiento."
            )
        else:
            recomendaciones.append(
                "El proyecto se mantiene en rango aceptable con desviaciones moderadas. Continuar con el monitoreo periódico."
            )

    return "\n\n".join(recomendaciones)


def calcular_phs_snapshot(
    proyecto,
    snapshot_data: Dict[str, Any],
    prev_snapshot: Optional[Any] = None
) -> Dict[str, Any]:
    """
    Consolida todos los sub-motores para generar el PHS del snapshot:
    PHS = round((α * P_0 + β * I_operativo + γ * I_NLP) * 100)
    Ponderaciones MVP: α = 0.20, β = 0.55, γ = 0.25
    """
    # 1. Recuperar o calcular Día 0
    dia0_dict = {}
    if hasattr(proyecto, 'perfil_dia0') and proyecto.perfil_dia0:
        d0_inst = proyecto.perfil_dia0
        dia0_dict = {
            'pm_experiencia_anios': d0_inst.pm_experiencia_anios,
            'modalidad_contratacion': d0_inst.modalidad_contratacion,
            'categoria_proyecto': d0_inst.categoria_proyecto,
            'presupuesto_base': float(d0_inst.presupuesto_base),
            'duracion_estimada_dias': d0_inst.duracion_estimada_dias,
            'complejidad_tecnica': d0_inst.complejidad_tecnica,
            'competencia_equipo_pct': d0_inst.competencia_equipo_pct,
            'certeza_requerimientos': d0_inst.certeza_requerimientos,
            'conocimiento_sponsor': d0_inst.conocimiento_sponsor,
        }
        res_dia0 = calcular_phs_dia0(dia0_dict)
        p_0 = res_dia0['p_0']
        score_a_priori = res_dia0['phs_inicial']
    else:
        # Fallback si no se configuró Día 0 explícitamente
        p_0 = 0.89
        score_a_priori = 89

    # 2. Métricas EVM
    pv = float(snapshot_data.get('pv', 0.0) or 0.0)
    ev = float(snapshot_data.get('ev', 0.0) or 0.0)
    ac = float(snapshot_data.get('ac', 0.0) or 0.0)
    presupuesto = float(dia0_dict.get('presupuesto_base', 0.0) or 0.0)
    evm_res = calcular_metricas_evm(pv, ev, ac, presupuesto)

    # 3. Métricas de Fricción
    reuniones_reales = int(snapshot_data.get('reuniones_reales', 1) or 1)
    reuniones_plan = int(snapshot_data.get('reuniones_planificadas', 1) or 1)
    retraso_total = int(snapshot_data.get('dias_retraso_total', 0) or 0)
    retraso_cliente = int(snapshot_data.get('dias_retraso_cliente', 0) or 0)
    duracion_dias = int(dia0_dict.get('duracion_estimada_dias', 90) or 90)

    friccion_res = calcular_metricas_friccion(
        reuniones_reales=reuniones_reales,
        reuniones_planificadas=reuniones_plan,
        dias_retraso_total=retraso_total,
        dias_retraso_cliente=retraso_cliente,
        duracion_estimada_dias=duracion_dias
    )
    tasa_vencidas = float(snapshot_data.get('tasa_tareas_vencidas', 0.0) or 0.0)

    # 4. Índice Operativo (B1)
    i_operativo = calcular_indice_operativo(evm_res, friccion_res, tasa_vencidas)

    # 5. Señales NLP (B2)
    nlp_dict = {
        'n4_empoderamiento': float(snapshot_data.get('n4_empoderamiento', 0.70) or 0.70),
        'n5_claridad_hitos': float(snapshot_data.get('n5_claridad_hitos', 0.70) or 0.70),
        'n6_participacion_cliente': float(snapshot_data.get('n6_participacion_cliente', 0.50) or 0.50),
        'n7_tension': float(snapshot_data.get('n7_tension', 0.05) or 0.05),
        's_cliente': float(snapshot_data.get('s_cliente', 0.20) or 0.20),
        's_equipo': float(snapshot_data.get('s_equipo', 0.25) or 0.25),
        'delta_s': float(snapshot_data.get('delta_s', 0.00) or 0.00)
    }

    # Si hay snapshot previo y no se pasó delta_s, calcularlo
    if prev_snapshot and 'delta_s' not in snapshot_data:
        nlp_dict['delta_s'] = round(nlp_dict['s_cliente'] - prev_snapshot.s_cliente, 3)

    i_nlp = calcular_indice_nlp(nlp_dict)

    # 6. Consolidación PHS final (Ponderaciones acordadas: α = 0.20, β = 0.55, γ = 0.25)
    alpha = 0.20
    beta = 0.55
    gamma = 0.25

    phs_calc = round((alpha * p_0 + beta * i_operativo + gamma * i_nlp) * 100)
    phs_final = max(1, min(100, int(phs_calc)))

    # 7. Nivel de Riesgo
    if phs_final > 70:
        nivel_riesgo = 'SALUDABLE'
    elif phs_final >= 55:
        nivel_riesgo = 'LATENTE'
    elif phs_final >= 35:
        nivel_riesgo = 'ACTIVO'
    else:
        nivel_riesgo = 'INMINENTE'

    # Detección de disparadores críticos de alerta temprana
    if friccion_res['rfc'] >= 0.75 and friccion_res['ratio_contacto'] < 0.40 and (nlp_dict['n7_tension'] > 0.25 or nlp_dict['delta_s'] < -0.20):
        nivel_riesgo = 'INMINENTE'
    elif friccion_res['rfc'] >= 0.65 and evm_res['csi'] < 0.80 and nivel_riesgo == 'SALUDABLE':
        nivel_riesgo = 'ACTIVO'

    # 8. Desglose SHAP y Acción Recomendada
    friccion_combinada = {**friccion_res, 'reuniones_reales': reuniones_reales, 'reuniones_planificadas': reuniones_plan, 'dias_retraso_total': retraso_total}
    desglose = generar_desglose_shap(phs_final, score_a_priori, evm_res, friccion_combinada, nlp_dict, dia0_dict)
    accion = redactar_accion_recomendada(phs_final, nivel_riesgo, evm_res, friccion_combinada, nlp_dict)

    return {
        'score_a_priori': score_a_priori,
        'indice_operativo': i_operativo,
        'indice_nlp': i_nlp,
        'phs': phs_final,
        'nivel_riesgo': nivel_riesgo,
        'spi': evm_res['spi'],
        'cpi': evm_res['cpi'],
        'csi': evm_res['csi'],
        'ratio_contacto': friccion_res['ratio_contacto'],
        'rfc': friccion_res['rfc'],
        'indice_desviacion': friccion_res['indice_desviacion'],
        'desglose_explicabilidad': desglose,
        'accion_recomendada': accion,
        'delta_s': nlp_dict['delta_s']
    }


def generar_sugerencias_automaticas(proyecto) -> Dict[str, Any]:
    """
    Analiza la base de datos (tareas, reuniones, financiaciones) para ofrecer
    valores sugeridos y precargados en el modal de nuevo snapshot.
    """
    from apps.tareas.models import Tarea
    from apps.reuniones.models import Reunion
    from apps.financiacion.models import CuotaPago, Financiacion

    ahora = timezone.now()
    hace_una_semana = ahora - timedelta(days=7)

    # 1. Tareas y cálculo de EV ponderado por etapa
    estado_proyecto_obj = proyecto.estados.first()
    estado_proyecto_actual = estado_proyecto_obj.estado if estado_proyecto_obj else 'OPORTUNIDAD'

    tareas = Tarea.objects.filter(proyecto=proyecto)
    total_tareas = tareas.count()
    tareas_completadas = tareas.filter(estado='COMPLETADA').count()
    tareas_vencidas = tareas.filter(fecha_limite__lt=ahora.date()).exclude(estado='COMPLETADA').count()
    tasa_vencidas = round((tareas_vencidas / total_tareas * 100.0), 1) if total_tareas > 0 else 0.0

    # Ponderación según la etapa del proyecto:
    # - OPORTUNIDAD: Etapa inicial (relevamiento/propuesta). Aporta como máximo un 10% del avance general del proyecto.
    #   Tener totalmente completadas las tareas del inicio NO significa un grado de avance significativo del proyecto en sí.
    # - TRABAJANDO: Etapa de desarrollo y construcción oficial. Aporta el 75% del avance general.
    # - SEGUIMIENTO: Etapa de monitoreo post-entrega y soporte. Aporta el 15% restante.
    # - CONCRETADO: 100% de avance.
    if estado_proyecto_actual == 'CONCRETADO':
        ev_sugerido = 100.0
    elif total_tareas == 0:
        ev_sugerido = 0.0
    else:
        tareas_oportunidad = tareas.filter(estado_proyecto='OPORTUNIDAD')
        tareas_trabajo = tareas.filter(estado_proyecto__in=['TRABAJANDO', 'PAUSADO'])
        tareas_seguimiento = tareas.filter(estado_proyecto='SEGUIMIENTO')

        tot_op = tareas_oportunidad.count()
        comp_op = tareas_oportunidad.filter(estado='COMPLETADA').count()
        pct_op = (comp_op / tot_op) if tot_op > 0 else (1.0 if estado_proyecto_actual in ['TRABAJANDO', 'SEGUIMIENTO'] else 0.0)

        tot_tr = tareas_trabajo.count()
        comp_tr = tareas_trabajo.filter(estado='COMPLETADA').count()
        pct_tr = (comp_tr / tot_tr) if tot_tr > 0 else (1.0 if estado_proyecto_actual == 'SEGUIMIENTO' else 0.0)

        tot_seg = tareas_seguimiento.count()
        comp_seg = tareas_seguimiento.filter(estado='COMPLETADA').count()
        pct_seg = (comp_seg / tot_seg) if tot_seg > 0 else 0.0

        if estado_proyecto_actual == 'OPORTUNIDAD':
            # Solo está en etapa inicial: completar tareas iniciales aporta como máximo 10% de avance del proyecto total
            ev_sugerido = round(pct_op * 10.0, 1)
        elif estado_proyecto_actual in ['TRABAJANDO', 'PAUSADO']:
            # En ejecución oficial: 10% de etapa inicial + progreso en etapa de trabajo (máximo 75%)
            ev_sugerido = round((pct_op * 10.0) + (pct_tr * 75.0), 1)
        elif estado_proyecto_actual == 'SEGUIMIENTO':
            # En seguimiento post-entrega: 10% inicial + 75% ejecución + progreso en seguimiento (máximo 15%)
            ev_sugerido = round(85.0 + (pct_seg * 15.0), 1)
        else:
            ev_sugerido = round((tareas_completadas / total_tareas * 100.0), 1)

        ev_sugerido = min(100.0, max(0.0, ev_sugerido))

    # 2. PV estimado por días transcurridos
    pv_sugerido = 0.0
    if proyecto.fecha_inicio_estimada and proyecto.fecha_fin_estimada:
        dias_totales = (proyecto.fecha_fin_estimada - proyecto.fecha_inicio_estimada).days
        dias_transcurridos = (ahora.date() - proyecto.fecha_inicio_estimada).days
        if dias_totales > 0:
            pv_sugerido = round(min(100.0, max(0.0, (dias_transcurridos / dias_totales) * 100.0)), 1)
    elif estado_proyecto_actual == 'SEGUIMIENTO':
        pv_sugerido = max(ev_sugerido, 85.0)
    elif ev_sugerido > 0:
        pv_sugerido = ev_sugerido

    # 3. Reuniones (semana previa o total reciente)
    reuniones_recientes = Reunion.objects.filter(proyecto=proyecto, fecha_hora_inicio__gte=hace_una_semana).count()
    reuniones_reales = max(1, reuniones_recientes)

    # 4. Costo Real (AC) estimado desde cuotas pagadas o gastos
    cuotas_pagadas = CuotaPago.objects.filter(financiacion__proyecto=proyecto, estado='PAGADO')
    total_ac = sum(float(c.monto) for c in cuotas_pagadas)

    # 5. Obtener último snapshot para número de corte y valores anteriores
    ultimo_snapshot = proyecto.snapshots.first()
    numero_corte = (ultimo_snapshot.numero_corte + 1) if ultimo_snapshot else 1

    return {
        'numero_corte': numero_corte,
        'fecha_corte': ahora.date().isoformat(),
        'pv': pv_sugerido,
        'ev': ev_sugerido,
        'ac': total_ac,
        'tasa_tareas_vencidas': tasa_vencidas,
        'reuniones_planificadas': 1,
        'reuniones_reales': reuniones_reales,
        'dias_retraso_total': ultimo_snapshot.dias_retraso_total if ultimo_snapshot else 0,
        'dias_retraso_cliente': ultimo_snapshot.dias_retraso_cliente if ultimo_snapshot else 0,
        'cambios_alcance_periodo': 0,
        'rotacion_personal_clave': 0,
        'n4_empoderamiento': ultimo_snapshot.n4_empoderamiento if ultimo_snapshot else 0.70,
        'n5_claridad_hitos': ultimo_snapshot.n5_claridad_hitos if ultimo_snapshot else 0.70,
        'n6_participacion_cliente': ultimo_snapshot.n6_participacion_cliente if ultimo_snapshot else 0.50,
        'n7_tension': ultimo_snapshot.n7_tension if ultimo_snapshot else 0.05,
        's_cliente': ultimo_snapshot.s_cliente if ultimo_snapshot else 0.20,
        's_equipo': ultimo_snapshot.s_equipo if ultimo_snapshot else 0.25,
        'delta_s': 0.00,
        'canal_predominante': ultimo_snapshot.canal_predominante if ultimo_snapshot else 'SINCRONICO_VIDEO'
    }
