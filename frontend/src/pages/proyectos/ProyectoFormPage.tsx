import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { proyectosApi } from '../../api/proyectos';
import { empresasApi } from '../../api/empresas';
import { personalApi } from '../../api/personal';
import { Empresa, Personal, TipoServicio, TIPO_SERVICIO_LABELS } from '../../types';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import TextArea from '../../components/ui/TextArea';
import Select from '../../components/ui/Select';
import Card from '../../components/ui/Card';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { FormField } from '../../components/forms/FormField';
import { Crown } from 'lucide-react';

export default function ProyectoFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [personalList, setPersonalList] = useState<Personal[]>([]);

  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    empresa: '',
    tipo_servicio: [] as TipoServicio[],
    tipo_servicio_otro: '',
    lider_proyecto: '',
    fecha_inicio_estimada: '',
    fecha_fin_estimada: '',
    notas: '',
    equipo_ids: [] as string[],
    notificar_equipo: true
  });

  useEffect(() => {
    const loadDependencies = async () => {
      try {
        const [empRes, persRes] = await Promise.all([
          empresasApi.getAll(),
          personalApi.getAll()
        ]);
        setEmpresas(empRes);
        setPersonalList(persRes);

        if (isEditing) {
          const proj = await proyectosApi.getById(id!);
          const assignedIds = proj.equipo_asignaciones?.map(e => (typeof e.personal === 'object' ? (e.personal as any)?.id : (e.personal_id || e.personal))) || [];
          const liderId = proj.lider_proyecto_id || (typeof proj.lider_proyecto === 'object' ? (proj.lider_proyecto as any)?.id : (proj.lider_proyecto as any)) || '';
          if (liderId && !assignedIds.includes(liderId)) {
            assignedIds.push(liderId);
          }
          setFormData({
            nombre: proj.nombre || '',
            descripcion: proj.descripcion || '',
            empresa: proj.empresa_id || (proj.empresa as any) || '',
            tipo_servicio: proj.tipo_servicio || [],
            tipo_servicio_otro: proj.tipo_servicio_otro || '',
            lider_proyecto: liderId,
            fecha_inicio_estimada: proj.fecha_inicio_estimada || '',
            fecha_fin_estimada: proj.fecha_fin_estimada || '',
            notas: proj.notas || '',
            equipo_ids: assignedIds,
            notificar_equipo: false
          });
        }
      } catch (error) {
        console.error('Error cargando datos del proyecto', error);
        alert('Error al cargar datos');
      } finally {
        setLoading(false);
      }
    };
    loadDependencies();
  }, [id, isEditing]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'lider_proyecto') {
      setFormData(prev => {
        let newEquipo = [...prev.equipo_ids];
        if (value && !newEquipo.includes(value)) {
          newEquipo.push(value);
        }
        return {
          ...prev,
          lider_proyecto: value,
          equipo_ids: newEquipo
        };
      });
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleTipoServicioToggle = (tipo: TipoServicio) => {
    setFormData(prev => {
      const exists = prev.tipo_servicio.includes(tipo);
      const newServicios = exists
        ? prev.tipo_servicio.filter(t => t !== tipo)
        : [...prev.tipo_servicio, tipo];
      return { ...prev, tipo_servicio: newServicios };
    });
  };

  const handleEquipoToggle = (personalId: string) => {
    if (personalId === formData.lider_proyecto && formData.equipo_ids.includes(personalId)) {
      alert('Este profesional está asignado como Líder del Proyecto y debe formar parte del equipo. Si desea retirarlo, cambie primero el Líder del Proyecto.');
      return;
    }
    setFormData(prev => {
      const exists = prev.equipo_ids.includes(personalId);
      const newEquipo = exists
        ? prev.equipo_ids.filter(p => p !== personalId)
        : [...prev.equipo_ids, personalId];
      return { ...prev, equipo_ids: newEquipo };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.empresa) {
      alert('Debe seleccionar la empresa cliente');
      return;
    }
    if (formData.tipo_servicio.length === 0) {
      alert('Debe seleccionar al menos un tipo de servicio');
      return;
    }
    if (formData.tipo_servicio.includes(TipoServicio.OTRO) && !formData.tipo_servicio_otro.trim()) {
      alert('Ha seleccionado el tipo de servicio "Otro". Por favor, explique en el campo correspondiente a qué servicio se refiere.');
      return;
    }
    if (formData.fecha_inicio_estimada && formData.fecha_fin_estimada) {
      if (formData.fecha_inicio_estimada > formData.fecha_fin_estimada) {
        alert('La fecha de inicio estimada no puede ser posterior a la fecha de finalización estimada.');
        return;
      }
    }

    setSaving(true);
    try {
      const payload: any = {
        nombre: formData.nombre,
        descripcion: formData.descripcion,
        empresa: formData.empresa,
        tipo_servicio: formData.tipo_servicio,
        tipo_servicio_otro: formData.tipo_servicio.includes(TipoServicio.OTRO) ? formData.tipo_servicio_otro.trim() : null,
        lider_proyecto: formData.lider_proyecto || null,
        fecha_inicio_estimada: formData.fecha_inicio_estimada || null,
        fecha_fin_estimada: formData.fecha_fin_estimada || null,
        notas: formData.notas,
        equipo_ids: formData.equipo_ids,
        notificar_equipo: formData.notificar_equipo
      };

      if (isEditing) {
        await proyectosApi.update(id!, payload);
      } else {
        await proyectosApi.create(payload);
      }
      navigate('/proyectos');
    } catch (error: any) {
      console.error('Error al guardar proyecto', error);
      const serverErr = error?.response?.data;
      let errorMsg = 'Ocurrió un error al guardar el proyecto.';
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{isEditing ? 'Editar' : 'Nuevo'} Proyecto</h1>
          <p className="text-sm text-gray-500 mt-1">
            {isEditing ? 'Actualice la información del proyecto' : 'Cargue los datos iniciales. El proyecto iniciará automáticamente en estado "Oportunidad".'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Datos Básicos */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4 border-b pb-2 text-gray-800">Información General</h2>
          <div className="space-y-4">
            <FormField label="Nombre del Proyecto">
              <Input
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                placeholder="Ej: Desarrollo Portal Corporativo e-Commerce"
                required
              />
            </FormField>

            <FormField label="Descripción del Alcance">
              <TextArea
                name="descripcion"
                value={formData.descripcion}
                onChange={handleChange}
                placeholder="Detalle los objetivos y alcance del producto de software a construir..."
                rows={4}
                required
              />
            </FormField>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Empresa Cliente <span className="text-red-500">*</span>
                </label>
                <Select
                  name="empresa"
                  value={formData.empresa}
                  onChange={handleChange}
                  options={[
                    { value: '', label: 'Seleccione una empresa cliente...' },
                    ...empresas.map(emp => ({
                      value: emp.id,
                      label: `${emp.razon_social} (${emp.nombre_comercial})`
                    }))
                  ]}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Líder o Jefe de Proyecto (Opcional)
                </label>
                <Select
                  name="lider_proyecto"
                  value={formData.lider_proyecto}
                  onChange={handleChange}
                  options={[
                    { value: '', label: 'Sin líder asignado' },
                    ...personalList.map(p => ({
                      value: p.id,
                      label: `${p.nombre} ${p.apellido} (${p.rol} - ${p.cargo})`
                    }))
                  ]}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Tipo de Servicio */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-2 text-gray-800">Tipo de Servicio</h2>
          <p className="text-sm text-gray-500 mb-4">
            Seleccione una o más modalidades aplicables a este proyecto:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {(Object.keys(TIPO_SERVICIO_LABELS) as TipoServicio[]).map(tipo => {
              const isSelected = formData.tipo_servicio.includes(tipo);
              return (
                <label
                  key={tipo}
                  className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                    isSelected ? 'bg-primary-50 border-primary-500 text-primary-900 font-semibold' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleTipoServicioToggle(tipo)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded mr-3"
                  />
                  <span className="text-sm font-medium">{TIPO_SERVICIO_LABELS[tipo]}</span>
                </label>
              );
            })}
          </div>

          {formData.tipo_servicio.includes(TipoServicio.OTRO) && (
            <div className="mt-4 p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2 animate-fade-in">
              <label className="block text-sm font-semibold text-amber-900">
                Especifique el Tipo de Servicio ("Otro") <span className="text-red-500">*</span>
              </label>
              <Input
                name="tipo_servicio_otro"
                value={formData.tipo_servicio_otro}
                onChange={handleChange}
                placeholder="Explique cuál es el servicio personalizado o modalidad (ej: Auditoría Forense, Migración Cloud)..."
                required
              />
              <p className="text-xs text-amber-700">
                Indique claramente el alcance o definición de este servicio personalizado para que conste en el proyecto.
              </p>
            </div>
          )}
        </Card>

        {/* Equipo de Programadores Asignado */}
        <Card className="p-6">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-semibold text-gray-800">Equipo Encargado</h2>
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">
              {formData.equipo_ids.length} miembro(s) seleccionado(s)
            </span>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Asigne los programadores y profesionales que conformarán el equipo del proyecto:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto p-2 border rounded-lg bg-gray-50 mb-4">
            {personalList.length > 0 ? (
              personalList.map(p => {
                const isLeader = p.id === formData.lider_proyecto;
                const isSelected = formData.equipo_ids.includes(p.id) || isLeader;
                return (
                  <label
                    key={p.id}
                    className={`flex items-center p-3 rounded-lg cursor-pointer transition-all ${
                      isLeader
                        ? 'border-2 border-indigo-600 ring-2 ring-indigo-200 bg-indigo-50/90 shadow-sm'
                        : isSelected
                        ? 'border-2 border-primary-500 bg-primary-50/40 shadow-xs'
                        : 'border border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleEquipoToggle(p.id)}
                      disabled={isLeader}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mr-3 cursor-pointer"
                    />
                    <div className="text-sm flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`font-semibold ${isLeader ? 'text-indigo-950 font-bold' : 'text-gray-900'}`}>
                          {p.nombre} {p.apellido}
                        </span>
                        {isLeader && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-600 text-white shadow-xs">
                            <Crown className="w-3 h-3 text-amber-300" /> Líder
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 truncate">{p.cargo} • <span className="uppercase">{p.rol}</span></div>
                    </div>
                  </label>
                );
              })
            ) : (
              <div className="col-span-2 text-center py-4 text-sm text-gray-500">
                No hay personal registrado en el sistema.
              </div>
            )}
          </div>

          <div className="flex items-center mt-2">
            <input
              type="checkbox"
              id="notificar_equipo"
              checked={formData.notificar_equipo}
              onChange={(e) => setFormData(prev => ({ ...prev, notificar_equipo: e.target.checked }))}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded mr-2"
            />
            <label htmlFor="notificar_equipo" className="text-sm text-gray-700">
              Enviar email de aviso a los miembros asignados al proyecto
            </label>
          </div>
        </Card>

        {/* Fechas Estimadas y Notas */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4 border-b pb-2 text-gray-800">Planificación y Observaciones</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Fecha Inicio Estimada">
              <Input
                type="date"
                name="fecha_inicio_estimada"
                value={formData.fecha_inicio_estimada}
                onChange={handleChange}
              />
            </FormField>

            <FormField label="Fecha Fin Estimada">
              <Input
                type="date"
                name="fecha_fin_estimada"
                min={formData.fecha_inicio_estimada || undefined}
                value={formData.fecha_fin_estimada}
                onChange={handleChange}
              />
            </FormField>
          </div>

          <div className="mt-4">
            <FormField label="Notas u Observaciones">
              <TextArea
                name="notas"
                value={formData.notas}
                onChange={handleChange}
                placeholder="Notas internas, condiciones preliminares, acuerdos especiales..."
                rows={3}
              />
            </FormField>
          </div>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" onClick={() => navigate('/proyectos')} variant="secondary">
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? 'Guardando...' : (isEditing ? 'Guardar Cambios' : 'Crear Proyecto')}
          </Button>
        </div>
      </form>
    </div>
  );
}

