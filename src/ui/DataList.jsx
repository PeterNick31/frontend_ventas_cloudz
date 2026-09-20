// Tabla en escritorio; en móvil cada fila se vuelve una tarjeta (ver CSS .datalist).
// columnas: [{ titulo, render(fila), principal?, acciones?, alinear? }]
export default function DataList({ columnas, filas, clave, onFila, etiqueta }) {
  return (
    <div className="datalist-marco">
      <table className="datalist" aria-label={etiqueta}>
        <thead>
          <tr>
            {columnas.map((c) => (
              <th key={c.titulo} className={c.alinear === 'derecha' ? 'derecha' : ''}>
                {c.titulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((fila) => (
            <tr
              key={clave(fila)}
              className={onFila ? 'fila-clicable' : ''}
              onClick={onFila ? () => onFila(fila) : undefined}
              onKeyDown={
                onFila
                  ? (e) => {
                      if (e.target === e.currentTarget && e.key === 'Enter') onFila(fila);
                    }
                  : undefined
              }
              tabIndex={onFila ? 0 : undefined}
            >
              {columnas.map((c) => (
                <td
                  key={c.titulo}
                  data-label={c.titulo}
                  className={[
                    c.principal ? 'celda-principal' : '',
                    c.acciones ? 'celda-acciones' : '',
                    c.alinear === 'derecha' ? 'derecha' : '',
                  ].join(' ')}
                >
                  {c.acciones ? (
                    // Evita que un clic en un botón dispare también el clic de la fila.
                    <div className="acciones-fila" onClick={(e) => e.stopPropagation()}>
                      {c.render(fila)}
                    </div>
                  ) : (
                    c.render(fila)
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
