import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { tareasApi } from '../../api/tareas';
import { proyectosApi } from '../../api/proyectos';
import { personalApi } from '../../api/personal';
import {
  Proyecto, Personal, PrioridadTarea, EstadoTarea,
  PRIORIDAD_LABELS, ESTADO_TAREA_LABELS
} from '../../types';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import TextArea from '../../components/ui/TextArea';
import Select from '../../components/ui/Select';
import Card from '../../components/ui/Card';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { FormField } from '../../components/forms/FormField';

export default function TareaFormPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isEditing = !!id;
  const initialProyecto = searchParams.get('proyecto') || '';

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [personalList, setPersonalList] = useState<Personal[]>([]);

  const [formData, setFormData] = useState({
    proyecto: initialProyecto,
    titulo: '',
    descripcion: '',
    asignado_a: '',
    prioridad: PrioridadTarea.MEDIA,
    estado: EstadoTarea.PENDIENTE,
    estado_proyecto: 'TRABAJANDO',
    fecha_inicio: '',
    fecha_limite: '',
    notas: ''
  });

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
          const tarea: any = await tareasApi.getById(id!);
          const proyId = typeof tarea.proyecto === 'object' ? tarea.proyecto?.id : (tarea.proyecto || tarea.proyecto_id || '');
          const asigId = typeof tarea.asignado_a === 'object' ? tarea.asignado_a?.id : (tarea.asignado_a || tarea.asignado_a_id || '');
          setFormData({
            proyecto: proyId,
            titulo: tarea.titulo || '',
            descripcion: tarea.descripcion || '',
            asignado_a: asigId,
            prioridad: tarea.prioridad || PrioridadTarea.MEDIA,
            estado: tarea.estado || EstadoTarea.PENDIENTE,
            estado_proyecto: tarea.estado_proyecto || 'TRABAJANDO',
            fecha_inicio: tarea.fecha_inicio ? String(tarea.fecha_inicio).split('T')[0] : '',
            fecha_limite: tarea.fecha_limite ? String(tarea.fecha_limite).split('T')[0] : '',
            notas: tarea.notas || ''
          });
        }
      } catch (error) {
        console.error('Error al cargar datos de tarea', error);
        alert('Error al cargar datos de la tarea');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id, isEditing]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'proyecto') {
      const proy = proyectos.find(p => p.id === value);
      const estProy = proy?.estado_actual?.estado || 'TRABAJANDO';
      setFormData(prev => ({
        ...prev,
        proyecto: value,
        estado_proyecto: prev.estado_proyecto === 'TRABAJANDO' || !prev.estado_proyecto ? estProy : prev.estado_proyecto
      }));
      return;
    }
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.proyecto || !formData.asignado_a) {
      alert('Debe seleccionar el proyecto y el programador asignado');
      return;
    }

    if (formData.fecha_inicio && formData.fecha_limite && formData.fecha_inicio > formData.fecha_limite) {
      alert('La Fecha de Inicio no puede ser posterior a la Fecha Límite de entrega.');
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        proyecto: formData.proyecto,
        titulo: formData.titulo,
        descripcion: formData.descripcion,
        asignado_a: formData.asignado_a,
        prioridad: formData.prioridad,
        estado: formData.estado,
        estado_proyecto: formData.estado_proyecto,
        fecha_inicio: formData.fecha_inicio || null,
        fecha_limite: formData.fecha_limite,
        notas: formData.notas
      };

      if (isEditing) {
        await tareasApi.update(id!, payload);
      } else {
        await tareasApi.create(payload);
      }
      navigate('/tareas');
    } catch (error: any) {
      console.error('Error al guardar tarea', error);
      let errorMsg = 'Error al guardar la tarea.';
      if (error?.response?.data) {
        if (typeof error.response.data === 'string') {
          errorMsg = error.response.data;
        } else if (typeof error.response.data === 'object') {
          errorMsg = Object.entries(error.response.data)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
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
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{isEditing ? 'Editar' : 'Nueva'} Tarea</h1>
          <p className="text-sm text-gray-500 mt-1">
            Asignación y seguimiento de entregables para programadores con notificación automática por email.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4 border-b pb-2 text-gray-800">Detalle de la Tarea</h2>
          <div className="space-y-4">
            <FormField label="Título de la Tarea">
              <Input
                name="titulo"
                value={formData.titulo}
                onChange={handleChange}
                placeholder="Ej: Implementar endpoints de autenticación JWT y login"
                required
              />
            </FormField>

            <FormField label="Descripción de la Tarea">
              <TextArea
                name="descripcion"
                value={formData.descripcion}
                onChange={handleChange}
                placeholder="Especifique requerimientos, criterios de aceptación, endpoints o dependencias..."
                rows={4}
                required
              />
            </FormField>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Proyecto Relacionado <span className="text-red-500">*</span>
                </label>
                <Select
                  name="proyecto"
                  value={formData.proyecto}
                  onChange={handleChange}
                  options={[
                    { value: '', label: 'Seleccione un proyecto...' },
                    ...proyectos.map(p => ({ value: p.id, label: p.nombre }))
                  ]}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Programador / Profesional Asignado <span className="text-red-500">*</span>
                </label>
                <Select
                  name="asignado_a"
                  value={formData.asignado_a}
                  onChange={handleChange}
                  options={[
                    { value: '', label: 'Seleccione el profesional...' },
                    ...personalList.map(p => ({
                      value: p.id,
                      label: `${p.nombre} ${p.apellido} (${p.cargo} - ${p.rol})`
                    }))
                  ]}
                  required
                />
                {(() => {
                  const proySeleccionado = proyectos.find(p => p.id === formData.proyecto);
                  const equipoIds = proySeleccionado?.equipo_asignaciones?.map((e: any) => e.personal_id || e.personal?.id || e.personal) || [];
                  const esMiembro = !formData.asignado_a || !formData.proyecto || equipoIds.includes(formData.asignado_a);
                  return !esMiembro ? (
                    <p className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 p-2 rounded-md mt-2 flex items-center gap-1.5">
                      <span>ℹ️</span>
                      <span>
                        Este profesional no pertenece al equipo actual del proyecto. Se agregará automáticamente al <strong>Equipo Encargado</strong>.
                      </span>
                    </p>
                  ) : null;
                })()}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prioridad
                </label>
                <Select
                  name="prioridad"
                  value={formData.prioridad}
                  onChange={handleChange}
                  options={Object.entries(PRIORIDAD_LABELS).map(([k, v]) => ({ value: k, label: v }))}
                  required
                />
              </div>

              {isEditing && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estado de la Tarea
                  </label>
                  <Select
                    name="estado"
                    value={formData.estado}
                    onChange={handleChange}
                    options={Object.entries(ESTADO_TAREA_LABELS).map(([k, v]) => ({ value: k, label: v }))}
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Etapa de Proyecto Asociada
                </label>
                <Select
                  name="estado_proyecto"
                  value={formData.estado_proyecto}
                  onChange={handleChange}
                  options={[
                    { value: 'OPORTUNIDAD', label: 'Oportunidad (Etapa Inicial / Relevamiento)' },
                    { value: 'TRABAJANDO', label: 'Trabajando (Ejecución Oficial)' },
                    { value: 'PAUSADO', label: 'Pausado' },
                    { value: 'SEGUIMIENTO', label: 'Seguimiento (Soporte / Post-entrega)' },
                    { value: 'CONCRETADO', label: 'Concretado' },
                    { value: 'CAIDO', label: 'Caído' },
                  ]}
                  required
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  En el Predictor de Salud (PHS), completar tareas de etapa inicial aporta hasta un 10% del total.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de Inicio <span className="text-xs text-gray-400 font-normal">(Opcional / A futuro)</span>
                </label>
                <Input
                  type="date"
                  name="fecha_inicio"
                  value={formData.fecha_inicio}
                  onChange={handleChange}
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  Permite definir cuándo comenzará la tarea si está planificada a futuro.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha Límite de Entrega <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  name="fecha_limite"
                  value={formData.fecha_limite}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="mt-4">
              <FormField label="Notas Adicionales">
                <TextArea
                  name="notas"
                  value={formData.notas}
                  onChange={handleChange}
                  placeholder="Instrucciones complementarias, links a repositorios o documentación..."
                  rows={2}
                />
              </FormField>
            </div>
          </div>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" onClick={() => navigate('/tareas')} variant="secondary">
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? 'Guardando...' : (isEditing ? 'Guardar Cambios' : 'Crear y Asignar Tarea')}
          </Button>
        </div>
      </form>
    </div>
  );
}

