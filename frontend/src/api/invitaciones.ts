import client from './client';
import { Invitacion } from '../types';

export const invitacionesApi = {
  getAll: async (): Promise<Invitacion[]> => {
    const response = await client.get('/invitaciones/');
    return response.data.results || response.data;
  },

  crear: async (data: { email: string; nombre: string; apellido: string; cargo: string; rol: string }): Promise<Invitacion> => {
    const response = await client.post('/invitaciones/', data);
    return response.data;
  },

  reenviar: async (id: string): Promise<{ ok: boolean; mensaje: string }> => {
    const response = await client.post(`/invitaciones/${id}/reenviar/`);
    return response.data;
  },

  revocar: async (id: string): Promise<{ ok: boolean; mensaje: string }> => {
    const response = await client.post(`/invitaciones/${id}/revocar/`);
    return response.data;
  },

  aprobar: async (id: string): Promise<{ ok: boolean; mensaje: string }> => {
    const response = await client.post(`/invitaciones/${id}/aprobar/`);
    return response.data;
  },

  validar: async (token: string): Promise<{
    valido: boolean;
    email?: string;
    nombre?: string;
    apellido?: string;
    cargo?: string;
    rol?: string;
    rol_display?: string;
    horas_restantes?: number;
    expirada?: boolean;
    error?: string;
  }> => {
    const response = await client.get(`/invitaciones/validar/?token=${token}`);
    return response.data;
  },

  completar: async (data: { token: string; password: string; password_confirm: string }): Promise<{
    ok: boolean;
    mensaje: string;
  }> => {
    const response = await client.post('/invitaciones/completar/', data);
    return response.data;
  },
};
