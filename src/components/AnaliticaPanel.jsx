import { useEffect, useState } from 'react';
import { URLS, fetchSeguro } from './api';

export default function AnaliticaPanel() {
  const [rotacion, setRotacion] = useState(null);
  const [masQuiebres, setMasQuiebres] = useState(null);
  const [estado, setEstado] = useState('cargando');

  useEffect(() => {
    const cargar = async () => {
      setEstado('cargando');
      // 2 llamadas directas a Analítica (Athena)
      const [rot, quiebres] = await Promise.all([
        fetchSeguro(`${URLS.analitica}/rotacion-categoria`),
        fetchSeguro(`${URLS.analitica}/productos-mas-quiebres`),
      ]);
      if (!rot && !quiebres) {
        setEstado('error');
        return;
      }
      setRotacion(rot || []);
      setMasQuiebres(quiebres || []);
      setEstado('listo');
    };
    cargar();
  }, []);

  const maxUnidades = rotacion ? Math.max(...rotacion.map((r) => r.unidades_vendidas), 1) : 1;

  return (
    <section className="sales-dashboard">
      <div className="dashboard-heading">
        <div>
          <p className="eyebrow">Operaciones / Analítica</p>
          <h1>Panel de estadísticas</h1>
          <p className="subtitle">Rotación por categoría y productos con más riesgo de quiebre (Athena).</p>
        </div>
      </div>

      {estado === 'cargando' && <p className="status-message">Cargando estadísticas...</p>}
      {estado === 'error' && (
        <p className="status-message error-message">
          analitica-api no respondió. Puede que Athena/Glue aún no estén configurados.
        </p>
      )}

      {estado === 'listo' && (
        <>
          <h2 style={{ fontSize: 15, color: '#173b2c', marginBottom: 12 }}>Rotación por categoría</h2>
          <div className="detail-card" style={{ marginBottom: 32, padding: 20 }}>
            {rotacion.length === 0 && <p className="status-message">Sin datos todavía.</p>}
            {rotacion.map((r) => (
              <div key={r.categoria} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                  <span>{r.categoria}</span>
                  <span>{r.unidades_vendidas} unidades · {r.productos_distintos} productos</span>
                </div>
                <div style={{ background: '#e7e2d2', height: 8, borderRadius: 4 }}>
                  <div
                    style={{
                      width: `${(r.unidades_vendidas / maxUnidades) * 100}%`,
                      background: '#173b2c',
                      height: 8,
                      borderRadius: 4,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <h2 style={{ fontSize: 15, color: '#173b2c', marginBottom: 12 }}>
            Top productos con más riesgo de quiebre
          </h2>
          <div className="product-grid">
            {masQuiebres.map((p) => (
              <div key={p.producto_id} className="product-card">
                <div className="card-topline">
                  <span className="product-label">{p.nombre}</span>
                  <span className="detail-subid">#{p.producto_id} · {p.categoria}</span>
                </div>
                <strong className="sales-number">{p.veces_riesgo_alto}</strong>
                <span className="sales-label">veces en riesgo alto</span>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
