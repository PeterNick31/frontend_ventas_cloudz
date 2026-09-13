import { useEffect, useState } from 'react';

const INVENTARIO_URL = (import.meta.env.VITE_INVENTARIO_URL || 'http://localhost:8000').replace(/\/$/, '');

export default function InventarioLista({ onSeleccionarProducto }) {
  const [productos, setProductos] = useState([]);
  const [estado, setEstado] = useState('cargando');
  const [error, setError] = useState('');

  useEffect(() => {
    const cargar = async () => {
      try {
        setEstado('cargando');
        // Llamada directa a Inventario: GET /productos
        const response = await fetch(`${INVENTARIO_URL}/productos`);
        if (!response.ok) throw new Error(`La API respondió con ${response.status}`);
        const data = await response.json();
        setProductos(Array.isArray(data) ? data : []);
        setEstado('listo');
      } catch (requestError) {
        setError(requestError.message);
        setEstado('error');
      }
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
      {estado === 'error' && <p className="status-message error-message">No se pudo cargar el inventario: {error}</p>}

      <div className="product-grid">
        {productos.map((prod) => (
          <button
            key={prod.id}
            className="product-card product-card-clickable"
            onClick={() => onSeleccionarProducto(prod.id)}
          >
            <div className="card-topline">
              <span className="product-label">{prod.nombre}</span>
              <span className="detail-subid">#{prod.id} · {prod.categoria || 'Sin categoría'}</span>
            </div>
            <strong className="sales-number">{prod.stockActual ?? '—'}</strong>
            <span className="sales-label">unidades en stock</span>
          </button>
        ))}
      </div>
    </section>
  );
}
