// Etiqueta + control + ayuda/error. El <label> envuelve al control, así que es accesible sin ids.
export default function Campo({ etiqueta, error, ayuda, children, className = '' }) {
  return (
    <label className={`campo ${className}`}>
      <span className="campo-etiqueta">{etiqueta}</span>
      {children}
      {ayuda && !error && <span className="campo-ayuda">{ayuda}</span>}
      {error && (
        <span className="campo-error" role="alert">
          {error}
        </span>
      )}
    </label>
  );
}
