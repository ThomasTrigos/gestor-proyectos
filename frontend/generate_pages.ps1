$scriptDir = "C:\Users\usuario\.gemini\antigravity\scratch\gestor-proyectos\frontend\src"

function Create-File {
    param(
        [string]$Path,
        [string]$Content
    )
    $Fullpath = Join-Path $scriptDir $Path
    $Dir = Split-Path $Fullpath
    if (-not (Test-Path $Dir)) {
        New-Item -ItemType Directory -Force -Path $Dir | Out-Null
    }
    Set-Content -Path $Fullpath -Value $Content -Encoding UTF8
    Write-Host "Created $Path"
}

# components/ui
Create-File "components\ui\Button.tsx" @"
import React from 'react';
export const Button = ({ children, className = '', ...props }: any) => (
  <button className={`px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 transition \${className}`} {...props}>
    {children}
  </button>
);
"@

Create-File "components\ui\Input.tsx" @"
import React from 'react';
export const Input = React.forwardRef<HTMLInputElement, any>(({ className = '', ...props }, ref) => (
  <input ref={ref} className={`border border-gray-300 rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-primary-500 \${className}`} {...props} />
));
Input.displayName = 'Input';
"@

Create-File "components\ui\Select.tsx" @"
import React from 'react';
export const Select = React.forwardRef<HTMLSelectElement, any>(({ className = '', children, ...props }, ref) => (
  <select ref={ref} className={`border border-gray-300 rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-primary-500 \${className}`} {...props}>
    {children}
  </select>
));
Select.displayName = 'Select';
"@

Create-File "components\ui\TextArea.tsx" @"
import React from 'react';
export const TextArea = React.forwardRef<HTMLTextAreaElement, any>(({ className = '', ...props }, ref) => (
  <textarea ref={ref} className={`border border-gray-300 rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-primary-500 \${className}`} {...props} />
));
TextArea.displayName = 'TextArea';
"@

Create-File "components\ui\DatePicker.tsx" @"
import React from 'react';
export const DatePicker = React.forwardRef<HTMLInputElement, any>(({ className = '', ...props }, ref) => (
  <input type="date" ref={ref} className={`border border-gray-300 rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-primary-500 \${className}`} {...props} />
));
DatePicker.displayName = 'DatePicker';
"@

Create-File "components\ui\Modal.tsx" @"
import React from 'react';
export const Modal = ({ isOpen, onClose, title, children }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">{title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">&times;</button>
        </div>
        {children}
      </div>
    </div>
  );
};
"@

Create-File "components\ui\Table.tsx" @"
import React from 'react';
export const Table = ({ headers, children }: any) => (
  <div className="overflow-x-auto bg-white rounded-lg shadow">
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          {headers.map((h: string, i: number) => (
            <th key={i} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {children}
      </tbody>
    </table>
  </div>
);
"@

Create-File "components\ui\Badge.tsx" @"
import React from 'react';
export const Badge = ({ children, variant = 'gray' }: any) => {
  const colors: Record<string, string> = {
    gray: 'bg-gray-100 text-gray-800',
    green: 'bg-green-100 text-green-800',
    blue: 'bg-blue-100 text-blue-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    red: 'bg-red-100 text-red-800',
  };
  return <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full \${colors[variant]}`}>{children}</span>;
};
"@

Create-File "components\ui\Card.tsx" @"
import React from 'react';
export const Card = ({ title, children, className = '' }: any) => (
  <div className={`bg-white rounded-lg shadow p-6 \${className}`}>
    {title && <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>}
    {children}
  </div>
);
"@

Create-File "components\ui\FileUpload.tsx" @"
import React from 'react';
export const FileUpload = ({ onFileSelect }: any) => (
  <div className="border-2 border-dashed border-gray-300 rounded p-4 text-center">
    <input type="file" className="hidden" id="file-upload" onChange={(e) => onFileSelect(e.target.files?.[0])} />
    <label htmlFor="file-upload" className="cursor-pointer text-primary-600 hover:text-primary-800">
      Seleccionar archivo
    </label>
  </div>
);
"@

Create-File "components\ui\LoadingSpinner.tsx" @"
import React from 'react';
export const LoadingSpinner = () => (
  <div className="flex justify-center items-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
  </div>
);
"@

Create-File "components\ui\EmptyState.tsx" @"
import React from 'react';
export const EmptyState = ({ message = 'No hay datos disponibles' }: any) => (
  <div className="text-center py-12 text-gray-500">{message}</div>
);
"@

Create-File "components\forms\FormField.tsx" @"
import React from 'react';
export const FormField = ({ label, error, children }: any) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    {children}
    {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
  </div>
);
"@

# auth pages
Create-File "pages\auth\LoginPage.tsx" @"
import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { FormField } from '../../components/forms/FormField';
import { RolPersonal } from '../../types';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login({ email, password });
      navigate('/');
    } catch (err) {
      setError('Credenciales inválidas');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-md">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Iniciar Sesión</h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && <div className="text-red-500 text-center text-sm">{error}</div>}
          <div className="rounded-md shadow-sm space-y-4">
            <FormField label="Email">
              <Input type="email" required value={email} onChange={(e: any) => setEmail(e.target.value)} />
            </FormField>
            <FormField label="Contraseña">
              <Input type="password" required value={password} onChange={(e: any) => setPassword(e.target.value)} />
            </FormField>
          </div>
          <Button type="submit" className="w-full">Ingresar</Button>
        </form>
      </div>
    </div>
  );
}
"@

# NotFoundPage
Create-File "pages\NotFoundPage.tsx" @"
import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="text-center py-20">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">404 - Página no encontrada</h1>
      <Link to="/" className="text-primary-600 hover:underline">Volver al inicio</Link>
    </div>
  );
}
"@

# Dashboard
Create-File "pages\dashboard\DashboardPage.tsx" @"
import React from 'react';
import { Card } from '../../components/ui/Card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const data = [
  { name: 'Pendientes', value: 4, color: '#94a3b8' },
  { name: 'En Progreso', value: 12, color: '#3b82f6' },
  { name: 'Completados', value: 8, color: '#22c55e' },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Tablero General</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card title="Total Proyectos">
          <div className="text-4xl font-bold text-primary-600">24</div>
        </Card>
        <Card title="Tareas Activas">
          <div className="text-4xl font-bold text-yellow-600">45</div>
        </Card>
        <Card title="Presupuesto Ejecutado">
          <div className="text-4xl font-bold text-green-600">$1.2M</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Estado de Proyectos">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} cx="50%" cy="50%" outerRadius={100} fill="#8884d8" dataKey="value" label>
                  {data.map((entry, index) => (
                    <Cell key={`cell-\${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
"@

# Helper to generate basic list page
function Generate-ListPage {
    param($Entity, $Plural, $Headers, $Fields)
    $lowEntity = $Entity.ToLower()
    $lowPlural = $Plural.ToLower()
    $CapEntity = $Entity
    
    $headersMap = $Headers -split ","
    $fieldsMap = $Fields -split ","
    
    $ths = ($headersMap | ForEach-Object { "'$_'" }) -join ", "
    $tds = ($fieldsMap | ForEach-Object { "<td className=`"px-6 py-4 whitespace-nowrap text-sm text-gray-500`">{item.$_}</td>" }) -join "`n"

    return @"
import React from 'react';
import { Link } from 'react-router-dom';
import { useApiQuery } from '../../hooks/useApi';
import { Table } from '../../components/ui/Table';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Button } from '../../components/ui/Button';
import { $CapEntity } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { RolPersonal } from '../../types';

export default function $($CapEntity)sListPage() {
  const { data, isLoading } = useApiQuery<$CapEntity[]>([`$lowPlural`], `/$lowPlural/`);
  const { user } = useAuth();
  
  if (isLoading) return <LoadingSpinner />;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">$Plural</h1>
        {user?.rol === RolPersonal.RRHH && (
          <Link to={`/$lowPlural/nueva`}>
            <Button>Nueva $CapEntity</Button>
          </Link>
        )}
      </div>
      
      <Table headers={[$ths, 'Acciones']}>
        {data?.map((item) => (
          <tr key={item.id}>
$tds
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              <Link to={`/$lowPlural/\${item.id}/editar`} className="text-primary-600 hover:text-primary-900">Editar</Link>
            </td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
"@
}

# Generate simple form page
function Generate-FormPage {
    param($Entity, $Plural)
    $lowEntity = $Entity.ToLower()
    $lowPlural = $Plural.ToLower()
    $CapEntity = $Entity
    
    return @"
import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button';

export default function $($CapEntity)FormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  return (
    <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow">
      <h1 className="text-2xl font-bold mb-6">{isEditing ? 'Editar' : 'Nueva'} $CapEntity</h1>
      <form>
        {/* Placeholder para campos del formulario */}
        <p className="mb-6 text-gray-500">Formulario en construcción...</p>
        <div className="flex gap-4">
          <Button type="button" onClick={() => navigate(-1)} className="bg-gray-200 text-gray-800 hover:bg-gray-300">
            Cancelar
          </Button>
          <Button type="submit">Guardar</Button>
        </div>
      </form>
    </div>
  );
}
"@
}

# Generate Empresas pages
Create-File "pages\empresas\EmpresasListPage.tsx" (Generate-ListPage -Entity "Empresa" -Plural "Empresas" -Headers "Nombre,Razón Social,CUIT" -Fields "nombre,razon_social,cuit")

# Overwrite EmpresaFormPage to meet special specs
Create-File "pages\empresas\EmpresaFormPage.tsx" @"
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { FormField } from '../../components/forms/FormField';

export default function EmpresaFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;
  const [contactos, setContactos] = useState([{ id: Date.now(), nombre: '', email: '' }]);

  const addContacto = () => setContactos([...contactos, { id: Date.now(), nombre: '', email: '' }]);
  const removeContacto = (index: number) => setContactos(contactos.filter((_, i) => i !== index));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (contactos.length === 0) {
      alert('Debe agregar al menos 1 contacto');
      return;
    }
    navigate('/empresas');
  };

  return (
    <div className="max-w-3xl mx-auto bg-white p-6 rounded-lg shadow">
      <h1 className="text-2xl font-bold mb-6">{isEditing ? 'Editar' : 'Nueva'} Empresa</h1>
      <form onSubmit={handleSubmit}>
        <FormField label="Nombre"><Input required /></FormField>
        <FormField label="CUIT"><Input required /></FormField>
        
        <div className="mt-8 mb-4 border-t pt-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Contactos (Min. 1)</h2>
            <Button type="button" onClick={addContacto} className="text-sm py-1">Añadir Contacto</Button>
          </div>
          {contactos.map((c, i) => (
            <div key={c.id} className="flex gap-4 mb-4 items-end bg-gray-50 p-4 rounded">
              <div className="flex-1">
                <FormField label="Nombre Contacto"><Input required /></FormField>
              </div>
              <div className="flex-1">
                <FormField label="Email Contacto"><Input required type="email" /></FormField>
              </div>
              <Button type="button" onClick={() => removeContacto(i)} className="bg-red-500 hover:bg-red-600 mb-4">X</Button>
            </div>
          ))}
        </div>

        <div className="flex gap-4 mt-6">
          <Button type="button" onClick={() => navigate('/empresas')} className="bg-gray-200 text-gray-800 hover:bg-gray-300">Cancelar</Button>
          <Button type="submit">Guardar</Button>
        </div>
      </form>
    </div>
  );
}
"@

# Generate Personal pages
Create-File "pages\personal\PersonalListPage.tsx" (Generate-ListPage -Entity "Personal" -Plural "Personal" -Headers "Nombre,Apellidos,Email,Rol" -Fields "nombre,apellidos,email,rol")
Create-File "pages\personal\PersonalFormPage.tsx" (Generate-FormPage -Entity "Personal" -Plural "Personal")

# Generate Proyectos pages
Create-File "pages\proyectos\ProyectosListPage.tsx" (Generate-ListPage -Entity "Proyecto" -Plural "Proyectos" -Headers "Nombre,Estado,Fecha Inicio" -Fields "nombre,estado,fecha_inicio")
Create-File "pages\proyectos\ProyectoFormPage.tsx" (Generate-FormPage -Entity "Proyecto" -Plural "Proyectos")

Create-File "pages\proyectos\ProyectoDetallePage.tsx" @"
import React from 'react';
import { useParams } from 'react-router-dom';

export default function ProyectoDetallePage() {
  const { id } = useParams();
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h1 className="text-2xl font-bold mb-4">Detalles del Proyecto {id}</h1>
      <p>Cargando información detallada...</p>
    </div>
  );
}
"@

# Generate Reuniones pages
Create-File "pages\reuniones\ReunionesListPage.tsx" (Generate-ListPage -Entity "Reunion" -Plural "Reuniones" -Headers "Asunto,Fecha y Hora,Duración" -Fields "asunto,fecha_hora,duracion_minutos")
Create-File "pages\reuniones\ReunionFormPage.tsx" (Generate-FormPage -Entity "Reunion" -Plural "Reuniones")

# Generate Financiacion pages
Create-File "pages\financiacion\FinanciacionListPage.tsx" (Generate-ListPage -Entity "Financiacion" -Plural "Financiacion" -Headers "Monto,Forma Pago" -Fields "monto_total,forma_pago")
Create-File "pages\financiacion\FinanciacionFormPage.tsx" (Generate-FormPage -Entity "Financiacion" -Plural "Financiacion")

# Generate Tareas pages
Create-File "pages\tareas\TareasListPage.tsx" (Generate-ListPage -Entity "Tarea" -Plural "Tareas" -Headers "Nombre,Prioridad,Estado" -Fields "nombre,prioridad,estado")
Create-File "pages\tareas\TareaFormPage.tsx" (Generate-FormPage -Entity "Tarea" -Plural "Tareas")

# TareaConfirmacionPage
Create-File "pages\tareas\TareaConfirmacionPage.tsx" @"
import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button';

export default function TareaConfirmacionPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  if (!token) return <div className="p-8 text-center text-red-500">Token no válido o faltante.</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 flex justify-center">
      <div className="max-w-2xl w-full bg-white p-8 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold mb-2">Detalles de Tarea</h1>
        <p className="text-sm text-gray-500 mb-6">Acceso vía Token: {token}</p>

        <div className="space-y-4 mb-8 border-t border-b py-4">
          <div><strong className="text-gray-700">Nombre:</strong> Implementar Autenticación</div>
          <div><strong className="text-gray-700">Estado Actual:</strong> Asignada</div>
          <div><strong className="text-gray-700">Descripción:</strong> Completar el flujo JWT.</div>
        </div>

        <div className="flex gap-4 justify-center">
          <Button className="bg-blue-600 hover:bg-blue-700">Confirmar Lectura</Button>
          <Button className="bg-yellow-600 hover:bg-yellow-700">Iniciar Trabajo</Button>
          <Button className="bg-green-600 hover:bg-green-700">Completar</Button>
        </div>
      </div>
    </div>
  );
}
"@
