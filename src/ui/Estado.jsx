import { CircleAlert, CircleCheck, CircleHelp, Clock, Inbox, RefreshCw } from 'lucide-react';
import { infoSemaforo } from './semaforo';
import Boton from './Boton';

const ICONOS = { rojo: CircleAlert, amarillo: Clock, verde: CircleCheck, neutro: CircleHelp };

export function SemaforoBadge({ semaforo, texto }) {
  const info = infoSemaforo(semaforo);
  const Icono = ICONOS[info.clase];
  return (
    <span className={`badge badge-${info.clase}`}>
      <Icono size={14} />
      {texto || info.texto}
    </span>
  );
}

export function Badge({ clase = 'neutro', children }) {
  return <span className={`badge badge-${clase}`}>{children}</span>;
}

export function Cargando({ texto = 'Cargando…' }) {
  return (
    <div className="estado estado-cargando" role="status">
      <div className="esqueleto" />
      <div className="esqueleto esqueleto-corto" />
      <span className="solo-lector">{texto}</span>
    </div>
  );
}

export function ErrorCaja({ mensaje, onReintentar }) {
  return (
    <div className="estado estado-error" role="alert">
      <CircleAlert size={22} />
      <div>
        <strong>No se pudo cargar</strong>
        <p>{mensaje}</p>
      </div>
      {onReintentar && (
        <Boton variante="secundario" icono={RefreshCw} onClick={onReintentar}>
          Reintentar
        </Boton>
      )}
    </div>
  );
}

export function EstadoVacio({ titulo, texto, accion }) {
  return (
    <div className="estado estado-vacio">
      <Inbox size={28} />
      <strong>{titulo}</strong>
      {texto && <p>{texto}</p>}
      {accion}
    </div>
  );
}
