/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useState } from 'react';

// El "operador" es solo una etiqueta de trazabilidad (se envía como `usuario` en los movimientos).
// No es autenticación: el backend no tiene login.
const CLAVE = 'bodega.operador';

const leer = () => {
  try {
    return localStorage.getItem(CLAVE) || '';
  } catch {
    return '';
  }
};

const OperadorContext = createContext(null);

export function OperadorProvider({ children }) {
  const [operador, setOperadorState] = useState(leer);

  const setOperador = useCallback((nombre) => {
    const limpio = nombre.trim();
    setOperadorState(limpio);
    try {
      localStorage.setItem(CLAVE, limpio);
    } catch {
      // sin almacenamiento: queda solo en memoria durante la sesión
    }
  }, []);

  const valor = useMemo(() => ({ operador, setOperador }), [operador, setOperador]);
  return <OperadorContext.Provider value={valor}>{children}</OperadorContext.Provider>;
}

export function useOperador() {
  return useContext(OperadorContext);
}
