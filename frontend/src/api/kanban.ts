import client from './client';
import { KanbanBoardData, ColumnaKanban } from '../types';

export const kanbanApi = {
  getBoard: async (proyectoId: string): Promise<KanbanBoardData> => {
    const response = await client.get(`/proyectos/${proyectoId}/kanban/`);
    return response.data;
  },

  moverTarjeta: async (proyectoId: string, tareaId: string, columnaDestinoId: string, nuevoOrden: number = 0) => {
    const response = await client.post(`/proyectos/${proyectoId}/kanban/mover-tarjeta/`, {
      tarea_id: tareaId,
      columna_destino_id: columnaDestinoId,
      nuevo_orden: nuevoOrden,
    });
    return response.data;
  },

  crearColumna: async (proyectoId: string, data: { nombre: string; color: string; estado_asociado?: string | null }): Promise<ColumnaKanban> => {
    const response = await client.post(`/proyectos/${proyectoId}/kanban/columnas/`, data);
    return response.data;
  },

  editarColumna: async (proyectoId: string, columnaId: string, data: Partial<ColumnaKanban>): Promise<ColumnaKanban> => {
    const response = await client.put(`/proyectos/${proyectoId}/kanban/columnas/${columnaId}/`, data);
    return response.data;
  },

  eliminarColumna: async (proyectoId: string, columnaId: string): Promise<{ ok: boolean; mensaje: string }> => {
    const response = await client.delete(`/proyectos/${proyectoId}/kanban/columnas/${columnaId}/`);
    return response.data;
  },

  reordenarColumnas: async (proyectoId: string, columnasOrden: string[]): Promise<{ ok: boolean }> => {
    const response = await client.post(`/proyectos/${proyectoId}/kanban/reordenar-columnas/`, {
      columnas_orden: columnasOrden,
    });
    return response.data;
  },

  designarLider: async (proyectoId: string, personalId: string) => {
    const response = await client.post(`/proyectos/${proyectoId}/designar_lider/`, {
      personal_id: personalId,
    });
    return response.data;
  },
};
