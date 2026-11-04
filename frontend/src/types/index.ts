// Enums que coinciden con los choices del backend

export enum RolPersonal {
  RRHH = 'RRHH',
  GERENTE = 'GERENTE',
  EMPLEADO = 'EMPLEADO',
  PROGRAMADOR = 'EMPLEADO',
}

export enum EstadoProyectoEnum {
  OPORTUNIDAD = 'OPORTUNIDAD',
  TRABAJANDO = 'TRABAJANDO',
  PAUSADO = 'PAUSADO',
  SEGUIMIENTO = 'SEGUIMIENTO',
  CONCRETADO = 'CONCRETADO',
  CAIDO = 'CAIDO',
}

export enum PrioridadTarea {
  BAJA = 'BAJA',
  MEDIA = 'MEDIA',
  ALTA = 'ALTA',
  URGENTE = 'URGENTE',
}

export enum EstadoTarea {
  PENDIENTE = 'PENDIENTE',
  EN_PROGRESO = 'EN_PROGRESO',
  COMPLETADA = 'COMPLETADA',
  CANCELADA = 'CANCELADA',
}

export enum FormaPago {
  MES_ADELANTADO = 'MES_ADELANTADO',
  MES_VENCIDO = 'MES_VENCIDO',
  ANUAL_ADELANTADO = 'ANUAL_ADELANTADO',
  PLAN_CUOTAS = 'PLAN_CUOTAS',
  ENTREGABLES = 'ENTREGABLES',
  OTROS = 'OTROS',
}

export enum TipoTrabajoFinanciacion {
  CONSULTORIA = 'CONSULTORIA',
  DESARROLLO = 'DESARROLLO',
  IMPLEMENTACION_CAPACITACION = 'IMPLEMENTACION_CAPACITACION',
  OTRO = 'OTRO',
}

export const TIPO_TRABAJO_LABELS: Record<TipoTrabajoFinanciacion, string> = {
  [TipoTrabajoFinanciacion.CONSULTORIA]: 'Consultoría',
  [TipoTrabajoFinanciacion.DESARROLLO]: 'Desarrollo',
  [TipoTrabajoFinanciacion.IMPLEMENTACION_CAPACITACION]: 'Implementación + Capacitación',
  [TipoTrabajoFinanciacion.OTRO]: 'Otro',
};

export enum TipoPagoItem {
  CUOTA = 'CUOTA',
  ENTREGABLE = 'ENTREGABLE',
}

export enum ModalidadPago {
  ADELANTADO = 'ADELANTADO',
  VENCIDO = 'VENCIDO',
}

export enum EstadoCuota {
  EN_ESPERA = 'EN_ESPERA',
  PAGADO = 'PAGADO',
  VERIFICANDOSE = 'VERIFICANDOSE',
  IMPAGO = 'IMPAGO',
  PENDIENTE = 'PENDIENTE',
  VENCIDO = 'VENCIDO',
  ANULADO = 'ANULADO',
}

export const ESTADO_PAGO_LABELS: Record<string, string> = {
  EN_ESPERA: 'En espera',
  PAGADO: 'Pagado',
  VERIFICANDOSE: 'Verificándose',
  IMPAGO: 'Impago',
  PENDIENTE: 'Pendiente',
  VENCIDO: 'Vencido',
  ANULADO: 'Anulado',
};

export enum TipoReunion {
  PRESENCIAL = 'PRESENCIAL',
  VIRTUAL = 'VIRTUAL',
  TELEFONICA = 'TELEFONICA',
  OTRA = 'OTRA',
}

export enum ResultadoReunion {
  EXCELENTE = 'EXCELENTE',
  BUENA = 'BUENA',
  FRICCION = 'FRICCION',
  CRITICA = 'CRITICA',
}

export const RESULTADO_REUNION_LABELS: Record<ResultadoReunion, string> = {
  [ResultadoReunion.EXCELENTE]: '🟢 Muy Fructífera / Resolutiva',
  [ResultadoReunion.BUENA]: '🔵 Constructiva / Estándar',
  [ResultadoReunion.FRICCION]: '🟡 Con Fricción / Dudas',
  [ResultadoReunion.CRITICA]: '🔴 Tensa / En Conflicto',
};


export enum TipoServicio {
  CONSULTORIA = 'CONSULTORIA',
  DESARROLLO = 'DESARROLLO',
  IMPLEMENTACION_CAPACITACION = 'IMPLEMENTACION_CAPACITACION',
  OTRO = 'OTRO',
}

export enum AccionAudit {
  CREAR = 'CREAR',
  MODIFICAR = 'MODIFICAR',
  ELIMINAR = 'ELIMINAR',
}

// --- Interfaces que coinciden con los modelos Django ---

export interface AuthUser {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  rol: RolPersonal;
  telefono?: string;
  cargo?: string;
  username?: string;
}

export interface LoginRequest {
  identificador?: string;
  username?: string;
  email?: string;
  password?: string;
  token?: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: AuthUser;
}

export interface Empresa {
  id: string;
  razon_social: string;
  nombre_comercial: string;
  cuit: string;
  direccion: string;
  telefono: string;
  email: string;
  sitio_web?: string;
  notas?: string;
  contactos: ContactoEmpresa[];
  created_at: string;
  updated_at: string;
}

export interface ContactoEmpresa {
  id?: string;
  empresa_id?: string;
  nombre: string;
  cargo: string;
  telefono: string;
  email: string;
  es_principal: boolean;
  notas?: string;
}

export interface Personal {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono?: string;
  cargo: string;
  rol: RolPersonal;
  token_confirmacion?: string;
  activo: boolean;
  fecha_ingreso: string;
  created_at: string;
  updated_at: string;
}

export interface Proyecto {
  id: string;
  nombre: string;
  descripcion: string;
  empresa_id?: string;
  empresa?: Empresa | string;
  tipo_servicio: TipoServicio[];
  tipo_servicio_otro?: string;
  lider_proyecto_id?: string;
  lider_proyecto?: Personal;
  fecha_inicio_estimada?: string;
  fecha_fin_estimada?: string;
  notas?: string;
  estado_actual?: EstadoProyecto;
  empresa_razon_social?: string;
  empresa_nombre_comercial?: string;
  lider_proyecto_nombre?: string;
  estados?: EstadoProyecto[];
  equipo_asignaciones?: ProyectoEquipo[];
  phs_actual?: number | null;
  nivel_riesgo_actual?: NivelRiesgo | string | null;
  tiene_perfil_dia0?: boolean;
  alerta_snapshot_pendiente?: AlertaSnapshotPendiente;
  created_at: string;
  updated_at: string;
}

export interface ProyectoEquipo {
  id: string;
  proyecto_id: string;
  personal_id: string;
  personal?: Personal;
  es_lider?: boolean;
  fecha_asignacion: string;
  notificado_email: boolean;
  personal_nombre?: string;
  personal_cargo?: string;
  personal_rol?: string;
  personal_email?: string;
}

export interface EstadoProyecto {
  id: string;
  proyecto_id: string;
  estado: EstadoProyectoEnum;
  fecha_cambio: string;
  razon_cambio: string;
  cambiado_por_id?: string;
  cambiado_por?: Personal;
  cambiado_por_nombre?: string;
}

export interface Tarea {
  id: string;
  proyecto_id: string;
  proyecto?: Proyecto;
  asignado_a_id?: string;
  asignado_a?: Personal;
  asignado_por_id?: string;
  asignado_por?: Personal;
  titulo: string;
  descripcion: string;
  prioridad: PrioridadTarea;
  estado: EstadoTarea;
  estado_proyecto?: EstadoProyectoEnum | string;
  columna_kanban?: string | null;
  columna_kanban_nombre?: string;
  orden_en_columna?: number;
  fecha_asignacion?: string;
  fecha_inicio?: string | null;
  fecha_limite: string;
  fecha_leido?: string;
  fecha_inicio_trabajo?: string;
  fecha_completada?: string;
  notificado_email?: boolean;
  notificado_icalendar?: boolean;
  notas?: string;
  proyecto_nombre?: string;
  empresa_nombre?: string;
  asignado_a_nombre?: string;
  asignado_a_email?: string;
  created_at?: string;
  updated_at: string;
}

export interface Reunion {
  id: string;
  proyecto_id?: string | null;
  proyecto?: Proyecto | string | null;
  proyecto_nombre?: string | null;
  titulo: string;
  motivo?: string;
  tipo_reunion: TipoReunion;
  descripcion?: string;
  fecha_hora?: string;
  fecha_hora_inicio: string;
  fecha_hora_fin?: string | null;
  ubicacion?: string;
  acta?: string;
  resultado?: ResultadoReunion | string | null;
  compromisos?: string | null;
  completada?: boolean;
  fecha_completada?: string | null;
  participantes_internos?: ReunionParticipanteInterno[];
  participantes_externos?: ParticipanteExterno[];
  created_at: string;
  updated_at?: string;
  eliminado?: boolean;
}

export interface ReunionParticipanteInterno {
  id: string;
  reunion_id: string;
  personal_id: string;
  personal?: Personal;
  asistio?: boolean;
}

export interface ParticipanteExterno {
  id?: string;
  reunion_id?: string;
  nombre: string;
  email?: string;
  cargo?: string;
  detalles?: string;
  empresa_nombre?: string;
  empresa_representada?: string;
  asistio?: boolean;
}

export interface Financiacion {
  id: string;
  empresa_id?: string;
  empresa?: Empresa;
  empresa_nombre?: string;
  proyecto_id: string;
  proyecto?: Proyecto | string;
  proyecto_nombre?: string;
  tipo_trabajo: TipoTrabajoFinanciacion;
  tipo_trabajo_otro?: string;
  tipo_trabajo_display?: string;
  monto_total: number;
  monto_usd?: number | string | null;
  cotizacion_usd?: number | string | null;
  moneda: string;
  forma_pago: string;
  cantidad_cuotas?: number;
  detalle_entregables?: string;
  detalle_otros?: string;
  fecha_acuerdo: string;
  notas?: string;
  aviso_email_empresa?: boolean;
  recordatorio_verificar_cobro?: boolean;
  cuotas?: CuotaPago[];
  created_at: string;
  updated_at: string;
}

export interface CuotaPago {
  id?: string;
  financiacion_id?: string;
  tipo_pago: TipoPagoItem | string;
  numero_cuota?: number | null;
  entregable?: string;
  detalle?: string;
  monto: number;
  monto_pagado?: number;
  moneda: string;
  fecha_pago?: string;
  fecha_vencimiento?: string;
  fecha_aviso?: string;
  modalidad: ModalidadPago | string;
  estado: EstadoCuota | string;
  comprobante?: string;
  pago_en_dolares?: boolean;
  monto_usd?: number | string | null;
  cotizacion_usd?: number | string | null;
}

export type Cuota = CuotaPago;

export interface Adjunto {
  id: string;
  nombre_original: string;
  archivo: string;
  tipo_mime: string;
  tamanio: number;
  content_type: string;
  object_id: string;
  subido_por_id?: string;
  subido_por?: Personal;
  created_at: string;
}

export interface AuditLog {
  id: string;
  tabla: string;
  registro_id: string;
  accion: AccionAudit;
  campo?: string;
  valor_anterior?: string;
  valor_nuevo?: string;
  usuario_id?: string;
  fecha: string;
  ip_address?: string;
}

export interface Recordatorio {
  id?: string;
  usuario_id?: string;
  usuario_nombre?: string;
  usuario_email?: string;
  titulo: string;
  descripcion?: string;
  fecha: string;
  hora?: string | null;
  enviar_email_futuro: boolean;
  email_destino?: string;
  email_enviado?: boolean;
  prioridad?: 'BAJA' | 'MEDIA' | 'ALTA' | 'URGENTE';
  completado?: boolean;
  aviso_email?: string;
  created_at?: string;
  updated_at?: string;
}


// --- Labels en español para UI ---

export const ESTADO_PROYECTO_LABELS: Record<EstadoProyectoEnum, string> = {
  [EstadoProyectoEnum.OPORTUNIDAD]: 'Oportunidad',
  [EstadoProyectoEnum.TRABAJANDO]: 'Trabajando',
  [EstadoProyectoEnum.PAUSADO]: 'Pausado',
  [EstadoProyectoEnum.SEGUIMIENTO]: 'Seguimiento',
  [EstadoProyectoEnum.CONCRETADO]: 'Concretado',
  [EstadoProyectoEnum.CAIDO]: 'Caído',
};

export const ESTADO_PROYECTO_COLORS: Record<EstadoProyectoEnum, string> = {
  [EstadoProyectoEnum.OPORTUNIDAD]: 'bg-blue-100 text-blue-800',
  [EstadoProyectoEnum.TRABAJANDO]: 'bg-green-100 text-green-800',
  [EstadoProyectoEnum.PAUSADO]: 'bg-yellow-100 text-yellow-800',
  [EstadoProyectoEnum.SEGUIMIENTO]: 'bg-purple-100 text-purple-800',
  [EstadoProyectoEnum.CONCRETADO]: 'bg-emerald-100 text-emerald-800',
  [EstadoProyectoEnum.CAIDO]: 'bg-red-100 text-red-800',
};

export const PRIORIDAD_LABELS: Record<PrioridadTarea, string> = {
  [PrioridadTarea.BAJA]: 'Baja',
  [PrioridadTarea.MEDIA]: 'Media',
  [PrioridadTarea.ALTA]: 'Alta',
  [PrioridadTarea.URGENTE]: 'Urgente',
};

export const PRIORIDAD_COLORS: Record<PrioridadTarea, string> = {
  [PrioridadTarea.BAJA]: 'bg-gray-100 text-gray-800',
  [PrioridadTarea.MEDIA]: 'bg-blue-100 text-blue-800',
  [PrioridadTarea.ALTA]: 'bg-orange-100 text-orange-800',
  [PrioridadTarea.URGENTE]: 'bg-red-100 text-red-800',
};

export const ESTADO_TAREA_LABELS: Record<EstadoTarea, string> = {
  [EstadoTarea.PENDIENTE]: 'Pendiente',
  [EstadoTarea.EN_PROGRESO]: 'En Progreso',
  [EstadoTarea.COMPLETADA]: 'Completada',
  [EstadoTarea.CANCELADA]: 'Cancelada',
};

export const FORMA_PAGO_LABELS: Record<FormaPago, string> = {
  [FormaPago.MES_ADELANTADO]: 'Mes Adelantado',
  [FormaPago.MES_VENCIDO]: 'Mes Vencido',
  [FormaPago.ANUAL_ADELANTADO]: 'Anual Adelantado',
  [FormaPago.PLAN_CUOTAS]: 'Plan en Cuotas',
  [FormaPago.ENTREGABLES]: 'Por Entregables',
  [FormaPago.OTROS]: 'Otros',
};

export const TIPO_SERVICIO_LABELS: Record<TipoServicio, string> = {
  [TipoServicio.CONSULTORIA]: 'Consultoría',
  [TipoServicio.DESARROLLO]: 'Desarrollo',
  [TipoServicio.IMPLEMENTACION_CAPACITACION]: 'Implementación + Capacitación',
  [TipoServicio.OTRO]: 'Otro',
};

export const TIPO_REUNION_LABELS: Record<TipoReunion, string> = {
  [TipoReunion.PRESENCIAL]: 'Presencial',
  [TipoReunion.VIRTUAL]: 'Virtual',
  [TipoReunion.TELEFONICA]: 'Telefónica',
  [TipoReunion.OTRA]: 'Otra',
};

export interface ConfiguracionEmail {
  id?: string;
  proveedor: 'GMAIL' | 'OUTLOOK' | 'SENDGRID' | 'BREVO' | 'MAILJET' | 'OTRO';
  host: string;
  port: number;
  usuario: string;
  password?: string;
  tiene_password?: boolean;
  use_tls: boolean;
  use_ssl: boolean;
  remitente_default: string;
  activo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ProbarEmailRequest {
  email_destino: string;
  config_id?: string;
  proveedor?: string;
  host?: string;
  port?: number;
  usuario?: string;
  password?: string;
  use_tls?: boolean;
  use_ssl?: boolean;
  remitente_default?: string;
}

export interface Invitacion {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  cargo: string;
  rol: RolPersonal;
  token: string;
  creado_por?: string;
  creado_por_nombre?: string;
  fecha_expiracion: string;
  estado: 'PENDIENTE' | 'REGISTRADO' | 'APROBADO' | 'EXPIRADA' | 'REVOCADA';
  aprobado_por?: string;
  aprobado_por_nombre?: string;
  fecha_aprobacion?: string;
  esta_expirada: boolean;
  horas_restantes: number;
  created_at: string;
  updated_at?: string;
}

export interface ColumnaKanban {
  id: string;
  proyecto: string;
  nombre: string;
  color: 'slate' | 'blue' | 'amber' | 'emerald' | 'purple' | 'rose' | 'cyan' | 'indigo';
  orden: number;
  estado_asociado?: EstadoTarea | null;
  tareas_count?: number;
  created_at?: string;
}

export interface KanbanColumnaConTareas {
  id: string;
  nombre: string;
  color: string;
  orden: number;
  estado_asociado?: string;
  tareas: Tarea[];
}

export interface KanbanBoardData {
  proyecto_id: string;
  proyecto_nombre: string;
  lider_proyecto?: {
    id: string;
    nombre: string;
    apellido: string;
    email: string;
  } | null;
  puede_editar_columnas: boolean;
  columnas: KanbanColumnaConTareas[];
}

// =========================================================================
// PROJECT HEALTH SCORE (PHS) TYPES
// =========================================================================

export enum ModalidadContratacion {
  IN_HOUSE = 'IN_HOUSE',
  OUTSOURCED = 'OUTSOURCED',
  MIXTO = 'MIXTO',
}

export const MODALIDAD_LABELS: Record<ModalidadContratacion, string> = {
  [ModalidadContratacion.IN_HOUSE]: 'In-house (Desarrollo interno)',
  [ModalidadContratacion.OUTSOURCED]: 'Outsourced (Contrato externo precio fijo)',
  [ModalidadContratacion.MIXTO]: 'Mixto (Equipo híbrido)',
};

export enum CategoriaProyecto {
  PRODUCTO_CORE = 'PRODUCTO_CORE',
  SOPORTE_INTERNO = 'SOPORTE_INTERNO',
  INNOVACION = 'INNOVACION',
  TRANSVERSAL = 'TRANSVERSAL',
  OTRO = 'OTRO',
}

export const CATEGORIA_LABELS: Record<CategoriaProyecto, string> = {
  [CategoriaProyecto.PRODUCTO_CORE]: 'Producto Core',
  [CategoriaProyecto.SOPORTE_INTERNO]: 'Soporte Interno',
  [CategoriaProyecto.INNOVACION]: 'Innovación / I+D',
  [CategoriaProyecto.TRANSVERSAL]: 'Transversal / RRHH',
  [CategoriaProyecto.OTRO]: 'Otro',
};

export enum NivelRiesgo {
  SALUDABLE = 'SALUDABLE',
  LATENTE = 'LATENTE',
  ACTIVO = 'ACTIVO',
  INMINENTE = 'INMINENTE',
  SIN_DATOS = 'SIN_DATOS',
}

export const NIVEL_RIESGO_LABELS: Record<NivelRiesgo, string> = {
  [NivelRiesgo.SALUDABLE]: 'Saludable (> 70 pts)',
  [NivelRiesgo.LATENTE]: 'Riesgo Latente (55 - 70 pts)',
  [NivelRiesgo.ACTIVO]: 'Riesgo Activo (35 - 54 pts)',
  [NivelRiesgo.INMINENTE]: 'Cancelación Inminente (< 35 pts)',
  [NivelRiesgo.SIN_DATOS]: 'Sin Datos',
};

export interface ProyectoDia0 {
  id?: string;
  proyecto?: string;
  pm_experiencia_anios: number;
  modalidad_contratacion: ModalidadContratacion;
  categoria_proyecto: CategoriaProyecto;
  presupuesto_base: number;
  duracion_estimada_dias: number;
  esfuerzo_meses_persona: number;
  complejidad_tecnica: number;
  competencia_equipo_pct: number;
  certeza_requerimientos: number;
  conocimiento_sponsor: number;
  tolerancia_desviacion_tiempo_pct: number;
  tolerancia_desviacion_costo_pct: number;
  certificaciones_pm?: string[];
  phs_inicial?: number;
  configurado?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ShapFactor {
  variable: string;
  valor_real: string;
  impacto: number;
  signo: 'positivo' | 'negativo' | 'neutral';
  explicacion: string;
}

export interface DesgloseExplicabilidad {
  puntaje_base: number;
  phs_resultado: number;
  factores: ShapFactor[];
}

export interface ProyectoSnapshot {
  id: string;
  proyecto: string;
  numero_corte: number;
  fecha_corte: string;
  pv: number;
  ev: number;
  ac: number;
  spi: number;
  cpi: number;
  csi: number;
  tasa_tareas_vencidas: number;
  reuniones_planificadas: number;
  reuniones_reales: number;
  ratio_contacto: number;
  canal_predominante: string;
  dias_retraso_total: number;
  dias_retraso_cliente: number;
  rfc: number;
  indice_desviacion: number;
  cambios_alcance_periodo: number;
  rotacion_personal_clave: number;
  s_cliente: number;
  s_equipo: number;
  delta_s: number;
  n4_empoderamiento: number;
  n5_claridad_hitos: number;
  n6_participacion_cliente: number;
  n7_tension: number;
  archivo_minuta?: string | null;
  texto_minuta_analizado?: string | null;
  score_a_priori: number;
  indice_operativo: number;
  indice_nlp: number;
  phs: number;
  nivel_riesgo: NivelRiesgo;
  desglose_explicabilidad: DesgloseExplicabilidad;
  accion_recomendada: string;
  registrado_por?: string | null;
  registrado_por_nombre?: string;
  created_at: string;
}

export interface AlertaSnapshotPendiente {
  requiere_snapshot: boolean;
  dias_desde_ultimo: number;
  ultimo_corte?: string | null;
  numero_corte?: number;
}

export interface SnapshotHistoricoItem {
  corte: string;
  numero_corte: number;
  fecha: string;
  phs: number;
  csi: number;
  spi: number;
  cpi: number;
  rfc: number;
  n4_empoderamiento: number;
  s_cliente: number;
  nivel_riesgo: NivelRiesgo;
}

export interface HealthScoreData {
  phs_actual: number | null;
  nivel_riesgo: NivelRiesgo;
  tiene_dia0: boolean;
  tiene_snapshots: boolean;
  alerta_snapshot_pendiente: AlertaSnapshotPendiente;
  ultimo_snapshot?: ProyectoSnapshot | null;
  desglose_explicabilidad: DesgloseExplicabilidad;
  accion_recomendada: string;
  historico_grafico: SnapshotHistoricoItem[];
  mensaje?: string;
}

export interface SnapshotSugerencias {
  numero_corte: number;
  fecha_corte: string;
  pv: number;
  ev: number;
  ac: number;
  tasa_tareas_vencidas: number;
  reuniones_planificadas: number;
  reuniones_reales: number;
  dias_retraso_total: number;
  dias_retraso_cliente: number;
  cambios_alcance_periodo: number;
  rotacion_personal_clave: number;
  n4_empoderamiento: number;
  n5_claridad_hitos: number;
  n6_participacion_cliente: number;
  n7_tension: number;
  s_cliente: number;
  s_equipo: number;
  delta_s: number;
  canal_predominante: string;
}

export interface PortfolioHealthOverview {
  total_proyectos: number;
  proyectos_con_seguimiento: number;
  phs_promedio: number;
  distribucion_riesgo: {
    saludable: number;
    latente: number;
    activo: number;
    inminente: number;
    sin_datos: number;
  };
  snapshots_pendientes_alerta: number;
}

export interface AnalisisMinutaResponse {
  texto_extraido_resumen: string;
  longitud_caracteres: number;
  caracteres?: number;
  proveedor?: string;
  es_ia_remota?: boolean;
  modelo_ia?: string;
  nlp: {
    n4_empoderamiento: number;
    n5_claridad_hitos: number;
    n6_participacion_cliente: number;
    n7_tension: number;
    s_cliente: number;
    s_equipo: number;
    delta_s: number;
    resumen_hallazgos: string[];
    palabras_clave_detectadas: string[];
    proveedor?: string;
    es_ia_remota?: boolean;
    modelo_ia?: string;
  };
  analisis?: any;
}

export interface DiagnosticoReunion {
  veredicto: string;
  calificacion: 'EXCELENTE' | 'BUENA' | 'FRICCION' | 'CRITICA';
  color: string;
  descripcion_clima: string;
  diagnostico_cliente: string;
  diagnostico_equipo: string;
  compromisos: string[];
  alertas: string[];
  resumen_sugerido: string;
  proveedor?: string;
  es_ia_remota?: boolean;
  modelo_ia?: string;
  nlp_metricas: {
    n4_empoderamiento: number;
    n5_claridad_hitos: number;
    n6_participacion_cliente: number;
    n7_tension: number;
    s_cliente: number;
    s_equipo: number;
    delta_s: number;
    resumen_hallazgos: string[];
    palabras_clave_detectadas: string[];
    proveedor?: string;
    es_ia_remota?: boolean;
    modelo_ia?: string;
  };
}

export interface AnalisisTranscripcionResponse {
  texto_extraido?: string;
  caracteres?: number;
  diagnostico: DiagnosticoReunion;
  proveedor?: string;
  es_ia_remota?: boolean;
}

export type ProveedorIA = 'GEMINI' | 'GROK' | 'CLAUDE' | 'OPENAI' | 'LOCAL';

export interface ConfiguracionIA {
  id: string;
  proveedor: ProveedorIA;
  nombre: string;
  modelo: string;
  api_key?: string;
  mascara_api_key?: string;
  tiene_api_key: boolean;
  es_predeterminado: boolean;
  activo: boolean;
  temperatura: number;
  max_tokens: number;
  created_at?: string;
  updated_at?: string;
}

export interface ProveedorIADisponible {
  id: string;
  proveedor: ProveedorIA;
  nombre: string;
  modelo: string;
  mascara_api_key?: string;
  es_predeterminado: boolean;
  origen: 'BASE_DE_DATOS' | 'VARIABLE_ENTORNO';
}

export interface EstadoConfiguracionIA {
  total_configurados: number;
  proveedor_activo: string;
  proveedor_predeterminado_codigo: string;
  modo: string;
  es_remota: boolean;
  proveedores_disponibles: ProveedorIADisponible[];
  soporta: string[];
}

export interface ProbarIARequest {
  proveedor: ProveedorIA;
  api_key?: string;
  modelo?: string;
  id?: string;
}

export interface ProbarIAResponse {
  ok: boolean;
  mensaje?: string;
  error?: string;
  latencia_ms?: number;
  modelo?: string;
  proveedor?: string;
}



