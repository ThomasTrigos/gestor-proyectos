import { Tarea } from '../types';
import client from './client';

export const tareasApi = {
  getAll: async () => {
    const { data } = await client.get<any>('/tareas/');
    return (data?.results || data || []) as Tarea[];
  },
  getById: async (id: string) => {
    const { data } = await client.get<Tarea>(`/tareas/${id}/`);
    return data;
  },
  getByToken: async (token: string) => {
    const { data } = await client.get<Tarea>(`/tareas/public/?token=${token}`);
    return data;
  },
  create: async (tarea: Partial<Tarea>) => {
    const { data } = await client.post<Tarea>('/tareas/', tarea);
    return data;
  },
  update: async (id: string, tarea: Partial<Tarea>) => {
    const { data } = await client.put<Tarea>(`/tareas/${id}/`, tarea);
    return data;
  },
  patch: async (id: string, tarea: Partial<Tarea>) => {
    const { data } = await client.patch<Tarea>(`/tareas/${id}/`, tarea);
    return data;
  },
  delete: async (id: string) => {
    await client.delete(`/tareas/${id}/`);
  },
  completar: async (id: string) => {
    const { data } = await client.post<Tarea>(`/tareas/${id}/completar/`);
    return data;
  },
  cambiarEstado: async (id: string, estado: string) => {
    const { data } = await client.post<Tarea>(`/tareas/${id}/cambiar_estado/`, { estado });
    return data;
  },
  updateStatusByToken: async (token: string, estado: string) => {
    const { data } = await client.post<Tarea>('/tareas/public/update_status/', { token, estado });
    return data;
  }
};
