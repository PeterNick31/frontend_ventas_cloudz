import { useEffect, useState } from 'react';

// Router mínimo basado en el hash: "#/inventario/12" -> partes ["inventario", "12"].
// Da enlaces compartibles y el botón "atrás" funciona sin dependencias extra.
export function useHashRoute() {
  const [hash, setHash] = useState(() => window.location.hash);

  useEffect(() => {
    const alCambiar = () => setHash(window.location.hash);
    window.addEventListener('hashchange', alCambiar);
    return () => window.removeEventListener('hashchange', alCambiar);
  }, []);

  const partes = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  return { partes, seccion: partes[0] || 'inicio' };
}

export function irA(ruta) {
  window.location.hash = ruta.startsWith('/') ? ruta : `/${ruta}`;
}
