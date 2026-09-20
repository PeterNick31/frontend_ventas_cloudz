import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

const FOCALIZABLES = 'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])';

export default function Modal({ titulo, onCerrar, children, pie, ancho = 'md' }) {
  const dialogo = useRef(null);
  const cerrarRef = useRef(onCerrar);
  cerrarRef.current = onCerrar;

  useEffect(() => {
    const previo = document.activeElement;
    const cuerpo = dialogo.current.querySelector('.modal-cuerpo');
    (cuerpo.querySelector(FOCALIZABLES) || dialogo.current).focus();
    document.body.classList.add('sin-scroll');

    const alTecla = (e) => {
      if (e.key === 'Escape') {
        cerrarRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      // Mantiene el foco dentro del diálogo.
      const items = [...dialogo.current.querySelectorAll(FOCALIZABLES)];
      if (items.length === 0) return;
      const primero = items[0];
      const ultimo = items[items.length - 1];
      if (e.shiftKey && document.activeElement === primero) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primero.focus();
      }
    };
    document.addEventListener('keydown', alTecla);
    return () => {
      document.removeEventListener('keydown', alTecla);
      document.body.classList.remove('sin-scroll');
      previo?.focus?.();
    };
  }, []);

  return (
    <div className="modal-fondo" onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}>
      <div
        className={`modal modal-${ancho}`}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        ref={dialogo}
        tabIndex={-1}
      >
        <div className="modal-cabecera">
          <h2>{titulo}</h2>
          <button type="button" className="icono-boton" onClick={onCerrar} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>
        <div className="modal-cuerpo">{children}</div>
        {pie && <div className="modal-pie">{pie}</div>}
      </div>
    </div>
  );
}
