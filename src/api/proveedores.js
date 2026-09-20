import { URLS, apiFetch, listarTodo, qs } from './http';

export const proveedores = {
  listar: ({ skip = 0, limit = 200 } = {}) => apiFetch(`${URLS.proveedores}${qs({ skip, limit })}`),
  listarTodos: () => listarTodo((skip, limit) => proveedores.listar({ skip, limit })),
  crear: (datos) => apiFetch(URLS.proveedores, { method: 'POST', body: datos }),
  actualizar: (id, datos) => apiFetch(`${URLS.proveedores}/${id}`, { method: 'PATCH', body: datos }),
  eliminar: (id) => apiFetch(`${URLS.proveedores}/${id}`, { method: 'DELETE' }),
};

export const tiempos = {
  listar: ({ proveedor_id, producto_id, skip = 0, limit = 200 } = {}) =>
    apiFetch(`${URLS.proveedores}/tiempos-entrega${qs({ proveedor_id, producto_id, skip, limit })}`),
  crear: (datos) => apiFetch(`${URLS.proveedores}/tiempos-entrega`, { method: 'POST', body: datos }),
  actualizar: (id, datos) => apiFetch(`${URLS.proveedores}/tiempos-entrega/${id}`, { method: 'PATCH', body: datos }),
  eliminar: (id) => apiFetch(`${URLS.proveedores}/tiempos-entrega/${id}`, { method: 'DELETE' }),
  // El de menor tiempo promedio si hay varios proveedores; 404 si no hay ninguno.
  deProducto: (productoId) => apiFetch(`${URLS.proveedores}/producto/${productoId}/tiempo-entrega`),
};
