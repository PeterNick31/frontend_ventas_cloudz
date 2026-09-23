import { useCallback, useEffect, useState } from 'react';
import { API_BASE } from './api/client';
import { SERVICIOS } from './api/endpoints';
import DetalleProducto from './components/DetalleProducto';
import { AppProvider } from './components/ui';
import { useHashRoute } from './hooks';
import Alertas from './pages/Alertas';
import Analitica from './pages/Analitica';
import Inventario from './pages/Inventario';
import Predicciones from './pages/Predicciones';
import Proveedores from './pages/Proveedores';
import Ventas from './pages/Ventas';

const MENU = [
  { ruta: '/alertas', texto: 'Alertas de stock', servicio: 'alertas' },
  { ruta: '/inventario/productos', base: '/inventario', texto: 'Inventario', servicio: 'inventario' },
  { ruta: '/ventas/diarias', base: '/ventas', texto: 'Ventas y pedidos', servicio: 'ventas' },
  { ruta: '/proveedores/lista', base: '/proveedores', texto: 'Proveedores', servicio: 'proveedores' },
  { ruta: '/predicciones', texto: 'Predicciones', servicio: 'prediccion' },
  { ruta: '/analitica', texto: 'Analítica', servicio: 'analitica' },
];

/** Consulta cada microservicio cada 60 s para mostrar su estado junto al menú. */
function useEstadoServicios() {
  const [estado, setEstado] = useState({});
  useEffect(() => {
    if (!API_BASE) return undefined;
    const revisar = () =>
      SERVICIOS.forEach((s) => {
        s.ping()
          .then(() => setEstado((e) => ({ ...e, [s.clave]: 'ok' })))
          .catch((err) => setEstado((e) => ({ ...e, [s.clave]: err.status ? `HTTP ${err.status}` : 'sin conexión' })));
      });
    revisar();
    const t = setInterval(revisar, 60000);
    return () => clearInterval(t);
  }, []);
  return estado;
}

export default function App() {
  const { ruta, params } = useHashRoute();
  const [productoAbierto, setProductoAbierto] = useState(null);
  const [menuMovil, setMenuMovil] = useState(false);
  const estado = useEstadoServicios();
  const abrirProducto = useCallback((id) => setProductoAbierto(Number(id)), []);

  useEffect(() => setMenuMovil(false), [ruta]);

  const [, seccion, sub] = ruta.split('/');
  let pagina;
  if (seccion === 'inventario') pagina = <Inventario seccion={sub} params={params} />;
  else if (seccion === 'ventas') pagina = <Ventas seccion={sub} params={params} />;
  else if (seccion === 'proveedores') pagina = <Proveedores seccion={sub} params={params} />;
  else if (seccion === 'predicciones') pagina = <Predicciones />;
  else if (seccion === 'analitica') pagina = <Analitica />;
  else pagina = <Alertas />;

  const activo = (m) => (m.base ? ruta.startsWith(m.base) : ruta === m.ruta) || (m.ruta === '/alertas' && !MENU.some((x) => ruta.startsWith(x.base || x.ruta)));

  return (
    <AppProvider onAbrirProducto={abrirProducto}>
      <div className="app">
        <aside className={`lateral ${menuMovil ? 'lateral-abierto' : ''}`}>
          <div className="marca">
            <span className="marca-logo" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            <div>
              <strong>Bodega Inteligente</strong>
              <span>Panel de gestión</span>
            </div>
            <button className="btn-icon menu-movil" onClick={() => setMenuMovil(!menuMovil)} aria-label="Abrir menú" aria-expanded={menuMovil}>
              ☰
            </button>
          </div>

          <nav className="menu" aria-label="Secciones">
            {MENU.map((m) => (
              <a key={m.ruta} href={`#${m.ruta}`} className={`menu-item ${activo(m) ? 'menu-activo' : ''}`} aria-current={activo(m) ? 'page' : undefined}>
                <span>{m.texto}</span>
                <span
                  className={`punto ${estado[m.servicio] === 'ok' ? 'punto-ok' : estado[m.servicio] ? 'punto-mal' : ''}`}
                  title={estado[m.servicio] === 'ok' ? 'Servicio en línea' : estado[m.servicio] || 'Comprobando…'}
                />
              </a>
            ))}
          </nav>

          <div className="servicios">
            <span className="campo-etiqueta">Documentación de las APIs (Swagger)</span>
            <ul>
              {SERVICIOS.map((s) => (
                <li key={s.clave}>
                  <a href={API_BASE + s.docs} target="_blank" rel="noreferrer">
                    {s.nombre}
                  </a>
                  <span className="muted">{s.lenguaje}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <main className="contenido">
          {!API_BASE && (
            <div className="aviso aviso-config" role="alert">
              Falta la variable <code>VITE_API_BASE_URL</code> con la URL de API Gateway. En Amplify: Hosting → Variables de entorno, y vuelve a
              desplegar.
            </div>
          )}
          {pagina}
        </main>
      </div>

      {productoAbierto && <DetalleProducto key={productoAbierto} id={productoAbierto} onCerrar={() => setProductoAbierto(null)} />}
    </AppProvider>
  );
}
