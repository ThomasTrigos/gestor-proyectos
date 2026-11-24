import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useBranding } from '../../contexts/BrandingContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { FormField } from '../../components/forms/FormField';
import { Lock, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const [identificador, setIdentificador] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const { appName, appLogo } = useBranding();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await login({ identificador, password });
      navigate('/');
    } catch (err: any) {
      if (!err?.response) {
        setError(`Error de conexión con el backend (${err?.message || 'Network Error'}). Verifique que el servicio backend esté 'Live' en Render.`);
      } else if (err.response.status === 401) {
        setError(err.response.data?.error || 'Credenciales inválidas. Verifique el usuario/email y la contraseña.');
      } else {
        setError(`Error del servidor (${err.response.status}): ${err.response.data?.error || err.message}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
        <div className="text-center">
          {appLogo ? (
            <div className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center bg-white shadow-lg shadow-indigo-100 border border-gray-100 mb-4 p-2">
              <img src={appLogo} alt="Logo" className="w-full h-full object-contain" />
            </div>
          ) : (
            <div className="mx-auto w-14 h-14 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 mb-4">
              <Lock className="w-7 h-7" />
            </div>
          )}
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">{appName}</h2>
          <p className="text-sm text-gray-500 mt-1">Ingrese con su usuario o correo electrónico</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <FormField label="Usuario o Correo Electrónico">
            <div className="relative">
              <Input
                type="text"
                required
                autoComplete="username"
                placeholder="Ej: rrhh o usuario@empresa.com"
                value={identificador}
                onChange={(e: any) => {
                  setIdentificador(e.target.value);
                  if (error) setError('');
                }}
              />
            </div>
          </FormField>

          <FormField label="Contraseña">
            <Input
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e: any) => {
                setPassword(e.target.value);
                if (error) setError('');
              }}
            />
          </FormField>

          <Button
            type="submit"
            className="w-full py-2.5 text-base font-semibold shadow-md shadow-indigo-200 hover:shadow-indigo-300 transition-all cursor-pointer"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Iniciando sesión...' : 'Ingresar al Sistema'}
          </Button>
        </form>
      </div>
    </div>
  );
}

