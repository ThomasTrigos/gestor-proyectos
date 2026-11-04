import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useApiQuery } from '../../hooks/useApi';
import client from '../../api/client';
import { Table } from '../../components/ui/Table';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Button } from '../../components/ui/Button';
import { TableSortControl } from '../../components/ui/TableSortControl';
import { useTableSort } from '../../hooks/useTableSort';
import { Empresa, RolPersonal } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { getResults, formatDate } from '../../utils/formatters';
import { Building2, Trash2, RotateCcw, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function EmpresasListPage() {
  const [tabActiva, setTabActiva] = useState<'activas' | 'papelera'>('activas');
  const [accionLoading, setAccionLoading] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);

  const endpoint = tabActiva === 'papelera' ? '/empresas/?papelera=true' : '/empresas/';
  const { data, isLoading, refetch } = useApiQuery<any>(['empresas', tabActiva], endpoint);
  const { user } = useAuth();
  const isRRHH = user?.rol === RolPersonal.RRHH;

  const rawEmpresas = getResults<Empresa>(data);

  const sortExtractors = useMemo(() => ({
    getText: (e: Empresa) => e.nombre_comercial || e.razon_social,
    getUpdatedAt: (e: Empresa) => e.updated_at,
    getCreatedAt: (e: Empresa) => e.created_at
  }), []);

  const { sortedItems: empresas, sortCriterion, setSortCriterion } = useTableSort<Empresa>(
    rawEmpresas,
    sortExtractors,
    'created_at_desc'
  );

  const handleHeaderSort = (key: string) => {
    if (key === 'alfabetico') {
      setSortCriterion(sortCriterion === 'alfabetico_asc' ? 'alfabetico_desc' : 'alfabetico_asc');
    } else if (key === 'created_at') {
      setSortCriterion(sortCriterion === 'created_at_desc' ? 'created_at_asc' : 'created_at_desc');
    }
  };

  const getSortHeaderState = (key: string) => {
    if (key === 'alfabetico' && sortCriterion.startsWith('alfabetico')) {
      return { key, dir: sortCriterion.endsWith('asc') ? ('asc' as const) : ('desc' as const) };
    }
    if (key === 'created_at' && sortCriterion.startsWith('created_at')) {
      return { key, dir: sortCriterion.endsWith('asc') ? ('asc' as const) : ('desc' as const) };
    }
    return { key: undefined, dir: undefined };
  };

  const currentSortHeader = getSortHeaderState(
    sortCriterion.startsWith('alfabetico') ? 'alfabetico' :
    sortCriterion.startsWith('created_at') ? 'created_at' : ''
  );

  const handleMoverAPapelera = async (id: string, nombre: string) => {
    if (!window.confirm(`¿Seguro que deseas mover la empresa "${nombre}" a la papelera? Quedará oculta del sistema hasta que decidas restaurarla.`)) {
      return;
    }
    try {
      setAccionLoading(id);
      setMensaje(null);
      await client.delete(`/empresas/${id}/`);
      setMensaje({ tipo: 'exito', texto: `Empresa "${nombre}" enviada a la papelera.` });
      refetch();
    } catch (err: any) {
      setMensaje({ tipo: 'error', texto: err.response?.data?.error || 'No se pudo mover a la papelera.' });
    } finally {
      setAccionLoading(null);
    }
  };

  const handleRestaurar = async (id: string, nombre: string) => {
    try {
      setAccionLoading(id);
      setMensaje(null);
      await client.post(`/empresas/${id}/restaurar/`);
      setMensaje({ tipo: 'exito', texto: `Empresa "${nombre}" restaurada correctamente.` });
      refetch();
    } catch (err: any) {
      setMensaje({ tipo: 'error', texto: err.response?.data?.error || 'No se pudo restaurar.' });
    } finally {
      setAccionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Empresas Clientes</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Gestión de empresas cliente, razones sociales, contactos y acuerdos vinculados.
          </p>
        </div>
        {isRRHH && (
          <Link to={`/empresas/nueva`}>
            <Button variant="primary">+ Nueva Empresa</Button>
          </Link>
        )}
      </div>

      {mensaje && (
        <div className={`p-3.5 rounded-lg text-sm flex items-center gap-2 border ${
          mensaje.tipo === 'exito'
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
            : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          {mensaje.tipo === 'exito' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          )}
          <span>{mensaje.texto}</span>
        </div>
      )}

      {/* Pestañas Activas vs Papelera (solo RRHH tiene papelera) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-gray-200 pb-3">
        <div className="flex gap-2">
          <button
            onClick={() => setTabActiva('activas')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2 ${
              tabActiva === 'activas'
                ? 'bg-primary-50 text-primary-700 border border-primary-200'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Empresas Activas</span>
          </button>
          {isRRHH && (
            <button
              onClick={() => setTabActiva('papelera')}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2 ${
                tabActiva === 'papelera'
                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Trash2 className="w-4 h-4" />
              <span>Papelera de Reciclaje</span>
            </button>
          )}
        </div>

        {/* Control de Ordenamiento */}
        <TableSortControl
          value={sortCriterion}
          onChange={setSortCriterion}
          hasEstado={false}
          labelAlphabetical="Nombre Comercial"
        />
      </div>
      
      {isLoading ? (
        <LoadingSpinner />
      ) : empresas.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500 border">
          {tabActiva === 'papelera'
            ? 'La papelera de empresas se encuentra vacía.'
            : 'No hay empresas registradas actualmente.'}
        </div>
      ) : (
        <Table
          headers={[
            { label: 'Nombre Comercial', sortKey: 'alfabetico' },
            'Razón Social',
            'CUIT',
            { label: 'Fecha de Registro', sortKey: 'created_at' },
            'Acciones'
          ]}
          currentSortKey={currentSortHeader.key}
          sortDirection={currentSortHeader.dir}
          onSort={handleHeaderSort}
        >
          {empresas.map((item) => (
            <tr key={item.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {item.nombre_comercial}
                {tabActiva === 'papelera' && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-rose-100 text-rose-800">
                    En papelera
                  </span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.razon_social}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.cuit}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {formatDate(item.created_at)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                {tabActiva === 'activas' ? (
                  <>
                    <Link to={`/empresas/${item.id}/editar`} className="text-primary-600 hover:text-primary-900 font-medium">
                      Editar
                    </Link>
                    {isRRHH && (
                      <button
                        onClick={() => handleMoverAPapelera(item.id, item.nombre_comercial || item.razon_social)}
                        disabled={accionLoading === item.id}
                        className="text-rose-600 hover:text-rose-900 font-medium ml-2"
                        title="Mover a papelera de reciclaje"
                      >
                        {accionLoading === item.id ? 'Moviendo...' : 'Eliminar'}
                      </button>
                    )}
                  </>
                ) : (
                  isRRHH && (
                    <button
                      onClick={() => handleRestaurar(item.id, item.nombre_comercial || item.razon_social)}
                      disabled={accionLoading === item.id}
                      className="text-emerald-600 hover:text-emerald-900 font-medium inline-flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      {accionLoading === item.id ? 'Restaurando...' : 'Restaurar'}
                    </button>
                  )
                )}
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
