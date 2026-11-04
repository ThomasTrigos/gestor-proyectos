import os
import sys

form_path = r"C:\Users\usuario\.gemini\antigravity\scratch\gestor-proyectos\frontend\src\pages\financiacion\FinanciacionFormPage.tsx"
list_path = r"C:\Users\usuario\.gemini\antigravity\scratch\gestor-proyectos\frontend\src\pages\financiacion\FinanciacionListPage.tsx"

list_code = '''import React from 'react';
import { Link } from 'react-router-dom';
import { useApiQuery } from '../../hooks/useApi';
import { Table } from '../../components/ui/Table';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Button } from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { 
  Financiacion, 
  FORMA_PAGO_LABELS, 
  TIPO_TRABAJO_LABELS, 
  TipoTrabajoFinanciacion, 
  RolPersonal 
} from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { getResults, formatDate } from '../../utils/formatters';
import { Plus, Edit3, DollarSign, Calendar, Layers, Building2, FolderKanban } from 'lucide-react';

export default function FinanciacionListPage() {
  const { data, isLoading, refetch } = useApiQuery<any>(['financiacion'], '/financiacion/');
  const { user } = useAuth();
  
  if (isLoading) return <LoadingSpinner />;

  const financiaciones = getResults<Financiacion>(data);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Planes de Financiación</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestión integral de acuerdos financieros, cobros por cuotas y entregables por proyecto.
          </p>
        </div>
        {user?.rol === RolPersonal.RRHH && (
          <Link to="/financiacion/nueva">
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Nueva Financiación
            </Button>
          </Link>
        )}
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5 text-left">Proyecto y Empresa</th>
                  <th className="px-6 py-3.5 text-left">Tipo de Trabajo</th>
                  <th className="px-6 py-3.5 text-left">Monto Total</th>
                  <th className="px-6 py-3.5 text-left">Forma de Pago</th>
                  <th className="px-6 py-3.5 text-left">Plan de Ejecución</th>
                  <th className="px-6 py-3.5 text-left">Fecha Acuerdo</th>
                  <th className="px-6 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {financiaciones.map((item: any) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-semibold text-gray-900 flex items-center gap-1.5">
                        <FolderKanban className="w-4 h-4 text-primary-600 inline" />
                        {item.proyecto_nombre || 'Sin Proyecto'}
                      </div>
                      <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <Building2 className="w-3.5 h-3.5 text-gray-400" />
                        {item.empresa_nombre || 'Sin Empresa'}
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {FORMA_PAGO_LABELS[item.forma_pago as keyof typeof FORMA_PAGO_LABELS] || item.forma_pago}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <span className="text-xs bg-gray-100 text-gray-800 px-2.5 py-1 rounded-md border border-gray-200 font-medium">
                        {getPlanResumen(item)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(item.fecha_acuerdo)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <Link 
                        to={`/financiacion/${item.id}/editar`} 
                        className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-900 font-medium text-xs bg-primary-50 hover:bg-primary-100 px-3 py-1.5 rounded-md transition"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Editar
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
'''

with open(list_path, 'w', encoding='utf-8') as f:
    f.write(list_code)
print(f"Successfully wrote {list_path}")
