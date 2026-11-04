import re
import io
import os
import json
import time
import logging
import urllib.request
import urllib.error
from typing import Dict, Any, Optional, List, Tuple

logger = logging.getLogger(__name__)

try:
    import pypdf
except ImportError:
    pypdf = None

try:
    import docx
except ImportError:
    docx = None


def extraer_texto_de_archivo(archivo) -> str:
    """
    Extrae texto de un archivo subido (.txt, .pdf, .docx).
    Soporta Django UploadedFile, BytesIO o ruta de archivo en disco.
    """
    if hasattr(archivo, 'name'):
        nombre = archivo.name.lower()
    elif isinstance(archivo, str):
        nombre = archivo.lower()
    else:
        nombre = "archivo.txt"

    contenido_bytes = b""
    if hasattr(archivo, 'read'):
        pos_inicial = archivo.tell() if hasattr(archivo, 'tell') else 0
        contenido_bytes = archivo.read()
        if hasattr(archivo, 'seek'):
            archivo.seek(pos_inicial)
    elif isinstance(archivo, str):
        with open(archivo, 'rb') as f:
            contenido_bytes = f.read()

    if nombre.endswith('.pdf'):
        if pypdf is None:
            raise ImportError("La librería 'pypdf' no está disponible en el entorno.")
        reader = pypdf.PdfReader(io.BytesIO(contenido_bytes))
        paginas_texto = []
        for page in reader.pages:
            t = page.extract_text()
            if t:
                paginas_texto.append(t)
        return "\n".join(paginas_texto)

    elif nombre.endswith('.docx'):
        if docx is None:
            raise ImportError("La librería 'python-docx' no está disponible en el entorno.")
        doc = docx.Document(io.BytesIO(contenido_bytes))
        parrafos = [p.text for p in doc.paragraphs if p.text.strip()]
        for table in doc.tables:
            for row in table.rows:
                row_text = " | ".join(cell.text.strip() for cell in row.cells if cell.text.strip())
                if row_text:
                    parrafos.append(row_text)
        return "\n".join(parrafos)

    else:
        # Fallback texto plano (.txt, markdown, etc.)
        try:
            return contenido_bytes.decode('utf-8')
        except UnicodeDecodeError:
            return contenido_bytes.decode('latin-1', errors='ignore')


# =====================================================================
# INTEGRACIÓN MULTI-PROVEEDOR LLM: GEMINI, GROK, CLAUDE, OPENAI
# =====================================================================

MODELOS_DEFAULT = {
    'GEMINI': 'gemini-1.5-flash',
    'GROK': 'grok-2-latest',
    'CLAUDE': 'claude-3-5-sonnet-20241022',
    'OPENAI': 'gpt-4o-mini',
}

NOMBRES_PROVEEDOR = {
    'GEMINI': 'Google Gemini',
    'GROK': 'xAI Grok',
    'CLAUDE': 'Anthropic Claude',
    'OPENAI': 'OpenAI',
}


def _obtener_todas_las_credenciales() -> List[Dict[str, Any]]:
    """
    Recopila todas las configuraciones de IA activas en Base de Datos y en variables de entorno (.env).
    Las configuraciones de BD tienen prioridad sobre las del entorno.
    """
    credenciales = []
    provs_en_bd = set()

    # 1. Base de Datos (ConfiguracionIA)
    try:
        from apps.core.models import ConfiguracionIA
        for conf in ConfiguracionIA.objects.filter(activo=True):
            key = conf.get_api_key()
            if key:
                provs_en_bd.add(conf.proveedor)
                credenciales.append({
                    'id': str(conf.id),
                    'proveedor': conf.proveedor,
                    'nombre': conf.nombre or f"{NOMBRES_PROVEEDOR.get(conf.proveedor, conf.proveedor)} ({conf.modelo})",
                    'modelo': conf.modelo or MODELOS_DEFAULT.get(conf.proveedor, ''),
                    'api_key': key,
                    'mascara': conf.mascara_api_key,
                    'es_predeterminado': conf.es_predeterminado,
                    'origen': 'BASE_DE_DATOS',
                    'temperatura': conf.temperatura,
                    'max_tokens': conf.max_tokens,
                })
    except Exception as e:
        logger.debug(f"No se pudieron leer credenciales de IA en BD: {e}")

    # 2. Variables de Entorno (si no están ya en BD)
    env_mappings = [
        ('GEMINI', ['GEMINI_API_KEY'], 'GEMINI_MODEL', 'gemini-1.5-flash'),
        ('GROK', ['GROK_API_KEY', 'XAI_API_KEY'], 'GROK_MODEL', 'grok-2-latest'),
        ('CLAUDE', ['CLAUDE_API_KEY', 'ANTHROPIC_API_KEY'], 'CLAUDE_MODEL', 'claude-3-5-sonnet-20241022'),
        ('OPENAI', ['OPENAI_API_KEY'], 'OPENAI_MODEL', 'gpt-4o-mini'),
    ]

    for prov, key_names, model_var, default_model in env_mappings:
        if prov not in provs_en_bd:
            for kn in key_names:
                k = os.getenv(kn, '').strip()
                if k:
                    m = os.getenv(model_var, default_model).strip()
                    mascara = f"{k[:4]}••••••••{k[-4:]}" if len(k) > 8 else "••••••••"
                    credenciales.append({
                        'id': f'env-{prov.lower()}',
                        'proveedor': prov,
                        'nombre': f"{NOMBRES_PROVEEDOR.get(prov, prov)} (Entorno)",
                        'modelo': m,
                        'api_key': k,
                        'mascara': mascara,
                        'es_predeterminado': False,
                        'origen': 'VARIABLE_ENTORNO',
                        'temperatura': 0.2,
                        'max_tokens': 2048,
                    })
                    break

    return credenciales


def obtener_estado_configuracion_ia() -> Dict[str, Any]:
    """
    Retorna el estado de disponibilidad de cada compañía de IA y cuál está activa.
    """
    credenciales = _obtener_todas_las_credenciales()
    predeterminado = next((c for c in credenciales if c.get('es_predeterminado')), None)
    if not predeterminado and credenciales:
        predeterminado = credenciales[0]

    proveedores_resumen = []
    for c in credenciales:
        proveedores_resumen.append({
            'id': c['id'],
            'proveedor': c['proveedor'],
            'nombre': c['nombre'],
            'modelo': c['modelo'],
            'mascara_api_key': c['mascara'],
            'es_predeterminado': c.get('es_predeterminado', False),
            'origen': c['origen']
        })

    if predeterminado:
        proveedor_activo = f"{NOMBRES_PROVEEDOR.get(predeterminado['proveedor'], predeterminado['proveedor'])} ({predeterminado['modelo']})"
        modo = f"Híbrido ({len(credenciales)} proveedores configurados + Fallback Local)"
        es_remota = True
    else:
        proveedor_activo = "Motor NLP Heurístico Local (Offline)"
        modo = "Autónomo Local (100% Offline / Sin API Keys)"
        es_remota = False

    return {
        'total_configurados': len(credenciales),
        'proveedor_activo': proveedor_activo,
        'proveedor_predeterminado_codigo': predeterminado['proveedor'] if predeterminado else 'LOCAL',
        'modo': modo,
        'es_remota': es_remota,
        'proveedores_disponibles': proveedores_resumen,
        'soporta': ['GEMINI', 'GROK', 'CLAUDE', 'OPENAI', 'LOCAL']
    }


def _construir_prompt_analisis(texto: str) -> str:
    # Si el texto es muy extenso, preservar el inicio (contexto y discusión)
    # y el cierre (acuerdos, compromisos y próximos pasos clave)
    if len(texto) > 16000:
        texto_procesado = (
            texto[:9000]
            + "\n\n[... CONTENIDO INTERMEDIO OMITIDO POR EXTENSIÓN PARA OPTIMIZAR VENTANA DE CONTEXTO ...]\n\n"
            + texto[-7000:]
        )
    else:
        texto_procesado = texto

    return f"""Eres un evaluador experto en gestión de proyectos y dinámicas de equipo, especializado en metodologías ágiles y salud de proyectos según el marco 'Predictor de Éxito de Proyectos' (Health Score).

Analiza detalladamente la siguiente minuta o transcripción de reunión:
\"\"\"
{texto_procesado}
\"\"\"

Evalúa objetivamente la dinámica del cliente y del equipo, identificando compromisos, puntos de fricción y métricas de salud.
Responde ÚNICAMENTE con un objeto JSON válido (sin explicaciones previas ni posteriores, ni bloques adicionales de código) con exactamente la siguiente estructura:
{{
  "veredicto": "<Uno de: 'Reunión Muy Fructífera y Resolutiva', 'Reunión Constructiva y Estándar', 'Reunión con Puntos de Fricción', 'Reunión Tensa / En Conflicto'>",
  "calificacion": "<Uno de: 'EXCELENTE', 'BUENA', 'FRICCION', 'CRITICA'>",
  "color": "<Uno de: 'emerald', 'blue', 'amber', 'rose'>",
  "descripcion_clima": "<Explicación concisa del clima y tono de la reunión>",
  "diagnostico_cliente": "<Diagnóstico del grado de satisfacción, actitud y participación del cliente>",
  "diagnostico_equipo": "<Diagnóstico de autonomía, empoderamiento y resolución del equipo>",
  "compromisos": ["<compromiso 1 con responsable/fecha si aplica>", "<compromiso 2>", ...],
  "alertas": ["<alerta o riesgo 1 si hubo fricción/bloqueo>", ...],
  "resumen_sugerido": "<Resumen ejecutivo completo estructurado en Markdown para el acta>",
  "nlp_metricas": {{
    "n4_empoderamiento": <float entre 0.0 y 1.0>,
    "n5_claridad_hitos": <float entre 0.0 y 1.0>,
    "n6_participacion_cliente": <float entre 0.0 y 1.0>,
    "n7_tension": <float entre 0.0 y 1.0>,
    "s_cliente": <float entre -1.0 y 1.0>,
    "s_equipo": <float entre -1.0 y 1.0>,
    "delta_s": <float entre -2.0 y 2.0>,
    "resumen_hallazgos": ["<hallazgo clave 1>", "<hallazgo clave 2>"],
    "palabras_clave_detectadas": ["<término clave 1>", "<término clave 2>"]
  }}
}}"""


# --- Conectores REST API nativos con urllib (sin dependencias extra) ---

def _invocar_gemini_api(prompt: str, api_key: str, modelo: str = "gemini-1.5-flash", timeout: int = 25) -> Optional[str]:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{modelo}:generateContent?key={api_key}"
    payload = {
        "contents": [{
            "parts": [{"text": prompt}]
        }],
        "generationConfig": {
            "response_mime_type": "application/json",
            "temperature": 0.2
        }
    }
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req, timeout=timeout) as response:
        res_data = json.loads(response.read().decode('utf-8'))
        candidates = res_data.get('candidates', [])
        if candidates and 'content' in candidates[0]:
            parts = candidates[0]['content'].get('parts', [])
            if parts and 'text' in parts[0]:
                return parts[0]['text']
    return None


def _invocar_grok_api(prompt: str, api_key: str, modelo: str = "grok-2-latest", timeout: int = 25) -> Optional[str]:
    url = "https://api.x.ai/v1/chat/completions"
    payload = {
        "model": modelo,
        "messages": [
            {"role": "system", "content": "Eres un asistente y evaluador experto de proyectos de software. Responde siempre únicamente en formato JSON válido."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.2
    }
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}"
        },
        method="POST"
    )
    with urllib.request.urlopen(req, timeout=timeout) as response:
        res_data = json.loads(response.read().decode('utf-8'))
        choices = res_data.get('choices', [])
        if choices and 'message' in choices[0]:
            return choices[0]['message'].get('content')
    return None


def _invocar_claude_api(prompt: str, api_key: str, modelo: str = "claude-3-5-sonnet-20241022", timeout: int = 25) -> Optional[str]:
    url = "https://api.anthropic.com/v1/messages"
    payload = {
        "model": modelo,
        "max_tokens": 2048,
        "messages": [
            {"role": "user", "content": prompt + "\n\nIMPORTANTE: Responde ÚNICAMENTE con el objeto JSON solicitado, sin texto antes ni después."}
        ],
        "temperature": 0.2
    }
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "Content-Type": "application/json",
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01"
        },
        method="POST"
    )
    with urllib.request.urlopen(req, timeout=timeout) as response:
        res_data = json.loads(response.read().decode('utf-8'))
        content = res_data.get('content', [])
        if content and 'text' in content[0]:
            return content[0]['text']
    return None


def _invocar_openai_api(prompt: str, api_key: str, modelo: str = "gpt-4o-mini", timeout: int = 25) -> Optional[str]:
    url = "https://api.openai.com/v1/chat/completions"
    payload = {
        "model": modelo,
        "messages": [
            {"role": "system", "content": "Eres un evaluador experto de proyectos de software. Responde siempre únicamente en formato JSON válido."},
            {"role": "user", "content": prompt}
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.2
    }
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}"
        },
        method="POST"
    )
    with urllib.request.urlopen(req, timeout=timeout) as response:
        res_data = json.loads(response.read().decode('utf-8'))
        choices = res_data.get('choices', [])
        if choices and 'message' in choices[0]:
            return choices[0]['message'].get('content')
    return None


def probar_conexion_proveedor(proveedor: str, api_key: str, modelo: Optional[str] = None) -> Dict[str, Any]:
    """
    Realiza un ping de prueba ultrarrápido al proveedor de IA para validar autenticación y latencia.
    """
    proveedor = proveedor.upper().strip()
    if not modelo:
        modelo = MODELOS_DEFAULT.get(proveedor, 'gemini-1.5-flash')

    prompt_ping = 'Responde ÚNICAMENTE con este JSON exacto: {"status": "ok", "ping": true}'
    inicio = time.time()

    try:
        if proveedor == 'GEMINI':
            raw = _invocar_gemini_api(prompt_ping, api_key, modelo, timeout=12)
        elif proveedor == 'GROK':
            raw = _invocar_grok_api(prompt_ping, api_key, modelo, timeout=12)
        elif proveedor == 'CLAUDE':
            raw = _invocar_claude_api(prompt_ping, api_key, modelo, timeout=12)
        elif proveedor == 'OPENAI':
            raw = _invocar_openai_api(prompt_ping, api_key, modelo, timeout=12)
        else:
            return {'ok': False, 'error': f"Proveedor no soportado: {proveedor}"}

        latencia_ms = int((time.time() - inicio) * 1000)
        nombre_legible = NOMBRES_PROVEEDOR.get(proveedor, proveedor)

        if raw and ('"status"' in raw or 'ok' in raw or 'ping' in raw):
            return {
                'ok': True,
                'latencia_ms': latencia_ms,
                'mensaje': f"¡Conexión exitosa con {nombre_legible} ({modelo})! Latencia: {latencia_ms}ms.",
                'modelo': modelo,
                'proveedor': proveedor
            }
        else:
            return {
                'ok': True,
                'latencia_ms': latencia_ms,
                'mensaje': f"Conexión establecida con {nombre_legible} ({modelo}). Respuesta recibida ({latencia_ms}ms).",
                'modelo': modelo,
                'proveedor': proveedor
            }

    except urllib.error.HTTPError as e:
        cuerpo = ""
        try:
            cuerpo = e.read().decode('utf-8')
        except Exception:
            pass
        return {
            'ok': False,
            'error': f"Error HTTP {e.code}: {e.reason}. Detalle: {cuerpo[:220]}",
            'modelo': modelo,
            'proveedor': proveedor
        }
    except Exception as e:
        return {
            'ok': False,
            'error': f"Falla de conexión: {str(e)}",
            'modelo': modelo,
            'proveedor': proveedor
        }


def _limpiar_y_parsear_json(texto_json: str) -> Optional[Dict[str, Any]]:
    if not texto_json or not isinstance(texto_json, str):
        return None
    raw = texto_json.strip()
    if raw.startswith("```json"):
        raw = raw[7:]
    elif raw.startswith("```"):
        raw = raw[3:]
    if raw.endswith("```"):
        raw = raw[:-3]
    raw = raw.strip()

    try:
        data = json.loads(raw)
        if isinstance(data, dict):
            return data
    except Exception as e:
        logger.warning(f"Error parseando JSON devuelto por la IA: {e}")
    return None


def _normalizar_resultado_ia(data: Dict[str, Any], proveedor: str, modelo: str) -> Dict[str, Any]:
    calificaciones_validas = ['EXCELENTE', 'BUENA', 'FRICCION', 'CRITICA']
    calificacion = str(data.get('calificacion', '')).upper().strip()
    if calificacion not in calificaciones_validas:
        calificacion = 'BUENA'

    colores = {
        'EXCELENTE': 'emerald',
        'BUENA': 'blue',
        'FRICCION': 'amber',
        'CRITICA': 'rose'
    }
    color = data.get('color') or colores.get(calificacion, 'blue')

    veredicto = str(data.get('veredicto', 'Reunión Analizada'))
    descripcion_clima = str(data.get('descripcion_clima', 'Análisis realizado mediante IA.'))
    diagnostico_cliente = str(data.get('diagnostico_cliente', 'Participación regular.'))
    diagnostico_equipo = str(data.get('diagnostico_equipo', 'Desempeño operativo regular.'))

    compromisos = data.get('compromisos', [])
    if not isinstance(compromisos, list):
        compromisos = [str(compromisos)]
    compromisos = [str(c).strip() for c in compromisos if str(c).strip()][:7]

    alertas = data.get('alertas', [])
    if not isinstance(alertas, list):
        alertas = [str(alertas)]
    alertas = [str(a).strip() for a in alertas if str(a).strip()][:5]

    resumen_sugerido = str(data.get('resumen_sugerido', '')).strip()

    metricas_raw = data.get('nlp_metricas', {})
    if not isinstance(metricas_raw, dict):
        metricas_raw = {}

    def _clamp(val, min_v, max_v, default):
        try:
            return round(max(min_v, min(max_v, float(val))), 3)
        except (TypeError, ValueError):
            return default

    n4 = _clamp(metricas_raw.get('n4_empoderamiento'), 0.0, 1.0, 0.70)
    n5 = _clamp(metricas_raw.get('n5_claridad_hitos'), 0.0, 1.0, 0.70)
    n6 = _clamp(metricas_raw.get('n6_participacion_cliente'), 0.0, 1.0, 0.60)
    n7 = _clamp(metricas_raw.get('n7_tension'), 0.0, 1.0, 0.05)
    s_cli = _clamp(metricas_raw.get('s_cliente'), -1.0, 1.0, 0.20)
    s_eq = _clamp(metricas_raw.get('s_equipo'), -1.0, 1.0, 0.25)
    delta_s = _clamp(metricas_raw.get('delta_s'), -2.0, 2.0, 0.0)

    hallazgos = metricas_raw.get('resumen_hallazgos', [])
    if not isinstance(hallazgos, list):
        hallazgos = [str(hallazgos)]
    hallazgos = [str(h) for h in hallazgos if str(h).strip()]

    palabras = metricas_raw.get('palabras_clave_detectadas', [])
    if not isinstance(palabras, list):
        palabras = [str(palabras)]
    palabras = [str(p) for p in palabras if str(p).strip()][:12]

    nlp_metricas = {
        'n4_empoderamiento': n4,
        'n5_claridad_hitos': n5,
        'n6_participacion_cliente': n6,
        'n7_tension': n7,
        's_cliente': s_cli,
        's_equipo': s_eq,
        'delta_s': delta_s,
        'resumen_hallazgos': hallazgos if hallazgos else ["Evaluación semántica procesada por IA remota."],
        'palabras_clave_detectadas': palabras,
        'proveedor': proveedor,
        'es_ia_remota': True,
        'modelo_ia': modelo
    }

    return {
        'veredicto': veredicto,
        'calificacion': calificacion,
        'color': color,
        'descripcion_clima': descripcion_clima,
        'diagnostico_cliente': diagnostico_cliente,
        'diagnostico_equipo': diagnostico_equipo,
        'compromisos': compromisos,
        'alertas': alertas,
        'resumen_sugerido': resumen_sugerido,
        'nlp_metricas': nlp_metricas,
        'proveedor': proveedor,
        'es_ia_remota': True,
        'modelo_ia': modelo
    }


def _llamar_ia_remota(texto: str, proveedor_solicitado: str = "AUTO") -> Optional[Dict[str, Any]]:
    """
    Ejecuta la llamada a la IA remota según el proveedor solicitado o el predeterminado.
    Si se solicita 'LOCAL', se salta la llamada remota y retorna None inmediatamente.
    """
    if str(proveedor_solicitado).upper().strip() == 'LOCAL':
        return None

    credenciales = _obtener_todas_las_credenciales()
    if not credenciales:
        return None

    # Filtrar según proveedor solicitado si no es AUTO
    candidatos = []
    solicitado_upper = str(proveedor_solicitado).upper().strip()
    if solicitado_upper and solicitado_upper != 'AUTO':
        candidatos = [c for c in credenciales if c['proveedor'] == solicitado_upper]

    if not candidatos:
        # Ordenar: predeterminado primero
        candidatos = sorted(credenciales, key=lambda c: not c.get('es_predeterminado', False))

    prompt = _construir_prompt_analisis(texto)

    for cand in candidatos:
        prov = cand['proveedor']
        key = cand['api_key']
        mod = cand['modelo']
        raw_output = None

        try:
            if prov == 'GEMINI':
                raw_output = _invocar_gemini_api(prompt, key, mod)
            elif prov == 'GROK':
                raw_output = _invocar_grok_api(prompt, key, mod)
            elif prov == 'CLAUDE':
                raw_output = _invocar_claude_api(prompt, key, mod)
            elif prov == 'OPENAI':
                raw_output = _invocar_openai_api(prompt, key, mod)

            if raw_output:
                parsed = _limpiar_y_parsear_json(raw_output)
                if parsed:
                    nombre_legible = NOMBRES_PROVEEDOR.get(prov, prov)
                    proveedor_label = f"{nombre_legible} ({mod})"
                    return _normalizar_resultado_ia(parsed, proveedor_label, mod)
        except Exception as e:
            logger.warning(f"Falla con proveedor {prov} ({mod}): {e}. Probando siguiente proveedor...")

    return None


# =====================================================================
# LÉXICO Y PATRONES SEMÁNTICOS LOCALES (MOTOR HEURÍSTICO OFFLINE)
# Basado en Ahmad et al. (Goal Clarity, Team Empowerment) y Gemino et al.
# =====================================================================

PALABRAS_EMPODERAMIENTO = [
    r'\bdefinimos\b', r'\bacordamos\b', r'\bimplementamos\b', r'\bresolvimos\b',
    r'\bdecidimos\b', r'\bsoluci[oó]n\b', r'\bavanzar\b', r'\boptimiz\w+',
    r'\bmitig\w+', r'\bpropusimos\b', r'\baut[oó]nom\w+', r'\bcomplet\w+',
    r'\bconcluid\w+', r'\bdestrab\w+', r'\bcorreg\w+', r'\bdespleg\w+',
    r'\blisto\b', r'\brefactoriz\w+', r'\bconsensu\w+', r'\bejecut\w+'
]

PALABRAS_BLOQUEO = [
    r'esperando aprobaci[oó]n', r'bloquead\w+', r'no podemos avanzar',
    r'solicitud de permiso', r'falta validaci[oó]n', r'pendiente de ok',
    r'a la espera', r'paralizad\w+', r'trabad\w+', r'dependemos de',
    r'sin respuesta del cliente', r'retrasado por terceros', r'impedimento',
    r'cuello de botella', r'sin autorizaci[oó]n', r'no responde'
]

PATRONES_CLARIDAD_HITOS = [
    r'\bentregable\b', r'\bhito\b', r'\bfecha l[ií]mite\b', r'\bdeadline\b',
    r'\bcompromiso\b', r'\bpara el d[ií]a\b', r'\bresponsable\s*:\s*\w+',
    r'\basignado a\b', r'\ba cargo de\b', r'\bentrega programada\b',
    r'\b\d{1,2}/\d{1,2}(?:/\d{2,4})?\b', r'\blunes|martes|mi[eé]rcoles|jueves|viernes\b'
]

PATRONES_PARTICIPACION_CLIENTE = [
    r'cliente valida', r'cliente confirma', r'aprobado por el cliente',
    r'cliente propone', r'feedback recibido', r'comentarios del sponsor',
    r'el cliente solicita', r'sugerencia del cliente', r'revisi[oó]n conjunta',
    r'conforme el cliente', r'cliente prioriza', r'alineaci[oó]n con sponsor'
]

PALABRAS_TENSION = [
    r'penalizaci[oó]n', r'sobrecosto', r'reclamo', r'conflicto',
    r'rescisi[oó]n', r'incumplimiento', r'insatisfech\w+', r'molest\w+',
    r'retraso grave', r'fuera de alcance', r'scope creep', r'inviable',
    r'cancelar', r'p[eé]rdida', r'demanda', r'crisis', r'ultim[aá]tum',
    r'desacuerdo', r'disconformidad', r'intolerable', r'frenar proyecto',
    r'pausar indefinidamente'
]

PALABRAS_POSITIVAS = [
    r'excelente', r'conforme', r'gran avance', r'[eé]xito', r'felicitaciones',
    r'satisfech\w+', r'alinead\w+', r'claro', r'r[aá]pido', r'impecable',
    r'gracias', r'acuerdo', r'correcto', r'funcional', r'positivo',
    r'destacable', r'cumplido', r'eficiente', r'sólido'
]

PALABRAS_NEGATIVAS = [
    r'desconforme', r'disconforme', r'tarde', r'deficiente', r'error',
    r'bug', r'falla', r'cr[ií]tico', r'inaceptable', r'problema',
    r'queja', r'lento', r'decepcionante', r'disculpas', r'dif[ií]cil',
    r'complicado', r'incompleto', r'insuficiente', r'fallido'
]


def _contar_coincidencias(patrones, texto: str) -> int:
    total = 0
    for p in patrones:
        total += len(re.findall(p, texto, flags=re.IGNORECASE))
    return total


def _analizar_texto_minuta_local(texto: str, texto_previo: Optional[str] = None) -> Dict[str, Any]:
    if not texto or not texto.strip():
        return {
            'n4_empoderamiento': 0.70,
            'n5_claridad_hitos': 0.70,
            'n6_participacion_cliente': 0.50,
            'n7_tension': 0.05,
            's_cliente': 0.20,
            's_equipo': 0.25,
            'delta_s': 0.00,
            'resumen_hallazgos': ['Texto no provisto o vacío; se asignaron valores neutrales base.'],
            'palabras_clave_detectadas': [],
            'proveedor': "Motor NLP Local Heurístico (Offline)",
            'es_ia_remota': False,
            'modelo_ia': "local-nlp-v1"
        }

    texto_lower = texto.lower()
    palabras = re.findall(r'\b\w+\b', texto_lower)
    total_palabras = max(1, len(palabras))

    # 1. Empoderamiento (N4)
    emp_count = _contar_coincidencias(PALABRAS_EMPODERAMIENTO, texto)
    bloq_count = _contar_coincidencias(PALABRAS_BLOQUEO, texto)
    total_eb = emp_count + bloq_count
    if total_eb > 0:
        n4 = round(emp_count / total_eb, 3)
    else:
        n4 = 0.70

    # 2. Claridad de hitos (N5)
    hitos_count = _contar_coincidencias(PATRONES_CLARIDAD_HITOS, texto)
    n5 = min(1.0, max(0.3, round(0.40 + (hitos_count * 0.15), 3)))

    # 3. Participación activa del cliente (N6)
    part_count = _contar_coincidencias(PATRONES_PARTICIPACION_CLIENTE, texto)
    intervenciones_cliente = len(re.findall(r'(?:cliente|sponsor)\s*:', texto_lower))
    n6 = min(1.0, max(0.2, round(0.40 + ((part_count + intervenciones_cliente) * 0.15), 3)))

    # 4. Tensión y Urgencia (N7)
    tension_count = _contar_coincidencias(PALABRAS_TENSION, texto)
    densidad_tension = (tension_count / (total_palabras / 100.0))
    n7 = min(1.0, max(0.0, round(densidad_tension * 0.20, 3)))

    # 5. Sentimiento general y de cliente/equipo
    pos_count = _contar_coincidencias(PALABRAS_POSITIVAS, texto)
    neg_count = _contar_coincidencias(PALABRAS_NEGATIVAS, texto)
    total_sent = pos_count + neg_count
    if total_sent > 0:
        polaridad_base = (pos_count - neg_count) / total_sent
    else:
        polaridad_base = 0.15

    s_cliente = max(-1.0, min(1.0, round(polaridad_base - (n7 * 0.4), 3)))
    s_equipo = max(-1.0, min(1.0, round(polaridad_base - (n7 * 0.2) + (n4 * 0.1 - 0.05), 3)))

    delta_s = 0.00
    if texto_previo and texto_previo.strip():
        analisis_previo = _analizar_texto_minuta_local(texto_previo)
        delta_s = round(s_cliente - analisis_previo['s_cliente'], 3)

    hallazgos = []
    if n4 >= 0.75:
        hallazgos.append(f"Alto empoderamiento del equipo ({int(n4*100)}%): orientados a resolución autónoma.")
    elif n4 <= 0.45:
        hallazgos.append(f"Bajo empoderamiento ({int(n4*100)}%): alta dependencia de aprobaciones y bloqueos reiterados.")

    if n7 >= 0.30:
        hallazgos.append(f"Señales de fricción/tensión detectadas (índice: {n7}). Términos de conflicto identificados.")
    if hitos_count >= 2:
        hallazgos.append(f"Buena definición de compromisos e hitos ({hitos_count} referencias detectadas).")
    if s_cliente < -0.2:
        hallazgos.append(f"Sentimiento del cliente negativo ({s_cliente}). Requiere atención prioritaria.")

    palabras_encontradas = []
    for grupo, lista in [("Resolución", PALABRAS_EMPODERAMIENTO), ("Bloqueo", PALABRAS_BLOQUEO), ("Tensión", PALABRAS_TENSION)]:
        for p in lista:
            m = re.search(p, texto_lower)
            if m and m.group(0) not in palabras_encontradas:
                palabras_encontradas.append(m.group(0))

    return {
        'n4_empoderamiento': n4,
        'n5_claridad_hitos': n5,
        'n6_participacion_cliente': n6,
        'n7_tension': n7,
        's_cliente': s_cliente,
        's_equipo': s_equipo,
        'delta_s': delta_s,
        'resumen_hallazgos': hallazgos if hallazgos else ["Minuta con tono equilibrado y desarrollo estándar."],
        'palabras_clave_detectadas': palabras_encontradas[:10],
        'proveedor': "Motor NLP Local Heurístico (Offline)",
        'es_ia_remota': False,
        'modelo_ia': "local-nlp-v1"
    }


def _diagnosticar_reunion_completa_local(texto: str) -> Dict[str, Any]:
    base = _analizar_texto_minuta_local(texto)

    n4 = base['n4_empoderamiento']
    n7 = base['n7_tension']
    s_cli = base['s_cliente']

    if n7 >= 0.35 or s_cli <= -0.40:
        veredicto = "Reunión Tensa / En Conflicto"
        calificacion = "CRITICA"
        color = "rose"
        descripcion_clima = "Se identificaron expresiones de desacuerdo, reclamos o tensión sobre plazos o costos."
    elif n7 >= 0.20 or s_cli < 0.0 or n4 <= 0.40:
        veredicto = "Reunión con Puntos de Fricción"
        calificacion = "FRICCION"
        color = "amber"
        descripcion_clima = "Hubo fricción moderada o bloqueos operativos que requieren seguimiento cercano."
    elif n4 >= 0.70 and s_cli >= 0.20:
        veredicto = "Reunión Muy Fructífera y Resolutiva"
        calificacion = "EXCELENTE"
        color = "emerald"
        descripcion_clima = "Excelente sincronización, alta proactividad del equipo y validación positiva del cliente."
    else:
        veredicto = "Reunión Constructiva y Estándar"
        calificacion = "BUENA"
        color = "blue"
        descripcion_clima = "Reunión de avance operativo con desarrollo profesional equilibrado."

    if s_cli >= 0.35:
        diagnostico_cliente = "Muy satisfecho y conforme con los avances presentados."
    elif s_cli >= 0.0:
        diagnostico_cliente = "Receptivo y colaborativo, validando acuerdos de trabajo."
    elif s_cli >= -0.30:
        diagnostico_cliente = "Preocupado o expectante respecto al cumplimiento de plazos."
    else:
        diagnostico_cliente = "Desconforme o molesto con el estado actual del servicio o costos."

    if n4 >= 0.70:
        diagnostico_equipo = "Altamente resolutivo, autónomo y con soluciones claras."
    elif n4 >= 0.50:
        diagnostico_equipo = "Desarrollo metódico cumpliendo los requerimientos pactados."
    else:
        diagnostico_equipo = "Con dependencias externas y bloqueado a la espera de aprobaciones."

    lineas = [l.strip() for l in texto.split('\n') if l.strip()]
    compromisos = []
    for l in lineas:
        if any(re.search(p, l, re.IGNORECASE) for p in PATRONES_CLARIDAD_HITOS):
            if len(l) < 200 and l not in compromisos:
                compromisos.append(l)

    if not compromisos:
        oraciones = re.split(r'[.;]\s+', texto)
        for o in oraciones:
            if any(re.search(p, o, re.IGNORECASE) for p in PATRONES_CLARIDAD_HITOS):
                clean_o = o.strip()
                if 15 < len(clean_o) < 180 and clean_o not in compromisos:
                    compromisos.append(clean_o)
                if len(compromisos) >= 4:
                    break

    alertas = []
    oraciones = re.split(r'[.;]\s+', texto)
    for o in oraciones:
        if any(re.search(p, o, re.IGNORECASE) for p in PALABRAS_TENSION):
            clean_a = o.strip()
            if 15 < len(clean_a) < 180 and clean_a not in alertas:
                alertas.append(clean_a)
            if len(alertas) >= 3:
                break

    lista_compromisos = "\n".join(f"- {c}" for c in compromisos[:5]) if compromisos else "- Se acordó continuar con los hitos previstos en la planificación."
    lista_alertas = f"\n**Puntos de Atención / Fricción:**\n" + "\n".join(f"- ⚠️ {a}" for a in alertas[:3]) if alertas else "\n**Riesgos:** No se registraron bloqueos críticos durante la sesión."

    resumen_sugerido = f"""### Resumen Ejecutivo de la Reunión (Generado por IA)

**Diagnóstico General:** {veredicto}
*{descripcion_clima}*

**Dinámica:**
- **Cliente:** {diagnostico_cliente} (Sentimiento: {s_cli:+.2f})
- **Equipo:** {diagnostico_equipo} (Empoderamiento: {int(n4*100)}%)

**Acuerdos y Próximos Pasos:**
{lista_compromisos}
{lista_alertas}
"""

    return {
        'veredicto': veredicto,
        'calificacion': calificacion,
        'color': color,
        'descripcion_clima': descripcion_clima,
        'diagnostico_cliente': diagnostico_cliente,
        'diagnostico_equipo': diagnostico_equipo,
        'compromisos': compromisos[:5],
        'alertas': alertas[:3],
        'resumen_sugerido': resumen_sugerido.strip(),
        'nlp_metricas': base,
        'proveedor': "Motor NLP Local Heurístico (Offline)",
        'es_ia_remota': False,
        'modelo_ia': "local-nlp-v1"
    }


# =====================================================================
# INTERFAZ PÚBLICA PRINCIPAL
# =====================================================================

def analizar_texto_minuta(texto: str, texto_previo: Optional[str] = None, proveedor_solicitado: str = "AUTO") -> Dict[str, Any]:
    """
    Punto de entrada principal para cálculo de métricas NLP de minutas y snapshots.
    Soporta selección de proveedor: 'GEMINI', 'GROK', 'CLAUDE', 'OPENAI', 'AUTO', 'LOCAL'.
    """
    if texto and texto.strip():
        resultado_ia = _llamar_ia_remota(texto, proveedor_solicitado=proveedor_solicitado)
        if resultado_ia and 'nlp_metricas' in resultado_ia:
            metricas = resultado_ia['nlp_metricas']
            metricas['proveedor'] = resultado_ia.get('proveedor', 'IA Remota')
            metricas['es_ia_remota'] = True
            metricas['modelo_ia'] = resultado_ia.get('modelo_ia', '')
            return metricas

    return _analizar_texto_minuta_local(texto, texto_previo)


def diagnosticar_reunion_completa(texto: str, proveedor_solicitado: str = "AUTO") -> Dict[str, Any]:
    """
    Punto de entrada para el diagnóstico cualitativo y cuantitativo de reuniones.
    Soporta selección de proveedor: 'GEMINI', 'GROK', 'CLAUDE', 'OPENAI', 'AUTO', 'LOCAL'.
    """
    if texto and texto.strip():
        resultado_ia = _llamar_ia_remota(texto, proveedor_solicitado=proveedor_solicitado)
        if resultado_ia:
            return resultado_ia

    return _diagnosticar_reunion_completa_local(texto)
