import client from './client';
import { ConfiguracionEmail, ProbarEmailRequest } from '../types';

export const emailConfigApi = {
  getActiva: async (): Promise<ConfiguracionEmail | null> => {
    try {
      const response = await client.get('/configuracion-email/activa/');
      if (response.data && response.data.id) {
        return response.data;
      }
      return null;
    } catch {
      return null;
    }
  },

  getAll: async (): Promise<ConfiguracionEmail[]> => {
    const response = await client.get('/configuracion-email/');
    return response.data.results || response.data;
  },

  guardar: async (data: Partial<ConfiguracionEmail>): Promise<ConfiguracionEmail> => {
    if (data.id) {
      const response = await client.put(`/configuracion-email/${data.id}/`, data);
      return response.data;
    } else {
      const response = await client.post('/configuracion-email/', data);
      return response.data;
    }
  },

  probar: async (data: ProbarEmailRequest): Promise<{ ok: boolean; mensaje?: string; error?: string }> => {
    const response = await client.post('/configuracion-email/probar/', data);
    return response.data;
  },
};
