// Base única del API Gateway; todos los servicios comparten dominio y solo cambia /api/<servicio>.
// VITE_API_BASE_URL definida pero VACÍA significa "mismo origen": las peticiones van a /api/...
// y las reenvía el proxy de Vite (dev) o una regla de rewrite de Amplify (prod), lo que evita CORS.
// Si no está definida se usa VITE_INVENTARIO_URL, y como último recurso localhost:8001.
const BASE_DEFINIDA = import.meta.env.VITE_API_BASE_URL;
const BASE_URL = (
  BASE_DEFINIDA !== undefined ? BASE_DEFINIDA : import.meta.env.VITE_INVENTARIO_URL || 'http://localhost:8001'
).replace(/\/$/, '');

export const URLS = {
  inventario: `${BASE_URL}/api/inventario`,
  ventas: `${BASE_URL}/api/ventas`,
  proveedores: `${BASE_URL}/api/proveedores`,
  prediccion: `${BASE_URL}/api/prediccion`,
  alertas: `${BASE_URL}/api/alertas`,
  analitica: `${BASE_URL}/api/analitica`,
};

export class ApiError extends Error {
  constructor(status, mensaje) {
    super(mensaje);
    this.name = 'ApiError';
    this.status = status;
  }
}

const MENSAJES_POR_ESTADO = {
  0: 'No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.',
  400: 'Los datos enviados no son válidos.',
  404: 'No se encontró el registro.',
  409: 'La operación entra en conflicto con datos existentes.',
  422: 'Hay datos incompletos o con formato incorrecto.',
  500: 'El servidor tuvo un problema. Inténtalo de nuevo en unos minutos.',
  502: 'El servicio no está respondiendo. Inténtalo de nuevo en unos minutos.',
  503: 'El servicio no está disponible por ahora.',
  504: 'El servicio tardó demasiado en responder.',
};

// FastAPI responde {"detail": "..."} o {"detail": [{loc, msg}]}; Spring, {"message"|"error": "..."}.
function extraerMensaje(cuerpo) {
  if (!cuerpo || typeof cuerpo !== 'object') return null;
  const { detail, message, error } = cuerpo;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((d) => {
        const campo = Array.isArray(d.loc) ? d.loc[d.loc.length - 1] : null;
        return campo && campo !== 'body' ? `${campo}: ${d.msg}` : d.msg;
      })
      .join('; ');
  }
  if (typeof message === 'string' && message) return message;
  if (typeof error === 'string' && error) return error;
  return null;
}

// Lanza ApiError con un mensaje legible. 204 devuelve null.
export async function apiFetch(url, { method = 'GET', body, headers } = {}) {
  let respuesta;
  try {
    respuesta = await fetch(url, {
      method,
      headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...headers },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, MENSAJES_POR_ESTADO[0]);
  }

  if (respuesta.status === 204) return null;

  let cuerpo = null;
  try {
    cuerpo = await respuesta.json();
  } catch {
    // respuesta sin JSON
  }

  if (!respuesta.ok) {
    throw new ApiError(
      respuesta.status,
      extraerMensaje(cuerpo) || MENSAJES_POR_ESTADO[respuesta.status] || `Error ${respuesta.status}.`,
    );
  }
  return cuerpo;
}

// Para lecturas opcionales: nunca lanza, devuelve null si algo falla.
export async function fetchSeguro(url, options) {
  try {
    return await apiFetch(url, options);
  } catch {
    return null;
  }
}

// Arma "?a=1&b=2" omitiendo valores vacíos.
export function qs(params = {}) {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') p.append(k, v);
  });
  const s = p.toString();
  return s ? `?${s}` : '';
}

// Los listados de FastAPI no devuelven total y tienen tope 200: recorre páginas hasta agotar.
export async function listarTodo(fnPagina, tamano = 200, maxPaginas = 40, concurrencia = 4) {
  const todo = [];
  for (let i = 0; i < maxPaginas; i += concurrencia) {
    const lote = await Promise.all(
      Array.from({ length: concurrencia }, (_, j) => fnPagina((i + j) * tamano, tamano)),
    );
    let agotado = false;
    lote.forEach((pagina) => {
      todo.push(...pagina);
      if (pagina.length < tamano) agotado = true;
    });
    if (agotado) break;
  }
  return todo;
}
