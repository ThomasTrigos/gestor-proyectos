import { Reunion } from '../types';
import client from './client';

export const reunionesApi = {
  getAll: async () => {
    const { data } = await client.get<any>('/reuniones/');
    return (data?.results || data || []) as Reunion[];
  },
  getById: async (id: string) => {
    const { data } = await client.get<Reunion>(`/reuniones/${id}/`);
    return data;
  },
  create: async (reunion: Partial<Reunion>) => {
    const { data } = await client.post<Reunion>('/reuniones/', reunion);
    return data;
  },
  update: async (id: string, reunion: Partial<Reunion>) => {
    const { data } = await client.put<Reunion>(`/reuniones/${id}/`, reunion);
    return data;
  },
  patch: async (id: string, reunion: Partial<Reunion>) => {
    const { data } = await client.patch<Reunion>(`/reuniones/${id}/`, reunion);
    return data;
  },
  delete: async (id: string) => {
    await client.delete(`/reuniones/${id}/`);
  },
  completar: async (id: string) => {
    const { data } = await client.post<any>(`/reuniones/${id}/completar/`);
    return data;
  },
  analizarTranscripcion: async (archivo?: File | null, texto?: string, proveedor?: string) => {
    if (archivo) {
      const formData = new FormData();
      formData.append('archivo', archivo);
      if (texto) formData.append('texto', texto);
      if (proveedor) formData.append('proveedor', proveedor);
      const { data } = await client.post<any>('/reuniones/analizar-transcripcion/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    } else {
      const { data } = await client.post<any>('/reuniones/analizar-transcripcion/', { texto, proveedor });
      return data;
    }
  },
  analizarActa: async (id: string, proveedor?: string) => {
    const { data } = await client.post<any>(`/reuniones/${id}/analizar-acta/`, { proveedor });
    return data;
  },
};

