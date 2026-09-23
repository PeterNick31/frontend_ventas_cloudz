import { useState } from 'react';
import { alertas, inventario } from '../api/endpoints';
import { registrarNombre, usePaged } from '../hooks';
import { FormPedido } from '../components/formularios';
import { BarraProb, BarraStock, Cabecera, Cargando, ErrorCarga, Paginador, Semaforo, Vacio, fmt, useApp } from '../components/ui';

// Alertas y catálogo recorren los productos en el mismo orden (por id): se piden en paralelo y se unen.
async function paginaAlertas(p, filtros, opts) {
  const [a, prods] = await Promise.all([alertas.listar(p, filtros, opts), inventario.listarProductos(p, {}, opts)]);
  const porId = new Map(prods.items.map((x) => [x.id, x]));
  prods.items.forEach((x) => registrarNombre('producto', x.id, x));
  return { items: a.items.map((al) => ({ ...al, producto: porId.get(al.producto_id) })), hasNext: a.hasNext };
}

export default function Alertas() {
  const { abrirProducto } = useApp();
  const pag = usePaged(paginaAlertas, {}, 25);
  const [pedido, setPedido] = useState(null);
  const [soloUrgentes, setSoloUrgentes] = useState(false);

  const conteo = { rojo: 0, amarillo: 0, verde: 0, desconocido: 0 };
  pag.items.forEach((a) => (conteo[a.semaforo] = (conteo[a.semaforo] || 0) + 1));
  const filas = soloUrgentes ? pag.items.filter((a) => a.pedir_ya) : pag.items;

  return (
    <>
      <Cabecera titulo="Alertas de stock" descripcion="Semáforo por producto según su predicción de quiebre, stock actual y tiempo de entrega del proveedor." />

      <div className="barra-herramientas">
        <div className="leyenda" aria-label="Resumen de la página">
          <span><Semaforo valor="rojo" compacto /> {conteo.rojo} pedir ya</span>
          <span><Semaforo valor="amarillo" compacto /> {conteo.amarillo} vigilar</span>
          <span><Semaforo valor="verde" compacto /> {conteo.verde} stock sano</span>
          {conteo.desconocido > 0 && <span><Semaforo valor="desconocido" compacto /> {conteo.desconocido} sin predicción</span>}
          <span className="muted">en esta página</span>
        </div>
        <label className="interruptor">
          <input type="checkbox" checked={soloUrgentes} onChange={(e) => setSoloUrgentes(e.target.checked)} />
          Mostrar solo los que hay que pedir
        </label>
      </div>

      <div className="tabla-marco">
        {pag.error ? (
          <ErrorCarga error={pag.error} onReintentar={pag.recargar} />
        ) : pag.cargando && !pag.items.length ? (
          <Cargando texto="Calculando alertas…" />
        ) : !filas.length ? (
          <Vacio>{soloUrgentes ? 'Ningún producto de esta página necesita pedido. Prueba la página siguiente.' : 'No hay productos.'}</Vacio>
        ) : (
          <table className={pag.cargando ? 'tabla tabla-cargando' : 'tabla'}>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Estado</th>
                <th>Stock</th>
                <th className="num">Se agota en</th>
                <th className="num">Entrega</th>
                <th>Prob. de quiebre</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filas.map((a) => (
                <tr key={a.producto_id} className={a.pedir_ya ? 'fila-urgente' : ''}>
                  <td>
                    <button className="celda-ref" onClick={() => abrirProducto(a.producto_id)}>
                      <span className="celda-id">#{a.producto_id}</span>
                      <span className="celda-nombre">{a.producto?.nombre ?? '—'}</span>
                    </button>
                    <div className="sub">{a.producto?.categoria}</div>
                  </td>
                  <td>
                    <Semaforo valor={a.semaforo} />
                  </td>
                  <td>{a.producto ? <BarraStock actual={a.stock_actual ?? a.producto.stock_actual} minimo={a.producto.stock_minimo} /> : fmt.entero(a.stock_actual)}</td>
                  <td className="num">{a.dias_hasta_agotamiento == null ? '—' : `${fmt.num(a.dias_hasta_agotamiento, 1)} días`}</td>
                  <td className="num">{a.tiempo_entrega_promedio == null ? '—' : `${a.tiempo_entrega_promedio} días`}</td>
                  <td>{a.prob_quiebre == null ? <span className="muted">{a.error ? 'Sin datos' : '—'}</span> : <BarraProb valor={a.prob_quiebre} />}</td>
                  <td className="celda-acciones">
                    {a.pedir_ya && (
                      <button className="btn btn-sm btn-primary" onClick={() => setPedido({ productoId: a.producto_id })}>
                        Pedir al proveedor
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Paginador {...pag} cantidad={pag.items.length} />
      </div>

      {pedido && <FormPedido inicial={pedido} onCerrar={() => setPedido(null)} />}
    </>
  );
}
