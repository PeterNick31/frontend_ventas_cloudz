import { useEffect, useState } from 'react';
import { URLS, fetchSeguro, SEMAFORO_INFO } from './api';

export default function DetalleProducto({ productoIdInicial = '', onProductoIdConsumido }) {
  const [productoId, setProductoId] = useState(productoIdInicial);
  const [consultaActual, setConsultaActual] = useState('');
  const [producto, setProducto] = useState(null);
  const [alerta, setAlerta] = useState(null);
  const [tiempoEntrega, setTiempoEntrega] = useState(null);
  const [historialVentas, setHistorialVentas] = useState(null);
  const [prediccion, setPrediccion] = useState(null);
  const [recalculando, setRecalculando] = useState(false);
  const [estado, setEstado] = useState('inicial'); // inicial | cargando | listo | error

  const cargarTodo = async (id) => {
    if (!id) return;
    setEstado('cargando');

    const [prod, alertaData, entrega, ventas, pred] = await Promise.all([
      // Inventario: GET /api/inventario/productos/{id}
      fetchSeguro(`${URLS.inventario}/productos/${id}`),
      // Alertas: GET /api/alertas/{id} (agrega Predicción + Inventario + Proveedores)
      fetchSeguro(`${URLS.alertas}/${id}`),
      // Proveedores: GET /api/proveedores/producto/{id}/tiempo-entrega
      fetchSeguro(`${URLS.proveedores}/producto/${id}/tiempo-entrega`),
      // Ventas: GET /api/ventas/producto/{id}?dias=30
      fetchSeguro(`${URLS.ventas}/producto/${id}?dias=30`),
      // Predicción: GET /api/prediccion/{id}
      fetchSeguro(`${URLS.prediccion}/${id}`),
    ]);

    if (!prod) {
      setEstado('error');
      return;
    }

    setProducto(prod);
    setAlerta(alertaData);
    setTiempoEntrega(entrega);
    setHistorialVentas(Array.isArray(ventas) ? ventas : null);
    setPrediccion(pred);
    setEstado('listo');
  };

  const recalcularPrediccion = async () => {
    if (!consultaActual) return;
    setRecalculando(true);
    // Predicción: POST /api/prediccion/calcular/{id} (2do método REST distinto)
    await fetchSeguro(`${URLS.prediccion}/calcular/${consultaActual}`, {
      method: 'POST',
    });
    await cargarTodo(consultaActual);
    setRecalculando(false);
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
    if (consultaActual) cargarTodo(consultaActual);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consultaActual]);

  const info = alerta ? SEMAFORO_INFO[alerta.semaforo] || SEMAFORO_INFO.desconocido : null;

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
          placeholder="ID de producto, ej. 42"
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
      {estado === 'error' && (
        <p className="status-message error-message">
          No existe el producto "{consultaActual}" o inventario-api no respondió.
        </p>
      )}

      {estado === 'listo' && producto && (
        <article className="detail-card">
          <div className="detail-header" style={{ borderColor: info?.color || '#94a3b8' }}>
            <div>
              <span className="product-label">{producto.nombre}</span>
              <span className="detail-subid">
                {producto.sku} · {producto.categoria}
              </span>
            </div>
            {info && (
              <span className="status-badge" style={{ color: info.color }}>
                <span className="status-dot" style={{ backgroundColor: info.dot }} />
                {alerta.pedir_ya ? 'Pedir ya' : info.text}
              </span>
            )}
          </div>

          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-item-label">Stock actual</span>
              <strong className="detail-item-value">{producto.stock_actual}</strong>
            </div>
            <div className="detail-item">
              <span className="detail-item-label">Stock mínimo</span>
              <strong className="detail-item-value">{producto.stock_minimo}</strong>
            </div>
            <div className="detail-item">
              <span className="detail-item-label">Días hasta agotamiento</span>
              <strong className="detail-item-value">
                {alerta?.dias_hasta_agotamiento != null
                  ? `${Number(alerta.dias_hasta_agotamiento).toFixed(1)} días`
                  : '—'}
              </strong>
            </div>
            <div className="detail-item">
              <span className="detail-item-label">Proveedor</span>
              <strong className="detail-item-value">
                {tiempoEntrega?.proveedor_nombre || 'No asignado'}
              </strong>
            </div>
            <div className="detail-item">
              <span className="detail-item-label">Tiempo de entrega</span>
              <strong className="detail-item-value">
                {tiempoEntrega?.dias_entrega_promedio != null
                  ? `${tiempoEntrega.dias_entrega_promedio} días`
                  : '—'}
              </strong>
            </div>
            <div className="detail-item">
              <span className="detail-item-label">Precio unitario</span>
              <strong className="detail-item-value">S/ {producto.precio_unitario}</strong>
            </div>
          </div>

          {alerta?.advertencia && (
            <div className="detail-contact">⚠️ {alerta.advertencia}</div>
          )}
          {alerta?.error && <div className="detail-contact">⚠️ {alerta.error}</div>}

          {prediccion && (
            <div className="detail-contact">
              <strong>Predicción vigente:</strong> velocidad de venta{' '}
              {Number(prediccion.velocidad_venta_diaria).toFixed(1)} u/día, nivel de riesgo{' '}
              {prediccion.nivel_riesgo}, probabilidad de quiebre{' '}
              {Math.round(prediccion.prob_quiebre * 100)}%
            </div>
          )}

          <div className="detail-contact" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>¿Predicción desactualizada?</span>
            <button
              className="search-button"
              onClick={recalcularPrediccion}
              disabled={recalculando}
              type="button"
            >
              {recalculando ? 'Recalculando...' : 'Recalcular predicción'}
            </button>
          </div>

          {historialVentas && historialVentas.length > 0 && (
            <div className="detail-contact">
              <strong>Últimas ventas (30 días):</strong>{' '}
              {historialVentas.slice(0, 5).map((v) => v.cantidadVendida).join(', ')} unidades
            </div>
          )}
        </article>
      )}
    </section>
  );
}
