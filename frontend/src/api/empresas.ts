import { Empresa } from '../types';
import client from './client';

export const empresasApi = {
  getAll: async () => {
    const { data } = await client.get<any>('/empresas/');
    return (data?.results || data || []) as Empresa[];
  },
  getById: async (id: string) => {
    const { data } = await client.get<Empresa>(`/empresas/${id}/`);
    return data;
  },
  create: async (empresa: Partial<Empresa>) => {
    const { data } = await client.post<Empresa>('/empresas/', empresa);
    return data;
  },
  update: async (id: string, empresa: Partial<Empresa>) => {
    const { data } = await client.put<Empresa>(`/empresas/${id}/`, empresa);
    return data;
  },
  delete: async (id: string) => {
    await client.delete(`/empresas/${id}/`);
  },
};
