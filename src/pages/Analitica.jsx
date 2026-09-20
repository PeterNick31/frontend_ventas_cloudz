import { useMemo, useState } from 'react';
import { analitica } from '../api/analisis';
import { ventasDelRango } from '../api/ventas';
import { useCatalogos } from '../hooks/useCatalogos';
import { useCargar } from '../hooks/useCargar';
import { fechaCorta, hoyISO, moneda, sumarDias } from '../utils/formato';
import { Cargando, ErrorCaja, EstadoVacio } from '../ui/Estado';
import PageHeader from '../ui/PageHeader';

const VENTANAS = [7, 14, 30];
const MAX_PAGINAS = 40; // 40 × 200 = 8000 filas: tope para no cargar historiales enormes

// Trae las ventas de los últimos `dias` días. Como la API ordena por fecha (más reciente primero),
// si se alcanza el tope se descarta el día más antiguo (incompleto) y la ventana se acorta,
// para que los totales nunca se calculen con días a medias.
async function ventasUltimosDias(dias) {
  const hasta = hoyISO();
  let desde = sumarDias(hasta, -(dias - 1));
  const { filas, truncado } = await ventasDelRango(desde, hasta, { maxPaginas: MAX_PAGINAS, concurrencia: 5 });
  if (!truncado) return { filas, desde, hasta, truncado, dias, pedido: dias };
  const masAntigua = filas.reduce((m, v) => (v.fecha < m ? v.fecha : m), hasta);
  desde = sumarDias(masAntigua, 1);
  const completos = Math.round((new Date(`${hasta}T00:00`) - new Date(`${desde}T00:00`)) / 864e5) + 1;
  return { filas: filas.filter((v) => v.fecha >= desde), desde, hasta, truncado, dias: completos, pedido: dias };
}

export default function Analitica() {
  const { nombreProducto } = useCatalogos();
  const [ventana, setVentana] = useState(7);
  const ventasQ = useCargar(() => ventasUltimosDias(ventana), [ventana]);
  const rotacionQ = useCargar(() => analitica.rotacionCategoria(), []);
  const quiebresQ = useCargar(() => analitica.productosMasQuiebres(), []);

  // Ventas por día: se calculan en el navegador con ventas-api, sin depender de Athena.
  const resumen = useMemo(() => {
    if (!ventasQ.datos) return null;
    const { filas, desde, dias: DIAS } = ventasQ.datos;
    const porDia = new Map();
    for (let i = 0; i < DIAS; i += 1) porDia.set(sumarDias(desde, i), 0);
    const porProducto = new Map();
    filas.forEach((v) => {
      porDia.set(v.fecha, (porDia.get(v.fecha) || 0) + Number(v.total || 0));
      porProducto.set(v.productoId, (porProducto.get(v.productoId) || 0) + v.cantidadVendida);
    });
    const dias = [...porDia.entries()].map(([fecha, total]) => ({ fecha, total }));
    const total = dias.reduce((s, d) => s + d.total, 0);
    const mejor = dias.reduce((m, d) => (d.total > m.total ? d : m), dias[0]);
    const top = [...porProducto.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    return { dias, total, mejor, top, n: DIAS, max: Math.max(...dias.map((d) => d.total), 1) };
  }, [ventasQ.datos]);

  const rotacion = Array.isArray(rotacionQ.datos) ? rotacionQ.datos : [];
  // Athena puede devolver unidades_vendidas = null: en ese caso se compara por cantidad de productos.
  const hayUnidades = rotacion.some((r) => r.unidades_vendidas != null);
  const valorRot = (r) => (hayUnidades ? Number(r.unidades_vendidas ?? 0) : Number(r.productos_distintos ?? 0));
  const maxRot = Math.max(...rotacion.map(valorRot), 1);
  const quiebres = Array.isArray(quiebresQ.datos) ? quiebresQ.datos : [];

  return (
    <>
      <PageHeader titulo="Analítica" subtitulo="Cómo se están moviendo las ventas y qué productos tienen más riesgo." />

      <section className="panel">
        <div className="panel-cabecera">
          <h2>Ventas de los últimos {resumen?.n ?? ventana} días</h2>
          <div className="chips" style={{ margin: 0 }} role="group" aria-label="Período">
            {VENTANAS.map((d) => (
              <button key={d} type="button" className="chip" aria-pressed={ventana === d} onClick={() => setVentana(d)}>{d} días</button>
            ))}
          </div>
        </div>
        {ventasQ.cargando && !ventasQ.datos && <Cargando />}
        {ventasQ.error && <ErrorCaja mensaje={ventasQ.error} onReintentar={ventasQ.recargar} />}
        {resumen && (
          <>
            <div className="kpis" style={{ marginBottom: 16 }}>
              <div className="kpi kpi-neutro"><span className="kpi-valor">{moneda(resumen.total)}</span><span className="kpi-etiqueta">Vendido en total</span></div>
              <div className="kpi kpi-neutro"><span className="kpi-valor">{moneda(resumen.total / resumen.n)}</span><span className="kpi-etiqueta">Promedio por día</span></div>
              <div className="kpi kpi-verde"><span className="kpi-valor">{resumen.mejor.total > 0 ? moneda(resumen.mejor.total) : '—'}</span><span className="kpi-etiqueta">Mejor día{resumen.mejor.total > 0 && ` · ${fechaCorta(resumen.mejor.fecha)}`}</span></div>
            </div>
            {resumen.total === 0 ? (
              <EstadoVacio titulo="Sin ventas en este período" texto="Cuando registres ventas, el gráfico aparecerá aquí." />
            ) : (
              <>
                <div className="grafico-dias" role="img" aria-label={`Ventas por día de los últimos ${resumen.n} días. Total ${moneda(resumen.total)}.`}>
                  {resumen.dias.map((d) => (
                    <div key={d.fecha} className="grafico-col" title={`${fechaCorta(d.fecha)}: ${moneda(d.total)}`}>
                      <div className="grafico-barra" style={{ height: `${Math.max((d.total / resumen.max) * 100, d.total > 0 ? 3 : 0)}%` }} />
                    </div>
                  ))}
                </div>
                <div className="grafico-ejes"><span>{fechaCorta(resumen.dias[0].fecha)}</span><span>{fechaCorta(resumen.dias[resumen.n - 1].fecha)}</span></div>
              </>
            )}
            {ventasQ.datos.truncado && <p className="aviso aviso-aviso">Hay tantas ventas que se muestran solo los últimos {resumen.n} días completos (pediste {ventasQ.datos.pedido}).</p>}
          </>
        )}
      </section>

      <div className="rejilla rejilla-2" style={{ marginTop: 16 }}>
        <section className="panel" style={{ marginTop: 0 }}>
          <h2>Lo más vendido (unidades, {resumen?.n ?? ventana} días)</h2>
          {resumen && resumen.top.length === 0 && <p className="subtitulo">Sin ventas en el período.</p>}
          {resumen && resumen.top.length > 0 && (
            <ol className="barras">
              {resumen.top.map(([id, unidades]) => (
                <li key={id}>
                  <div className="barras-fila"><span>{nombreProducto(id)}</span><strong>{unidades}</strong></div>
                  <div className="barras-pista"><div className="barras-relleno" style={{ width: `${(unidades / resumen.top[0][1]) * 100}%` }} /></div>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="panel" style={{ marginTop: 0 }}>
          <h2>Rotación por categoría</h2>
          {rotacionQ.cargando && !rotacionQ.datos && <Cargando />}
          {rotacionQ.error && <p className="aviso aviso-aviso">Este dato viene de Athena y no está disponible ahora. El resto de la pantalla funciona igual.</p>}
          {rotacionQ.datos && rotacion.length === 0 && <p className="subtitulo">Sin datos todavía.</p>}
          {rotacion.length > 0 && !hayUnidades && <p className="aviso aviso-info">Athena aún no devuelve las unidades vendidas: las barras comparan cuántos productos tiene cada categoría.</p>}
          <ol className="barras">
            {rotacion.map((r) => (
              <li key={r.categoria}>
                <div className="barras-fila"><span>{r.categoria}</span><span>{hayUnidades ? `${r.unidades_vendidas ?? 0} u · ` : ''}{r.productos_distintos} productos</span></div>
                <div className="barras-pista"><div className="barras-relleno" style={{ width: `${(valorRot(r) / maxRot) * 100}%` }} /></div>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <section className="panel">
        <h2>Productos que más veces estuvieron en riesgo alto</h2>
        {quiebresQ.cargando && !quiebresQ.datos && <Cargando />}
        {quiebresQ.error && <p className="aviso aviso-aviso">Este dato viene de Athena y no está disponible ahora.</p>}
        {quiebresQ.datos && quiebres.length === 0 && <p className="subtitulo">Sin datos todavía.</p>}
        <ol className="barras">
          {quiebres.map((p) => (
            <li key={p.producto_id}>
              <div className="barras-fila">
                <a href={`#/inventario/${p.producto_id}`}>{p.nombre}</a>
                <span>{p.veces_riesgo_alto} veces · {p.categoria}</span>
              </div>
              <div className="barras-pista"><div className="barras-relleno rojo" style={{ width: `${(p.veces_riesgo_alto / quiebres[0].veces_riesgo_alto) * 100}%` }} /></div>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
