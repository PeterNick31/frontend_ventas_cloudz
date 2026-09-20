import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { movimientos } from '../api/inventario';
import { ventas } from '../api/ventas';
import { irA } from '../hooks/useHashRoute';
import { useCatalogos } from '../hooks/useCatalogos';
import { useCargar } from '../hooks/useCargar';
import { useOperador } from '../hooks/useOperador';
import { fechaCorta, hoyISO, moneda, sumarDias } from '../utils/formato';
import { useToast } from '../ui/Toast';
import Boton from '../ui/Boton';
import Campo from '../ui/Campo';
import ConfirmDialog from '../ui/ConfirmDialog';
import DataList from '../ui/DataList';
import { Cargando, ErrorCaja, EstadoVacio } from '../ui/Estado';
import Modal from '../ui/Modal';
import PageHeader from '../ui/PageHeader';
import { PaginadorServidor } from '../ui/Paginacion';
import Selector from '../ui/Selector';

const TAMANO = 20;

function EditarVenta({ venta, onGuardado, onCerrar }) {
  const { nombreProducto, recargar } = useCatalogos();
  const { operador } = useOperador();
  const toast = useToast();
  const [fecha, setFecha] = useState(venta.fecha);
  const [cantidad, setCantidad] = useState(String(venta.cantidadVendida));
  const [precio, setPrecio] = useState(String(venta.precioUnitario));
  const [corregir, setCorregir] = useState(true);
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const n = Number(cantidad);
  const delta = n - venta.cantidadVendida;
  const valido = fecha && Number.isInteger(n) && n >= 1 && precio !== '' && Number(precio) >= 0;

  const guardar = async (e) => {
    e.preventDefault();
    if (!valido) return;
    setGuardando(true);
    setError(null);
    try {
      await ventas.actualizar(venta.id, { fecha, cantidadVendida: n, precioUnitario: Number(precio) });
    } catch (err) {
      setError(err.message);
      setGuardando(false);
      return;
    }
    if (corregir && delta !== 0) {
      try {
        await movimientos.crear({
          producto_id: venta.productoId,
          tipo_movimiento: delta > 0 ? 'salida' : 'entrada',
          cantidad: Math.abs(delta),
          motivo: `Corrección de venta #${venta.id}`,
          usuario: operador,
        });
        await recargar();
        toast.ok('Venta corregida y stock ajustado.');
      } catch (err) {
        toast.aviso(`La venta se corrigió, pero no se pudo ajustar el stock: ${err.message}`);
      }
    } else {
      toast.ok('Venta corregida.');
    }
    onGuardado();
  };

  return (
    <Modal
      titulo={`Corregir venta #${venta.id}`}
      onCerrar={onCerrar}
      ancho="sm"
      pie={
        <>
          <Boton variante="secundario" onClick={onCerrar} disabled={guardando}>Cancelar</Boton>
          <Boton type="submit" form="form-venta" cargando={guardando} disabled={!valido}>Guardar cambios</Boton>
        </>
      }
    >
      <form id="form-venta" className="form-grid" onSubmit={guardar}>
        <p className="completo"><strong>{nombreProducto(venta.productoId)}</strong></p>
        <Campo etiqueta="Fecha" className="completo">
          <input className="input" type="date" value={fecha} max={hoyISO()} onChange={(e) => setFecha(e.target.value)} required />
        </Campo>
        <Campo etiqueta="Cantidad">
          <input className="input" type="number" min="1" step="1" inputMode="numeric" value={cantidad} onChange={(e) => setCantidad(e.target.value)} required />
        </Campo>
        <Campo etiqueta="Precio unitario (S/)">
          <input className="input" type="number" min="0" step="0.01" inputMode="decimal" value={precio} onChange={(e) => setPrecio(e.target.value)} required />
        </Campo>
        {valido && <p className="completo aviso aviso-info" style={{ marginTop: 0 }}>Nuevo total: <strong>{moneda(n * Number(precio))}</strong></p>}
        {delta !== 0 && valido && (
          <label className="completo casilla">
            <input type="checkbox" checked={corregir} onChange={(e) => setCorregir(e.target.checked)} />
            <span>
              Corregir también el stock ({delta > 0 ? `salen ${delta} más` : `vuelven ${-delta}`}).
              <span className="campo-ayuda" style={{ display: 'block' }}>Editar una venta no toca el inventario por sí solo.</span>
            </span>
          </label>
        )}
      </form>
      {error && <p className="aviso aviso-error" role="alert">{error}</p>}
    </Modal>
  );
}

function EliminarVenta({ venta, onListo, onCerrar }) {
  const { nombreProducto, recargar } = useCatalogos();
  const { operador } = useOperador();
  const toast = useToast();
  const [devolver, setDevolver] = useState(true);

  const confirmar = async () => {
    await ventas.eliminar(venta.id);
    if (devolver) {
      try {
        await movimientos.crear({
          producto_id: venta.productoId,
          tipo_movimiento: 'entrada',
          cantidad: venta.cantidadVendida,
          motivo: `Anulación de venta #${venta.id}`,
          usuario: operador,
        });
        await recargar();
        toast.ok('Venta eliminada y stock devuelto.');
      } catch (err) {
        toast.aviso(`La venta se eliminó, pero no se pudo devolver el stock: ${err.message}`);
      }
    } else {
      toast.ok('Venta eliminada.');
    }
    onListo();
  };

  return (
    <ConfirmDialog
      titulo="Eliminar venta"
      mensaje={`¿Eliminar la venta de ${venta.cantidadVendida} × ${nombreProducto(venta.productoId)} (${moneda(venta.total)})? No se puede deshacer.`}
      confirmarTexto="Eliminar venta"
      peligro
      onConfirmar={confirmar}
      onCancelar={onCerrar}
    >
      <label className="casilla" style={{ marginTop: 10 }}>
        <input type="checkbox" checked={devolver} onChange={(e) => setDevolver(e.target.checked)} />
        <span>Devolver {venta.cantidadVendida} unidades al stock</span>
      </label>
    </ConfirmDialog>
  );
}

export default function Ventas() {
  const { opcionesProductos, nombreProducto } = useCatalogos();
  const [productoId, setProductoId] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [pagina, setPagina] = useState(0);
  const [editando, setEditando] = useState(null);
  const [eliminando, setEliminando] = useState(null);

  const { datos, cargando, error, recargar } = useCargar(
    () => ventas.listar({ productoId, desde, hasta, page: pagina, size: TAMANO }),
    [productoId, desde, hasta, pagina],
  );
  const filas = Array.isArray(datos) ? datos : [];
  const totalPagina = filas.reduce((s, v) => s + Number(v.total || 0), 0);

  const rango = (dias) => {
    setPagina(0);
    setHasta(dias === null ? '' : hoyISO());
    setDesde(dias === null ? '' : sumarDias(hoyISO(), -dias));
  };
  const cambiarFiltro = (setter) => (e) => {
    setter(e.target.value);
    setPagina(0);
  };

  const columnas = [
    { titulo: 'Fecha', principal: true, render: (v) => fechaCorta(v.fecha) },
    { titulo: 'Producto', render: (v) => <a href={`#/inventario/${v.productoId}`}>{nombreProducto(v.productoId)}</a> },
    { titulo: 'Cantidad', alinear: 'derecha', render: (v) => v.cantidadVendida },
    { titulo: 'Precio', alinear: 'derecha', render: (v) => moneda(v.precioUnitario) },
    { titulo: 'Total', alinear: 'derecha', render: (v) => <strong>{moneda(v.total)}</strong> },
    {
      titulo: 'Acciones',
      acciones: true,
      render: (v) => (
        <>
          <Boton variante="fantasma" icono={Pencil} className="boton-chico" onClick={() => setEditando(v)}>Corregir</Boton>
          <Boton variante="fantasma" icono={Trash2} className="boton-chico rojo" onClick={() => setEliminando(v)}>Eliminar</Boton>
        </>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        titulo="Ventas"
        subtitulo="Historial de ventas registradas, de la más reciente a la más antigua."
        acciones={<Boton icono={Plus} onClick={() => irA('/vender')}>Nueva venta</Boton>}
      />

      <div className="chips" role="group" aria-label="Rango rápido">
        <button type="button" className="chip" onClick={() => rango(0)}>Hoy</button>
        <button type="button" className="chip" onClick={() => rango(6)}>Últimos 7 días</button>
        <button type="button" className="chip" onClick={() => rango(29)}>Últimos 30 días</button>
        <button type="button" className="chip" onClick={() => rango(null)}>Todo</button>
      </div>
      <div className="barra-filtros">
        <Selector etiqueta="Producto" items={opcionesProductos} valor={productoId} onChange={(v) => { setProductoId(v); setPagina(0); }} />
        <label className="campo">
          <span className="campo-etiqueta">Desde</span>
          <input className="input" type="date" value={desde} onChange={cambiarFiltro(setDesde)} />
        </label>
        <label className="campo">
          <span className="campo-etiqueta">Hasta</span>
          <input className="input" type="date" value={hasta} onChange={cambiarFiltro(setHasta)} />
        </label>
      </div>

      {cargando && !datos && <Cargando texto="Cargando ventas…" />}
      {error && <ErrorCaja mensaje={error} onReintentar={recargar} />}
      {datos && filas.length === 0 && (
        <EstadoVacio
          titulo="No hay ventas en este filtro"
          texto="Registra una venta o cambia el rango de fechas."
          accion={<Boton icono={Plus} onClick={() => irA('/vender')}>Nueva venta</Boton>}
        />
      )}
      {filas.length > 0 && (
        <>
          <DataList etiqueta="Ventas" columnas={columnas} filas={filas} clave={(v) => v.id} />
          <p className="resumen-linea">
            En esta página: <strong>{filas.length}</strong> ventas por <strong>{moneda(totalPagina)}</strong>.
          </p>
          <PaginadorServidor pagina={pagina} hayMas={filas.length === TAMANO} onCambiar={setPagina} />
        </>
      )}

      {editando && <EditarVenta venta={editando} onGuardado={() => { setEditando(null); recargar(); }} onCerrar={() => setEditando(null)} />}
      {eliminando && <EliminarVenta venta={eliminando} onListo={() => { setEliminando(null); recargar(); }} onCerrar={() => setEliminando(null)} />}
    </>
  );
}
