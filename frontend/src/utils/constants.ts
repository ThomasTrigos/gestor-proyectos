import { RolPersonal } from '../types';

const rawApiUrl = (import.meta.env.VITE_API_URL || '/api').trim();
// Normalizar la URL: si viene un dominio sin protocolo https://, agregarlo automáticamente.
const urlWithProtocol =
  rawApiUrl.startsWith('http://') || rawApiUrl.startsWith('https://') || rawApiUrl.startsWith('/')
    ? rawApiUrl
    : `https://${rawApiUrl}`;
const sanitizedUrl = urlWithProtocol.replace(/\/+$/, '');
export const API_URL = sanitizedUrl.endsWith('/api') ? sanitizedUrl : `${sanitizedUrl}/api`;

export const ROLES_PERMITIDOS = {
  ADMIN: [RolPersonal.RRHH, RolPersonal.GERENTE],
  RRHH: [RolPersonal.RRHH],
  GERENTE: [RolPersonal.GERENTE],
};
