import { Proyecto } from '../types';
import client from './client';

export const proyectosApi = {
  getAll: async (params?: Record<string, any>) => {
    const { data } = await client.get<any>('/proyectos/', { params });
    return data.results || data;
  },
  getById: async (id: string) => {
    const { data } = await client.get<Proyecto>(`/proyectos/${id}/`);
    return data;
  },
  create: async (proyecto: Partial<Proyecto> & { equipo_ids?: string[]; notificar_equipo?: boolean }) => {
    const { data } = await client.post<Proyecto>('/proyectos/', proyecto);
    return data;
  },
  update: async (id: string, proyecto: Partial<Proyecto> & { equipo_ids?: string[]; notificar_equipo?: boolean }) => {
    const { data } = await client.put<Proyecto>(`/proyectos/${id}/`, proyecto);
    return data;
  },
  delete: async (id: string) => {
    await client.delete(`/proyectos/${id}/`);
  },
  cambiarEstado: async (id: string, estado: string, razon_cambio: string, fecha_fin_estimada?: string | null) => {
    const payload: any = { estado, razon_cambio };
    if (fecha_fin_estimada !== undefined) {
      payload.fecha_fin_estimada = fecha_fin_estimada;
    }
    const { data } = await client.post<Proyecto>(`/proyectos/${id}/cambiar_estado/`, payload);
    return data;
  },
  asignarEquipo: async (id: string, personal_id: string, notificar = true) => {
    const { data } = await client.post(`/proyectos/${id}/asignar_equipo/`, { personal: personal_id, notificar });
    return data;
  },
  desasignarEquipo: async (id: string, personal_id: string) => {
    const { data } = await client.post(`/proyectos/${id}/desasignar_equipo/`, { personal: personal_id });
    return data;
  },
  getEstadosPosibles: async (id: string) => {
    const { data } = await client.get<{ estado_actual: string; estados_posibles: string[] }>(`/proyectos/${id}/estados_posibles/`);
    return data;
  }
};
