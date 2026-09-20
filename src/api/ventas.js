import { URLS, apiFetch, qs } from './http';

// ventas-api (Java) usa camelCase y paginación page/size.
export const ventas = {
  listar: ({ productoId, desde, hasta, page = 0, size = 20 } = {}) =>
    apiFetch(`${URLS.ventas}${qs({ productoId, desde, hasta, page, size })}`),
  porProducto: (productoId, dias) => apiFetch(`${URLS.ventas}/producto/${productoId}${qs({ dias })}`),
  crear: ({ productoId, fecha, cantidadVendida, precioUnitario }) =>
    apiFetch(URLS.ventas, {
      method: 'POST',
      body: { productoId, fecha, cantidadVendida, precioUnitario },
    }),
  actualizar: (id, datos) => apiFetch(`${URLS.ventas}/${id}`, { method: 'PATCH', body: datos }),
  eliminar: (id) => apiFetch(`${URLS.ventas}/${id}`, { method: 'DELETE' }),
};

// Trae todas las ventas de un rango recorriendo páginas (en paralelo, de a 4).
// `truncado` = true si se llegó al tope de páginas y pueden faltar ventas antiguas.
export async function ventasDelRango(desde, hasta, { maxPaginas = 12, concurrencia = 4 } = {}) {
  const filas = [];
  for (let i = 0; i < maxPaginas; i += concurrencia) {
    const lote = await Promise.all(
      Array.from({ length: Math.min(concurrencia, maxPaginas - i) }, (_, j) =>
        ventas.listar({ desde, hasta, page: i + j, size: 200 }),
      ),
    );
    let agotado = false;
    lote.forEach((pag) => {
      filas.push(...pag);
      if (pag.length < 200) agotado = true;
    });
    if (agotado) return { filas, truncado: false };
  }
  return { filas, truncado: true };
}

export const pedidos = {
  listar: ({ productoId, proveedorId, estado, page = 0, size = 20 } = {}) =>
    apiFetch(`${URLS.ventas}/pedidos-proveedor${qs({ productoId, proveedorId, estado, page, size })}`),
  porProducto: (productoId) => apiFetch(`${URLS.ventas}/pedidos-proveedor/producto/${productoId}`),
  crear: (datos) => apiFetch(`${URLS.ventas}/pedidos-proveedor`, { method: 'POST', body: datos }),
  actualizar: (id, datos) => apiFetch(`${URLS.ventas}/pedidos-proveedor/${id}`, { method: 'PATCH', body: datos }),
  eliminar: (id) => apiFetch(`${URLS.ventas}/pedidos-proveedor/${id}`, { method: 'DELETE' }),
};
