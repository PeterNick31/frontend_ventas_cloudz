import { useEffect, useState } from 'react';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8082').replace(/\/$/, '');

export default function Semaforo() {
  const [productos, setProductos] = useState([]);
  const [estado, setEstado] = useState('cargando');
  const [error, setError] = useState('');

  useEffect(() => {
    const cargarVentas = async () => {
      try {
        setEstado('cargando');
        const response = await fetch(`${API_URL}/ventas`);
        if (!response.ok) throw new Error(`La API respondió con ${response.status}`);
        const data = await response.json();
        setProductos(Array.isArray(data) ? data : []);
        setEstado('listo');
      } catch (requestError) {
        setError(requestError.message);
        setEstado('error');
      }
    };

    cargarVentas();
  }, []);

  const getBadge = (estadoProducto) => {
    const badges = {
      ROJO: { color: '#dc2626', text: 'Baja rotación', className: 'badge-red' },
      AMARILLO: { color: '#d97706', text: 'Rotación media', className: 'badge-yellow' },
      VERDE: { color: '#15803d', text: 'Alta rotación', className: 'badge-green' },
    };
    return badges[estadoProducto] || { color: '#64748b', text: 'Sin clasificar', className: 'badge-neutral' };
  };

  return (
    <section className="sales-dashboard">
      <div className="dashboard-heading">
        <div>
          <p className="eyebrow">Operaciones / Ventas</p>
          <h1>Rotación de productos</h1>
          <p className="subtitle">Resumen acumulado para priorizar reposición.</p>
        </div>
        <span className="product-count">{productos.length} productos</span>
      </div>

      {estado === 'cargando' && <p className="status-message">Cargando resumen de ventas...</p>}
      {estado === 'error' && <p className="status-message error-message">No se pudo cargar el resumen: {error}</p>}
      {estado === 'listo' && productos.length === 0 && (
        <p className="status-message">Todavía no hay ventas registradas.</p>
      )}

      <div className="product-grid">
        {productos.map((prod) => {
          const badge = getBadge(prod.estado);
          return (
            <article className="product-card" key={prod.productoId}>
              <div className="card-topline">
                <span className="product-label">Producto #{prod.productoId}</span>
                <span className={`status-badge ${badge.className}`}>
                  <span className="status-dot" style={{ backgroundColor: badge.color }} />
                  {badge.text}
                </span>
              </div>
              <strong className="sales-number">{Number(prod.cantidad).toLocaleString('es-CL')}</strong>
              <span className="sales-label">unidades vendidas</span>
            </article>
          );
        })}
      </div>
    </section>
  );
}