import { useState } from 'react';
import Modal from './Modal';
import Boton from './Boton';

// Confirmación para acciones destructivas. `children` permite agregar opciones (p. ej. casillas).
export default function ConfirmDialog({
  titulo,
  mensaje,
  confirmarTexto = 'Confirmar',
  peligro = false,
  onConfirmar,
  onCancelar,
  children,
}) {
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState(null);

  const confirmar = async () => {
    setTrabajando(true);
    setError(null);
    try {
      await onConfirmar();
    } catch (err) {
      setError(err.message);
      setTrabajando(false);
    }
  };

  return (
    <Modal
      titulo={titulo}
      onCerrar={onCancelar}
      ancho="sm"
      pie={
        <>
          <Boton variante="secundario" onClick={onCancelar} disabled={trabajando}>
            Cancelar
          </Boton>
          <Boton variante={peligro ? 'peligro' : 'primario'} onClick={confirmar} cargando={trabajando}>
            {confirmarTexto}
          </Boton>
        </>
      }
    >
      <p className="modal-texto">{mensaje}</p>
      {children}
      {error && (
        <p className="aviso aviso-error" role="alert">
          {error}
        </p>
      )}
    </Modal>
  );
}
