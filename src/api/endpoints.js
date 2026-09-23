// Un objeto por microservicio con los métodos REST que usa la interfaz.
// Los listados devuelven { items, hasNext } para la paginación del servidor.
import { api } from './client';

// Servicios con skip/limit (FastAPI y Node): se pide 1 registro extra para saber si hay página siguiente.
async function paginaSkip(path, { offset, limit }, filtros = {}, opts) {
  const datos = await api.get(path, { ...filtros, skip: offset, limit: limit + 1 }, opts);
  return { items: datos.slice(0, limit), hasNext: datos.length > limit };
}

// Ventas (Spring) usa page/size.
async function paginaSpring(path, { offset, limit }, filtros = {}, opts) {
  const datos = await api.get(path, { ...filtros, page: Math.floor(offset / limit), size: limit }, opts);
  return { items: datos, hasNext: datos.length === limit };
}

export const inventario = {
  listarProductos: (p, _f, opts) => paginaSkip('/api/inventario/productos', p, {}, opts),
  obtenerProducto: (id) => api.get(`/api/inventario/productos/${id}`),
  crearProducto: (datos) => api.post('/api/inventario/productos', datos),
  actualizarProducto: (id, cambios) => api.patch(`/api/inventario/productos/${id}`, cambios),
  eliminarProducto: (id) => api.del(`/api/inventario/productos/${id}`),
  stock: (id) => api.get(`/api/inventario/stock/${id}`),
  listarMovimientos: (p, f, opts) => paginaSkip('/api/inventario/movimientos', p, f, opts),
  obtenerMovimiento: (id) => api.get(`/api/inventario/movimientos/${id}`),
  registrarMovimiento: (datos) => api.post('/api/inventario/movimientos', datos),
};

export const proveedores = {
  listar: (p, _f, opts) => paginaSkip('/api/proveedores', p, {}, opts),
  obtener: (id) => api.get(`/api/proveedores/${id}`),
  crear: (datos) => api.post('/api/proveedores', datos),
  actualizar: (id, cambios) => api.patch(`/api/proveedores/${id}`, cambios),
  eliminar: (id) => api.del(`/api/proveedores/${id}`),
  listarTiempos: (p, f, opts) => paginaSkip('/api/proveedores/tiempos-entrega', p, f, opts),
  crearTiempo: (datos) => api.post('/api/proveedores/tiempos-entrega', datos),
  actualizarTiempo: (id, cambios) => api.patch(`/api/proveedores/tiempos-entrega/${id}`, cambios),
  eliminarTiempo: (id) => api.del(`/api/proveedores/tiempos-entrega/${id}`),
  tiempoDeProducto: (productoId) => api.get(`/api/proveedores/producto/${productoId}/tiempo-entrega`),
};

export const ventas = {
  listar: (p, f, opts) => paginaSpring('/api/ventas', p, f, opts),
  obtener: (id) => api.get(`/api/ventas/${id}`),
  crear: (datos) => api.post('/api/ventas', datos),
  actualizar: (id, cambios) => api.patch(`/api/ventas/${id}`, cambios),
  eliminar: (id) => api.del(`/api/ventas/${id}`),
  historialProducto: (productoId, dias) => api.get(`/api/ventas/producto/${productoId}`, { dias }),
  listarPedidos: (p, f, opts) => paginaSpring('/api/ventas/pedidos-proveedor', p, f, opts),
  obtenerPedido: (id) => api.get(`/api/ventas/pedidos-proveedor/detalle/${id}`),
  crearPedido: (datos) => api.post('/api/ventas/pedidos-proveedor', datos),
  actualizarPedido: (id, cambios) => api.patch(`/api/ventas/pedidos-proveedor/${id}`, cambios),
  eliminarPedido: (id) => api.del(`/api/ventas/pedidos-proveedor/${id}`),
};

export const prediccion = {
  listar: (p, _f, opts) => paginaSkip('/api/prediccion', p, {}, opts),
  deProducto: (productoId) => api.get(`/api/prediccion/${productoId}`),
  calcular: (productoId) => api.post(`/api/prediccion/calcular/${productoId}`),
};

export const alertas = {
  listar: (p, _f, opts) => paginaSkip('/api/alertas', p, {}, opts),
  deProducto: (productoId) => api.get(`/api/alertas/${productoId}`),
};

export const analitica = {
  rotacionCategoria: () => api.get('/api/analitica/rotacion-categoria'),
  productosMasQuiebres: () => api.get('/api/analitica/productos-mas-quiebres'),
};

// Comprobación ligera de cada servicio (lectura de 1 registro o su documento OpenAPI).
export const SERVICIOS = [
  { clave: 'inventario', nombre: 'Inventario', lenguaje: 'Python', ping: () => api.get('/api/inventario/productos', { limit: 1 }), docs: '/api/inventario/docs' },
  { clave: 'ventas', nombre: 'Ventas', lenguaje: 'Java', ping: () => api.get('/api/ventas', { size: 1 }), docs: '/api/ventas/swagger-ui.html' },
  { clave: 'proveedores', nombre: 'Proveedores', lenguaje: 'Python', ping: () => api.get('/api/proveedores', { limit: 1 }), docs: '/api/proveedores/docs' },
  { clave: 'prediccion', nombre: 'Predicción', lenguaje: 'Node.js', ping: () => api.get('/api/prediccion', { limit: 1 }), docs: '/api/prediccion/docs/' },
  { clave: 'alertas', nombre: 'Alertas', lenguaje: 'Node.js', ping: () => api.get('/api/alertas/1'), docs: '/api/alertas/docs/' },
  { clave: 'analitica', nombre: 'Analítica', lenguaje: 'Python', ping: () => api.get('/api/analitica/openapi.json'), docs: '/api/analitica/docs' },
];
