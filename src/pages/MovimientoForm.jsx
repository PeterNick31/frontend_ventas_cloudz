import { useState } from 'react';
import { movimientos } from '../api/inventario';
import { TIPOS_MOVIMIENTO } from '../utils/movimientos';
import { useCatalogos } from '../hooks/useCatalogos';
import { useOperador } from '../hooks/useOperador';
import { useToast } from '../ui/Toast';
import Modal from '../ui/Modal';
import Boton from '../ui/Boton';
import Campo from '../ui/Campo';

// Registra un movimiento de stock. `producto` debe traer el stock actual vigente.
export default function MovimientoForm({ producto, tipoInicial = 'entrada', onGuardado, onCerrar }) {
  const { recargar } = useCatalogos();
  const { operador } = useOperador();
  const toast = useToast();
  const [tipo, setTipo] = useState(tipoInicial);
  const [cantidad, setCantidad] = useState('');
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const n = cantidad === '' ? null : Number(cantidad);
  const stock = Number(producto.stock_actual);
  const resultante = n === null || Number.isNaN(n) ? null : tipo === 'entrada' ? stock + n : tipo === 'salida' ? stock - n : n;

  let problema = null;
  if (n !== null) {
    if (!Number.isInteger(n)) problema = 'La cantidad debe ser un número entero.';
    else if (tipo === 'ajuste' ? n < 0 : n < 1) problema = tipo === 'ajuste' ? 'El conteo no puede ser negativo.' : 'La cantidad debe ser 1 o más.';
    else if (tipo === 'salida' && n > stock) problema = `No hay suficiente stock: solo quedan ${stock}.`;
  }

  const guardar = async (e) => {
    e.preventDefault();
    if (n === null || problema) return;
    setGuardando(true);
    setError(null);
    try {
      await movimientos.crear({
        producto_id: producto.id,
        tipo_movimiento: tipo,
        cantidad: n,
        motivo: motivo.trim() || TIPOS_MOVIMIENTO[tipo].motivo,
        usuario: operador,
      });
      toast.ok(`${TIPOS_MOVIMIENTO[tipo].etiqueta} registrada. Stock ahora: ${resultante}.`);
      await recargar();
      onGuardado?.();
    } catch (err) {
      setError(err.message);
      setGuardando(false);
    }
  };

  return (
    <Modal
      titulo={`Movimiento de stock · ${producto.nombre}`}
      onCerrar={onCerrar}
      ancho="sm"
      pie={
        <>
          <Boton variante="secundario" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </Boton>
          <Boton type="submit" form="form-movimiento" cargando={guardando} disabled={n === null || !!problema}>
            Registrar
          </Boton>
        </>
      }
    >
      <form id="form-movimiento" onSubmit={guardar} className="form-grid">
        <div className="completo chips" role="group" aria-label="Tipo de movimiento" style={{ marginBottom: 0 }}>
          {Object.entries(TIPOS_MOVIMIENTO).map(([clave, t]) => (
            <button key={clave} type="button" className="chip" aria-pressed={tipo === clave} onClick={() => setTipo(clave)}>
              {t.etiqueta}
            </button>
          ))}
        </div>
        <p className="completo campo-ayuda" style={{ marginTop: -6 }}>
          {TIPOS_MOVIMIENTO[tipo].ayuda}. Stock actual: <strong>{stock}</strong>
        </p>
        <Campo
          etiqueta={tipo === 'ajuste' ? 'Stock contado (cuántas unidades hay realmente)' : 'Cantidad'}
          error={problema}
          className="completo"
        >
          <input
            className="input"
            type="number"
            min={tipo === 'ajuste' ? 0 : 1}
            step="1"
            inputMode="numeric"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
            aria-invalid={!!problema}
            required
          />
        </Campo>
        <Campo etiqueta="Motivo (opcional)" className="completo">
          <input className="input" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder={TIPOS_MOVIMIENTO[tipo].motivo} maxLength={150} />
        </Campo>
      </form>
      {resultante !== null && !problema && (
        <p className="aviso aviso-info">
          El stock pasará de <strong>{stock}</strong> a <strong>{resultante}</strong>.
        </p>
      )}
      {!operador && <p className="aviso aviso-aviso">No indicaste quién registra: el movimiento quedará sin nombre.</p>}
      {error && (
        <p className="aviso aviso-error" role="alert">
          {error}
        </p>
      )}
    </Modal>
  );
}
