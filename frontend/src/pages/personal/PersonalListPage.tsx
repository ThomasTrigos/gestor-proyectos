import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useApiQuery } from '../../hooks/useApi';
import { Table } from '../../components/ui/Table';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Button } from '../../components/ui/Button';
import { TableSortControl } from '../../components/ui/TableSortControl';
import { useTableSort } from '../../hooks/useTableSort';
import { Personal, RolPersonal, Invitacion } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { getResults, formatDate } from '../../utils/formatters';
import { invitacionesApi } from '../../api/invitaciones';
import { 
  Users, MailPlus, Clock, CheckCircle2, XCircle, RefreshCw, Send, ShieldCheck, 
  AlertCircle, Check, Trash2 
} from 'lucide-react';

export default function PersonalListPage() {
  const { data, isLoading, refetch } = useApiQuery<any>(['personal'], '/personal/');
  const { data: invData, isLoading: invLoading, refetch: refetchInvitaciones } = useApiQuery<any>(['invitaciones'], '/invitaciones/');
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'personal' | 'invitaciones'>('personal');
  const [modalOpen, setModalOpen] = useState(false);
  const [invitando, setInvitando] = useState(false);
  const [accionLoading, setAccionLoading] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [mensajeError, setMensajeError] = useState<string | null>(null);

  const [invitacionForm, setInvitacionForm] = useState({
    nombre: '',
    apellido: '',
    email: '',
    cargo: 'Desarrollador de Software',
    rol: 'EMPLEADO'
  });

  const isRRHH = user?.rol === RolPersonal.RRHH;
  const isGerente = user?.rol === RolPersonal.GERENTE;

  const personalList = getResults<Personal>(data);
  const invitacionesList: Invitacion[] = getResults<Invitacion>(invData);

  const pendientesAprobacion = invitacionesList.filter(i => i.estado === 'REGISTRADO').length;

  const sortExtractors = useMemo(() => ({
    getText: (p: Personal) => `${p.nombre} ${p.apellido}`,
    getEstado: (p: Personal) => (p.activo ? 'ACTIVO' : 'INACTIVO'),
    getUpdatedAt: (p: Personal) => p.updated_at,
    getCreatedAt: (p: Personal) => p.created_at || p.fecha_ingreso
  }), []);

  const { sortedItems: personalFiltrado, sortCriterion, setSortCriterion } = useTableSort<Personal>(
    personalList,
    sortExtractors,
    'alfabetico_asc'
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

  const invSortExtractors = useMemo(() => ({
    getText: (i: Invitacion) => `${i.nombre} ${i.apellido}`,
    getEstado: (i: Invitacion) => i.estado,
    getUpdatedAt: (i: Invitacion) => i.fecha_expiracion,
    getCreatedAt: (i: Invitacion) => (i as any).created_at || i.fecha_expiracion
  }), []);

  const { sortedItems: invitacionesFiltradas, sortCriterion: invSortCriterion, setSortCriterion: setInvSortCriterion } = useTableSort<Invitacion>(
    invitacionesList,
    invSortExtractors,
    'created_at_desc'
  );

  const handleInvHeaderSort = (key: string) => {
    if (key === 'alfabetico') {
      setInvSortCriterion(invSortCriterion === 'alfabetico_asc' ? 'alfabetico_desc' : 'alfabetico_asc');
    } else if (key === 'estado') {
      setInvSortCriterion(invSortCriterion === 'estado_asc' ? 'estado_desc' : 'estado_asc');
    } else if (key === 'created_at') {
      setInvSortCriterion(invSortCriterion === 'created_at_desc' ? 'created_at_asc' : 'created_at_desc');
    }
  };

  const getInvSortHeaderState = (key: string) => {
    if (key === 'alfabetico' && invSortCriterion.startsWith('alfabetico')) {
      return { key, dir: invSortCriterion.endsWith('asc') ? ('asc' as const) : ('desc' as const) };
    }
    if (key === 'estado' && invSortCriterion.startsWith('estado')) {
      return { key, dir: invSortCriterion.endsWith('asc') ? ('asc' as const) : ('desc' as const) };
    }
    if (key === 'created_at' && invSortCriterion.startsWith('created_at')) {
      return { key, dir: invSortCriterion.endsWith('asc') ? ('asc' as const) : ('desc' as const) };
    }
    return { key: undefined, dir: undefined };
  };

  const currentInvSortHeader = getInvSortHeaderState(
    invSortCriterion.startsWith('alfabetico') ? 'alfabetico' :
    invSortCriterion.startsWith('estado') ? 'estado' :
    invSortCriterion.startsWith('created_at') ? 'created_at' : ''
  );

  const handleCrearInvitacion = async (e: React.FormEvent) => {
    e.preventDefault();
    setInvitando(true);
    setMensajeExito(null);
    setMensajeError(null);

    try {
      await invitacionesApi.crear(invitacionForm);
      setMensajeExito(`¡Invitación enviada formalmente a ${invitacionForm.email}! El enlace tiene una vigencia de 48 horas.`);
      setModalOpen(false);
      setInvitacionForm({
        nombre: '',
        apellido: '',
        email: '',
        cargo: 'Desarrollador de Software',
        rol: 'EMPLEADO'
      });
      refetchInvitaciones();
    } catch (err: any) {
      setMensajeError(err.response?.data?.email?.[0] || err.response?.data?.error || err.message || 'Error al emitir la invitación.');
    } finally {
      setInvitando(false);
    }
  };

  const handleAprobar = async (id: string, nombre: string) => {
    if (!confirm(`¿Confirmas la aprobación formal de ${nombre}? Su cuenta quedará habilitada para iniciar sesión.`)) return;
    setAccionLoading(id);
    setMensajeExito(null);
    setMensajeError(null);

    try {
      const res = await invitacionesApi.aprobar(id);
      setMensajeExito(res.mensaje);
      refetchInvitaciones();
      refetch();
    } catch (err: any) {
      setMensajeError(err.response?.data?.error || 'Error al aprobar la cuenta.');
    } finally {
      setAccionLoading(null);
    }
  };

  const handleReenviar = async (id: string, email: string) => {
    setAccionLoading(id);
    setMensajeExito(null);
    setMensajeError(null);

    try {
      const res = await invitacionesApi.reenviar(id);
      setMensajeExito(res.mensaje);
      refetchInvitaciones();
    } catch (err: any) {
      setMensajeError(err.response?.data?.error || 'Error al reenviar la invitación.');
    } finally {
      setAccionLoading(null);
    }
  };

  const handleRevocar = async (id: string) => {
    if (!confirm('¿Deseas revocar esta invitación? El enlace dejará de ser utilizable.')) return;
    setAccionLoading(id);
    setMensajeExito(null);
    setMensajeError(null);

    try {
      const res = await invitacionesApi.revocar(id);
      setMensajeExito(res.mensaje);
      refetchInvitaciones();
    } catch (err: any) {
      setMensajeError(err.response?.data?.error || 'Error al revocar la invitación.');
    } finally {
      setAccionLoading(null);
    }
  };

  if (isLoading && invLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-7 h-7 text-indigo-600" />
            Gestión de Personal e Invitaciones
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Administra los miembros de la empresa, roles de acceso y el ciclo de invitaciones temporales con vencimiento.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {(isRRHH || isGerente) && (
            <button
              onClick={() => setModalOpen(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-sm shadow-sm transition flex items-center gap-2"
            >
              <MailPlus className="w-4 h-4" />
              <span>Invitar Miembro por Email</span>
            </button>
          )}
          {isRRHH && (
            <Link to="/personal/nuevo">
              <Button className="text-sm">Registro Directo</Button>
            </Link>
          )}
        </div>
      </div>

      {/* Alertas */}
      {mensajeExito && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-start gap-3 text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
          <span>{mensajeExito}</span>
        </div>
      )}

      {mensajeError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl flex items-start gap-3 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 mt-0.5 shrink-0" />
          <span>{mensajeError}</span>
        </div>
      )}

      {/* Selector de Pestañas */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('personal')}
            className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'personal'
                ? 'border-indigo-600 text-indigo-600 font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Personal Activo ({personalList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('invitaciones')}
            className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'invitaciones'
                ? 'border-indigo-600 text-indigo-600 font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Invitaciones ({invitacionesList.length})</span>
            {pendientesAprobacion > 0 && (
              <span className="px-2 py-0.5 text-xs font-bold bg-amber-100 text-amber-800 rounded-full animate-pulse">
                {pendientesAprobacion} por aprobar
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* Pestaña: Personal Activo */}
      {activeTab === 'personal' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <TableSortControl
              value={sortCriterion}
              onChange={setSortCriterion}
              hasEstado={true}
              labelAlphabetical="Nombre y Apellido"
              labelEstado="Estado (Activo / Inactivo)"
            />
          </div>
          {personalFiltrado.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-500">
              No hay miembros de personal registrados en el sistema.
            </div>
          ) : (
            <Table
              headers={[
                { label: 'Nombre y Apellido', sortKey: 'alfabetico' },
                'Email',
                'Cargo',
                'Rol en Sistema',
                { label: 'Estado', sortKey: 'estado' },
                'Acciones'
              ]}
              currentSortKey={currentSortHeader.key}
              sortDirection={currentSortHeader.dir}
              onSort={handleHeaderSort}
            >
              {personalFiltrado.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                    {item.nombre} {item.apellido}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">
                    {item.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {item.cargo || 'Sin especificar'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      item.rol === 'GERENTE'
                        ? 'bg-purple-100 text-purple-800 border border-purple-200'
                        : item.rol === 'RRHH'
                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}>
                      {item.rol === 'EMPLEADO' ? 'Empleado' : item.rol}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {item.activo ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Activo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-500 font-medium">
                        <XCircle className="w-3.5 h-3.5" /> Inactivo
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {isRRHH && (
                      <Link to={`/personal/${item.id}/editar`} className="text-indigo-600 hover:text-indigo-900 font-medium text-xs">
                        Editar
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </div>
      )}

      {/* Pestaña: Invitaciones Emitidas */}
      {activeTab === 'invitaciones' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <TableSortControl
              value={invSortCriterion}
              onChange={setInvSortCriterion}
              hasEstado={true}
              labelAlphabetical="Destinatario"
              labelEstado="Estado de Invitación"
            />
          </div>
          {invitacionesFiltradas.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-500">
              No hay invitaciones enviadas. Puedes invitar a nuevos empleados usando el botón superior.
            </div>
          ) : (
            <Table
              headers={[
                { label: 'Destinatario', sortKey: 'alfabetico' },
                'Cargo & Rol',
                { label: 'Emisión & Vencimiento', sortKey: 'created_at' },
                { label: 'Estado', sortKey: 'estado' },
                'Acciones'
              ]}
              currentSortKey={currentInvSortHeader.key}
              sortDirection={currentInvSortHeader.dir}
              onSort={handleInvHeaderSort}
            >
              {invitacionesFiltradas.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="font-medium text-gray-900">{inv.nombre} {inv.apellido}</div>
                    <div className="text-xs text-gray-500 font-mono">{inv.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="text-gray-800">{inv.cargo}</div>
                    <span className="text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 font-medium">
                      {inv.rol === 'EMPLEADO' ? 'Empleado' : inv.rol}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-600">
                    <div>Expira: {new Date(inv.fecha_expiracion).toLocaleString()}</div>
                    {!inv.esta_expirada && inv.estado === 'PENDIENTE' && (
                      <span className="text-amber-700 font-medium flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" /> Quedan {inv.horas_restantes} hs
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {inv.estado === 'APROBADO' && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1 w-max">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Aprobado y Activo
                      </span>
                    )}
                    {inv.estado === 'REGISTRADO' && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1 w-max animate-pulse">
                        <Clock className="w-3.5 h-3.5" /> Esperando Aprobación RRHH
                      </span>
                    )}
                    {inv.estado === 'PENDIENTE' && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1 w-max">
                        <Send className="w-3 h-3" /> Pendiente de Registro
                      </span>
                    )}
                    {inv.estado === 'EXPIRADA' && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-300 flex items-center gap-1 w-max">
                        <Clock className="w-3 h-3" /> Expirada (48h superadas)
                      </span>
                    )}
                    {inv.estado === 'REVOCADA' && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1 w-max">
                        <XCircle className="w-3.5 h-3.5" /> Revocada
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                      {/* Botón de Aprobación por RRHH / Gerente */}
                      {inv.estado === 'REGISTRADO' && (
                        <button
                          onClick={() => handleAprobar(inv.id, `${inv.nombre} ${inv.apellido}`)}
                          disabled={accionLoading === inv.id}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-sm"
                          title="Aprobar usuario y habilitar inicio de sesión"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Aprobar Usuario</span>
                        </button>
                      )}

                      {/* Botón Reenviar */}
                      {(inv.estado === 'PENDIENTE' || inv.estado === 'EXPIRADA') && (
                        <button
                          onClick={() => handleReenviar(inv.id, inv.email)}
                          disabled={accionLoading === inv.id}
                          className="px-2.5 py-1 bg-gray-100 hover:bg-indigo-50 text-indigo-700 rounded-lg text-xs font-medium border border-gray-300 hover:border-indigo-300 transition flex items-center gap-1"
                          title="Reenviar correo y renovar plazo por 48 horas"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Reenviar</span>
                        </button>
                      )}

                      {/* Botón Revocar */}
                      {inv.estado !== 'APROBADO' && inv.estado !== 'REVOCADA' && (
                        <button
                          onClick={() => handleRevocar(inv.id)}
                          disabled={accionLoading === inv.id}
                          className="p-1 text-gray-400 hover:text-rose-600 transition"
                          title="Revocar invitación"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </div>
      )}

      {/* Modal para Emitir Invitación Formal por Correo */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 animate-fade-in space-y-5">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <MailPlus className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Invitar Nuevo Miembro por Email</h3>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-600">
              Se enviará un correo electrónico formal con un enlace de activación seguro de un solo uso que expirará en <strong>48 horas</strong>.
            </p>

            <form onSubmit={handleCrearInvitacion} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Nombre</label>
                  <input
                    type="text"
                    required
                    value={invitacionForm.nombre}
                    onChange={(e) => setInvitacionForm({ ...invitacionForm, nombre: e.target.value })}
                    placeholder="Ej: Lucía"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Apellido</label>
                  <input
                    type="text"
                    required
                    value={invitacionForm.apellido}
                    onChange={(e) => setInvitacionForm({ ...invitacionForm, apellido: e.target.value })}
                    placeholder="Ej: Gómez"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Correo Electrónico Destino</label>
                <input
                  type="email"
                  required
                  value={invitacionForm.email}
                  onChange={(e) => setInvitacionForm({ ...invitacionForm, email: e.target.value })}
                  placeholder="lucia.gomez@empresa.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Cargo / Puesto</label>
                  <input
                    type="text"
                    required
                    value={invitacionForm.cargo}
                    onChange={(e) => setInvitacionForm({ ...invitacionForm, cargo: e.target.value })}
                    placeholder="Ej: Frontend Developer"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Rol a Asignar</label>
                  <select
                    value={invitacionForm.rol}
                    onChange={(e) => setInvitacionForm({ ...invitacionForm, rol: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="EMPLEADO">Empleado</option>
                    {isGerente && (
                      <>
                        <option value="RRHH">Recursos Humanos</option>
                        <option value="GERENTE">Gerente</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-lg text-xs leading-relaxed">
                ⏳ <strong>Plazo de 48 horas</strong>: El destinatario tendrá dos días para configurar su contraseña. Al registrarse, quedará a la espera de que Recursos Humanos apruebe su cuenta.
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={invitando}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
                >
                  {invitando ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Despachando...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Emitir y Enviar Invitación</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
