import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useApiQuery } from '../../hooks/useApi';
import client from '../../api/client';
import { reunionesApi } from '../../api/reuniones';
import { Table } from '../../components/ui/Table';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Button } from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Input from '../../components/ui/Input';
import { TableSortControl } from '../../components/ui/TableSortControl';
import { useTableSort } from '../../hooks/useTableSort';
import { Reunion, RolPersonal, TipoReunion } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { getResults, formatDateTime, formatDate } from '../../utils/formatters';
import { Calendar, Trash2, RotateCcw, AlertCircle, CheckCircle2, Video, Phone, Users, MapPin, Sparkles } from 'lucide-react';
import { HealthScorePromptModal } from '../../components/healthScore/HealthScorePromptModal';
import { SnapshotFormModal } from '../../components/healthScore/SnapshotFormModal';
import { DiagnosticoReunionModal } from '../../components/reuniones/DiagnosticoReunionModal';
import { DiagnosticoReunion } from '../../types';



const TIPO_REUNION_LABELS: Record<string, string> = {
  PRESENCIAL: 'Presencial',
  VIRTUAL: 'Virtual',
  TELEFONICA: 'Telefónica',
  OTRA: 'Otra'
};

const TIPO_REUNION_COLORS: Record<string, string> = {
  PRESENCIAL: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  VIRTUAL: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  TELEFONICA: 'bg-amber-50 text-amber-700 border-amber-200',
  OTRA: 'bg-gray-50 text-gray-700 border-gray-200'
};

export default function ReunionesListPage() {
  const [tabActiva, setTabActiva] = useState<'activas' | 'papelera'>('activas');
  const [accionLoading, setAccionLoading] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const endpoint = tabActiva === 'papelera' ? '/reuniones/?papelera=true' : '/reuniones/';
  const { data, isLoading, refetch } = useApiQuery<any>(['reuniones', tabActiva], endpoint);
  const { user } = useAuth();
  const isRRHH = user?.rol === RolPersonal.RRHH;
  const isManagerOrHR = isRRHH || user?.rol === RolPersonal.GERENTE;

  // Estados para modal reactivo de salud al terminar reunión
  const [promptSaludOpen, setPromptSaludOpen] = useState(false);
  const [reunionProyecto, setReunionProyecto] = useState<{ id: string; nombre: string; titulo: string } | null>(null);
  const [snapshotModalOpen, setSnapshotModalOpen] = useState(false);

  // Estados para diagnóstico IA de actas existentes
  const [diagnosticoModalOpen, setDiagnosticoModalOpen] = useState(false);
  const [diagnosticoData, setDiagnosticoData] = useState<DiagnosticoReunion | null>(null);
  const [diagnosticoTitulo, setDiagnosticoTitulo] = useState<string>('');

  const handleVerDiagnosticoActa = async (id: string, titulo: string) => {
    try {
      setAccionLoading(id);
      const res = await reunionesApi.analizarActa(id);
      if (res && res.diagnostico) {
        setDiagnosticoData(res.diagnostico);
        setDiagnosticoTitulo(titulo);
        setDiagnosticoModalOpen(true);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'No se pudo analizar el acta de la reunión.');
    } finally {
      setAccionLoading(null);
    }
  };

  const handleToggleCompletar = async (id: string) => {
    const rPrevia = rawReuniones.find(r => r.id === id);
    try {
      setAccionLoading(id);
      await reunionesApi.completar(id);
      refetch();

      // Si la reunión no estaba completada y pertenece a un proyecto, sugerir actualización de salud
      if (rPrevia && !(rPrevia as any).completada && rPrevia.proyecto) {
        const projId = typeof rPrevia.proyecto === 'object' ? (rPrevia.proyecto as any).id : rPrevia.proyecto;
        const projNombre = (rPrevia as any).proyecto_nombre || 'Proyecto';
        setReunionProyecto({ id: projId, nombre: projNombre, titulo: rPrevia.titulo });
        setPromptSaludOpen(true);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'No se pudo actualizar el estado de la reunión');
    } finally {
      setAccionLoading(null);
    }
  };

  const rawReuniones = getResults<Reunion>(data);

  const reunionesFiltradas = useMemo(() => {
    return rawReuniones.filter((r: Reunion) => {
      const matchTitulo = r.titulo.toLowerCase().includes(searchTerm.toLowerCase());
      const matchProyecto = (r as any).proyecto_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
      const matchUbicacion = r.ubicacion?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
      return matchTitulo || matchProyecto || matchUbicacion;
    });
  }, [rawReuniones, searchTerm]);

  const sortExtractors = useMemo(() => ({
    getText: (r: Reunion) => r.titulo,
    getEstado: (r: Reunion) => r.tipo_reunion,
    getUpdatedAt: (r: Reunion) => r.updated_at,
    getCreatedAt: (r: Reunion) => r.fecha_hora_inicio || r.created_at
  }), []);

  const { sortedItems: reuniones, sortCriterion, setSortCriterion } = useTableSort<Reunion>(
    reunionesFiltradas,
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

  const handleMoverAPapelera = async (id: string, titulo: string) => {
    if (!window.confirm(`¿Seguro que deseas enviar la reunión "${titulo}" a la papelera? Quedará oculta en el sistema.`)) {
      return;
    }
    try {
      setAccionLoading(id);
      setMensaje(null);
      await client.delete(`/reuniones/${id}/`);
      setMensaje({ tipo: 'exito', texto: `Reunión "${titulo}" enviada a la papelera.` });
      refetch();
    } catch (err: any) {
      setMensaje({ tipo: 'error', texto: err.response?.data?.error || 'No se pudo mover a la papelera.' });
    } finally {
      setAccionLoading(null);
    }
  };

  const handleRestaurar = async (id: string, titulo: string) => {
    try {
      setAccionLoading(id);
      setMensaje(null);
      await client.post(`/reuniones/${id}/restaurar/`);
      setMensaje({ tipo: 'exito', texto: `Reunión "${titulo}" restaurada exitosamente.` });
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
          <h1 className="text-2xl font-bold text-gray-900">Reuniones y Minutas</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Planificación de encuentros de trabajo, sincronizaciones con clientes y seguimiento de actas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/calendario">
            <Button variant="secondary" className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-primary-600" />
              <span>Ver Calendario</span>
            </Button>
          </Link>
          {isManagerOrHR && (
            <Link to={`/reuniones/nueva`}>
              <Button variant="primary">+ Nueva Reunión</Button>
            </Link>
          )}
        </div>
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

      {/* Pestañas Activas vs Papelera */}
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
            <Calendar className="w-4 h-4" />
            <span>Reuniones Activas</span>
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
          hasEstado={true}
          labelAlphabetical="Título de Reunión"
          labelEstado="Tipo de Reunión"
          labelDate="Fecha y hora de reunión"
          dateDescText="Más reciente"
          dateAscText="Más antigua"
        />
      </div>

      {/* Búsqueda */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <Input
          placeholder="Buscar por título, proyecto o ubicación..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      
      {isLoading ? (
        <LoadingSpinner />
      ) : reuniones.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500 border">
          {tabActiva === 'papelera'
            ? 'La papelera de reuniones se encuentra vacía.'
            : 'No hay reuniones registradas con los criterios seleccionados.'}
        </div>
      ) : (
        <Table
          headers={[
            { label: 'Título', sortKey: 'alfabetico' },
            'Proyecto',
            { label: 'Tipo', sortKey: 'estado' },
            { label: 'Fecha y Hora Inicio', sortKey: 'created_at' },
            'Fin / Duración',
            'Estado',
            'Acciones'
          ]}
          currentSortKey={currentSortHeader.key}
          sortDirection={currentSortHeader.dir}
          onSort={handleHeaderSort}
        >
          {reuniones.map((item) => (
            <tr key={item.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="font-semibold text-gray-900">{item.titulo}</div>
                {tabActiva === 'papelera' && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-rose-100 text-rose-800 mt-1">
                    En papelera
                  </span>
                )}
                {item.ubicacion && (
                  <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-gray-400" />
                    {item.ubicacion}
                  </div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                {(item as any).proyecto_nombre || (
                  <span className="text-gray-400 italic font-normal">Sin proyecto (General)</span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${TIPO_REUNION_COLORS[item.tipo_reunion] || TIPO_REUNION_COLORS.OTRA}`}>
                  {TIPO_REUNION_LABELS[item.tipo_reunion] || item.tipo_reunion}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                {formatDateTime(item.fecha_hora_inicio)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {item.fecha_hora_fin ? formatDateTime(item.fecha_hora_fin) : 'No definida'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                <div className="flex flex-col gap-1 items-start">
                  <Badge variant={item.completada ? 'success' : 'warning'}>
                    {item.completada ? 'Realizada' : 'Pendiente'}
                  </Badge>
                  {item.resultado && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        item.resultado === 'EXCELENTE'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : item.resultado === 'BUENA'
                          ? 'bg-blue-50 text-blue-800 border-blue-200'
                          : item.resultado === 'FRICCION'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-rose-50 text-rose-800 border-rose-200'
                      }`}
                    >
                      {item.resultado === 'EXCELENTE'
                        ? '🟢 Fructífera'
                        : item.resultado === 'BUENA'
                        ? '🔵 Constructiva'
                        : item.resultado === 'FRICCION'
                        ? '🟡 Con Fricción'
                        : '🔴 Tensa'}
                    </span>
                  )}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div className="flex items-center gap-2">
                  {tabActiva === 'activas' ? (
                    <>
                      <button
                        onClick={() => handleToggleCompletar(item.id)}
                        disabled={accionLoading === item.id}
                        className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded border transition cursor-pointer ${
                          item.completada
                            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-300'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-300'
                        }`}
                        title={item.completada ? 'Marcar como pendiente' : 'Marcar como realizada'}
                      >
                        {item.completada ? '↩ Reabrir' : '✓ Realizada'}
                      </button>
                      {isManagerOrHR ? (
                        <Link to={`/reuniones/${item.id}/editar`} className="text-primary-600 hover:text-primary-900 font-medium text-xs">
                          Editar
                        </Link>
                      ) : (
                        <Link to="/calendario" className="text-primary-600 hover:text-primary-900 font-medium text-xs">
                          Ver Calendario
                        </Link>
                      )}
                      {item.acta && (
                        <button
                          type="button"
                          onClick={() => handleVerDiagnosticoActa(item.id, item.titulo)}
                          disabled={accionLoading === item.id}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition cursor-pointer"
                          title="Analizar acta y dinámica con IA"
                        >
                          <Sparkles className="w-3 h-3 text-indigo-500" />
                          <span>Diagnóstico IA</span>
                        </button>
                      )}
                      {isManagerOrHR && (
                        <button
                          onClick={() => handleMoverAPapelera(item.id, item.titulo)}
                          disabled={accionLoading === item.id}
                          className="text-rose-600 hover:text-rose-900 font-medium text-xs ml-1 cursor-pointer"
                          title="Mover a papelera de reciclaje"
                        >
                          {accionLoading === item.id ? 'Moviendo...' : 'Eliminar'}
                        </button>
                      )}
                    </>
                  ) : (
                    isRRHH && (
                      <button
                        onClick={() => handleRestaurar(item.id, item.titulo)}
                        disabled={accionLoading === item.id}
                        className="text-emerald-600 hover:text-emerald-900 font-medium inline-flex items-center gap-1.5 text-xs cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        {accionLoading === item.id ? 'Restaurando...' : 'Restaurar'}
                      </button>
                    )
                  )}
                </div>
              </td>
            </tr>
          ))}
        </Table>
      )}

      {/* Modal Reactivo de Salud al Terminar Reunión */}
      {reunionProyecto && (
        <HealthScorePromptModal
          isOpen={promptSaludOpen}
          onClose={() => {
            setPromptSaludOpen(false);
            setReunionProyecto(null);
          }}
          onConfirm={() => {
            setPromptSaludOpen(false);
            setSnapshotModalOpen(true);
          }}
          proyectoNombre={reunionProyecto.nombre}
          motivo="REUNION_COMPLETADA"
          detalle={`Se finalizó la reunión "${reunionProyecto.titulo}". Puedes registrar o procesar el acta de la misma.`}
        />
      )}

      {/* Modal de Carga de Snapshot */}
      {reunionProyecto && (
        <SnapshotFormModal
          isOpen={snapshotModalOpen}
          onClose={() => {
            setSnapshotModalOpen(false);
            setReunionProyecto(null);
          }}
          proyectoId={reunionProyecto.id}
          proyectoNombre={reunionProyecto.nombre}
          onSuccess={() => {
            setSnapshotModalOpen(false);
            setReunionProyecto(null);
            refetch();
          }}
        />
      )}

      {/* Modal de Diagnóstico IA de Acta de Reunión */}
      <DiagnosticoReunionModal
        isOpen={diagnosticoModalOpen}
        onClose={() => {
          setDiagnosticoModalOpen(false);
          setDiagnosticoData(null);
        }}
        diagnostico={diagnosticoData}
        tituloReunion={diagnosticoTitulo}
      />
    </div>
  );
}
