import { useEffect, useState } from 'react';
import { URLS, fetchSeguro, SEMAFORO_INFO } from './api';

export default function Semaforo({ onSeleccionarProducto }) {
  const [alertas, setAlertas] = useState([]);
  const [estado, setEstado] = useState('cargando');

  useEffect(() => {
    const cargar = async () => {
      setEstado('cargando');

      // ✅ Usamos URLS.alertas y URLS.inventario limpiando la duplicación de /api/...
      const [listaAlertas, listaProductos] = await Promise.all([
        fetchSeguro(`${URLS.alertas}/`), // Apunta a GET /api/alertas/
        fetchSeguro(`${URLS.inventario}/productos?limit=200`), // Apunta a GET /api/inventario/productos?limit=200
      ]);

      if (!listaAlertas) {
        setEstado('error');
        return;
      }

      const productosPorId = new Map((listaProductos || []).map((p) => [p.id, p]));
      const combinado = listaAlertas.map((a) => ({
        ...a,
        producto: productosPorId.get(a.producto_id) || null,
      }));

      setAlertas(combinado);
      setEstado('listo');
    };
    cargar();
  }, []);

  return (
    <section className="sales-dashboard">
      <div className="dashboard-heading">
        <div>
          <p className="eyebrow">Operaciones / Ventas</p>
          <h1>Semáforo de reabastecimiento</h1>
          <p className="subtitle">Estado de cada producto según su predicción de quiebre de stock.</p>
        </div>
        <span className="product-count">{alertas.length} productos</span>
      </div>

      {estado === 'cargando' && <p className="status-message">Cargando semáforo...</p>}
      {estado === 'error' && (
        <p className="status-message error-message">
          No se pudo cargar alertas-api. Verifica que el servicio esté corriendo.
        </p>
      )}

      <div className="product-grid">
        {alertas.map((a) => {
          const info = SEMAFORO_INFO[a.semaforo] || SEMAFORO_INFO.desconocido;
          return (
            <button
              key={a.producto_id}
              className="product-card product-card-clickable"
              style={{ borderLeft: `4px solid ${info.color}` }}
              onClick={() => onSeleccionarProducto?.(a.producto_id)}
            >
              <div className="card-topline">
                <span className="product-label">
                  {a.producto?.nombre || `Producto #${a.producto_id}`}
                </span>
                <span className="detail-subid">{a.producto?.sku || ''}</span>
              </div>
              <strong className="sales-number">{a.stock_actual ?? '—'}</strong>
              <span className="sales-label">unidades en stock</span>
              <span className="status-badge" style={{ color: info.color, marginTop: 8 }}>
                <span className="status-dot" style={{ backgroundColor: info.dot }} />
                {a.pedir_ya ? 'Pedir ya' : info.text}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
