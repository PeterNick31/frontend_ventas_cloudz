import { useEffect, useState } from 'react';
import { inventario, proveedores } from '../api/endpoints';
import { registrarNombre, useDebounced, useNombres } from '../hooks';
import { fmt, useApp } from './ui';

/**
 * Campo de ID con verificación en vivo: muestra el nombre si existe o avisa si no.
 * onResuelto(dato|null) entrega el registro completo (útil para autocompletar precio, etc.).
 */
export function CampoReferencia({ tipo, valor, onCambiar, onResuelto, requerido = true, deshabilitado }) {
  const id = useDebounced(valor, 350);
  const [estado, setEstado] = useState({ tipo: 'vacio' });

  useEffect(() => {
    if (!id || Number(id) < 1) {
      setEstado({ tipo: 'vacio' });
      onResuelto?.(null);
      return;
    }
    let vivo = true;
    setEstado({ tipo: 'buscando' });
    const pedir = tipo === 'producto' ? inventario.obtenerProducto(id) : proveedores.obtener(id);
    pedir
      .then((r) => {
        if (!vivo) return;
        registrarNombre(tipo, id, r);
        setEstado({ tipo: 'ok', dato: r });
        onResuelto?.(r);
      })
      .catch((e) => {
        if (!vivo) return;
        setEstado({ tipo: e.status === 404 ? 'noexiste' : 'error', mensaje: e.message });
        onResuelto?.(null);
      });
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, tipo]);

  const etiqueta = tipo === 'producto' ? 'producto' : 'proveedor';
  return (
    <div className="referencia">
      <input
        type="number"
        min="1"
        inputMode="numeric"
        required={requerido}
        disabled={deshabilitado}
        value={valor}
        placeholder={`ID del ${etiqueta}`}
        onChange={(e) => onCambiar(e.target.value)}
        aria-invalid={estado.tipo === 'noexiste'}
      />
      <span className={`referencia-estado ref-${estado.tipo}`}>
        {estado.tipo === 'buscando' && 'Buscando…'}
        {estado.tipo === 'ok' &&
          (tipo === 'producto'
            ? `${estado.dato.nombre}, stock ${fmt.entero(estado.dato.stock_actual)}`
            : estado.dato.nombre)}
        {estado.tipo === 'noexiste' && `No existe un ${etiqueta} con ese ID`}
        {estado.tipo === 'error' && estado.mensaje}
      </span>
    </div>
  );
}

/** Celda "#12 Arroz extra" que abre el detalle del producto. */
export function CeldaProducto({ id, nombres }) {
  const { abrirProducto } = useApp();
  const info = nombres(id);
  return (
    <button className="celda-ref" onClick={() => abrirProducto(id)} title="Ver detalle del producto">
      <span className="celda-id">#{id}</span>
      <span className="celda-nombre">{info?.nombre || (info?.noExiste ? 'No existe' : info?.pendiente ? '…' : '')}</span>
    </button>
  );
}

export function CeldaProveedor({ id, nombres, nombre }) {
  const info = nombre ? { nombre } : nombres?.(id);
  return (
    <span className="celda-ref celda-ref-plana">
      <span className="celda-id">#{id}</span>
      <span className="celda-nombre">{info?.nombre || (info?.noExiste ? 'No existe' : '…')}</span>
    </span>
  );
}

export { useNombres };
