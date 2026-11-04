import React from 'react';
import { ArrowUpDown } from 'lucide-react';
import { SortCriterion } from '../../hooks/useTableSort';

interface TableSortControlProps {
  value: SortCriterion;
  onChange: (value: SortCriterion) => void;
  hasEstado?: boolean;
  labelAlphabetical?: string;
  labelEstado?: string;
  labelDate?: string;
  dateDescText?: string;
  dateAscText?: string;
  hasFechaInicio?: boolean;
  hasFechaLimite?: boolean;
  hasPrioridad?: boolean;
  hasUpdatedAt?: boolean;
}

export const TableSortControl: React.FC<TableSortControlProps> = ({
  value,
  onChange,
  hasEstado = false,
  labelAlphabetical = 'Nombre',
  labelEstado = 'Estado',
  labelDate = 'Fecha de creación',
  dateDescText = 'Más reciente',
  dateAscText = 'Más antigua',
  hasFechaInicio = false,
  hasFechaLimite = false,
  hasPrioridad = false,
  hasUpdatedAt = true,
}) => {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium whitespace-nowrap">
        <ArrowUpDown className="w-3.5 h-3.5 text-indigo-500" />
        <span>Ordenar:</span>
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SortCriterion)}
        className="text-xs bg-white border border-gray-300 text-gray-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 shadow-sm transition-colors cursor-pointer"
      >
        <option value="created_at_desc">{labelDate} ({dateDescText})</option>
        <option value="created_at_asc">{labelDate} ({dateAscText})</option>
        {hasFechaInicio && (
          <>
            <option value="fecha_inicio_asc">Fecha de comienzo (Más próxima)</option>
            <option value="fecha_inicio_desc">Fecha de comienzo (Más lejana)</option>
          </>
        )}
        {hasFechaLimite && (
          <>
            <option value="fecha_limite_asc">Fecha de terminación (Más próxima)</option>
            <option value="fecha_limite_desc">Fecha de terminación (Más lejana)</option>
          </>
        )}
        {hasPrioridad && (
          <>
            <option value="prioridad_desc">Prioridad (Urgente primero)</option>
            <option value="prioridad_asc">Prioridad (Baja primero)</option>
          </>
        )}
        {hasUpdatedAt && (
          <>
            <option value="updated_at_desc">Última modificación (Reciente)</option>
            <option value="updated_at_asc">Última modificación (Antigua)</option>
          </>
        )}
        <option value="alfabetico_asc">{labelAlphabetical} (A - Z)</option>
        <option value="alfabetico_desc">{labelAlphabetical} (Z - A)</option>
        {hasEstado && (
          <>
            <option value="estado_asc">{labelEstado} (A - Z)</option>
            <option value="estado_desc">{labelEstado} (Z - A)</option>
          </>
        )}
      </select>
    </div>
  );
};
