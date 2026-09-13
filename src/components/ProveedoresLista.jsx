import { useEffect, useState } from 'react';

const PROVEEDORES_URL = (import.meta.env.VITE_PROVEEDORES_URL || 'http://localhost:5001').replace(/\/$/, '');

export default function ProveedoresLista() {
  const [proveedores, setProveedores] = useState([]);
  const [estado, setEstado] = useState('cargando');
  const [error, setError] = useState('');

  useEffect(() => {
    const cargar = async () => {
      try {
        setEstado('cargando');
        // Llamada directa a Proveedores: GET /proveedores
        const response = await fetch(`${PROVEEDORES_URL}/proveedores`);
        if (!response.ok) throw new Error(`La API respondió con ${response.status}`);
        const data = await response.json();
        setProveedores(Array.isArray(data) ? data : []);
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
          <p className="eyebrow">Operaciones / Proveedores</p>
          <h1>Proveedores registrados</h1>
          <p className="subtitle">Contactos y tiempos de entrega generales por proveedor.</p>
        </div>
        <span className="product-count">{proveedores.length} proveedores</span>
      </div>

      {estado === 'cargando' && <p className="status-message">Cargando proveedores...</p>}
      {estado === 'error' && <p className="status-message error-message">No se pudo cargar proveedores: {error}</p>}

      <div className="product-grid">
        {proveedores.map((prov) => (
          <div key={prov.id} className="product-card">
            <div className="card-topline">
              <span className="product-label">{prov.nombre}</span>
              <span className="detail-subid">#{prov.id}</span>
            </div>
            <strong className="sales-number">{prov.tiempoEntregaDias ?? prov.tiempo_entrega_dias ?? '—'}</strong>
            <span className="sales-label">días de entrega promedio</span>
            {(prov.telefono || prov.contacto) && (
              <span className="detail-subid" style={{ marginTop: 8, display: 'block' }}>
                {prov.contacto || prov.telefono}
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
