// Cliente HTTP único para los 6 microservicios (todos detrás del mismo API Gateway).

export const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

export class ApiError extends Error {
  constructor(message, status, service) {
    super(message);
    this.status = status;
    this.service = service;
  }
}

const MENSAJES_POR_ESTADO = {
  400: 'Los datos enviados no son válidos.',
  404: 'No existe el registro solicitado.',
  409: 'La operación entra en conflicto con datos existentes.',
  422: 'Revisa los campos del formulario.',
  500: 'El servicio tuvo un error interno.',
  502: 'Un servicio del que depende esta operación no respondió.',
  503: 'El servicio no está disponible en este momento.',
  504: 'El servicio tardó demasiado en responder.',
};

// Cada backend devuelve errores con otra forma:
// FastAPI {detail: "..."} o {detail: [{loc, msg}]}, Express {error, detalle}, Spring {status, error, message}.
function extraerMensaje(cuerpo, status) {
  if (cuerpo && typeof cuerpo === 'object') {
    const { detail, error, detalle, message } = cuerpo;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
      return detail
        .map((d) => {
          const campo = Array.isArray(d.loc) ? d.loc.filter((x) => x !== 'body').join('.') : '';
          return campo ? `${campo}: ${d.msg}` : d.msg;
        })
        .join('; ');
    }
    if (typeof error === 'string' && typeof detalle === 'string') return `${error}: ${detalle}`;
    if (typeof message === 'string' && message) return message;
    if (typeof error === 'string' && status >= 500) return MENSAJES_POR_ESTADO[status] || error;
  }
  return MENSAJES_POR_ESTADO[status] || `Error HTTP ${status}.`;
}

function servicioDe(path) {
  const m = path.match(/^\/api\/([^/?]+)/);
  return m ? m[1] : 'api';
}

export async function request(method, path, { query, body, signal } = {}) {
  if (!API_BASE) {
    throw new ApiError('Falta configurar VITE_API_BASE_URL (URL de API Gateway).', 0, servicioDe(path));
  }
  const url = new URL(API_BASE + path);
  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
    });
  }
  let res;
  try {
    res = await fetch(url, {
      method,
      signal,
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError('No se pudo conectar con la API. Revisa la conexión, la URL configurada o CORS.', 0, servicioDe(path));
  }
  if (res.status === 204) return null;
  const texto = await res.text();
  let cuerpo = null;
  try {
    cuerpo = texto ? JSON.parse(texto) : null;
  } catch {
    cuerpo = texto;
  }
  if (!res.ok) throw new ApiError(extraerMensaje(cuerpo, res.status), res.status, servicioDe(path));
  return cuerpo;
}

export const api = {
  get: (path, query, opts) => request('GET', path, { ...opts, query }),
  post: (path, body, query) => request('POST', path, { body, query }),
  patch: (path, body) => request('PATCH', path, { body }),
  del: (path) => request('DELETE', path),
};
