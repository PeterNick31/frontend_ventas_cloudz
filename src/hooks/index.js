import { useCallback, useEffect, useRef, useState } from 'react';
import { inventario, proveedores } from '../api/endpoints';

/** Paginación del lado del servidor. fetchPage({offset, limit}, filtros, {signal}) -> {items, hasNext} */
export function usePaged(fetchPage, filtros, tamanoInicial = 25) {
  const [pagina, setPagina] = useState(1);
  const [tamano, setTamano] = useState(tamanoInicial);
  const [estado, setEstado] = useState({ items: [], hasNext: false, cargando: true, error: null });
  const [version, setVersion] = useState(0);
  const claveFiltros = JSON.stringify(filtros || {});

  // Al cambiar filtros o tamaño se vuelve a la página 1.
  useEffect(() => setPagina(1), [claveFiltros, tamano]);

  useEffect(() => {
    const ctrl = new AbortController();
    setEstado((e) => ({ ...e, cargando: true, error: null }));
    fetchPage({ offset: (pagina - 1) * tamano, limit: tamano }, JSON.parse(claveFiltros), { signal: ctrl.signal })
      .then((r) => setEstado({ items: r.items, hasNext: r.hasNext, cargando: false, error: null }))
      .catch((err) => {
        if (err.name !== 'AbortError') setEstado({ items: [], hasNext: false, cargando: false, error: err });
      });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagina, tamano, claveFiltros, version]);

  const recargar = useCallback(() => setVersion((v) => v + 1), []);
  return { ...estado, pagina, setPagina, tamano, setTamano, recargar };
}

/** Carga única con estado; recargar() vuelve a ejecutarla. */
export function useAsync(fn, deps) {
  const [estado, setEstado] = useState({ datos: null, cargando: true, error: null });
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let vivo = true;
    setEstado((e) => ({ ...e, cargando: true, error: null }));
    fn()
      .then((datos) => vivo && setEstado({ datos, cargando: false, error: null }))
      .catch((error) => vivo && setEstado({ datos: null, cargando: false, error }));
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version]);
  return { ...estado, recargar: () => setVersion((v) => v + 1) };
}

/** Rutas por hash (#/inventario/productos?producto_id=3): funcionan en Amplify sin reglas de reescritura. */
export function useHashRoute() {
  const leer = () => {
    const [ruta, qs] = (window.location.hash.replace(/^#/, '') || '/alertas').split('?');
    return { ruta, params: Object.fromEntries(new URLSearchParams(qs || '')) };
  };
  const [estado, setEstado] = useState(leer);
  useEffect(() => {
    const onHash = () => setEstado(leer());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  return estado;
}

export function navegar(ruta, params) {
  const qs = params ? new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v != null)).toString() : '';
  window.location.hash = qs ? `${ruta}?${qs}` : ruta;
}

export function useDebounced(valor, ms = 400) {
  const [v, setV] = useState(valor);
  useEffect(() => {
    const t = setTimeout(() => setV(valor), ms);
    return () => clearTimeout(t);
  }, [valor, ms]);
  return v;
}

// ---- Caché compartida de nombres (producto y proveedor) para mostrar "#12 Arroz extra" en las tablas.
const cache = { producto: new Map(), proveedor: new Map() };
const suscriptores = new Set();
const cola = [];
let activos = 0;

function procesarCola() {
  while (activos < 6 && cola.length) {
    const { tipo, id } = cola.shift();
    activos += 1;
    const pedir = tipo === 'producto' ? inventario.obtenerProducto(id) : proveedores.obtener(id);
    pedir
      .then((r) => cache[tipo].set(id, { nombre: r.nombre, dato: r }))
      .catch((e) => cache[tipo].set(id, { nombre: null, noExiste: e.status === 404 }))
      .finally(() => {
        activos -= 1;
        suscriptores.forEach((fn) => fn());
        procesarCola();
      });
  }
}

export function registrarNombre(tipo, id, dato) {
  if (id == null) return;
  cache[tipo].set(Number(id), { nombre: dato.nombre, dato });
}

export function olvidarNombre(tipo, id) {
  cache[tipo].delete(Number(id));
}

/** Devuelve una función nombre(id) que resuelve en segundo plano los ids que aún no conoce. */
export function useNombres(tipo, ids) {
  const [, forzar] = useState(0);
  const idsRef = useRef('');
  useEffect(() => {
    const fn = () => forzar((n) => n + 1);
    suscriptores.add(fn);
    return () => suscriptores.delete(fn);
  }, []);
  useEffect(() => {
    const unicos = [...new Set(ids.filter((x) => x != null).map(Number))];
    const clave = unicos.join(',');
    if (clave === idsRef.current) return;
    idsRef.current = clave;
    unicos.forEach((id) => {
      if (!cache[tipo].has(id)) {
        cache[tipo].set(id, { pendiente: true });
        cola.push({ tipo, id });
      }
    });
    procesarCola();
  });
  return (id) => cache[tipo].get(Number(id)) || null;
}
