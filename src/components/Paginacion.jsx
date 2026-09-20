export default function Paginacion({ paginaActual, totalPaginas, onCambiarPagina }) {
  if (totalPaginas <= 1) return null;

  // Muestra máximo 5 números de página, centrados en la página actual.
  const paginas = [];
  let inicio = Math.max(1, paginaActual - 2);
  let fin = Math.min(totalPaginas, inicio + 4);
  inicio = Math.max(1, fin - 4);
  for (let i = inicio; i <= fin; i++) paginas.push(i);

  return (
    <nav className="pagination" aria-label="Paginación">
      <button
        className="pagination-btn"
        onClick={() => onCambiarPagina(paginaActual - 1)}
        disabled={paginaActual === 1}
      >
        ← Anterior
      </button>

      {inicio > 1 && (
        <>
          <button className="pagination-num" onClick={() => onCambiarPagina(1)}>1</button>
          {inicio > 2 && <span className="pagination-dots">…</span>}
        </>
      )}

      {paginas.map((n) => (
        <button
          key={n}
          className={`pagination-num ${n === paginaActual ? 'pagination-num-activo' : ''}`}
          onClick={() => onCambiarPagina(n)}
        >
          {n}
        </button>
      ))}

      {fin < totalPaginas && (
        <>
          {fin < totalPaginas - 1 && <span className="pagination-dots">…</span>}
          <button className="pagination-num" onClick={() => onCambiarPagina(totalPaginas)}>
            {totalPaginas}
          </button>
        </>
      )}

      <button
        className="pagination-btn"
        onClick={() => onCambiarPagina(paginaActual + 1)}
        disabled={paginaActual === totalPaginas}
      >
        Siguiente →
      </button>
    </nav>
  );
}
