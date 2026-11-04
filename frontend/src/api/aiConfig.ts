import client from './client';
import {
  ConfiguracionIA,
  EstadoConfiguracionIA,
  ProbarIARequest,
  ProbarIAResponse
} from '../types';

export const aiConfigApi = {
  getAll: async (): Promise<ConfiguracionIA[]> => {
    const response = await client.get('/configuracion-ia/');
    return response.data.results || response.data;
  },

  getProveedores: async (): Promise<EstadoConfiguracionIA> => {
    const response = await client.get('/configuracion-ia/proveedores/');
    return response.data;
  },

  guardar: async (data: Partial<ConfiguracionIA>): Promise<ConfiguracionIA> => {
    if (data.id && !data.id.startsWith('env-')) {
      const response = await client.patch(`/configuracion-ia/${data.id}/`, data);
      return response.data;
    } else {
      const { id, ...createData } = data;
      const response = await client.post('/configuracion-ia/', createData);
      return response.data;
    }
  },

  eliminar: async (id: string): Promise<void> => {
    await client.delete(`/configuracion-ia/${id}/`);
  },

  probar: async (data: ProbarIARequest): Promise<ProbarIAResponse> => {
    const response = await client.post('/configuracion-ia/probar/', data);
    return response.data;
  },

  establecerPredeterminado: async (id: string): Promise<{ ok: boolean; mensaje: string }> => {
    const response = await client.post(`/configuracion-ia/${id}/establecer_predeterminado/`);
    return response.data;
  },
};
