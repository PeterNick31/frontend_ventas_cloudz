import { Loader } from 'lucide-react';

export default function Boton({
  variante = 'primario',
  icono: Icono,
  cargando = false,
  grande = false,
  children,
  className = '',
  disabled,
  type = 'button',
  ...resto
}) {
  return (
    <button
      type={type}
      className={`boton boton-${variante} ${grande ? 'boton-grande' : ''} ${className}`}
      disabled={disabled || cargando}
      {...resto}
    >
      {cargando ? <Loader size={16} className="girar" /> : Icono && <Icono size={16} />}
      {children}
    </button>
  );
}
