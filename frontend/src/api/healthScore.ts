import api from './client';
import {
  ProyectoDia0,
  ProyectoSnapshot,
  HealthScoreData,
  SnapshotSugerencias,
  PortfolioHealthOverview,
  AnalisisMinutaResponse
} from '../types';

export const healthScoreApi = {
  getProyectoDia0: async (proyectoId: string): Promise<ProyectoDia0> => {
    const res = await api.get(`/proyectos/${proyectoId}/dia0/`);
    return res.data;
  },

  saveProyectoDia0: async (proyectoId: string, data: Partial<ProyectoDia0>): Promise<ProyectoDia0> => {
    const res = await api.post(`/proyectos/${proyectoId}/dia0/`, data);
    return res.data;
  },

  getProyectoSnapshots: async (proyectoId: string): Promise<ProyectoSnapshot[]> => {
    const res = await api.get(`/proyectos/${proyectoId}/snapshots/`);
    return res.data;
  },

  createProyectoSnapshot: async (
    proyectoId: string,
    payload: FormData | Record<string, any>
  ): Promise<ProyectoSnapshot> => {
    const isFormData = payload instanceof FormData;
    const res = await api.post(`/proyectos/${proyectoId}/snapshots/`, payload, {
      headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
    });
    return res.data;
  },

  getSnapshotSugerencias: async (proyectoId: string): Promise<SnapshotSugerencias> => {
    const res = await api.get(`/proyectos/${proyectoId}/snapshots-sugerencias/`);
    return res.data;
  },

  getProyectoHealthScore: async (proyectoId: string): Promise<HealthScoreData> => {
    const res = await api.get(`/proyectos/${proyectoId}/health-score/`);
    return res.data;
  },

  getPortfolioHealthOverview: async (): Promise<PortfolioHealthOverview> => {
    const res = await api.get('/proyectos/health-overview/');
    return res.data;
  },

  analizarMinuta: async (archivo?: File | null, texto?: string, proveedor?: string): Promise<AnalisisMinutaResponse> => {
    if (archivo) {
      const formData = new FormData();
      formData.append('archivo', archivo);
      if (texto) formData.append('texto', texto);
      if (proveedor) formData.append('proveedor', proveedor);
      const res = await api.post('/proyectos/analizar-minuta/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    } else {
      const res = await api.post('/proyectos/analizar-minuta/', { texto, proveedor });
      return res.data;
    }
  },
};
