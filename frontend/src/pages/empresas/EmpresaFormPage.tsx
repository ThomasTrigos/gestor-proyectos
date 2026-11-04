import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { empresasApi } from '../../api/empresas';
import { ContactoEmpresa, Empresa } from '../../types';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';
import TextArea from '../../components/ui/TextArea';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { FormField } from '../../components/forms/FormField';

export default function EmpresaFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState<Partial<Empresa>>({
    razon_social: '',
    nombre_comercial: '',
    cuit: '',
    direccion: '',
    telefono: '',
    email: '',
    sitio_web: '',
    notas: '',
    contactos: []
  });

  useEffect(() => {
    if (isEditing) {
      const fetchEmpresa = async () => {
        try {
          const emp = await empresasApi.getById(id!);
          setFormData(emp);
        } catch (error) {
          console.error('Error al cargar empresa', error);
          alert('Error al cargar empresa');
        } finally {
          setLoading(false);
        }
      };
      fetchEmpresa();
    } else {
      // Initialize with one contact
      setFormData(prev => ({
        ...prev,
        contactos: [{ nombre: '', cargo: '', telefono: '', email: '', es_principal: true }]
      }));
    }
  }, [id, isEditing]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleContactoChange = (index: number, field: keyof ContactoEmpresa, value: any) => {
    setFormData(prev => {
      const newContactos = [...(prev.contactos || [])];
      
      // Si se marca como principal, desmarcar los demás
      if (field === 'es_principal' && value === true) {
        newContactos.forEach(c => c.es_principal = false);
      }
      
      newContactos[index] = { ...newContactos[index], [field]: value };
      return { ...prev, contactos: newContactos };
    });
  };

  const addContacto = () => {
    setFormData(prev => ({
      ...prev,
      contactos: [...(prev.contactos || []), { nombre: '', cargo: '', telefono: '', email: '', es_principal: false }]
    }));
  };

  const removeContacto = (index: number) => {
    setFormData(prev => {
      const newContactos = [...(prev.contactos || [])];
      newContactos.splice(index, 1);
      
      // If we removed the principal, make the first one principal if exists
      if (newContactos.length > 0 && !newContactos.some(c => c.es_principal)) {
        newContactos[0].es_principal = true;
      }
      
      return { ...prev, contactos: newContactos };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.contactos || formData.contactos.length === 0) {
      alert('Debe agregar al menos 1 contacto');
      return;
    }

    setSaving(true);
    try {
      if (isEditing) {
        await empresasApi.update(id!, formData);
      } else {
        await empresasApi.create(formData);
      }
      navigate('/empresas');
    } catch (error: any) {
      console.error('Error saving empresa', error);
      const serverErr = error?.response?.data;
      let errorMsg = 'Error al guardar la empresa.';
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
        <h1 className="text-2xl font-bold text-gray-900">{isEditing ? 'Editar' : 'Nueva'} Empresa</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 border-b pb-2">Datos Principales</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Razón Social">
              <Input name="razon_social" value={formData.razon_social || ''} onChange={handleChange} required />
            </FormField>
            <FormField label="Nombre Comercial">
              <Input name="nombre_comercial" value={formData.nombre_comercial || ''} onChange={handleChange} required />
            </FormField>
            <FormField label="CUIT">
              <Input name="cuit" value={formData.cuit || ''} onChange={handleChange} required />
            </FormField>
            <FormField label="Dirección">
              <Input name="direccion" value={formData.direccion || ''} onChange={handleChange} required />
            </FormField>
            <FormField label="Teléfono General">
              <Input name="telefono" value={formData.telefono || ''} onChange={handleChange} required />
            </FormField>
            <FormField label="Email General">
              <Input name="email" type="email" value={formData.email || ''} onChange={handleChange} required />
            </FormField>
            <FormField label="Sitio Web">
              <Input name="sitio_web" value={formData.sitio_web || ''} onChange={handleChange} />
            </FormField>
          </div>
          <div className="mt-4">
            <FormField label="Notas">
              <TextArea name="notas" value={formData.notas || ''} onChange={handleChange} rows={3} />
            </FormField>
          </div>
        </Card>
        
        <Card className="p-6 mb-6">
          <div className="flex justify-between items-center mb-4 border-b pb-2">
            <h2 className="text-lg font-semibold">Contactos (Mín. 1)</h2>
            <Button type="button" onClick={addContacto} variant="secondary" className="text-sm">
              + Añadir Contacto
            </Button>
          </div>
          
          <div className="space-y-4">
            {formData.contactos?.map((c, i) => (
              <div key={i} className="bg-gray-50 p-4 rounded border relative">
                <div className="absolute top-2 right-2">
                  <Button 
                    type="button" 
                    onClick={() => removeContacto(i)} 
                    variant="danger" 
                    className="px-2 py-1 text-xs"
                    disabled={formData.contactos!.length <= 1}
                  >
                    Eliminar
                  </Button>
                </div>
                
                <div className="flex items-center mb-4 mt-2">
                  <input 
                    type="radio" 
                    id={`principal-${i}`} 
                    name="es_principal" 
                    checked={c.es_principal || false}
                    onChange={() => handleContactoChange(i, 'es_principal', true)}
                    className="mr-2"
                  />
                  <label htmlFor={`principal-${i}`} className="text-sm font-medium text-gray-700">
                    Contacto Principal
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label="Nombre Completo">
                    <Input value={c.nombre} onChange={(e) => handleContactoChange(i, 'nombre', e.target.value)} required />
                  </FormField>
                  <FormField label="Cargo">
                    <Input value={c.cargo} onChange={(e) => handleContactoChange(i, 'cargo', e.target.value)} required />
                  </FormField>
                  <FormField label="Teléfono">
                    <Input value={c.telefono} onChange={(e) => handleContactoChange(i, 'telefono', e.target.value)} required />
                  </FormField>
                  <FormField label="Email">
                    <Input type="email" value={c.email} onChange={(e) => handleContactoChange(i, 'email', e.target.value)} required />
                  </FormField>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" onClick={() => navigate('/empresas')} variant="secondary">
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar Empresa'}
          </Button>
        </div>
      </form>
    </div>
  );
}
