import { useState } from 'react';
import Semaforo from './components/Semaforo';
import InventarioLista from './components/InventarioLista';
import ProveedoresLista from './components/ProveedoresLista';
import DetalleProducto from './components/DetalleProducto';
import AnaliticaPanel from './components/AnaliticaPanel';

function App() {
  const [vista, setVista] = useState('semaforo');
  const [productoIdPendiente, setProductoIdPendiente] = useState('');

  const irADetalle = (id) => {
    setProductoIdPendiente(id);
    setVista('detalle');
  };

  const pestañas = [
    { key: 'semaforo', label: 'Semáforo' },
    { key: 'inventario', label: 'Inventario' },
    { key: 'proveedores', label: 'Proveedores' },
    { key: 'detalle', label: 'Detalle de producto' },
    { key: 'analitica', label: 'Analítica' },
  ];

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand-mark">B</div>
        <div>
          <strong>Bodega Inteligente</strong>
          <span>Panel de gestión</span>
        </div>
        <nav className="app-nav">
          {pestañas.map((p) => (
            <button
              key={p.key}
              className={`nav-link ${vista === p.key ? 'nav-link-active' : ''}`}
              onClick={() => setVista(p.key)}
            >
              {p.label}
            </button>
          ))}
        </nav>
      </header>
      <main>
        {vista === 'semaforo' && <Semaforo onSeleccionarProducto={irADetalle} />}
        {vista === 'inventario' && <InventarioLista onSeleccionarProducto={irADetalle} />}
        {vista === 'proveedores' && <ProveedoresLista />}
        {vista === 'detalle' && (
          <DetalleProducto
            productoIdInicial={productoIdPendiente}
            onProductoIdConsumido={() => setProductoIdPendiente('')}
          />
        )}
        {vista === 'analitica' && <AnaliticaPanel />}
      </main>
    </div>
  );
}

export default App;
