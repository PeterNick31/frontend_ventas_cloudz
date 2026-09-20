import { useMemo, useState } from 'react';

const POR_PAGINA = 12;

/**
 * Pagina en el cliente un arreglo ya cargado por completo.
 * Se resetea a la página 1 cada vez que cambia el tamaño de la lista
 * (por ejemplo, al volver a cargar los datos).
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
