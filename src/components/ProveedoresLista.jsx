import { useEffect, useState } from 'react';
import { URLS, fetchSeguro } from './api';

export default function ProveedoresLista() {
  const [proveedores, setProveedores] = useState([]);
  const [estado, setEstado] = useState('cargando');

  useEffect(() => {
    const cargar = async () => {
      setEstado('cargando');
      // Llamada directa a Proveedores: GET /api/proveedores
      const data = await fetchSeguro(`${URLS.proveedores}?limit=200`);
      if (!data) {
        setEstado('error');
        return;
      }
      setProveedores(data);
      setEstado('listo');
    };
    cargar();
  }, []);

  return (
    <section className="sales-dashboard">
      <div className="dashboard-heading">
        <div>
          <p className="eyebrow">Operaciones / Proveedores</p>
          <h1>Proveedores registrados</h1>
          <p className="subtitle">Contactos generales por proveedor.</p>
        </div>
        <span className="product-count">{proveedores.length} proveedores</span>
      </div>

      {estado === 'cargando' && <p className="status-message">Cargando proveedores...</p>}
      {estado === 'error' && (
        <p className="status-message error-message">No se pudo cargar proveedores-api.</p>
      )}

      <div className="product-grid">
        {proveedores.map((prov) => (
          <div key={prov.id} className="product-card">
            <div className="card-topline">
              <span className="product-label">{prov.nombre}</span>
              <span className="detail-subid">#{prov.id}</span>
            </div>
            <span className="sales-label">{prov.contacto || 'Sin contacto registrado'}</span>
            {prov.telefono && <span className="detail-subid">{prov.telefono}</span>}
            {prov.email && <span className="detail-subid">{prov.email}</span>}
          </div>
        ))}
      </div>
    </section>
  );
}
