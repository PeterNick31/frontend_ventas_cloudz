import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

// ------------------------------------------------------------ formato
const soles = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' });
const entero = new Intl.NumberFormat('es-PE');
export const fmt = {
  soles: (v) => (v == null || v === '' ? '—' : soles.format(Number(v))),
  num: (v, dec = 0) =>
    v == null || v === '' || Number.isNaN(Number(v))
      ? '—'
      : new Intl.NumberFormat('es-PE', { maximumFractionDigits: dec, minimumFractionDigits: 0 }).format(Number(v)),
  entero: (v) => (v == null ? '—' : entero.format(Number(v))),
  fecha: (v) => {
    if (!v) return '—';
    const s = String(v);
    const d = new Date(s.length === 10 ? `${s}T12:00:00` : s);
    return Number.isNaN(d.getTime()) ? s : d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
  },
  fechaHora: (v) => {
    if (!v) return '—';
    const d = new Date(v);
    return Number.isNaN(d.getTime())
      ? String(v)
      : d.toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  },
  pct: (v) => (v == null ? '—' : `${Math.round(Number(v) * 100)} %`),
};
export const hoyISO = () => new Date().toLocaleDateString('en-CA');
export const sumarDias = (iso, dias) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + Number(dias || 0));
  return d.toLocaleDateString('en-CA');
};

// ------------------------------------------------------------ app context (toasts, detalle de producto)
const AppCtx = createContext(null);
export const useApp = () => useContext(AppCtx);

export function AppProvider({ children, onAbrirProducto }) {
  const [toasts, setToasts] = useState([]);
  const toast = useCallback((mensaje, tipo = 'ok') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, mensaje, tipo }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tipo === 'error' ? 7000 : 3500);
  }, []);
  return (
    <AppCtx.Provider value={{ toast, abrirProducto: onAbrirProducto }}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.tipo}`}>
            {t.mensaje}
          </div>
        ))}
      </div>
    </AppCtx.Provider>
  );
}

// ------------------------------------------------------------ modal y confirmación
export function Modal({ titulo, subtitulo, onCerrar, children, ancho = 560 }) {
  const ref = useRef(null);
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onCerrar();
    document.addEventListener('keydown', onKey);
    const primero = ref.current?.querySelector('input:not([disabled]), select, textarea, button.btn-primary');
    primero?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [onCerrar]);
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={titulo} ref={ref} style={{ maxWidth: ancho }}>
        <div className="modal-head">
          <div>
            <h2>{titulo}</h2>
            {subtitulo && <p className="muted">{subtitulo}</p>}
          </div>
          <button className="btn-icon" onClick={onCerrar} aria-label="Cerrar">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Confirmar({ titulo, mensaje, accion = 'Eliminar', onConfirmar, onCerrar }) {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const confirmar = async () => {
    setEnviando(true);
    setError(null);
    try {
      await onConfirmar();
      onCerrar();
    } catch (e) {
      setError(e.message);
      setEnviando(false);
    }
  };
  return (
    <Modal titulo={titulo} onCerrar={onCerrar} ancho={440}>
      <p className="modal-body">{mensaje}</p>
      {error && <p className="form-error">{error}</p>}
      <div className="modal-actions">
        <button className="btn" onClick={onCerrar}>
          Cancelar
        </button>
        <button className="btn btn-danger" onClick={confirmar} disabled={enviando}>
          {enviando ? 'Eliminando…' : accion}
        </button>
      </div>
    </Modal>
  );
}

/** Formulario en modal: maneja envío, error del API y botón. */
export function FormModal({ titulo, subtitulo, accion, onEnviar, onCerrar, children, ancho }) {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const enviar = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      await onEnviar();
      onCerrar();
    } catch (err) {
      setError(err.message);
      setEnviando(false);
    }
  };
  return (
    <Modal titulo={titulo} subtitulo={subtitulo} onCerrar={onCerrar} ancho={ancho}>
      <form onSubmit={enviar} noValidate={false}>
        <div className="form-grid">{children}</div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onCerrar}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={enviando}>
            {enviando ? 'Guardando…' : accion}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function Campo({ etiqueta, ayuda, ancho, children }) {
  return (
    <label className={`campo ${ancho === 'completo' ? 'campo-completo' : ''}`}>
      <span className="campo-etiqueta">{etiqueta}</span>
      {children}
      {ayuda && <span className="campo-ayuda">{ayuda}</span>}
    </label>
  );
}

// ------------------------------------------------------------ estados de carga
export function Cargando({ texto = 'Cargando…' }) {
  return (
    <div className="estado">
      <span className="spinner" aria-hidden="true" />
      {texto}
    </div>
  );
}

export function ErrorCarga({ error, onReintentar }) {
  return (
    <div className="estado estado-error" role="alert">
      <strong>No se pudieron cargar los datos.</strong>
      <span>{error?.message}</span>
      {onReintentar && (
        <button className="btn btn-sm" onClick={onReintentar}>
          Reintentar
        </button>
      )}
    </div>
  );
}

export function Vacio({ children }) {
  return <div className="estado">{children}</div>;
}

// ------------------------------------------------------------ paginación
export function Paginador({ pagina, setPagina, hasNext, tamano, setTamano, cargando, cantidad, tamanos = [10, 25, 50] }) {
  const desde = cantidad ? (pagina - 1) * tamano + 1 : 0;
  const hasta = (pagina - 1) * tamano + cantidad;
  return (
    <div className="paginador">
      <span className="muted">{cantidad ? `Registros ${fmt.entero(desde)}–${fmt.entero(hasta)}` : 'Sin registros'}</span>
      <div className="paginador-controles">
        <label className="muted">
          Por página{' '}
          <select value={tamano} onChange={(e) => setTamano(Number(e.target.value))}>
            {tamanos.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <button className="btn btn-sm" onClick={() => setPagina(1)} disabled={pagina === 1 || cargando}>
          Primera
        </button>
        <button className="btn btn-sm" onClick={() => setPagina(pagina - 1)} disabled={pagina === 1 || cargando}>
          Anterior
        </button>
        <span className="paginador-num">Página {pagina}</span>
        <button className="btn btn-sm" onClick={() => setPagina(pagina + 1)} disabled={!hasNext || cargando}>
          Siguiente
        </button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------ piezas del dominio
export const SEMAFORO = {
  rojo: { texto: 'Pedir ya', luz: 0 },
  amarillo: { texto: 'Vigilar', luz: 1 },
  verde: { texto: 'Stock sano', luz: 2 },
  desconocido: { texto: 'Sin predicción', luz: -1 },
};

/** Semáforo de tres luces: la activa se enciende. */
export function Semaforo({ valor, compacto }) {
  const info = SEMAFORO[valor] || SEMAFORO.desconocido;
  return (
    <span className={`semaforo semaforo-${valor || 'desconocido'}`} title={info.texto}>
      <span className="semaforo-caja" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span key={i} className={`luz luz-${i} ${info.luz === i ? 'luz-on' : ''}`} />
        ))}
      </span>
      {!compacto && <span className="semaforo-texto">{info.texto}</span>}
    </span>
  );
}

export function NivelRiesgo({ nivel }) {
  const mapa = { alto: 'rojo', medio: 'amarillo', bajo: 'verde' };
  return <span className={`pill pill-${mapa[nivel] || 'gris'}`}>{nivel ? `Riesgo ${nivel}` : '—'}</span>;
}

/** Barra de stock relativa al mínimo: rojo si está en o bajo el mínimo. */
export function BarraStock({ actual, minimo }) {
  const tope = Math.max(minimo * 3, actual, 1);
  const pct = Math.min(100, (actual / tope) * 100);
  const marca = Math.min(100, (minimo / tope) * 100);
  const estado = actual <= minimo ? 'bajo' : actual <= minimo * 1.5 ? 'justo' : 'ok';
  return (
    <div className="stock" title={`Stock ${actual}, mínimo ${minimo}`}>
      <span className="stock-num">{fmt.entero(actual)}</span>
      <span className="stock-barra">
        <span className={`stock-relleno stock-${estado}`} style={{ width: `${pct}%` }} />
        <span className="stock-minimo" style={{ left: `${marca}%` }} />
      </span>
    </div>
  );
}

export function BarraProb({ valor }) {
  const v = Math.max(0, Math.min(1, Number(valor) || 0));
  const color = v > 0.66 ? 'rojo' : v > 0.33 ? 'amarillo' : 'verde';
  return (
    <span className="prob">
      <span className="prob-barra">
        <span className={`prob-relleno prob-${color}`} style={{ width: `${v * 100}%` }} />
      </span>
      <span className="prob-num">{fmt.pct(v)}</span>
    </span>
  );
}

export function Tabs({ tabs, activa, onCambiar }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.clave}
          role="tab"
          aria-selected={activa === t.clave}
          className={`tab ${activa === t.clave ? 'tab-activa' : ''}`}
          onClick={() => onCambiar(t.clave)}
        >
          {t.texto}
        </button>
      ))}
    </div>
  );
}

export function Cabecera({ titulo, descripcion, children }) {
  return (
    <header className="cabecera">
      <div>
        <h1>{titulo}</h1>
        {descripcion && <p className="muted">{descripcion}</p>}
      </div>
      <div className="cabecera-acciones">{children}</div>
    </header>
  );
}

/** Menú de acciones por fila, como botones de texto discretos. */
export function Acciones({ children }) {
  return <div className="acciones">{children}</div>;
}
