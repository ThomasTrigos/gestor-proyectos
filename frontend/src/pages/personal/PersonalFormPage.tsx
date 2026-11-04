import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { personalApi } from '../../api/personal';
import { RolPersonal, Personal } from '../../types';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Card from '../../components/ui/Card';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { FormField } from '../../components/forms/FormField';

export default function PersonalFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [tokenConfirmacion, setTokenConfirmacion] = useState<string>('');

  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    cargo: '',
    rol: RolPersonal.EMPLEADO,
    activo: true,
    fecha_ingreso: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (isEditing) {
      const fetchPersonal = async () => {
        try {
          const data = await personalApi.getById(id!);
          setFormData({
            nombre: data.nombre || '',
            apellido: data.apellido || '',
            email: data.email || '',
            telefono: data.telefono || '',
            cargo: data.cargo || '',
            rol: data.rol || RolPersonal.PROGRAMADOR,
            activo: data.activo !== undefined ? data.activo : true,
            fecha_ingreso: data.fecha_ingreso || ''
          });
          if (data.token_confirmacion) {
            setTokenConfirmacion(data.token_confirmacion);
          }
        } catch (error) {
          console.error('Error al cargar datos del personal', error);
          alert('Error al cargar datos del personal');
        } finally {
          setLoading(false);
        }
      };
      fetchPersonal();
    }
  }, [id, isEditing]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const target = e.target as HTMLInputElement;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    setFormData(prev => ({ ...prev, [target.name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEditing) {
        await personalApi.update(id!, formData);
      } else {
        await personalApi.create(formData);
      }
      navigate('/personal');
    } catch (error: any) {
      console.error('Error al guardar personal', error);
      alert('Error al guardar datos. Verifique que el correo electrónico no esté duplicado.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8"><LoadingSpinner /></div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{isEditing ? 'Editar' : 'Nuevo'} Miembro del Personal</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestión de usuarios y profesionales (RRHH, Gerencia y Programadores).
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4 border-b pb-2 text-gray-800">Datos Personales y Laborales</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Nombre">
              <Input
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                placeholder="Nombre de pila"
                required
              />
            </FormField>

            <FormField label="Apellido">
              <Input
                name="apellido"
                value={formData.apellido}
                onChange={handleChange}
                placeholder="Apellido"
                required
              />
            </FormField>

            <FormField label="Email Laboral">
              <Input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="correo@empresa.com"
                required
              />
            </FormField>

            <FormField label="Teléfono">
              <Input
                name="telefono"
                value={formData.telefono}
                onChange={handleChange}
                placeholder="+54 9 11 ..."
              />
            </FormField>

            <FormField label="Cargo / Puesto">
              <Input
                name="cargo"
                value={formData.cargo}
                onChange={handleChange}
                placeholder="Ej: Desarrollador Backend Senior"
                required
              />
            </FormField>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rol en el Sistema <span className="text-red-500">*</span>
              </label>
              <Select
                name="rol"
                value={formData.rol}
                onChange={handleChange}
                options={[
                  { value: RolPersonal.EMPLEADO, label: 'Empleado (Tareas y Proyectos)' },
                  { value: RolPersonal.RRHH, label: 'Recursos Humanos (Gestión total)' },
                  { value: RolPersonal.GERENTE, label: 'Gerente (Tablero de indicadores)' }
                ]}
                required
              />
            </div>

            <FormField label="Fecha de Ingreso">
              <Input
                type="date"
                name="fecha_ingreso"
                value={formData.fecha_ingreso}
                onChange={handleChange}
                required
              />
            </FormField>

            <div className="flex items-center pt-6">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  name="activo"
                  checked={formData.activo}
                  onChange={handleChange}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded mr-2"
                />
                <span className="text-sm font-medium text-gray-700">Personal en activo</span>
              </label>
            </div>
          </div>

          {isEditing && tokenConfirmacion && (
            <div className="mt-6 pt-4 border-t bg-gray-50 p-3 rounded-md">
              <h3 className="text-xs font-semibold uppercase text-gray-500 mb-1">Token de Confirmación (Acceso sin contraseña):</h3>
              <code className="text-xs text-primary-700 break-all select-all font-mono">
                {tokenConfirmacion}
              </code>
              <p className="text-xs text-gray-500 mt-1">
                Este token se utiliza automáticamente en los correos enviados a los programadores para validar sus tareas.
              </p>
            </div>
          )}
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" onClick={() => navigate('/personal')} variant="secondary">
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? 'Guardando...' : (isEditing ? 'Guardar Cambios' : 'Registrar Personal')}
          </Button>
        </div>
      </form>
    </div>
  );
}

