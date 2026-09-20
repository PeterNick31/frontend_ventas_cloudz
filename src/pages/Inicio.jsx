import { useMemo } from 'react';
import { Plus } from 'lucide-react';
import { alertas } from '../api/analisis';
import { movimientos } from '../api/inventario';
import { pedidos, ventasDelRango } from '../api/ventas';
import { irA } from '../hooks/useHashRoute';
import { useCatalogos } from '../hooks/useCatalogos';
import { useCargar } from '../hooks/useCargar';
import { useOperador } from '../hooks/useOperador';
import { fechaHora, hoyISO, moneda } from '../utils/formato';
import Boton from '../ui/Boton';
import { Badge, Cargando, ErrorCaja, EstadoVacio, SemaforoBadge } from '../ui/Estado';
import PageHeader from '../ui/PageHeader';
import { TIPOS_MOVIMIENTO, textoCantidad } from '../utils/movimientos';

export default function Inicio() {
  const { operador } = useOperador();
  const { nombreProducto } = useCatalogos();
  const alertasQ = useCargar(() => alertas.lista(), []);
  const ventasQ = useCargar(() => ventasDelRango(hoyISO(), hoyISO(), { maxPaginas: 8 }), []);
  const movsQ = useCargar(() => movimientos.listar({ limit: 6 }), []);
  const transitoQ = useCargar(() => pedidos.listar({ estado: 'en_transito', size: 50 }), []);

  const lista = useMemo(() => (Array.isArray(alertasQ.datos) ? alertasQ.datos : []), [alertasQ.datos]);
  const conteo = useMemo(() => {
    const c = { rojo: 0, amarillo: 0, verde: 0 };
    lista.forEach((a) => {
      if (c[a.semaforo] !== undefined) c[a.semaforo] += 1;
    });
    return c;
  }, [lista]);
  const urgentes = useMemo(
    () =>
      lista
        .filter((a) => a.pedir_ya || a.semaforo === 'rojo')
        .sort((a, b) => (a.dias_hasta_agotamiento ?? 1e9) - (b.dias_hasta_agotamiento ?? 1e9))
        .slice(0, 8),
    [lista],
  );

  const ventasHoy = ventasQ.datos?.filas || [];
  const totalHoy = ventasHoy.reduce((s, v) => s + Number(v.total || 0), 0);
  const enTransito = Array.isArray(transitoQ.datos) ? transitoQ.datos : [];
  const saludo = new Date().getHours() < 12 ? 'Buenos días' : new Date().getHours() < 19 ? 'Buenas tardes' : 'Buenas noches';

  return (
    <>
      <PageHeader
        titulo={`${saludo}${operador ? `, ${operador}` : ''}`}
        subtitulo="Esto es lo que necesita tu atención hoy."
        acciones={<Boton grande icono={Plus} onClick={() => irA('/vender')}>Nueva venta</Boton>}
      />

      {alertasQ.error ? (
        <ErrorCaja mensaje={`No se pudo cargar el semáforo de reposición. ${alertasQ.error}`} onReintentar={alertasQ.recargar} />
      ) : (
        <div className="kpis">
          <div className="kpi kpi-rojo"><span className="kpi-valor">{conteo.rojo}</span><span className="kpi-etiqueta">Pedir ya</span></div>
          <div className="kpi kpi-amarillo"><span className="kpi-valor">{conteo.amarillo}</span><span className="kpi-etiqueta">Vigilar de cerca</span></div>
          <div className="kpi kpi-verde"><span className="kpi-valor">{conteo.verde}</span><span className="kpi-etiqueta">Stock saludable</span></div>
          <div className="kpi kpi-neutro">
            <span className="kpi-valor">{ventasQ.error ? '—' : `${ventasQ.datos?.truncado ? '≥ ' : ''}${moneda(totalHoy)}`}</span>
            <span className="kpi-etiqueta">Vendido hoy · {ventasHoy.length} ventas</span>
          </div>
        </div>
      )}

      <div className="rejilla rejilla-2">
        <section className="panel">
          <div className="panel-cabecera">
            <h2>Productos por pedir</h2>
            <a href="#/inventario">Ver inventario</a>
          </div>
          {alertasQ.cargando && !alertasQ.datos && <Cargando />}
          {alertasQ.datos && urgentes.length === 0 && <EstadoVacio titulo="Todo en orden" texto="Ningún producto necesita reposición urgente." />}
          <ul className="lista-simple">
            {urgentes.map((a) => (
              <li key={a.producto_id}>
                <div>
                  <a href={`#/inventario/${a.producto_id}`}><strong>{nombreProducto(a.producto_id)}</strong></a>
                  <span className="sub">
                    Stock {a.stock_actual ?? '—'}
                    {a.dias_hasta_agotamiento != null && ` · se agota en ${Number(a.dias_hasta_agotamiento).toFixed(1)} días`}
                  </span>
                </div>
                <div className="acciones-fila">
                  <SemaforoBadge semaforo={a.semaforo} texto={a.pedir_ya ? 'Pedir ya' : undefined} />
                  <Boton className="boton-chico" onClick={() => irA(`/pedidos/nuevo/${a.producto_id}`)}>Crear pedido</Boton>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel">
          <div className="panel-cabecera">
            <h2>Últimos movimientos</h2>
            <a href="#/inventario/movimientos">Ver todos</a>
          </div>
          {movsQ.cargando && !movsQ.datos && <Cargando />}
          {movsQ.error && <ErrorCaja mensaje={movsQ.error} onReintentar={movsQ.recargar} />}
          {Array.isArray(movsQ.datos) && movsQ.datos.length === 0 && <EstadoVacio titulo="Sin movimientos todavía" />}
          <ul className="lista-simple">
            {(Array.isArray(movsQ.datos) ? movsQ.datos : []).map((m) => (
              <li key={m.id}>
                <div>
                  <strong>{nombreProducto(m.producto_id)}</strong>
                  <span className="sub">{fechaHora(m.fecha_movimiento)}{m.usuario && ` · ${m.usuario}`}</span>
                </div>
                <div className="acciones-fila">
                  <Badge clase={TIPOS_MOVIMIENTO[m.tipo_movimiento]?.clase}>{TIPOS_MOVIMIENTO[m.tipo_movimiento]?.etiqueta}</Badge>
                  <strong>{textoCantidad(m)}</strong>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="panel">
        <div className="panel-cabecera">
          <h2>Pedidos en tránsito</h2>
          <a href="#/pedidos">Ver pedidos</a>
        </div>
        {transitoQ.error && <ErrorCaja mensaje={transitoQ.error} onReintentar={transitoQ.recargar} />}
        {Array.isArray(transitoQ.datos) && enTransito.length === 0 && <p className="subtitulo">No hay pedidos en camino.</p>}
        <ul className="lista-simple">
          {enTransito.slice(0, 6).map((p) => (
            <li key={p.id}>
              <div>
                <strong>{nombreProducto(p.productoId)}</strong>
                <span className="sub">Pedido #{p.id} · {p.cantidadPedida} unidades</span>
              </div>
              <a href="#/pedidos">Recibir</a>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
