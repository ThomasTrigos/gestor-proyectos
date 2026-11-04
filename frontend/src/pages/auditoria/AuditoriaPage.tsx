import React, { useState, useEffect } from 'react';
import { getAuditoria, RegistroAuditoria, AuditoriaQueryParams, PaginatedAuditoria } from '../../api/auditoria';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Select from '../../components/ui/Select';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const TABLAS_OPCIONES = [
  { value: '', label: 'Todas las tablas' },
  { value: 'empresas_empresa', label: 'Empresa' },
  { value: 'proyectos_proyecto', label: 'Proyecto' },
  { value: 'tareas_tarea', label: 'Tarea' },
  { value: 'personal_personal', label: 'Personal' },
  { value: 'reuniones_reunion', label: 'Reunión' },
  { value: 'financiacion_financiacion', label: 'Financiación' },
  { value: 'financiacion_cuotapago', label: 'Cuotas de Pago' },
];

const TABLA_LABELS: Record<string, string> = {
  empresas_empresa: 'Empresa',
  empresas_contactoempresa: 'Contacto Empresa',
  proyectos_proyecto: 'Proyecto',
  proyectos_proyectoequipo: 'Equipo de Proyecto',
  proyectos_estadoproyecto: 'Historial Estados',
  tareas_tarea: 'Tarea',
  tareas_columnakanban: 'Columna Kanban',
  personal_personal: 'Personal',
  reuniones_reunion: 'Reunión',
  reuniones_reunionparticipanteinterno: 'Participante Interno',
  financiacion_financiacion: 'Financiación',
  financiacion_cuotapago: 'Cuota de Pago',
};


const ACCION_OPCIONES = [
  { value: '', label: 'Todas las acciones' },
  { value: 'CREAR', label: 'Crear' },
  { value: 'MODIFICAR', label: 'Modificar' },
  { value: 'ELIMINAR', label: 'Eliminar' },
];

const AuditoriaPage: React.FC = () => {
  const [data, setData] = useState<PaginatedAuditoria | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const [filters, setFilters] = useState<AuditoriaQueryParams>({
    page: 1,
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getAuditoria(filters);
      setData(res);
      setError(null);
    } catch (err: any) {
      // Reemplazo amigable de errores técnicos (como 404 o 500)
      if (err?.response?.status === 404 || err?.message?.includes('404')) {
        setError('El servicio de auditoría se encuentra inicializando su historial o aún no se han registrado eventos para su perfil.');
      } else {
        setError(err?.response?.data?.detail || err?.response?.data?.error || 'No se pudieron sincronizar los registros de auditoría en este momento.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters.page]);

  const handleFilterChange = (key: keyof AuditoriaQueryParams, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const handleSearch = () => {
    fetchData();
  };

  const formatCampos = (campos: any) => {
    if (!campos) return '-';
    try {
      const parsed = typeof campos === 'string' ? JSON.parse(campos) : campos;
      return Object.entries(parsed).map(([k, v]) => (
        <div key={k} className="text-xs py-0.5">
          <strong className="text-gray-700">{k}:</strong> {typeof v === 'object' ? JSON.stringify(v) : String(v)}
        </div>
      ));
    } catch {
      return String(campos);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Registro de Auditoría</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Historial de trazabilidad y cambios en empresas, proyectos, tareas y personal del sistema.
          </p>
        </div>
        <Button onClick={fetchData} variant="secondary" size="sm">
          Actualizar Historial
        </Button>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tabla</label>
            <Select 
              value={filters.tabla || ''} 
              onChange={(e) => handleFilterChange('tabla', e.target.value)}
              options={TABLAS_OPCIONES}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Acción</label>
            <Select 
              value={filters.accion || ''} 
              onChange={(e) => handleFilterChange('accion', e.target.value)}
              options={ACCION_OPCIONES}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ID Registro</label>
            <Input 
              value={filters.registro_id || ''} 
              onChange={(e) => handleFilterChange('registro_id', e.target.value)}
              placeholder="Buscar por ID..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Desde</label>
            <Input 
              type="date"
              value={filters.fecha_desde || ''} 
              onChange={(e) => handleFilterChange('fecha_desde', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Hasta</label>
            <Input 
              type="date"
              value={filters.fecha_hasta || ''} 
              onChange={(e) => handleFilterChange('fecha_hasta', e.target.value)}
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={handleSearch} variant="primary">Filtrar</Button>
        </div>
      </Card>

      {error && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-sm flex items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
            <span>{error}</span>
          </div>
          <Button onClick={fetchData} variant="secondary" size="sm" className="shrink-0 text-xs">
            Reintentar
          </Button>
        </div>
      )}

      <Card>
        {loading ? (
          <div className="flex justify-center p-8"><LoadingSpinner /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuario</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tabla</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acción</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Campos Afectados</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data?.results?.map((registro) => (
                  <tr key={registro.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {registro.fecha_hora || (registro as any).fecha
                        ? new Date(registro.fecha_hora || (registro as any).fecha).toLocaleString('es-AR')
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {registro.usuario_nombre || (typeof registro.usuario_id === 'string' ? registro.usuario_id : 'Sistema')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">
                      {TABLA_LABELS[registro.tabla_afectada || (registro as any).tabla] || registro.tabla_afectada || (registro as any).tabla || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge 
                        variant={
                          registro.accion === 'CREAR' ? 'success' : 
                          registro.accion === 'MODIFICAR' ? 'info' : 'danger'
                        }
                      >
                        {registro.accion}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs overflow-hidden">
                      {formatCampos(registro.campos_modificados)}
                    </td>
                  </tr>
                ))}
                {(!data?.results || data.results.length === 0) && (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                      No se encontraron registros de auditoría.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Paginación simple */}
        <div className="flex justify-between items-center p-4 border-t border-gray-200">
          <Button 
            disabled={!data?.previous}
            onClick={() => setFilters(prev => ({ ...prev, page: (prev.page || 1) - 1 }))}
            variant="secondary"
          >
            Anterior
          </Button>
          <span className="text-sm text-gray-600">Página {filters.page}</span>
          <Button 
            disabled={!data?.next}
            onClick={() => setFilters(prev => ({ ...prev, page: (prev.page || 1) + 1 }))}
            variant="secondary"
          >
            Siguiente
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default AuditoriaPage;
