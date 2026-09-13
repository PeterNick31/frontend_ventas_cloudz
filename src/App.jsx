import { useState } from 'react';
import Semaforo from './components/Semaforo';
import DetalleProducto from './components/DetalleProducto';

function App() {
  const [vista, setVista] = useState('semaforo'); // 'semaforo' | 'detalle'

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand-mark">B</div>
        <div>
          <strong>Bodega Inteligente</strong>
          <span>Panel de gestión</span>
        </div>
        <nav className="app-nav">
          <button
            className={`nav-link ${vista === 'semaforo' ? 'nav-link-active' : ''}`}
            onClick={() => setVista('semaforo')}
          >
            Semáforo de ventas
          </button>
          <button
            className={`nav-link ${vista === 'detalle' ? 'nav-link-active' : ''}`}
            onClick={() => setVista('detalle')}
          >
            Detalle de producto
          </button>
        </nav>
      </header>
      <main>
        {vista === 'semaforo' ? <Semaforo /> : <DetalleProducto />}
      </main>
    </div>
  );
}

export default App;
