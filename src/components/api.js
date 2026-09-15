// URLs base de los 6 microservicios (ver .env.example)
export const URLS = {
  inventario: (import.meta.env.VITE_INVENTARIO_URL || 'http://localhost:8001').replace(/\/$/, ''),
  ventas: (import.meta.env.VITE_VENTAS_URL || 'http://localhost:8002').replace(/\/$/, ''),
  proveedores: (import.meta.env.VITE_PROVEEDORES_URL || 'http://localhost:8003').replace(/\/$/, ''),
  prediccion: (import.meta.env.VITE_PREDICCION_URL || 'http://localhost:8004').replace(/\/$/, ''),
  alertas: (import.meta.env.VITE_ALERTAS_URL || 'http://localhost:8005').replace(/\/$/, ''),
  analitica: (import.meta.env.VITE_ANALITICA_URL || 'http://localhost:8006').replace(/\/$/, ''),
};

// Trae un endpoint sin reventar el resto de la vista si falla: cada
// microservicio puede estar caído o no tener datos para este producto
// sin que eso tumbe toda la pantalla.
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
