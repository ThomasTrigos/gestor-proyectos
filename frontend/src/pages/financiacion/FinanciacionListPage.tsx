import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useApiQuery } from '../../hooks/useApi';
import { Table } from '../../components/ui/Table';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Button } from '../../components/ui/Button';
import { TableSortControl } from '../../components/ui/TableSortControl';
import { useTableSort } from '../../hooks/useTableSort';
import { 
  Financiacion, 
  TIPO_TRABAJO_LABELS, 
  TipoTrabajoFinanciacion, 
  RolPersonal 
} from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { getResults, formatDate } from '../../utils/formatters';
import { Plus, Edit3, DollarSign, Building2, FolderKanban, CalendarDays } from 'lucide-react';

export default function FinanciacionListPage() {
  const { data, isLoading } = useApiQuery<any>(['financiacion'], '/financiacion/');
  const { user } = useAuth();
  
  const rawFinanciaciones = getResults<Financiacion>(data);

  const getTipoTrabajoLabel = (item: Financiacion) => {
    if (item.tipo_trabajo_display) return item.tipo_trabajo_display;
    if (item.tipo_trabajo === TipoTrabajoFinanciacion.OTRO && item.tipo_trabajo_otro) {
      return `Otro (${item.tipo_trabajo_otro})`;
    }
    return TIPO_TRABAJO_LABELS[item.tipo_trabajo as TipoTrabajoFinanciacion] || item.tipo_trabajo || 'No especificado';
  };

  const getPlanResumen = (item: Financiacion) => {
    const cuotas = item.cuotas || [];
    if (cuotas.length === 0) {
      return item.cantidad_cuotas ? `${item.cantidad_cuotas} cuotas planificadas` : 'Sin cuotas asignadas';
    }
    const cantCuotas = cuotas.filter(c => c.tipo_pago === 'CUOTA').length;
    const cantEntregables = cuotas.filter(c => c.tipo_pago === 'ENTREGABLE').length;
    const pagados = cuotas.filter(c => c.estado === 'PAGADO').length;

    const parts: string[] = [];
    if (cantCuotas > 0) parts.push(`${cantCuotas} ${cantCuotas === 1 ? 'Cuota' : 'Cuotas'}`);
    if (cantEntregables > 0) parts.push(`${cantEntregables} ${cantEntregables === 1 ? 'Entregable' : 'Entregables'}`);

    const desc = parts.join(' + ') || `${cuotas.length} Pagos`;
    return `${desc} (${pagados}/${cuotas.length} pagados)`;
  };

  const sortExtractors = useMemo(() => ({
    getText: (f: Financiacion) => (f as any).proyecto_nombre || (f as any).empresa_nombre || '',
    getEstado: (f: Financiacion) => f.tipo_trabajo || '',
    getUpdatedAt: (f: Financiacion) => (f as any).updated_at,
    getCreatedAt: (f: Financiacion) => f.fecha_acuerdo || (f as any).created_at
  }), []);

  const { sortedItems: financiaciones, sortCriterion, setSortCriterion } = useTableSort<Financiacion>(
    rawFinanciaciones,
    sortExtractors,
    'created_at_desc'
  );

  const handleHeaderSort = (key: string) => {
    if (key === 'alfabetico') {
      setSortCriterion(sortCriterion === 'alfabetico_asc' ? 'alfabetico_desc' : 'alfabetico_asc');
    } else if (key === 'estado') {
      setSortCriterion(sortCriterion === 'estado_asc' ? 'estado_desc' : 'estado_asc');
    } else if (key === 'created_at') {
      setSortCriterion(sortCriterion === 'created_at_desc' ? 'created_at_asc' : 'created_at_desc');
    }
  };

  const getSortHeaderState = (key: string) => {
    if (key === 'alfabetico' && sortCriterion.startsWith('alfabetico')) {
      return { key, dir: sortCriterion.endsWith('asc') ? ('asc' as const) : ('desc' as const) };
    }
    if (key === 'estado' && sortCriterion.startsWith('estado')) {
      return { key, dir: sortCriterion.endsWith('asc') ? ('asc' as const) : ('desc' as const) };
    }
    if (key === 'created_at' && sortCriterion.startsWith('created_at')) {
      return { key, dir: sortCriterion.endsWith('asc') ? ('asc' as const) : ('desc' as const) };
    }
    return { key: undefined, dir: undefined };
  };

  const currentSortHeader = getSortHeaderState(
    sortCriterion.startsWith('alfabetico') ? 'alfabetico' :
    sortCriterion.startsWith('estado') ? 'estado' :
    sortCriterion.startsWith('created_at') ? 'created_at' : ''
  );

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Planes de Financiación</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestión integral de acuerdos financieros, cobros por cuotas y entregables por proyecto.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/calendario">
            <Button variant="secondary" className="flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4 text-emerald-600" />
              <span>Ver en Calendario</span>
            </Button>
          </Link>
          {user?.rol === RolPersonal.RRHH && (
            <Link to="/financiacion/nueva">
              <Button className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Nueva Financiación
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <TableSortControl
          value={sortCriterion}
          onChange={setSortCriterion}
          hasEstado={true}
          labelAlphabetical="Proyecto o Empresa"
          labelEstado="Tipo de Trabajo"
          labelDate="Fecha de acuerdo"
          dateDescText="Más reciente"
          dateAscText="Más antigua"
        />
      </div>
      
      {financiaciones.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-primary-600 flex items-center justify-center mx-auto mb-4">
            <DollarSign className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No hay acuerdos registrados</h3>
          <p className="text-sm text-gray-500 mb-6">Comience creando un nuevo plan de financiación para un proyecto.</p>
          {user?.rol === RolPersonal.RRHH && (
            <Link to="/financiacion/nueva">
              <Button>Registrar Primer Acuerdo</Button>
            </Link>
          )}
        </div>
      ) : (
        <Table
          headers={[
            { label: 'Proyecto y Empresa', sortKey: 'alfabetico' },
            { label: 'Tipo de Trabajo', sortKey: 'estado' },
            'Monto Total',
            'Cobro USD',
            'Plan de Ejecución',
            { label: 'Fecha Acuerdo', sortKey: 'created_at' },
            'Acciones'
          ]}
          currentSortKey={currentSortHeader.key}
          sortDirection={currentSortHeader.dir}
          onSort={handleHeaderSort}
        >
          {financiaciones.map((item: any) => {
            const tieneUsd = Array.isArray(item.cuotas) && item.cuotas.some((c: any) => c.pago_en_dolares);
            return (
              <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-semibold text-gray-900 flex items-center gap-1.5">
                    <FolderKanban className="w-4 h-4 text-primary-600 inline shrink-0" />
                    <span>{item.proyecto_nombre || 'Sin Proyecto'}</span>
                  </div>
                  <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                    <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span>{item.empresa_nombre || 'Sin Empresa'}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                    {getTipoTrabajoLabel(item)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-bold text-gray-900">
                    {Number(item.monto_total).toLocaleString('es-AR', { minimumFractionDigits: 2 })} {item.moneda}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {tieneUsd ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      💵 Cuotas en USD
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">
                      {item.moneda || 'ARS'}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  <span className="text-xs bg-gray-100 text-gray-800 px-2.5 py-1 rounded-md border border-gray-200 font-medium">
                    {getPlanResumen(item)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(item.fecha_acuerdo)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <Link 
                    to={`/financiacion/${item.id}/editar`} 
                    className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-900 font-medium text-xs bg-primary-50 hover:bg-primary-100 px-3 py-1.5 rounded-md transition"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Editar
                  </Link>
                </td>
              </tr>
            );
          })}
        </Table>
      )}
    </div>
  );
}
