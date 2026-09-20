import { useCallback, useEffect, useRef, useState } from 'react';

// Ejecuta una función asíncrona al montar (y cuando cambian `deps`) y expone su estado.
// Ignora respuestas de llamadas viejas para no pisar datos más recientes.
export function useCargar(fn, deps = []) {
  const [estado, setEstado] = useState({ datos: null, cargando: true, error: null });
  const contador = useRef(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const recargar = useCallback(async () => {
    const id = ++contador.current;
    setEstado((e) => ({ ...e, cargando: true, error: null }));
    try {
      const datos = await fnRef.current();
      if (id === contador.current) setEstado({ datos, cargando: false, error: null });
    } catch (err) {
      if (id === contador.current) {
        setEstado((e) => ({ ...e, cargando: false, error: err.message || 'Ocurrió un error.' }));
      }
    }
  }, []);

  useEffect(() => {
    recargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { ...estado, recargar };
}
