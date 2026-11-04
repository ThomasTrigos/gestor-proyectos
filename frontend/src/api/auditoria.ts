import api from './client';

export interface RegistroAuditoria {
  id: string;
  tabla_afectada: string;
  registro_id: string;
  accion: 'CREAR' | 'MODIFICAR' | 'ELIMINAR';
  campos_modificados: any;
  fecha_hora: string;
  usuario_id: string;
  usuario_nombre?: string; // We might get it from backend or not, assuming basic fields
}

export interface AuditoriaQueryParams {
  tabla?: string;
  accion?: string;
  registro_id?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  page?: number;
  page_size?: number;
}

export interface PaginatedAuditoria {
  count: number;
  next: string | null;
  previous: string | null;
  results: RegistroAuditoria[];
}

export const getAuditoria = async (params: AuditoriaQueryParams): Promise<PaginatedAuditoria> => {
  try {
    const response = await api.get('/core/auditoria/', { params });
    if (Array.isArray(response.data)) {
      return {
        count: response.data.length,
        next: null,
        previous: null,
        results: response.data
      };
    }
    return response.data;
  } catch (error: any) {
    if (error?.response?.status === 404) {
      const fallback = await api.get('/core/audit/', { params });
      if (Array.isArray(fallback.data)) {
        return {
          count: fallback.data.length,
          next: null,
          previous: null,
          results: fallback.data
        };
      }
      return fallback.data;
    }
    throw error;
  }
};
