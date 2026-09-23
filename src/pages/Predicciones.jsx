import { useState } from 'react';
import { prediccion } from '../api/endpoints';
import { useNombres, usePaged } from '../hooks';
import { CampoReferencia, CeldaProducto } from '../components/referencias';
import { BarraProb, Cabecera, Cargando, ErrorCarga, NivelRiesgo, Paginador, Vacio, fmt, useApp } from '../components/ui';

export default function Predicciones() {
  const { toast, abrirProducto } = useApp();
  const pag = usePaged(prediccion.listar, {}, 25);
  const nombres = useNombres('producto', pag.items.map((p) => p.producto_id));
  const [calculando, setCalculando] = useState(null);
  const [productoId, setProductoId] = useState('');

  const calcular = async (id) => {
    setCalculando(Number(id));
    try {
      const r = await prediccion.calcular(id);
      toast(`Predicción del producto #${id}: riesgo ${r.nivel_riesgo} (${fmt.pct(r.prob_quiebre)})`);
      pag.recargar();
      return r;
    } catch (e) {
      toast(e.message, 'error');
      return null;
    } finally {
      setCalculando(null);
    }
  };

  return (
    <>
      <Cabecera
        titulo="Predicciones de quiebre"
        descripcion="Última predicción de cada producto. Se recalcula todas las noches a las 02:00; también puedes recalcular un producto ahora."
      />

      <form
        className="barra-herramientas calcular"
        onSubmit={async (e) => {
          e.preventDefault();
          if (await calcular(productoId)) abrirProducto(Number(productoId));
        }}
      >
        <div className="calcular-campo">
          <span className="campo-etiqueta">Calcular predicción de un producto</span>
          <CampoReferencia tipo="producto" valor={productoId} onCambiar={setProductoId} />
        </div>
        <button className="btn btn-primary" disabled={!productoId || calculando != null}>
          {calculando != null && Number(productoId) === calculando ? 'Calculando…' : 'Calcular ahora'}
        </button>
      </form>

      <div className="tabla-marco">
        {pag.error ? (
          <ErrorCarga error={pag.error} onReintentar={pag.recargar} />
        ) : pag.cargando && !pag.items.length ? (
          <Cargando />
        ) : !pag.items.length ? (
          <Vacio>Todavía no hay predicciones.</Vacio>
        ) : (
          <table className={pag.cargando ? 'tabla tabla-cargando' : 'tabla'}>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Calculada</th>
                <th className="num">Vende al día</th>
                <th className="num">Stock</th>
                <th className="num">Se agota en</th>
                <th className="num">Entrega</th>
                <th>Prob. de quiebre</th>
                <th>Nivel</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pag.items.map((p) => (
                <tr key={p.producto_id}>
                  <td>
                    <CeldaProducto id={p.producto_id} nombres={nombres} />
                  </td>
                  <td>{fmt.fecha(p.fecha)}</td>
                  <td className="num">{fmt.num(p.velocidad_venta_diaria, 2)}</td>
                  <td className="num">{fmt.entero(p.stock_actual)}</td>
                  <td className="num">{p.dias_hasta_agotamiento == null ? 'Sin ventas' : `${fmt.num(p.dias_hasta_agotamiento, 1)} d`}</td>
                  <td className="num">{p.tiempo_entrega_promedio} d</td>
                  <td>
                    <BarraProb valor={p.prob_quiebre} />
                  </td>
                  <td>
                    <NivelRiesgo nivel={p.nivel_riesgo} />
                  </td>
                  <td className="celda-acciones">
                    <button className="btn btn-sm" onClick={() => calcular(p.producto_id)} disabled={calculando != null}>
                      {calculando === p.producto_id ? 'Calculando…' : 'Recalcular'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Paginador {...pag} cantidad={pag.items.length} />
      </div>
    </>
  );
}
