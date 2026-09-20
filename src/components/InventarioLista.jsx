import { useEffect, useState } from 'react';
import { URLS, fetchSeguro } from './api';

export default function InventarioLista({ onSeleccionarProducto }) {
  const [productos, setProductos] = useState([]);
  const [estado, setEstado] = useState('cargando');

  useEffect(() => {
    const cargar = async () => {
      setEstado('cargando');
      // Llamada directa a Inventario: GET /api/inventario/productos
      const data = await fetchSeguro(`${URLS.inventario}/productos?limit=200`);
      if (!data) {
        setEstado('error');
        return;
      }
      setProductos(data);
      setEstado('listo');
    };
    cargar();
  }, []);

  return (
    <section className="sales-dashboard">
      <div className="dashboard-heading">
        <div>
          <p className="eyebrow">Operaciones / Inventario</p>
          <h1>Catálogo de productos</h1>
          <p className="subtitle">Haz clic en un producto para ver su detalle completo.</p>
        </div>
        <span className="product-count">{productos.length} productos</span>
      </div>

      {estado === 'cargando' && <p className="status-message">Cargando inventario...</p>}
      {estado === 'error' && (
        <p className="status-message error-message">No se pudo cargar inventario-api.</p>
      )}

      <div className="product-grid">
        {productos.map((p) => {
          const enRiesgo = p.stock_actual <= p.stock_minimo;
          return (
            <button
              key={p.id}
              className="product-card product-card-clickable"
              onClick={() => onSeleccionarProducto(p.id)}
            >
              <div className="card-topline">
                <span className="product-label">{p.nombre}</span>
                <span className="detail-subid">
                  {p.sku} · {p.categoria || 'Sin categoría'}
                </span>
              </div>
              <strong className="sales-number">{p.stock_actual}</strong>
              <span className="sales-label">
                {p.unidad_medida ? `${p.unidad_medida} en stock` : 'unidades en stock'}
              </span>
              {enRiesgo && (
                <span className="status-badge" style={{ color: '#a5281c', marginTop: 8 }}>
                  <span className="status-dot" style={{ backgroundColor: '#dc2626' }} />
                  Bajo stock mínimo
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
