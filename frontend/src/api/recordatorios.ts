import { Recordatorio } from '../types';
import client from './client';

export const recordatoriosApi = {
  getAll: async (params?: Record<string, any>) => {
    const { data } = await client.get<any>('/recordatorios/', { params });
    return (data?.results || data || []) as Recordatorio[];
  },
  getById: async (id: string) => {
    const { data } = await client.get<Recordatorio>(`/recordatorios/${id}/`);
    return data;
  },
  create: async (recordatorio: Partial<Recordatorio>) => {
    const { data } = await client.post<Recordatorio>('/recordatorios/', recordatorio);
    return data;
  },
  update: async (id: string, recordatorio: Partial<Recordatorio>) => {
    const { data } = await client.put<Recordatorio>(`/recordatorios/${id}/`, recordatorio);
    return data;
  },
  patch: async (id: string, recordatorio: Partial<Recordatorio>) => {
    const { data } = await client.patch<Recordatorio>(`/recordatorios/${id}/`, recordatorio);
    return data;
  },
  delete: async (id: string) => {
    await client.delete(`/recordatorios/${id}/`);
  },
  toggleCompletado: async (id: string) => {
    const { data } = await client.post<Recordatorio>(`/recordatorios/${id}/toggle_completado/`);
    return data;
  },
};