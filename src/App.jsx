import { useEffect, useState } from 'react';
import { ChartColumn, Ellipsis, House, Package, Receipt, ShoppingCart, Truck, UserRound, Users } from 'lucide-react';
import { useHashRoute } from './hooks/useHashRoute';
import { OperadorProvider, useOperador } from './hooks/useOperador';
import { CatalogosProvider } from './hooks/useCatalogos';
import { ToastProvider } from './ui/Toast';
import Modal from './ui/Modal';
import Boton from './ui/Boton';
import Campo from './ui/Campo';
import Inicio from './pages/Inicio';
import Vender from './pages/Vender';
import Inventario from './pages/Inventario';
import Movimientos from './pages/Movimientos';
import ProductoDetalle from './pages/ProductoDetalle';
import Ventas from './pages/Ventas';
import Pedidos from './pages/Pedidos';
import Proveedores from './pages/Proveedores';
import Analitica from './pages/Analitica';

const NAV = [
  { clave: 'inicio', etiqueta: 'Inicio', icono: House },
  { clave: 'inventario', etiqueta: 'Inventario', icono: Package },
  { clave: 'ventas', etiqueta: 'Ventas', icono: Receipt },
  { clave: 'pedidos', etiqueta: 'Pedidos', icono: Truck },
  { clave: 'proveedores', etiqueta: 'Proveedores', icono: Users },
  { clave: 'analitica', etiqueta: 'Analítica', icono: ChartColumn },
];
const TITULOS = { vender: 'Vender', ...Object.fromEntries(NAV.map((n) => [n.clave, n.etiqueta])) };

function OperadorDialogo({ onCerrar }) {
  const { operador, setOperador } = useOperador();
  const [nombre, setNombre] = useState(operador);

  const guardar = (e) => {
    e.preventDefault();
    if (nombre.trim()) setOperador(nombre);
    onCerrar();
  };

  return (
    <Modal
      titulo="¿Quién registra?"
      onCerrar={onCerrar}
      ancho="sm"
      pie={
        <>
          <Boton variante="secundario" onClick={onCerrar}>
            Ahora no
          </Boton>
          <Boton type="submit" form="form-operador" disabled={!nombre.trim()}>
            Guardar
          </Boton>
        </>
      }
    >
      <form id="form-operador" onSubmit={guardar}>
        <p className="modal-texto">
          Tu nombre quedará anotado en cada movimiento de stock para saber quién hizo qué. No es una contraseña.
        </p>
        <Campo etiqueta="Nombre">
          <input
            className="input"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            maxLength={80}
            placeholder="Ej. Diego"
            autoComplete="off"
          />
        </Campo>
      </form>
    </Modal>
  );
}

function Shell() {
  const { partes, seccion } = useHashRoute();
  const { operador } = useOperador();
  const [dialogoOperador, setDialogoOperador] = useState(() => !operador);
  const [masAbierto, setMasAbierto] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    setMasAbierto(false);
    document.title = `${TITULOS[seccion] || 'Bodega'} · Bodega Inteligente`;
  }, [partes.join('/'), seccion]); // eslint-disable-line react-hooks/exhaustive-deps

  const enlace = (n, clase = 'nav-item') => (
    <a
      key={n.clave}
      href={`#/${n.clave}`}
      className={clase}
      aria-current={seccion === n.clave ? 'page' : undefined}
    >
      <n.icono size={20} />
      {n.etiqueta}
    </a>
  );

  let pagina;
  switch (seccion) {
    case 'vender':
      pagina = <Vender />;
      break;
    case 'inventario':
      if (!partes[1]) pagina = <Inventario />;
      else if (partes[1] === 'movimientos') pagina = <Movimientos />;
      else pagina = <ProductoDetalle key={partes[1]} id={partes[1]} />;
      break;
    case 'ventas':
      pagina = <Ventas />;
      break;
    case 'pedidos':
      pagina = <Pedidos productoNuevo={partes[1] === 'nuevo' ? partes[2] : null} />;
      break;
    case 'proveedores':
      pagina = <Proveedores />;
      break;
    case 'analitica':
      pagina = <Analitica />;
      break;
    default:
      pagina = <Inicio />;
  }

  const enMas = ['ventas', 'proveedores', 'analitica'].includes(seccion);

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="marca">
          <div className="marca-logo">B</div>
          <div>
            <strong>Bodega Inteligente</strong>
            <span>Panel de gestión</span>
          </div>
        </div>
        <nav className="nav" aria-label="Principal">
          <a href="#/vender" className="nav-item nav-vender" aria-current={seccion === 'vender' ? 'page' : undefined}>
            <ShoppingCart size={20} />
            Vender
          </a>
          {NAV.map((n) => enlace(n))}
        </nav>
        <button type="button" className="operador-boton" onClick={() => setDialogoOperador(true)}>
          <UserRound size={20} />
          <span>
            <small>Registrando como</small>
            {operador || 'Sin nombre'}
          </span>
        </button>
      </aside>

      <main className="contenido">{pagina}</main>

      <nav className="nav-inferior" aria-label="Principal">
        <a href="#/inicio" aria-current={seccion === 'inicio' ? 'page' : undefined}>
          <House size={22} />
          Inicio
        </a>
        <a href="#/inventario" aria-current={seccion === 'inventario' ? 'page' : undefined}>
          <Package size={22} />
          Inventario
        </a>
        <a href="#/vender" className="nav-vender-mov" aria-current={seccion === 'vender' ? 'page' : undefined}>
          <ShoppingCart size={22} />
          Vender
        </a>
        <a href="#/pedidos" aria-current={seccion === 'pedidos' ? 'page' : undefined}>
          <Truck size={22} />
          Pedidos
        </a>
        <button
          type="button"
          onClick={() => setMasAbierto((v) => !v)}
          aria-expanded={masAbierto}
          aria-current={enMas ? 'page' : undefined}
        >
          <Ellipsis size={22} />
          Más
        </button>
      </nav>
      {masAbierto && (
        <div className="nav-mas">
          {NAV.filter((n) => ['ventas', 'proveedores', 'analitica'].includes(n.clave)).map((n) => enlace(n))}
          <button type="button" className="nav-item" onClick={() => setDialogoOperador(true)}>
            <UserRound size={20} />
            {operador || 'Sin nombre'}
          </button>
        </div>
      )}

      {dialogoOperador && <OperadorDialogo onCerrar={() => setDialogoOperador(false)} />}
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <OperadorProvider>
        <CatalogosProvider>
          <Shell />
        </CatalogosProvider>
      </OperadorProvider>
    </ToastProvider>
  );
}
