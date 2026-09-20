import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';

// Selector con búsqueda para listas largas (el catálogo real tiene ~1500 productos, un <select> no sirve).
// items: [{ id, nombre, sub? }]. `valor` es el id elegido ('' = ninguno). onChange recibe el id como string.
export default function Selector({ etiqueta, items, valor, onChange, placeholder = 'Todos — escribe para buscar', className = '', ayuda, deshabilitado }) {
  const [q, setQ] = useState('');
  const [abierto, setAbierto] = useState(false);
  const elegido = items.find((i) => String(i.id) === String(valor));

  const coincidencias = useMemo(() => {
    const t = q.trim().toLowerCase();
    return items.filter((i) => !t || `${i.nombre} ${i.sub || ''}`.toLowerCase().includes(t)).slice(0, 8);
  }, [items, q]);

  const elegir = (id) => {
    onChange(String(id));
    setQ('');
    setAbierto(false);
  };

  return (
    <div className={`campo selector ${className}`}>
      <span className="campo-etiqueta">{etiqueta}</span>
      {elegido ? (
        <div className="selector-elegido">
          <span>
            <strong>{elegido.nombre}</strong>
            {elegido.sub && <span className="sub">{elegido.sub}</span>}
          </span>
          {!deshabilitado && (
            <button type="button" className="icono-boton" onClick={() => onChange('')} aria-label={`Quitar ${etiqueta}`}>
              <X size={18} />
            </button>
          )}
        </div>
      ) : (
        <div className="buscador">
          <Search size={18} />
          <input
            className="input"
            role="combobox"
            aria-label={etiqueta}
            aria-expanded={abierto}
            aria-autocomplete="list"
            value={q}
            placeholder={placeholder}
            autoComplete="off"
            onChange={(e) => {
              setQ(e.target.value);
              setAbierto(true);
            }}
            onFocus={() => setAbierto(true)}
            onBlur={() => setAbierto(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && abierto && coincidencias[0]) {
                e.preventDefault();
                elegir(coincidencias[0].id);
              } else if (e.key === 'Escape' && abierto) {
                e.stopPropagation();
                setAbierto(false);
              }
            }}
          />
          {abierto && (
            <ul className="selector-lista" role="listbox">
              {coincidencias.length === 0 && <li className="selector-vacio">Sin resultados para «{q}»</li>}
              {coincidencias.map((i) => (
                <li key={i.id} role="option" aria-selected="false">
                  {/* mouseDown evita que el input pierda el foco (y cierre la lista) antes del clic */}
                  <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => elegir(i.id)}>
                    <strong>{i.nombre}</strong>
                    {i.sub && <span className="sub">{i.sub}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {ayuda && <span className="campo-ayuda">{ayuda}</span>}
    </div>
  );
}
