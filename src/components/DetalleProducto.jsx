import { useEffect, useState } from 'react';

// Alertas ya agrega Inventario + Ventas + Predicción + Proveedores, así que
// es la única llamada que necesitamos para armar la vista completa.
const ALERTAS_URL = (import.meta.env.VITE_ALERTAS_URL || 'http://localhost:5002').replace(/\/$/, '');

const ESTADO_INFO = {
  rojo: { color: '#a5281c', dot: '#dc2626', text: 'Pedir ya' },
  amarillo: { color: '#a35f08', dot: '#d97706', text: 'Vigilar de cerca' },
  verde: { color: '#287345', dot: '#15803d', text: 'Stock saludable' },
  sin_datos: { color: '#64748b', dot: '#94a3b8', text: 'Sin predicción aún' },
};

export default function DetalleProducto() {
  const [productoId, setProductoId] = useState('');
  const [consultaActual, setConsultaActual] = useState('');
  const [alerta, setAlerta] = useState(null);
  const [estado, setEstado] = useState('inicial'); // inicial | cargando | listo | error
  const [error, setError] = useState('');

  const buscar = async (id) => {
    if (!id) return;
    setEstado('cargando');
    setError('');
    try {
      const response = await fetch(`${ALERTAS_URL}/alertas/${id}`);
      if (!response.ok) {
        if (response.status === 404) throw new Error(`No existe el producto "${id}"`);
        throw new Error(`La API respondió con ${response.status}`);
      }
      const data = await response.json();
      setAlerta(data);
      setEstado('listo');
    } catch (requestError) {
      setError(requestError.message);
      setEstado('error');
    }
  };

  useEffect(() => {
    if (consultaActual) buscar(consultaActual);
  }, [consultaActual]);

  const info = alerta ? ESTADO_INFO[alerta.estado] || ESTADO_INFO.sin_datos : null;

  return (
    <section className="sales-dashboard">
      <div className="dashboard-heading">
        <div>
          <p className="eyebrow">Operaciones / Inventario</p>
          <h1>Detalle de producto</h1>
          <p className="subtitle">Stock, predicción de agotamiento y proveedor asignado.</p>
        </div>
      </div>

      <form
        className="search-row"
        onSubmit={(e) => {
          e.preventDefault();
          setConsultaActual(productoId.trim());
        }}
      >
        <input
          type="text"
          placeholder="ID de producto, ej. P001"
          value={productoId}
          onChange={(e) => setProductoId(e.target.value)}
          className="search-input"
        />
        <button type="submit" className="search-button">Buscar</button>
      </form>

      {estado === 'inicial' && (
        <p className="status-message">Ingresa un ID de producto para ver su detalle.</p>
      )}
      {estado === 'cargando' && <p className="status-message">Cargando detalle...</p>}
      {estado === 'error' && <p className="status-message error-message">{error}</p>}

      {estado === 'listo' && alerta && (
        <article className="detail-card">
          <div className="detail-header" style={{ borderColor: info.color }}>
            <div>
              <span className="product-label">{alerta.nombreProducto}</span>
              <span className="detail-subid">Producto #{alerta.productoId}</span>
            </div>
            <span className="status-badge" style={{ color: info.color }}>
              <span className="status-dot" style={{ backgroundColor: info.dot }} />
              {info.text}
            </span>
          </div>

          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-item-label">Stock actual</span>
              <strong className="detail-item-value">{alerta.stockActual ?? '—'}</strong>
            </div>
            <div className="detail-item">
              <span className="detail-item-label">Días hasta agotamiento</span>
              <strong className="detail-item-value">
                {alerta.diasHastaAgotamiento != null
                  ? `${Number(alerta.diasHastaAgotamiento).toFixed(1)} días`
                  : '—'}
              </strong>
            </div>
            <div className="detail-item">
              <span className="detail-item-label">Proveedor</span>
              <strong className="detail-item-value">{alerta.proveedor || 'No asignado'}</strong>
            </div>
            <div className="detail-item">
              <span className="detail-item-label">Tiempo de entrega</span>
              <strong className="detail-item-value">
                {alerta.tiempoEntregaDias != null ? `${alerta.tiempoEntregaDias} días` : '—'}
              </strong>
            </div>
          </div>

          {alerta.contactoProveedor && (
            <div className="detail-contact">
              <strong>Contacto:</strong> {alerta.contactoProveedor.nombre} · {alerta.contactoProveedor.telefono}
            </div>
          )}

          <div className="detail-message">{alerta.mensaje}</div>
        </article>
      )}
    </section>
  );
}
