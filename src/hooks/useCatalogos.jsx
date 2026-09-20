/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { productos as apiProductos } from '../api/inventario';
import { proveedores as apiProveedores } from '../api/proveedores';

// Productos y proveedores se cargan una sola vez: casi todas las pantallas necesitan
// traducir ids (ventas, pedidos, movimientos) a nombres.
const CatalogosContext = createContext(null);

export function CatalogosProvider({ children }) {
  const [estado, setEstado] = useState({ productos: [], proveedores: [], cargando: true, error: null });

  const recargar = useCallback(async () => {
    try {
      const [productos, proveedores] = await Promise.all([
        apiProductos.listarTodos(),
        apiProveedores.listarTodos(),
      ]);
      setEstado({ productos, proveedores, cargando: false, error: null });
    } catch (err) {
      setEstado((e) => ({ ...e, cargando: false, error: err.message }));
    }
  }, []);

  useEffect(() => {
    recargar();
  }, [recargar]);

  const valor = useMemo(() => {
    const productoPorId = new Map(estado.productos.map((p) => [p.id, p]));
    const proveedorPorId = new Map(estado.proveedores.map((p) => [p.id, p]));
    return {
      ...estado,
      recargar,
      opcionesProductos: [...estado.productos]
        .sort((a, b) => a.nombre.localeCompare(b.nombre))
        .map((p) => ({ id: p.id, nombre: p.nombre, sub: `${p.sku} · stock ${p.stock_actual}` })),
      opcionesProveedores: [...estado.proveedores]
        .sort((a, b) => a.nombre.localeCompare(b.nombre))
        .map((p) => ({ id: p.id, nombre: p.nombre, sub: p.contacto || '' })),
      nombreProducto: (id) => productoPorId.get(Number(id))?.nombre || `Producto #${id}`,
      nombreProveedor: (id) => proveedorPorId.get(Number(id))?.nombre || `Proveedor #${id}`,
      producto: (id) => productoPorId.get(Number(id)) || null,
    };
  }, [estado, recargar]);

  return <CatalogosContext.Provider value={valor}>{children}</CatalogosContext.Provider>;
}

export function useCatalogos() {
  return useContext(CatalogosContext);
}
