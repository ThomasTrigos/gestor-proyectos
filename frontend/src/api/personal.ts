import { Personal } from '../types';
import client from './client';

export const personalApi = {
  getAll: async () => {
    const { data } = await client.get<any>('/personal/');
    return (data?.results || data || []) as Personal[];
  },
  getById: async (id: string) => {
    const { data } = await client.get<Personal>(`/personal/${id}/`);
    return data;
  },
  create: async (personal: Partial<Personal>) => {
    const { data } = await client.post<Personal>('/personal/', personal);
    return data;
  },
  update: async (id: string, personal: Partial<Personal>) => {
    const { data } = await client.put<Personal>(`/personal/${id}/`, personal);
    return data;
  },
  delete: async (id: string) => {
    await client.delete(`/personal/${id}/`);
  },
  getMiPerfil: async () => {
    const { data } = await client.get<any>('/personal/mi_perfil/');
    return data;
  },
  updateMiPerfil: async (datos: { telefono?: string; email?: string; nombre?: string; apellido?: string }) => {
    const { data } = await client.patch<any>('/personal/mi_perfil/', datos);
    return data;
  },
  cambiarPassword: async (datos: { password_actual: string; password_nuevo: string; password_confirm: string }) => {
    const { data } = await client.post<{ ok: boolean; mensaje: string }>('/personal/cambiar_password/', datos);
    return data;
  },
};
