import { useMemo, useState } from 'react';

const POR_PAGINA = 20;

/**
 * Pagina en el cliente un arreglo ya cargado por completo.
 * Vuelve a la página 1 cuando cambian los filtros (se pasa `reiniciarCon`).
 */
export function usePaginacion(items, porPagina = POR_PAGINA) {
  const [pagina, setPagina] = useState(1);

  const totalPaginas = Math.max(1, Math.ceil(items.length / porPagina));
  const paginaSegura = Math.min(pagina, totalPaginas);

  const itemsPagina = useMemo(() => {
    const inicio = (paginaSegura - 1) * porPagina;
    return items.slice(inicio, inicio + porPagina);
  }, [items, paginaSegura, porPagina]);

  return { pagina: paginaSegura, totalPaginas, itemsPagina, setPagina };
}
