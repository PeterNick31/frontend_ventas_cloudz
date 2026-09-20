/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { CircleAlert, CircleCheck, TriangleAlert } from 'lucide-react';

const ToastContext = createContext(null);
const ICONOS = { ok: CircleCheck, error: CircleAlert, aviso: TriangleAlert };

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const mostrar = useCallback((tipo, texto) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, tipo, texto }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tipo === 'ok' ? 4000 : 9000);
  }, []);

  const api = useMemo(
    () => ({
      ok: (t) => mostrar('ok', t),
      error: (t) => mostrar('error', t),
      aviso: (t) => mostrar('aviso', t),
    }),
    [mostrar],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => {
          const Icono = ICONOS[t.tipo];
          return (
            <div key={t.id} className={`toast toast-${t.tipo}`}>
              <Icono size={18} />
              <span>{t.texto}</span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
