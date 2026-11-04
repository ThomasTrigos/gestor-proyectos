import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { reunionesApi } from '../../api/reuniones';
import { proyectosApi } from '../../api/proyectos';
import { personalApi } from '../../api/personal';
import {
  Proyecto, Personal, TipoReunion,
  TIPO_REUNION_LABELS
} from '../../types';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import TextArea from '../../components/ui/TextArea';
import Select from '../../components/ui/Select';
import Card from '../../components/ui/Card';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { FormField } from '../../components/forms/FormField';
import { Sparkles, Upload, FileText, Bot } from 'lucide-react';
import { DiagnosticoReunion } from '../../types';
import { DiagnosticoReunionModal } from '../../components/reuniones/DiagnosticoReunionModal';


interface ParticipanteExtForm {
  nombre: string;
  email: string;
  cargo: string;
  detalles: string;
}

export default function ReunionFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [personalList, setPersonalList] = useState<Personal[]>([]);

  const [formData, setFormData] = useState({
    proyecto: '',
    titulo: '',
    tipo_reunion: TipoReunion.VIRTUAL,
    descripcion: '',
    fecha_hora_inicio: '',
    fecha_hora_fin: '',
    ubicacion: '',
    acta: '',
    resultado: '' as string,
    compromisos: '' as string,
    participantes_internos_ids: [] as string[],
    participantes_externos_datos: [] as ParticipanteExtForm[]
  });

  // Estados para análisis de IA de transcripciones
  const [archivoTranscripcion, setArchivoTranscripcion] = useState<File | null>(null);
  const [analizandoIA, setAnalizandoIA] = useState(false);
  const [proveedorIA, setProveedorIA] = useState<string>('AUTO');
  const [diagnosticoModalOpen, setDiagnosticoModalOpen] = useState(false);
  const [diagnosticoData, setDiagnosticoData] = useState<DiagnosticoReunion | null>(null);

  const handleAnalizarConIA = async () => {
    if (!archivoTranscripcion && !formData.acta.trim()) {
      alert('Por favor cargue un archivo de transcripción (.pdf, .docx, .txt) o escriba el texto en el acta para analizar con IA.');
      return;
    }
    try {
      setAnalizandoIA(true);
      const res = await reunionesApi.analizarTranscripcion(archivoTranscripcion, formData.acta, proveedorIA);
      if (res && res.diagnostico) {
        setDiagnosticoData(res.diagnostico);
        setDiagnosticoModalOpen(true);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al analizar la transcripción con IA.');
    } finally {
      setAnalizandoIA(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const [proyRes, persRes] = await Promise.all([
          proyectosApi.getAll(),
          personalApi.getAll()
        ]);
        setProyectos(proyRes);
        setPersonalList(persRes);

        if (isEditing) {
          const r = await reunionesApi.getById(id!);
          const intIds = r.participantes_internos?.map(pi => pi.personal_id || (pi.personal as any)?.id || pi.personal) || [];
          const extList = r.participantes_externos?.map(pe => ({
            nombre: pe.nombre,
            email: pe.email || '',
            cargo: pe.cargo || '',
            detalles: pe.detalles || '',
          })) || [];

          setFormData({
            proyecto: r.proyecto_id || (r.proyecto as any) || '',
            titulo: r.titulo || '',
            tipo_reunion: r.tipo_reunion || TipoReunion.VIRTUAL,
            descripcion: r.descripcion || '',
            fecha_hora_inicio: r.fecha_hora_inicio ? r.fecha_hora_inicio.slice(0, 16) : '',
            fecha_hora_fin: r.fecha_hora_fin ? r.fecha_hora_fin.slice(0, 16) : '',
            ubicacion: r.ubicacion || '',
            acta: r.acta || '',
            resultado: r.resultado || '',
            compromisos: r.compromisos || '',
            participantes_internos_ids: intIds as string[],
            participantes_externos_datos: extList
          });
        }
      } catch (error) {
        console.error('Error al cargar reunión', error);
        alert('Error al cargar datos');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id, isEditing]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleInternoToggle = (pid: string) => {
    setFormData(prev => {
      const exists = prev.participantes_internos_ids.includes(pid);
      const newIds = exists
        ? prev.participantes_internos_ids.filter(id => id !== pid)
        : [...prev.participantes_internos_ids, pid];
      return { ...prev, participantes_internos_ids: newIds };
    });
  };

  const addParticipanteExterno = () => {
    setFormData(prev => ({
      ...prev,
      participantes_externos_datos: [
        ...prev.participantes_externos_datos,
        { nombre: '', email: '', cargo: '', detalles: '' }
      ]
    }));
  };

  const updateParticipanteExterno = (index: number, field: keyof ParticipanteExtForm, value: string) => {
    setFormData(prev => {
      const newList = [...prev.participantes_externos_datos];
      newList[index] = { ...newList[index], [field]: value };
      return { ...prev, participantes_externos_datos: newList };
    });
  };

  const removeParticipanteExterno = (index: number) => {
    setFormData(prev => {
      const newList = [...prev.participantes_externos_datos];
      newList.splice(index, 1);
      return { ...prev, participantes_externos_datos: newList };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fecha_hora_inicio) {
      alert('Complete el campo obligatorio: Fecha/Hora de Inicio.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        proyecto: formData.proyecto || null,
        fecha_hora_fin: formData.fecha_hora_fin || null,
      };

      if (isEditing) {
        await reunionesApi.update(id!, payload as any);
      } else {
        await reunionesApi.create(payload as any);
      }
      navigate('/reuniones');
    } catch (error: any) {
      console.error('Error al guardar reunión', error);
      const serverErr = error?.response?.data;
      let errorMsg = 'Error al guardar la reunión.';
      if (serverErr) {
        if (typeof serverErr === 'string') errorMsg = serverErr;
        else if (serverErr.detail) errorMsg = serverErr.detail;
        else if (typeof serverErr === 'object') {
          errorMsg = Object.entries(serverErr)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : JSON.stringify(v)}`)
            .join('\n');
        }
      }
      alert(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8"><LoadingSpinner /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{isEditing ? 'Editar' : 'Agendar'} Reunión</h1>
        <p className="text-sm text-gray-500 mt-1">
          Coordinación con clientes y equipo con generación automática de evento iCalendar (.ics) y envío de invitaciones por email.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4 border-b pb-2 text-gray-800">Datos Principales</h2>
          <div className="space-y-4">
            <FormField label="Título o Motivo de la Reunión">
              <Input
                name="titulo"
                value={formData.titulo}
                onChange={handleChange}
                placeholder="Ej: Kickoff de Proyecto / Revisión de Sprint / Demo"
                required
              />
            </FormField>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Proyecto (Opcional)
                </label>
                <Select
                  name="proyecto"
                  value={formData.proyecto}
                  onChange={handleChange}
                  options={[
                    { value: '', label: 'Sin asignar a ningún proyecto (Reunión general)' },
                    ...proyectos.map(p => ({ value: p.id, label: p.nombre }))
                  ]}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Modalidad / Tipo de Reunión
                </label>
                <Select
                  name="tipo_reunion"
                  value={formData.tipo_reunion}
                  onChange={handleChange}
                  options={Object.entries(TIPO_REUNION_LABELS).map(([k, v]) => ({ value: k, label: v }))}
                  required
                />
              </div>

              <FormField label="Fecha y Hora de Inicio" required>
                <Input
                  type="datetime-local"
                  name="fecha_hora_inicio"
                  value={formData.fecha_hora_inicio}
                  onChange={handleChange}
                  required
                />
              </FormField>
            </div>

            <FormField label="Ubicación o Enlace de Videollamada">
              <Input
                name="ubicacion"
                value={formData.ubicacion}
                onChange={handleChange}
                placeholder="Ej: Google Meet / Zoom link o Sala de Reuniones 2"
              />
            </FormField>

            <FormField label="Agenda / Descripción Previa">
              <TextArea
                name="descripcion"
                value={formData.descripcion}
                onChange={handleChange}
                placeholder="Puntos a tratar, temas a discutir, documentación de soporte..."
                rows={3}
              />
            </FormField>
          </div>
        </Card>

        {/* Participantes de Nuestra Empresa */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-2 text-gray-800">Participantes de Nuestra Empresa</h2>
          <p className="text-sm text-gray-500 mb-4">
            Seleccione quiénes deben participar internamente (recibirán invitación con .ics):
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto p-2 border rounded-lg bg-gray-50">
            {personalList.map(p => {
              const isSelected = formData.participantes_internos_ids.includes(p.id);
              return (
                <label
                  key={p.id}
                  className={`flex items-center p-2.5 border rounded cursor-pointer transition-colors bg-white ${
                    isSelected ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleInternoToggle(p.id)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded mr-3"
                  />
                  <div className="text-sm">
                    <div className="font-medium text-gray-900">{p.nombre} {p.apellido}</div>
                    <div className="text-xs text-gray-500">{p.cargo} • {p.email}</div>
                  </div>
                </label>
              );
            })}
          </div>
        </Card>

        {/* Participantes de la Otra Empresa (Cliente / Externos) */}
        {(() => {
          const proySel = proyectos.find(p => p.id === formData.proyecto);
          const empProy = proySel ? (proySel.empresa_nombre_comercial || proySel.empresa_razon_social || '') : '';
          return (
            <Card className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <h2 className="text-lg font-semibold text-gray-800">Participantes Externos (Cliente / Terceros)</h2>
                {empProy && (
                  <span className="inline-flex items-center text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-1 rounded-full font-medium">
                    Empresa del proyecto: <strong className="ml-1">{empProy}</strong>
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Registre los asistentes externos. La empresa representada se asocia automáticamente a la empresa del proyecto ({empProy || 'indique el proyecto arriba'}).
              </p>

              <div className="space-y-3">
                {formData.participantes_externos_datos.length > 0 ? (
                  formData.participantes_externos_datos.map((ext, idx) => (
                    <div key={idx} className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                      <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                        <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                          Participante #{idx + 1}
                        </span>
                        <Button
                          type="button"
                          variant="danger"
                          onClick={() => removeParticipanteExterno(idx)}
                          className="px-2.5 py-1 text-xs"
                        >
                          ✕ Eliminar
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Nombre Completo <span className="text-red-500">*</span>
                          </label>
                          <Input
                            value={ext.nombre}
                            onChange={(e: any) => updateParticipanteExterno(idx, 'nombre', e.target.value)}
                            placeholder="Nombre del contacto"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Cargo
                          </label>
                          <Input
                            value={ext.cargo}
                            onChange={(e: any) => updateParticipanteExterno(idx, 'cargo', e.target.value)}
                            placeholder="Ej: Gerente de Sistemas / PO"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Email (Para invitación)
                          </label>
                          <Input
                            type="email"
                            value={ext.email}
                            onChange={(e: any) => updateParticipanteExterno(idx, 'email', e.target.value)}
                            placeholder="contacto@cliente.com"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Detalles
                        </label>
                        <Input
                          value={ext.detalles}
                          onChange={(e: any) => updateParticipanteExterno(idx, 'detalles', e.target.value)}
                          placeholder="Notas adicionales, disponibilidad, observaciones..."
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 italic text-center py-4 bg-gray-50 rounded-lg border">
                    No hay participantes externos agregados.
                  </p>
                )}
              </div>

              {/* Botón "+ Añadir Participante Externo" ubicado abajo de la cápsula */}
              <div className="mt-4 pt-3 border-t border-gray-200 flex justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={addParticipanteExterno}
                  className="text-sm shadow-sm"
                >
                  + Añadir Participante Externo
                </Button>
              </div>
            </Card>
          );
        })()}

        {/* Evaluación Manual del Resultado de la Reunión (Sin requerir IA) */}
        <Card className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">
                ¿Cómo fue la reunión? (Evaluación del Resultado)
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Indique manualmente el clima y resultado sin necesidad de usar IA, o permítale a la IA sugerirlo más abajo.
              </p>
            </div>
            {formData.resultado && (
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, resultado: '' }))}
                className="text-xs text-gray-500 hover:text-gray-700 cursor-pointer"
              >
                ✕ Desmarcar
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                id: 'EXCELENTE',
                label: 'Muy Fructífera',
                sub: 'Acuerdos rápidos y cliente muy conforme',
                color: 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-200 shadow-xs font-bold',
                idle: 'border-gray-200 hover:border-emerald-300 text-gray-700 bg-white',
                dot: 'bg-emerald-500'
              },
              {
                id: 'BUENA',
                label: 'Constructiva',
                sub: 'Desarrollo normal y colaborativo',
                color: 'border-blue-500 bg-blue-50 text-blue-900 ring-2 ring-blue-200 shadow-xs font-bold',
                idle: 'border-gray-200 hover:border-blue-300 text-gray-700 bg-white',
                dot: 'bg-blue-500'
              },
              {
                id: 'FRICCION',
                label: 'Con Fricción',
                sub: 'Dudas, bloqueos o demoras en acuerdos',
                color: 'border-amber-500 bg-amber-50 text-amber-900 ring-2 ring-amber-200 shadow-xs font-bold',
                idle: 'border-gray-200 hover:border-amber-300 text-gray-700 bg-white',
                dot: 'bg-amber-500'
              },
              {
                id: 'CRITICA',
                label: 'Tensa / En Conflicto',
                sub: 'Desacuerdo grave, reclamo o sobrecosto',
                color: 'border-rose-500 bg-rose-50 text-rose-900 ring-2 ring-rose-200 shadow-xs font-bold',
                idle: 'border-gray-200 hover:border-rose-300 text-gray-700 bg-white',
                dot: 'bg-rose-500'
              },
            ].map(item => {
              const selected = formData.resultado === item.id;
              return (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setFormData(prev => ({ ...prev, resultado: selected ? '' : item.id }))}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    selected ? item.color : item.idle
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-2.5 h-2.5 rounded-full ${item.dot}`}></span>
                    <span className="text-xs">{item.label}</span>
                  </div>
                  <span className="text-[11px] opacity-80 leading-tight">{item.sub}</span>
                </button>
              );
            })}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Compromisos y acuerdos clave alcanzados (Opcional)
            </label>
            <TextArea
              name="compromisos"
              value={formData.compromisos}
              onChange={handleChange}
              placeholder="Ej: Entregar reporte antes del viernes 18:00hs. El cliente confirma validación el lunes..."
              rows={2}
            />
          </div>
        </Card>

        {/* Acta de la Reunión (Post-reunión) & Análisis con IA */}
        <Card className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <span>Acta de Reunión y Transcripción</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700">
                  ✨ Con IA
                </span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Registre las conclusiones o suba una transcripción (.pdf, .docx, .txt) para diagnosticar cómo fue la reunión.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={proveedorIA}
                onChange={(e) => setProveedorIA(e.target.value)}
                className="px-2.5 py-2 text-xs border border-indigo-200 rounded-xl bg-white text-indigo-950 font-semibold focus:ring-2 focus:ring-indigo-500 shadow-2xs cursor-pointer"
                title="Selecciona la IA que procesará la reunión"
              >
                <option value="AUTO">✨ Auto (Predeterminado)</option>
                <option value="GEMINI">Google Gemini</option>
                <option value="GROK">xAI Grok</option>
                <option value="CLAUDE">Anthropic Claude</option>
                <option value="OPENAI">OpenAI (GPT)</option>
                <option value="LOCAL">Motor Local (Offline)</option>
              </select>

              <button
                type="button"
                onClick={handleAnalizarConIA}
                disabled={analizandoIA}
                className="px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5 shrink-0 disabled:opacity-50 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-indigo-200" />
                <span>{analizandoIA ? 'Analizando con IA...' : 'Analizar: ¿Cómo fue?'}</span>
              </button>
            </div>
          </div>

          {/* Subida de archivo de transcripción opcional */}
          <div className="flex items-center gap-3 p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl">
            <Upload className="w-4 h-4 text-indigo-600 shrink-0" />
            <div className="flex-1 text-xs">
              <span className="font-semibold text-indigo-950">
                {archivoTranscripcion ? archivoTranscripcion.name : 'Subir archivo de transcripción o minuta externa:'}
              </span>
              <span className="text-gray-500 ml-1 text-[11px]">(PDF, Word o TXT)</span>
            </div>
            <label className="px-3 py-1 bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 rounded-lg text-xs font-semibold cursor-pointer shadow-2xs transition-colors">
              <input
                type="file"
                accept=".pdf,.docx,.txt"
                className="hidden"
                onChange={(e) => setArchivoTranscripcion(e.target.files?.[0] || null)}
              />
              {archivoTranscripcion ? 'Cambiar archivo' : 'Elegir archivo'}
            </label>
            {archivoTranscripcion && (
              <button
                type="button"
                onClick={() => setArchivoTranscripcion(null)}
                className="text-xs text-red-500 hover:text-red-700"
              >
                ✕
              </button>
            )}
          </div>

          <TextArea
            name="acta"
            value={formData.acta}
            onChange={handleChange}
            placeholder="Escriba aquí los temas tratados, compromisos tomados, acuerdos comerciales o técnicos... (o pegue aquí la transcripción completa de la llamada)"
            rows={6}
          />
        </Card>

        {/* Modal de Diagnóstico de Reunión con IA */}
        <DiagnosticoReunionModal
          isOpen={diagnosticoModalOpen}
          onClose={() => setDiagnosticoModalOpen(false)}
          diagnostico={diagnosticoData}
          tituloReunion={formData.titulo || 'Reunión'}
          onAplicarResumen={(resumen) => {
            setFormData(prev => ({
              ...prev,
              acta: resumen,
              resultado: diagnosticoData?.calificacion || prev.resultado,
              compromisos: diagnosticoData?.compromisos?.join('\n') || prev.compromisos
            }));
          }}
        />

        <div className="flex justify-end gap-4">
          <Button type="button" onClick={() => navigate('/reuniones')} variant="secondary">
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? 'Guardando...' : (isEditing ? 'Guardar Cambios' : 'Agendar Reunión y Notificar')}
          </Button>
        </div>
      </form>
    </div>
  );
}

