import Semaforo from './components/Semaforo';

function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand-mark">B</div>
        <div>
          <strong>Bodega Inteligente</strong>
          <span>Panel de gestión</span>
        </div>
      </header>
      <main>
        <Semaforo />
      </main>
    </div>
  );
}

export default App;