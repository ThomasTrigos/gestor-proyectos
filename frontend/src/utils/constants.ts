import { RolPersonal } from '../types';

const rawApiUrl = (import.meta.env.VITE_API_URL || '/api').trim();

// Si Render inyectó el hostname interno (ej. "gestor-proyectos-backend-gs00") sin ".onrender.com"
let fullHost = rawApiUrl;
if (
  fullHost &&
  !fullHost.startsWith('/') &&
  !fullHost.includes('.') &&
  !fullHost.includes('localhost')
) {
  fullHost = `${fullHost}.onrender.com`;
}

// Normalizar la URL: si viene un dominio sin protocolo https://, agregarlo automáticamente.
const urlWithProtocol =
  fullHost.startsWith('http://') || fullHost.startsWith('https://') || fullHost.startsWith('/')
    ? fullHost
    : `https://${fullHost}`;
const sanitizedUrl = urlWithProtocol.replace(/\/+$/, '');
export const API_URL = sanitizedUrl.endsWith('/api') ? sanitizedUrl : `${sanitizedUrl}/api`;

export const ROLES_PERMITIDOS = {
  ADMIN: [RolPersonal.RRHH, RolPersonal.GERENTE],
  RRHH: [RolPersonal.RRHH],
  GERENTE: [RolPersonal.GERENTE],
};
