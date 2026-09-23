import { useEffect, useState } from 'react';
import { alertas, inventario, prediccion, proveedores, ventas } from '../api/endpoints';
import { navegar, olvidarNombre, useAsync } from '../hooks';
import { ESTADOS_PEDIDO, FormMovimiento, FormPedido, FormProducto, FormVenta } from './formularios';
import { BarraProb, BarraStock, Confirmar, NivelRiesgo, Semaforo, fmt, hoyISO, sumarDias, useApp } from './ui';

// Una sección que carga por su cuenta: si un servicio falla, el resto del panel sigue funcionando.
function Seccion({ titulo, consulta, vacio, children, accion }) {
  let cuerpo;
  if (consulta.cargando) cuerpo = <p className="muted">Cargando…</p>;
  else if (consulta.error?.status === 404) cuerpo = <p className="muted">{vacio}</p>;
  else if (consulta.error) cuerpo = <p className="texto-rojo">{consulta.error.message}</p>;
  else cuerpo = children(consulta.datos);
  return (
    <section className="det-seccion">
      <div className="det-seccion-cabeza">
        <h3>{titulo}</h3>
        {accion}
      </div>
      {cuerpo}
    </section>
  );
}

/** 28 barras diarias con las unidades vendidas (más reciente a la derecha). */
function VentasDiarias({ historial }) {
  const hoy = hoyISO();
  const dias = Array.from({ length: 28 }, (_, i) => sumarDias(hoy, i - 27));
  const porDia = new Map();
  historial.forEach((v) => porDia.set(v.fecha, (porDia.get(v.fecha) || 0) + v.cantidadVendida));
  const max = Math.max(...porDia.values(), 1);
  const total = [...porDia.values()].reduce((a, b) => a + b, 0);
  return (
    <>
      <div className="mini-barras" role="img" aria-label={`${total} unidades vendidas en 28 días`}>
        {dias.map((d) => (
          <span key={d} title={`${fmt.fecha(d)}: ${porDia.get(d) || 0} u.`} style={{ height: `${((porDia.get(d) || 0) / max) * 100}%` }} />
        ))}
      </div>
      <p className="muted">
        {fmt.entero(total)} unidades en {historial.length} ventas durante los últimos 28 días.
      </p>
    </>
  );
}

export default function DetalleProducto({ id, onCerrar }) {
  const { toast } = useApp();
  const [modal, setModal] = useState(null);
  const [version, setVersion] = useState(0);
  const refrescar = () => setVersion((v) => v + 1);

  const producto = useAsync(() => inventario.obtenerProducto(id), [id, version]);
  const alerta = useAsync(() => alertas.deProducto(id), [id, version]);
  const pred = useAsync(() => prediccion.deProducto(id), [id, version]);
  const tiempo = useAsync(() => proveedores.tiempoDeProducto(id), [id, version]);
  const historial = useAsync(() => ventas.historialProducto(id, 28), [id, version]);
  const movs = useAsync(() => inventario.listarMovimientos({ offset: 0, limit: 5 }, { producto_id: id }), [id, version]);
  const pedidos = useAsync(() => ventas.listarPedidos({ offset: 0, limit: 5 }, { productoId: id }), [id, version]);
  const [recalculando, setRecalculando] = useState(false);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !modal && onCerrar();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [modal, onCerrar]);

  const recalcular = async () => {
    setRecalculando(true);
    try {
      await prediccion.calcular(id);
      toast(`Predicción del producto #${id} recalculada`);
      refrescar();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setRecalculando(false);
    }
  };

  const ir = (ruta, params) => {
    onCerrar();
    navegar(ruta, params);
  };

  const p = producto.datos;
  return (
    <div className="overlay overlay-lateral" onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}>
      <aside className="panel-lateral" role="dialog" aria-modal="true" aria-label={`Producto ${id}`}>
        <div className="det-cabeza">
          <div>
            <span className="celda-id">Producto #{id}</span>
            <h2>{p?.nombre ?? (producto.error ? 'No disponible' : 'Cargando…')}</h2>
            {p && (
              <p className="muted">
                {p.categoria || 'Sin categoría'}, {p.sku}, {fmt.soles(p.precio_unitario)} por {p.unidad_medida}
              </p>
            )}
          </div>
          <button className="btn-icon" onClick={onCerrar} aria-label="Cerrar">
            ✕
          </button>
        </div>

        {producto.error ? (
          <p className="form-error">{producto.error.message}</p>
        ) : (
          p && (
            <>
              <div className="det-acciones">
                <button className="btn btn-primary btn-sm" onClick={() => setModal('pedido')}>
                  Pedir al proveedor
                </button>
                <button className="btn btn-sm" onClick={() => setModal('movimiento')}>
                  Mover stock
                </button>
                <button className="btn btn-sm" onClick={() => setModal('venta')}>
                  Registrar venta
                </button>
                <button className="btn btn-sm btn-texto" onClick={() => setModal('editar')}>
                  Editar
                </button>
                <button className="btn btn-sm btn-texto texto-rojo" onClick={() => setModal('borrar')}>
                  Eliminar
                </button>
              </div>

              <div className="det-resumen">
                <div>
                  <span className="campo-etiqueta">Estado</span>
                  {alerta.cargando ? <span className="muted">…</span> : <Semaforo valor={alerta.datos?.semaforo || 'desconocido'} />}
                </div>
                <div className="det-stock">
                  <span className="campo-etiqueta">Stock (mínimo {fmt.entero(p.stock_minimo)})</span>
                  <BarraStock actual={p.stock_actual} minimo={p.stock_minimo} />
                </div>
              </div>
              {alerta.datos?.pedir_ya && <p className="aviso">El stock se agotaría antes de que llegue un pedido hecho hoy. Conviene pedir ya.</p>}
            </>
          )
        )}

        <Seccion
          titulo="Predicción"
          consulta={pred}
          vacio="Aún no hay predicción para este producto."
          accion={
            <button className="btn btn-sm" onClick={recalcular} disabled={recalculando}>
              {recalculando ? 'Calculando…' : 'Recalcular ahora'}
            </button>
          }
        >
          {(d) => (
            <dl className="datos">
              <div>
                <dt>Probabilidad de quiebre</dt>
                <dd>
                  <BarraProb valor={d.prob_quiebre} />
                </dd>
              </div>
              <div>
                <dt>Nivel</dt>
                <dd>
                  <NivelRiesgo nivel={d.nivel_riesgo} />
                </dd>
              </div>
              <div>
                <dt>Vende al día</dt>
                <dd>{fmt.num(d.velocidad_venta_diaria, 2)} u.</dd>
              </div>
              <div>
                <dt>Se agota en</dt>
                <dd>{d.dias_hasta_agotamiento == null ? 'Sin ventas recientes' : `${fmt.num(d.dias_hasta_agotamiento, 1)} días`}</dd>
              </div>
              <div>
                <dt>Calculada</dt>
                <dd>{fmt.fecha(d.fecha)}</dd>
              </div>
            </dl>
          )}
        </Seccion>

        <Seccion
          titulo="Proveedor más rápido"
          consulta={tiempo}
          vacio="Ningún proveedor tiene registrado este producto."
          accion={
            <button className="btn btn-sm btn-texto" onClick={() => ir('/proveedores/tiempos', { producto_id: id })}>
              Ver todos
            </button>
          }
        >
          {(t) => (
            <p>
              <strong>{t.proveedor_nombre}</strong> (#{t.proveedor_id}) entrega en {t.dias_entrega_promedio} días en promedio (entre {t.dias_entrega_min} y{' '}
              {t.dias_entrega_max}).
            </p>
          )}
        </Seccion>

        <Seccion
          titulo="Ventas de los últimos 28 días"
          consulta={historial}
          vacio="Sin ventas."
          accion={
            <button className="btn btn-sm btn-texto" onClick={() => ir('/ventas/diarias', { productoId: id })}>
              Ver ventas
            </button>
          }
        >
          {(h) => <VentasDiarias historial={h} />}
        </Seccion>

        <Seccion
          titulo="Últimos movimientos"
          consulta={movs}
          vacio="Sin movimientos."
          accion={
            <button className="btn btn-sm btn-texto" onClick={() => ir('/inventario/movimientos', { producto_id: id })}>
              Ver todos
            </button>
          }
        >
          {(r) =>
            r.items.length ? (
              <ul className="lista-compacta">
                {r.items.map((m) => (
                  <li key={m.id}>
                    <span className={`pill pill-mov-${m.tipo_movimiento}`}>{m.tipo_movimiento}</span>
                    <span>{fmt.entero(m.cantidad)} u.</span>
                    <span className="muted">{m.motivo || ''}</span>
                    <span className="muted">{fmt.fechaHora(m.fecha_movimiento)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">Sin movimientos.</p>
            )
          }
        </Seccion>

        <Seccion
          titulo="Pedidos a proveedores"
          consulta={pedidos}
          vacio="Sin pedidos."
          accion={
            <button className="btn btn-sm btn-texto" onClick={() => ir('/ventas/pedidos', { productoId: id })}>
              Ver todos
            </button>
          }
        >
          {(r) =>
            r.items.length ? (
              <ul className="lista-compacta">
                {r.items.map((pd) => (
                  <li key={pd.id}>
                    <span className={`pill estado-${pd.estado}`}>{ESTADOS_PEDIDO.find((e) => e.valor === pd.estado)?.texto}</span>
                    <span>{fmt.entero(pd.cantidadPedida)} u.</span>
                    <span className="muted">proveedor #{pd.proveedorId}</span>
                    <span className="muted">{fmt.fecha(pd.fechaPedido)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">Sin pedidos.</p>
            )
          }
        </Seccion>
      </aside>

      {modal === 'editar' && <FormProducto producto={p} onCerrar={() => setModal(null)} onGuardado={refrescar} />}
      {modal === 'movimiento' && <FormMovimiento productoId={id} onCerrar={() => setModal(null)} onGuardado={refrescar} />}
      {modal === 'venta' && <FormVenta productoId={id} onCerrar={() => setModal(null)} onGuardado={refrescar} />}
      {modal === 'pedido' && <FormPedido inicial={{ productoId: id }} onCerrar={() => setModal(null)} onGuardado={refrescar} />}
      {modal === 'borrar' && (
        <Confirmar
          titulo={`Eliminar producto #${id}`}
          mensaje={`Se eliminará "${p?.nombre}". Si tiene movimientos registrados, Inventario no permitirá borrarlo.`}
          onConfirmar={async () => {
            await inventario.eliminarProducto(id);
            olvidarNombre('producto', id);
            toast(`Producto #${id} eliminado`);
            onCerrar();
          }}
          onCerrar={() => setModal(null)}
        />
      )}
    </div>
  );
}
