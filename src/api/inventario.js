import { URLS, apiFetch, listarTodo, qs } from './http';

export const productos = {
  listar: ({ skip = 0, limit = 200 } = {}) => apiFetch(`${URLS.inventario}/productos${qs({ skip, limit })}`),
  listarTodos: () => listarTodo((skip, limit) => productos.listar({ skip, limit })),
  obtener: (id) => apiFetch(`${URLS.inventario}/productos/${id}`),
  crear: (datos) => apiFetch(`${URLS.inventario}/productos`, { method: 'POST', body: datos }),
  actualizar: (id, datos) => apiFetch(`${URLS.inventario}/productos/${id}`, { method: 'PATCH', body: datos }),
  eliminar: (id) => apiFetch(`${URLS.inventario}/productos/${id}`, { method: 'DELETE' }),
};

export const movimientos = {
  listar: ({ producto_id, tipo_movimiento, skip = 0, limit = 30 } = {}) =>
    apiFetch(`${URLS.inventario}/movimientos${qs({ producto_id, tipo_movimiento, skip, limit })}`),
  // tipo: 'entrada' | 'salida' | 'ajuste'. En 'ajuste' la cantidad es el stock resultante.
  crear: ({ producto_id, tipo_movimiento, cantidad, motivo, usuario }) =>
    apiFetch(`${URLS.inventario}/movimientos`, {
      method: 'POST',
      body: { producto_id, tipo_movimiento, cantidad, motivo: motivo || null, usuario: usuario || null },
    }),
};
