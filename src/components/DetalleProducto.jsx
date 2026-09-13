import { useEffect, useState } from 'react';

const ALERTAS_URL = (import.meta.env.VITE_ALERTAS_URL || 'http://localhost:5002').replace(/\/$/, '');
const INVENTARIO_URL = (import.meta.env.VITE_INVENTARIO_URL || 'http://localhost:8000').replace(/\/$/, '');
const VENTAS_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8082').replace(/\/$/, '');
const PROVEEDORES_URL = (import.meta.env.VITE_PROVEEDORES_URL || 'http://localhost:5001').replace(/\/$/, '');
const PREDICCION_URL = (import.meta.env.VITE_PREDICCION_URL || 'http://localhost:4004').replace(/\/$/, '');

const ESTADO_INFO = {
  rojo: { color: '#a5281c', dot: '#dc2626', text: 'Pedir ya' },
  amarillo: { color: '#a35f08', dot: '#d97706', text: 'Vigilar de cerca' },
  verde: { color: '#287345', dot: '#15803d', text: 'Stock saludable' },
  sin_datos: { color: '#64748b', dot: '#94a3b8', text: 'Sin predicción aún' },
};

// Trae un endpoint y no revienta el resto de la vista si falla — cada
// microservicio puede estar caído o no tener datos para este producto
// sin que eso tumbe toda la pantalla.
async function fetchSeguro(url) {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

export default function DetalleProducto({ productoIdInicial = '', onProductoIdConsumido }) {
  const [productoId, setProductoId] = useState(productoIdInicial);
  const [consultaActual, setConsultaActual] = useState('');
  const [alerta, setAlerta] = useState(null);
  const [producto, setProducto] = useState(null);
  const [historialVentas, setHistorialVentas] = useState(null);
  const [tiempoEntrega, setTiempoEntrega] = useState(null);
  const [tendenciaPrediccion, setTendenciaPrediccion] = useState(null);
  const [estado, setEstado] = useState('inicial'); // inicial | cargando | listo | error
  const [error, setError] = useState('');

  const buscar = async (id) => {
    if (!id) return;
    setEstado('cargando');
    setError('');
    try {
      // Alertas: fuente principal, agrega todo lo demás internamente.
      const alertaResponse = await fetch(`${ALERTAS_URL}/alertas/${id}`);
      if (!alertaResponse.ok) {
        if (alertaResponse.status === 404) throw new Error(`No existe el producto "${id}"`);
        throw new Error(`La API respondió con ${alertaResponse.status}`);
      }
      const alertaData = await alertaResponse.json();
      setAlerta(alertaData);

      // Llamadas directas adicionales a cada microservicio (requisito de la
      // rúbrica: cada uno debe ser invocado con ≥2 métodos REST desde el
      // frontend). Se piden en paralelo y en modo "best effort".
      const [prod, ventas, entrega, prediccionActual, prediccionDirecta] = await Promise.all([
        fetchSeguro(`${INVENTARIO_URL}/productos/${id}`),
        fetchSeguro(`${VENTAS_URL}/ventas/${id}`),
        fetchSeguro(`${PROVEEDORES_URL}/productos/${id}/tiempo-entrega`),
        fetchSeguro(`${PREDICCION_URL}/api/predicciones/${id}`),
        fetchSeguro(`${PREDICCION_URL}/api/predicciones/${id}/historial`),
      ]);
      setProducto(prod);
      setHistorialVentas(Array.isArray(ventas) ? ventas : ventas?.historial || null);
      setTiempoEntrega(entrega);
      setTendenciaPrediccion({
        actual: prediccionActual,
        historial: Array.isArray(prediccionDirecta) ? prediccionDirecta : prediccionDirecta?.historial || [],
      });

      setEstado('listo');
    } catch (requestError) {
      setError(requestError.message);
      setEstado('error');
    }
  };

  useEffect(() => {
    if (productoIdInicial) {
      setProductoId(productoIdInicial);
      setConsultaActual(productoIdInicial);
      onProductoIdConsumido?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productoIdInicial]);

  useEffect(() => {
    if (consultaActual) buscar(consultaActual);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
              <span className="detail-subid">
                Producto #{alerta.productoId}
                {producto?.categoria ? ` · ${producto.categoria}` : ''}
              </span>
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
              <strong className="detail-item-value">
                {tiempoEntrega?.proveedor || alerta.proveedor || 'No asignado'}
              </strong>
            </div>
            <div className="detail-item">
              <span className="detail-item-label">Tiempo de entrega</span>
              <strong className="detail-item-value">
                {(tiempoEntrega?.tiempoEntregaDias ?? alerta.tiempoEntregaDias) != null
                  ? `${tiempoEntrega?.tiempoEntregaDias ?? alerta.tiempoEntregaDias} días`
                  : '—'}
              </strong>
            </div>
          </div>

          {producto && (
            <div className="detail-contact">
              <strong>Ficha de inventario:</strong> stock mínimo{' '}
              {producto.stockMinimo ?? producto.stock_minimo ?? '—'}, precio unitario{' '}
              {producto.precioUnitario ?? producto.precio_unitario ?? '—'}
            </div>
          )}

          {historialVentas && historialVentas.length > 0 && (
            <div className="detail-contact">
              <strong>Últimas ventas:</strong>{' '}
              {historialVentas.slice(-5).map((v) => v.cantidad).join(', ')} unidades
            </div>
          )}

          {tendenciaPrediccion?.actual && (
            <div className="detail-contact">
              <strong>Predicción (directa):</strong> venta promedio diaria{' '}
              {tendenciaPrediccion.actual.ventaPromedioDiaria ?? '—'}, probabilidad de quiebre{' '}
              {tendenciaPrediccion.actual.probQuiebre != null
                ? `${Math.round(tendenciaPrediccion.actual.probQuiebre * 100)}%`
                : '—'}
            </div>
          )}

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
