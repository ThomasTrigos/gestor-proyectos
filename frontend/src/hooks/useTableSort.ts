import { useState, useMemo } from 'react';

export type SortCriterion = 
  | 'alfabetico_asc' 
  | 'alfabetico_desc' 
  | 'estado_asc' 
  | 'estado_desc' 
  | 'prioridad_desc'
  | 'prioridad_asc'
  | 'fecha_inicio_asc'
  | 'fecha_inicio_desc'
  | 'fecha_limite_asc'
  | 'fecha_limite_desc'
  | 'updated_at_desc' 
  | 'updated_at_asc' 
  | 'created_at_desc' 
  | 'created_at_asc';

export interface SortExtractor<T> {
  getText?: (item: T) => string;
  getEstado?: (item: T) => string;
  getPrioridad?: (item: T) => string;
  getUpdatedAt?: (item: T) => string | number | Date | null | undefined;
  getCreatedAt?: (item: T) => string | number | Date | null | undefined;
  getFechaInicio?: (item: T) => string | number | Date | null | undefined;
  getFechaLimite?: (item: T) => string | number | Date | null | undefined;
}

export function useTableSort<T>(
  items: T[],
  extractors: SortExtractor<T>,
  initialCriterion: SortCriterion = 'created_at_desc'
) {
  const [sortCriterion, setSortCriterion] = useState<SortCriterion>(initialCriterion);

  const sortedItems = useMemo(() => {
    if (!items || items.length === 0) return [];

    const copy = [...items];

    return copy.sort((a, b) => {
      switch (sortCriterion) {
        case 'alfabetico_asc': {
          const textA = (extractors.getText ? extractors.getText(a) : '') || '';
          const textB = (extractors.getText ? extractors.getText(b) : '') || '';
          return textA.localeCompare(textB, 'es', { sensitivity: 'base' });
        }
        case 'alfabetico_desc': {
          const textA = (extractors.getText ? extractors.getText(a) : '') || '';
          const textB = (extractors.getText ? extractors.getText(b) : '') || '';
          return textB.localeCompare(textA, 'es', { sensitivity: 'base' });
        }
        case 'estado_asc': {
          const estA = (extractors.getEstado ? extractors.getEstado(a) : '') || '';
          const estB = (extractors.getEstado ? extractors.getEstado(b) : '') || '';
          return estA.localeCompare(estB, 'es', { sensitivity: 'base' });
        }
        case 'estado_desc': {
          const estA = (extractors.getEstado ? extractors.getEstado(a) : '') || '';
          const estB = (extractors.getEstado ? extractors.getEstado(b) : '') || '';
          return estB.localeCompare(estA, 'es', { sensitivity: 'base' });
        }
        case 'prioridad_desc': {
          const weight = (val: string) => {
            switch (val) {
              case 'URGENTE': return 4;
              case 'ALTA': return 3;
              case 'MEDIA': return 2;
              case 'BAJA': return 1;
              default: return 0;
            }
          };
          const pA = weight(extractors.getPrioridad ? extractors.getPrioridad(a) : (a as any).prioridad || '');
          const pB = weight(extractors.getPrioridad ? extractors.getPrioridad(b) : (b as any).prioridad || '');
          return pB - pA;
        }
        case 'prioridad_asc': {
          const weight = (val: string) => {
            switch (val) {
              case 'URGENTE': return 4;
              case 'ALTA': return 3;
              case 'MEDIA': return 2;
              case 'BAJA': return 1;
              default: return 0;
            }
          };
          const pA = weight(extractors.getPrioridad ? extractors.getPrioridad(a) : (a as any).prioridad || '');
          const pB = weight(extractors.getPrioridad ? extractors.getPrioridad(b) : (b as any).prioridad || '');
          return pA - pB;
        }
        case 'fecha_inicio_asc': {
          const rawA = extractors.getFechaInicio ? extractors.getFechaInicio(a) : (a as any).fecha_inicio;
          const rawB = extractors.getFechaInicio ? extractors.getFechaInicio(b) : (b as any).fecha_inicio;
          if (!rawA && !rawB) return 0;
          if (!rawA) return 1;
          if (!rawB) return -1;
          return new Date(rawA).getTime() - new Date(rawB).getTime();
        }
        case 'fecha_inicio_desc': {
          const rawA = extractors.getFechaInicio ? extractors.getFechaInicio(a) : (a as any).fecha_inicio;
          const rawB = extractors.getFechaInicio ? extractors.getFechaInicio(b) : (b as any).fecha_inicio;
          if (!rawA && !rawB) return 0;
          if (!rawA) return 1;
          if (!rawB) return -1;
          return new Date(rawB).getTime() - new Date(rawA).getTime();
        }
        case 'fecha_limite_asc': {
          const tA = extractors.getFechaLimite ? new Date(extractors.getFechaLimite(a) || 0).getTime() : new Date((a as any).fecha_limite || 0).getTime();
          const tB = extractors.getFechaLimite ? new Date(extractors.getFechaLimite(b) || 0).getTime() : new Date((b as any).fecha_limite || 0).getTime();
          return tA - tB;
        }
        case 'fecha_limite_desc': {
          const tA = extractors.getFechaLimite ? new Date(extractors.getFechaLimite(a) || 0).getTime() : new Date((a as any).fecha_limite || 0).getTime();
          const tB = extractors.getFechaLimite ? new Date(extractors.getFechaLimite(b) || 0).getTime() : new Date((b as any).fecha_limite || 0).getTime();
          return tB - tA;
        }
        case 'updated_at_desc': {
          const tA = extractors.getUpdatedAt ? new Date(extractors.getUpdatedAt(a) || 0).getTime() : new Date((a as any).updated_at || 0).getTime();
          const tB = extractors.getUpdatedAt ? new Date(extractors.getUpdatedAt(b) || 0).getTime() : new Date((b as any).updated_at || 0).getTime();
          return tB - tA;
        }
        case 'updated_at_asc': {
          const tA = extractors.getUpdatedAt ? new Date(extractors.getUpdatedAt(a) || 0).getTime() : new Date((a as any).updated_at || 0).getTime();
          const tB = extractors.getUpdatedAt ? new Date(extractors.getUpdatedAt(b) || 0).getTime() : new Date((b as any).updated_at || 0).getTime();
          return tA - tB;
        }
        case 'created_at_desc': {
          const tA = extractors.getCreatedAt ? new Date(extractors.getCreatedAt(a) || 0).getTime() : new Date((a as any).created_at || 0).getTime();
          const tB = extractors.getCreatedAt ? new Date(extractors.getCreatedAt(b) || 0).getTime() : new Date((b as any).created_at || 0).getTime();
          return tB - tA;
        }
        case 'created_at_asc': {
          const tA = extractors.getCreatedAt ? new Date(extractors.getCreatedAt(a) || 0).getTime() : new Date((a as any).created_at || 0).getTime();
          const tB = extractors.getCreatedAt ? new Date(extractors.getCreatedAt(b) || 0).getTime() : new Date((b as any).created_at || 0).getTime();
          return tA - tB;
        }
        default:
          return 0;
      }
    });
  }, [items, sortCriterion, extractors]);

  return {
    sortedItems,
    sortCriterion,
    setSortCriterion
  };
}
