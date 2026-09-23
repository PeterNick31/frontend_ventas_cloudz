import { analitica } from '../api/endpoints';
import { useAsync } from '../hooks';
import { Cabecera, Cargando, ErrorCarga, Vacio, fmt, useApp } from '../components/ui';

/** Barras horizontales: cada fila muestra etiqueta, barra proporcional al máximo y valor. */
function Barras({ filas, etiqueta, valor, formato = fmt.entero, onClickFila, color = 'verde' }) {
  const max = Math.max(...filas.map((f) => Number(f[valor]) || 0), 1);
  return (
    <ol className="barras">
      {filas.map((f, i) => {
        const v = Number(f[valor]) || 0;
        const contenido = (
          <>
            <span className="barras-etiqueta">{etiqueta(f)}</span>
            <span className="barras-pista">
              <span className={`barras-relleno barras-${color}`} style={{ width: `${(v / max) * 100}%` }} />
            </span>
            <span className="barras-valor">{formato(v)}</span>
          </>
        );
        return (
          <li key={i}>
            {onClickFila ? (
              <button className="barras-fila" onClick={() => onClickFila(f)}>
                {contenido}
              </button>
            ) : (
              <div className="barras-fila">{contenido}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function Bloque({ titulo, descripcion, consulta, children }) {
  return (
    <section className="bloque">
      <div className="bloque-cabeza">
        <div>
          <h2>{titulo}</h2>
          <p className="muted">{descripcion}</p>
        </div>
        <button className="btn btn-sm" onClick={consulta.recargar} disabled={consulta.cargando}>
          {consulta.cargando ? 'Consultando…' : 'Volver a consultar'}
        </button>
      </div>
      {consulta.error ? (
        <ErrorCarga error={consulta.error} onReintentar={consulta.recargar} />
      ) : consulta.cargando ? (
        <Cargando texto="Consultando Athena sobre el data lake… puede tardar unos segundos." />
      ) : !consulta.datos?.length ? (
        <Vacio>La consulta no devolvió filas. ¿Ya corrió la ingesta en VM4?</Vacio>
      ) : (
        children(consulta.datos)
      )}
    </section>
  );
}

export default function Analitica() {
  const { abrirProducto } = useApp();
  const rotacion = useAsync(() => analitica.rotacionCategoria(), []);
  const quiebres = useAsync(() => analitica.productosMasQuiebres(), []);

  return (
    <>
      <Cabecera
        titulo="Analítica"
        descripcion="Consultas SQL en Amazon Athena sobre los archivos que la ingesta dejó en S3 (última carga). No consultan las bases operacionales."
      />
      <div className="bloques">
        <Bloque titulo="Rotación por categoría" descripcion="Unidades vendidas por categoría: ventas (PostgreSQL) unidas con productos (MySQL)." consulta={rotacion}>
          {(filas) => (
            <>
              <Barras filas={filas} etiqueta={(f) => f.categoria || 'Sin categoría'} valor="unidades_vendidas" />
              <p className="muted nota">
                {fmt.entero(filas.reduce((s, f) => s + Number(f.unidades_vendidas || 0), 0))} unidades en {filas.length} categorías.
              </p>
            </>
          )}
        </Bloque>
        <Bloque
          titulo="Productos con más días en riesgo alto"
          descripcion="Predicciones con probabilidad de quiebre mayor a 66 % (MongoDB) unidas con el catálogo (MySQL). Top 20."
          consulta={quiebres}
        >
          {(filas) => (
            <Barras
              filas={filas}
              etiqueta={(f) => (
                <>
                  <span className="celda-id">#{f.producto_id}</span> {f.nombre}
                </>
              )}
              valor="veces_riesgo_alto"
              formato={(v) => `${fmt.entero(v)} días`}
              color="rojo"
              onClickFila={(f) => abrirProducto(Number(f.producto_id))}
            />
          )}
        </Bloque>
      </div>
    </>
  );
}
