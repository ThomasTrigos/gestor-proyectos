import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import client from '../../api/client';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { CheckCircle2, Clock, AlertCircle, PlayCircle, FileText } from 'lucide-react';

interface TareaDetalle {
  id: string;
  titulo: string;
  descripcion: string;
  prioridad: string;
  estado: string;
  fecha_inicio?: string | null;
  fecha_limite: string;
  fecha_leido?: string | null;
  fecha_inicio_trabajo?: string | null;
  fecha_completada?: string | null;
  proyecto_nombre?: string;
}

export default function TareaConfirmacionPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [tarea, setTarea] = useState<TareaDetalle | null>(null);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !token) {
      setError('Enlace incompleto: Se requiere el identificador de la tarea y el token de confirmación.');
      setCargando(false);
      return;
    }

    const cargarTarea = async () => {
      try {
        setCargando(true);
        setError(null);
        const res = await client.get(`/tareas/confirmar/${id}/detalle/?token=${token}`);
        setTarea(res.data);
      } catch (err: any) {
        const msg = err.response?.data?.error || 'No se pudo cargar la tarea o el enlace ha expirado.';
        setError(msg);
      } finally {
        setCargando(false);
      }
    };

    cargarTarea();
  }, [id, token]);

  const ejecutarAccion = async (accion: 'LEER' | 'INICIAR' | 'COMPLETAR') => {
    if (!id || !token) return;
    try {
      setProcesando(true);
      setError(null);
      setMensajeExito(null);

      const res = await client.post(`/tareas/confirmar/${id}/confirmar/?token=${token}`, { accion });
      
      const resDetalle = await client.get(`/tareas/confirmar/${id}/detalle/?token=${token}`);
      setTarea(resDetalle.data);

      if (accion === 'LEER') setMensajeExito('✓ Lectura confirmada exitosamente.');
      if (accion === 'INICIAR') setMensajeExito('✓ Tarea puesta en progreso.');
      if (accion === 'COMPLETAR') setMensajeExito('✓ ¡Tarea marcada como completada con éxito!');
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Ocurrió un error al procesar la acción.';
      setError(msg);
    } finally {
      setProcesando(false);
    }
  };

  if (cargando) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-sm text-slate-500">Cargando detalles de la tarea...</p>
        </div>
      </div>
    );
  }

  if (error && !tarea) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-sm border border-rose-100 text-center">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Enlace no disponible</h2>
          <p className="text-sm text-slate-600 mb-6">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 flex justify-center">
      <div className="max-w-2xl w-full bg-white p-8 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Tarea Asignada</span>
            <h1 className="text-2xl font-bold text-slate-900 mt-1">{tarea?.titulo}</h1>
          </div>
          <Badge variant={tarea?.estado === 'COMPLETADA' ? 'success' : tarea?.estado === 'EN_PROGRESO' ? 'info' : 'warning'}>
            {tarea?.estado?.replace('_', ' ')}
          </Badge>
        </div>

        {mensajeExito && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{mensajeExito}</span>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-4 my-6 py-2">
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Descripción</h3>
            <p className="mt-1 text-slate-700 whitespace-pre-wrap text-sm bg-slate-50 p-4 rounded-lg border border-slate-100">
              {tarea?.descripcion || 'Sin descripción detallada.'}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
            <div>
              <span className="text-xs font-medium text-slate-400">Prioridad</span>
              <p className="text-sm font-semibold text-slate-800">{tarea?.prioridad}</p>
            </div>
            {tarea?.fecha_inicio && (
              <div>
                <span className="text-xs font-medium text-slate-400">Fecha de Inicio</span>
                <p className="text-sm font-semibold text-sky-800">{tarea.fecha_inicio}</p>
              </div>
            )}
            <div>
              <span className="text-xs font-medium text-slate-400">Fecha Límite</span>
              <p className="text-sm font-semibold text-slate-800">{tarea?.fecha_limite}</p>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-3 justify-end">
          {!tarea?.fecha_leido && tarea?.estado !== 'COMPLETADA' && (
            <Button
              onClick={() => ejecutarAccion('LEER')}
              disabled={procesando}
              className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Confirmar Lectura
            </Button>
          )}

          {tarea?.estado === 'PENDIENTE' && (
            <Button
              onClick={() => ejecutarAccion('INICIAR')}
              disabled={procesando}
              className="bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-2"
            >
              <PlayCircle className="w-4 h-4" />
              Iniciar Trabajo
            </Button>
          )}

          {tarea?.estado !== 'COMPLETADA' && (
            <Button
              onClick={() => ejecutarAccion('COMPLETAR')}
              disabled={procesando}
              className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Marcar como Completada
            </Button>
          )}

          {tarea?.estado === 'COMPLETADA' && (
            <div className="w-full text-center py-2 text-emerald-600 font-medium text-sm flex items-center justify-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Esta tarea ya se encuentra completada.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
