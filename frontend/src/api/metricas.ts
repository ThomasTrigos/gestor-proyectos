import api from './client';

export interface ResumenGeneral {
  total_proyectos: number;
  proyectos_activos: number;
  total_empresas: number;
  total_personal: number;
  tareas_pendientes: number;
}

export interface ProyectoPorEstado {
  estado: string;
  cantidad: number;
}

export interface TareaPorProgramador {
  personal_id: string;
  nombre: string;
  apellido: string;
  total: number;
  pendientes: number;
  en_progreso: number;
  completadas: number;
}

export interface ResumenFinanciero {
  moneda: string;
  total_acordado: number;
  total_cobrado: number;
  total_pendiente: number;
}

export interface ProximaReunion {
  id: string;
  fecha_hora: string;
  motivo: string;
  modalidad: string;
  enlace_videollamada?: string;
  lugar_presencial?: string;
  proyecto_nombre: string;
  empresa_nombre: string;
}

export interface CargaTrabajo {
  personal_id: string;
  nombre: string;
  proyectos_activos: number;
  tareas_pendientes: number;
  tareas_vencidas: number;
}

export interface ProyectoPorVencer {
  id: string;
  nombre: string;
  fecha_estimada_fin: string;
  dias_restantes: number;
  estado: string;
  empresa_nombre: string;
}

export const getResumenGeneral = async (): Promise<ResumenGeneral> => {
  const response = await api.get('/core/metricas/resumen-general/');
  return response.data;
};

export const getProyectosPorEstado = async (): Promise<ProyectoPorEstado[]> => {
  const response = await api.get('/core/metricas/proyectos-por-estado/');
  return response.data;
};

export const getTareasPorProgramador = async (): Promise<TareaPorProgramador[]> => {
  const response = await api.get('/core/metricas/tareas-por-programador/');
  return response.data;
};

export const getResumenFinanciero = async (): Promise<ResumenFinanciero[]> => {
  const response = await api.get('/core/metricas/resumen-financiero/');
  return response.data;
};

export const getProximasReuniones = async (): Promise<ProximaReunion[]> => {
  const response = await api.get('/core/metricas/proximas-reuniones/');
  return response.data;
};

export const getCargaTrabajo = async (): Promise<CargaTrabajo[]> => {
  const response = await api.get('/core/metricas/carga-trabajo/');
  return response.data;
};

export const getProyectosPorVencer = async (): Promise<ProyectoPorVencer[]> => {
  const response = await api.get('/core/metricas/proyectos-por-vencer/');
  return response.data;
};
