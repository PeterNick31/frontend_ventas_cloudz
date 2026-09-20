// Detecta si estamos en producción (Amplify) o desarrollo local
const BASE_URL = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_INVENTARIO_URL || 'http://localhost:8001').replace(/\/$/, '');

// URLs base de los microservicios normalizadas con sus prefijos correspondientes
export const URLS = {
  inventario: `${BASE_URL}/api/inventario`,
  ventas: `${BASE_URL}/api/ventas`,
  proveedores: `${BASE_URL}/api/proveedores`,
  prediccion: `${BASE_URL}/api/prediccion`,
  alertas: `${BASE_URL}/api/alertas`,
  analitica: `${BASE_URL}/api/analitica`,
};

// Trae un endpoint sin reventar el resto de la vista si falla
export async function fetchSeguro(url, options) {
  try {
    const r = await fetch(url, options);
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

export const SEMAFORO_INFO = {
  rojo: { color: '#a5281c', dot: '#dc2626', text: 'Pedir ya' },
  amarillo: { color: '#a35f08', dot: '#d97706', text: 'Vigilar de cerca' },
  verde: { color: '#287345', dot: '#15803d', text: 'Stock saludable' },
  desconocido: { color: '#64748b', dot: '#94a3b8', text: 'Sin predicción aún' },
};
