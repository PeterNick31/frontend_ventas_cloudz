import { useEffect, useState } from 'react';
import { navegar } from '../hooks';

/**
 * Barra de filtros sincronizada con la URL (#/ruta?campo=valor): así los filtros
 * sobreviven a recargas y se pueden compartir enlaces ("ver tiempos del proveedor 12").
 */
export function BarraFiltros({ ruta, params, campos, children }) {
  const [local, setLocal] = useState(params);
  useEffect(() => setLocal(params), [JSON.stringify(params)]); // eslint-disable-line react-hooks/exhaustive-deps

  const aplicar = (e) => {
    e.preventDefault();
    navegar(ruta, local);
  };
  const limpiar = () => navegar(ruta);
  const activos = Object.values(params).some((v) => v !== '' && v != null);

  return (
    <form className="barra-herramientas filtros" onSubmit={aplicar}>
      <div className="filtros-campos">
        {campos.map((c) => (
          <label key={c.clave} className="filtro">
            <span>{c.etiqueta}</span>
            {c.opciones ? (
              <select value={local[c.clave] ?? ''} onChange={(e) => setLocal({ ...local, [c.clave]: e.target.value })}>
                <option value="">Todos</option>
                {c.opciones.map((o) => (
                  <option key={o.valor} value={o.valor}>
                    {o.texto}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={c.tipo || 'number'}
                min={c.tipo ? undefined : 1}
                value={local[c.clave] ?? ''}
                placeholder={c.placeholder}
                onChange={(e) => setLocal({ ...local, [c.clave]: e.target.value })}
                style={{ width: c.ancho || 110 }}
              />
            )}
          </label>
        ))}
        <button type="submit" className="btn btn-sm">
          Filtrar
        </button>
        {activos && (
          <button type="button" className="btn btn-sm btn-texto" onClick={limpiar}>
            Quitar filtros
          </button>
        )}
      </div>
      {children}
    </form>
  );
}

/** Si el filtro "id" viene informado se pide un único registro (GET /recurso/{id}) en vez del listado. */
export function conBusquedaPorId(listar, obtener) {
  return async (p, filtros, opts) => {
    const { id, ...resto } = filtros;
    if (id) {
      try {
        const r = await obtener(id);
        return { items: r ? [r] : [], hasNext: false };
      } catch (e) {
        if (e.status === 404) return { items: [], hasNext: false };
        throw e;
      }
    }
    return listar(p, resto, opts);
  };
}
