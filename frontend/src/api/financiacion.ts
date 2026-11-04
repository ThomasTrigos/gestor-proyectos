import { Financiacion } from '../types';
import client from './client';

export const financiacionApi = {
  getAll: async () => {
    const { data } = await client.get<any>('/financiacion/');
    return (data?.results || data || []) as Financiacion[];
  },
  getById: async (id: string) => {
    const { data } = await client.get<Financiacion>(`/financiacion/${id}/`);
    return data;
  },
  create: async (financiacion: Partial<Financiacion>) => {
    const { data } = await client.post<Financiacion>('/financiacion/', financiacion);
    return data;
  },
  update: async (id: string, financiacion: Partial<Financiacion>) => {
    const { data } = await client.put<Financiacion>(`/financiacion/${id}/`, financiacion);
    return data;
  },
  delete: async (id: string) => {
    await client.delete(`/financiacion/${id}/`);
  },
  patchCuota: async (id: string, data: any) => {
    const res = await client.patch(`/financiacion/cuotas/${id}/`, data);
    return res.data;
  },
};
