import { ChevronLeft, ChevronRight } from 'lucide-react';

// Paginación de cliente: se conoce el total de páginas.
export default function Paginacion({ paginaActual, totalPaginas, onCambiarPagina }) {
  if (totalPaginas <= 1) return null;

  // Muestra máximo 5 números de página, centrados en la actual.
  const paginas = [];
  let inicio = Math.max(1, paginaActual - 2);
  const fin = Math.min(totalPaginas, inicio + 4);
  inicio = Math.max(1, fin - 4);
  for (let i = inicio; i <= fin; i++) paginas.push(i);

  return (
    <nav className="paginacion" aria-label="Paginación">
      <button type="button" className="pag-btn" onClick={() => onCambiarPagina(paginaActual - 1)} disabled={paginaActual === 1}>
        <ChevronLeft size={16} /> Anterior
      </button>
      {inicio > 1 && (
        <>
          <button type="button" className="pag-num" onClick={() => onCambiarPagina(1)}>1</button>
          {inicio > 2 && <span className="pag-puntos">…</span>}
        </>
      )}
      {paginas.map((n) => (
        <button
          type="button"
          key={n}
          className={`pag-num ${n === paginaActual ? 'pag-activa' : ''}`}
          aria-current={n === paginaActual ? 'page' : undefined}
          onClick={() => onCambiarPagina(n)}
        >
          {n}
        </button>
      ))}
      {fin < totalPaginas && (
        <>
          {fin < totalPaginas - 1 && <span className="pag-puntos">…</span>}
          <button type="button" className="pag-num" onClick={() => onCambiarPagina(totalPaginas)}>{totalPaginas}</button>
        </>
      )}
      <button type="button" className="pag-btn" onClick={() => onCambiarPagina(paginaActual + 1)} disabled={paginaActual === totalPaginas}>
        Siguiente <ChevronRight size={16} />
      </button>
    </nav>
  );
}

// Paginación de servidor: las APIs no devuelven total, así que solo se sabe si hay "más".
// `hayMas` es true cuando la página vino llena. `pagina` empieza en 0.
export function PaginadorServidor({ pagina, hayMas, onCambiar }) {
  if (pagina === 0 && !hayMas) return null;
  return (
    <nav className="paginacion" aria-label="Paginación">
      <button type="button" className="pag-btn" onClick={() => onCambiar(pagina - 1)} disabled={pagina === 0}>
        <ChevronLeft size={16} /> Anterior
      </button>
      <span className="pag-puntos">Página {pagina + 1}</span>
      <button type="button" className="pag-btn" onClick={() => onCambiar(pagina + 1)} disabled={!hayMas}>
        Siguiente <ChevronRight size={16} />
      </button>
    </nav>
  );
}
