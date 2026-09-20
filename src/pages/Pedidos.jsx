import { useEffect, useState } from 'react';
import { PackageCheck, Pencil, Plus, Trash2, Truck } from 'lucide-react';
import { movimientos } from '../api/inventario';
import { pedidos } from '../api/ventas';
import { tiempos } from '../api/proveedores';
import { irA } from '../hooks/useHashRoute';
import { useCatalogos } from '../hooks/useCatalogos';
import { useCargar } from '../hooks/useCargar';
import { useOperador } from '../hooks/useOperador';
import { fechaCorta, hoyISO, sumarDias } from '../utils/formato';
import { useToast } from '../ui/Toast';
import Boton from '../ui/Boton';
import Campo from '../ui/Campo';
import ConfirmDialog from '../ui/ConfirmDialog';
import DataList from '../ui/DataList';
import { Badge, Cargando, ErrorCaja, EstadoVacio } from '../ui/Estado';
import Modal from '../ui/Modal';
import PageHeader from '../ui/PageHeader';
import { PaginadorServidor } from '../ui/Paginacion';
import Selector from '../ui/Selector';

const TAMANO = 20;
const ESTADOS = {
  pendiente: { clase: 'amarillo', texto: 'Pendiente' },
  en_transito: { clase: 'azul', texto: 'En tránsito' },
  recibido: { clase: 'verde', texto: 'Recibido' },
  cancelado: { clase: 'neutro', texto: 'Cancelado' },
};

function PedidoForm({ pedido, productoIdInicial, onGuardado, onCerrar }) {
  const editando = Boolean(pedido);
  const { opcionesProductos, opcionesProveedores, nombreProducto, recargar } = useCatalogos();
  const toast = useToast();
  const [f, setF] = useState({
    productoId: String(pedido?.productoId || productoIdInicial || ''),
    proveedorId: String(pedido?.proveedorId || ''),
    cantidadPedida: String(pedido?.cantidadPedida || ''),
    fechaPedido: pedido?.fechaPedido || hoyISO(),
    fechaEstimadaEntrega: pedido?.fechaEstimadaEntrega || '',
  });
  const [sugerencia, setSugerencia] = useState(null); // { proveedor, dias }
  const [toqueManual, setToqueManual] = useState(editando);
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const set = (campo) => (e) => setF((prev) => ({ ...prev, [campo]: e.target.value }));

  // Al elegir producto se sugiere el proveedor más rápido y la fecha estimada de entrega.
  useEffect(() => {
    if (editando || !f.productoId) return undefined;
    let vigente = true;
    tiempos
      .deProducto(f.productoId)
      .then((t) => {
        if (!vigente) return;
        setSugerencia({ proveedor: t.proveedor_nombre, dias: t.dias_entrega_promedio });
        setF((prev) => ({
          ...prev,
          proveedorId: prev.proveedorId || String(t.proveedor_id),
          fechaEstimadaEntrega: toqueManual ? prev.fechaEstimadaEntrega : sumarDias(prev.fechaPedido, t.dias_entrega_promedio),
        }));
      })
      .catch(() => vigente && setSugerencia(null));
    return () => {
      vigente = false;
    };
  }, [f.productoId, editando]); // eslint-disable-line react-hooks/exhaustive-deps

  const cambiarFechaPedido = (e) => {
    const fechaPedido = e.target.value;
    setF((prev) => ({
      ...prev,
      fechaPedido,
      fechaEstimadaEntrega: !toqueManual && sugerencia && fechaPedido ? sumarDias(fechaPedido, sugerencia.dias) : prev.fechaEstimadaEntrega,
    }));
  };

  const cant = Number(f.cantidadPedida);
  const valido = f.productoId && f.proveedorId && Number.isInteger(cant) && cant >= 1 && f.fechaPedido;
  const fechaIncoherente = f.fechaEstimadaEntrega && f.fechaEstimadaEntrega < f.fechaPedido;

  const guardar = async (e) => {
    e.preventDefault();
    if (!valido || fechaIncoherente) return;
    setGuardando(true);
    setError(null);
    const datos = {
      productoId: Number(f.productoId),
      proveedorId: Number(f.proveedorId),
      fechaPedido: f.fechaPedido,
      cantidadPedida: cant,
      fechaEstimadaEntrega: f.fechaEstimadaEntrega || null,
    };
    try {
      if (editando) await pedidos.actualizar(pedido.id, datos);
      else await pedidos.crear({ ...datos, estado: 'pendiente' });
      toast.ok(editando ? 'Pedido actualizado.' : 'Pedido creado.');
      await recargar();
      onGuardado();
    } catch (err) {
      setError(err.message);
      setGuardando(false);
    }
  };

  return (
    <Modal
      titulo={editando ? `Editar pedido #${pedido.id}` : 'Nuevo pedido a proveedor'}
      onCerrar={onCerrar}
      pie={
        <>
          <Boton variante="secundario" onClick={onCerrar} disabled={guardando}>Cancelar</Boton>
          <Boton type="submit" form="form-pedido" cargando={guardando} disabled={!valido || !!fechaIncoherente}>
            {editando ? 'Guardar cambios' : 'Crear pedido'}
          </Boton>
        </>
      }
    >
      <form id="form-pedido" className="form-grid" onSubmit={guardar}>
        {editando ? (
          <Campo etiqueta="Producto *" className="completo">
            <input className="input" value={nombreProducto(pedido.productoId)} disabled />
          </Campo>
        ) : (
          <Selector etiqueta="Producto *" items={opcionesProductos} valor={f.productoId} onChange={(v) => setF((prev) => ({ ...prev, productoId: v }))} placeholder="Escribe nombre o código…" className="completo" />
        )}
        <Selector etiqueta="Proveedor *" items={opcionesProveedores} valor={f.proveedorId} onChange={(v) => setF((prev) => ({ ...prev, proveedorId: v }))} placeholder="Escribe el nombre del proveedor…" ayuda={sugerencia ? `Sugerido: ${sugerencia.proveedor}, entrega en ${sugerencia.dias} días.` : undefined} className="completo" />
        <Campo etiqueta="Cantidad *">
          <input className="input" type="number" min="1" step="1" inputMode="numeric" value={f.cantidadPedida} onChange={set('cantidadPedida')} required />
        </Campo>
        <Campo etiqueta="Fecha del pedido *">
          <input className="input" type="date" value={f.fechaPedido} onChange={cambiarFechaPedido} required />
        </Campo>
        <Campo etiqueta="Entrega estimada" error={fechaIncoherente ? 'No puede ser anterior a la fecha del pedido.' : undefined} className="completo">
          <input
            className="input"
            type="date"
            value={f.fechaEstimadaEntrega}
            onChange={(e) => {
              setToqueManual(true);
              set('fechaEstimadaEntrega')(e);
            }}
          />
        </Campo>
      </form>
      {error && <p className="aviso aviso-error" role="alert">{error}</p>}
    </Modal>
  );
}

// Recibir = marcar el pedido como recibido + registrar la entrada de stock (el backend no lo hace solo).
function RecibirPedido({ pedido, onListo, onCerrar }) {
  const { nombreProducto, recargar } = useCatalogos();
  const { operador } = useOperador();
  const toast = useToast();
  const [cantidad, setCantidad] = useState(String(pedido.cantidadPedida));
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const n = Number(cantidad);
  const valido = Number.isInteger(n) && n >= 1;

  const confirmar = async (e) => {
    e.preventDefault();
    if (!valido) return;
    setGuardando(true);
    setError(null);
    try {
      await pedidos.actualizar(pedido.id, { estado: 'recibido' });
    } catch (err) {
      setError(err.message);
      setGuardando(false);
      return;
    }
    try {
      await movimientos.crear({
        producto_id: pedido.productoId,
        tipo_movimiento: 'entrada',
        cantidad: n,
        motivo: `Pedido #${pedido.id}${n !== pedido.cantidadPedida ? ` (se pidieron ${pedido.cantidadPedida})` : ''}`,
        usuario: operador,
      });
      await recargar();
      toast.ok(`Pedido recibido: entraron ${n} unidades al stock.`);
    } catch (err) {
      toast.aviso(`El pedido quedó como recibido, pero el stock NO subió (${err.message}). Registra la entrada a mano en el producto.`);
    }
    onListo();
  };

  return (
    <Modal
      titulo={`Recibir pedido #${pedido.id}`}
      onCerrar={onCerrar}
      ancho="sm"
      pie={
        <>
          <Boton variante="secundario" onClick={onCerrar} disabled={guardando}>Cancelar</Boton>
          <Boton type="submit" form="form-recibir" cargando={guardando} disabled={!valido}>Confirmar recepción</Boton>
        </>
      }
    >
      <form id="form-recibir" onSubmit={confirmar}>
        <p className="modal-texto"><strong>{nombreProducto(pedido.productoId)}</strong> · se pidieron {pedido.cantidadPedida}.</p>
        <Campo etiqueta="Cantidad que llegó realmente" ayuda="Esa cantidad se suma al stock.">
          <input className="input" type="number" min="1" step="1" inputMode="numeric" value={cantidad} onChange={(e) => setCantidad(e.target.value)} required />
        </Campo>
      </form>
      {error && <p className="aviso aviso-error" role="alert">{error}</p>}
    </Modal>
  );
}

export default function Pedidos({ productoNuevo }) {
  const { opcionesProductos, opcionesProveedores, nombreProducto, nombreProveedor } = useCatalogos();
  const toast = useToast();
  const [estado, setEstado] = useState('');
  const [productoId, setProductoId] = useState('');
  const [proveedorId, setProveedorId] = useState('');
  const [pagina, setPagina] = useState(0);
  const [formulario, setFormulario] = useState(() => (productoNuevo ? { productoId: productoNuevo } : null));
  const [recibiendo, setRecibiendo] = useState(null);
  const [aEliminar, setAEliminar] = useState(null);
  const [aCancelar, setACancelar] = useState(null);

  // Llegar desde "Pedir" en el detalle o en Inicio abre el formulario con el producto elegido.
  useEffect(() => {
    if (productoNuevo) setFormulario({ productoId: productoNuevo });
  }, [productoNuevo]);

  const cerrarFormulario = () => {
    setFormulario(null);
    if (productoNuevo) irA('/pedidos');
  };

  const { datos, cargando, error, recargar } = useCargar(
    () => pedidos.listar({ estado, productoId, proveedorId, page: pagina, size: TAMANO }),
    [estado, productoId, proveedorId, pagina],
  );
  const filas = Array.isArray(datos) ? datos : [];
  const hoy = hoyISO();

  const cambiarEstado = async (p, nuevo, mensaje) => {
    try {
      await pedidos.actualizar(p.id, { estado: nuevo });
      toast.ok(mensaje);
      await recargar();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const columnas = [
    { titulo: 'Pedido', principal: true, render: (p) => <>#{p.id}<span className="sub">{fechaCorta(p.fechaPedido)}</span></> },
    { titulo: 'Producto', render: (p) => <a href={`#/inventario/${p.productoId}`}>{nombreProducto(p.productoId)}</a> },
    { titulo: 'Proveedor', render: (p) => nombreProveedor(p.proveedorId) },
    { titulo: 'Cantidad', alinear: 'derecha', render: (p) => p.cantidadPedida },
    {
      titulo: 'Entrega estimada',
      render: (p) => {
        const atrasado = p.fechaEstimadaEntrega && p.fechaEstimadaEntrega < hoy && ['pendiente', 'en_transito'].includes(p.estado);
        return (
          <>
            {fechaCorta(p.fechaEstimadaEntrega)} {atrasado && <Badge clase="rojo">Atrasado</Badge>}
          </>
        );
      },
    },
    { titulo: 'Estado', render: (p) => <Badge clase={ESTADOS[p.estado]?.clase}>{ESTADOS[p.estado]?.texto || p.estado}</Badge> },
    {
      titulo: 'Acciones',
      acciones: true,
      render: (p) => (
        <>
          {p.estado === 'pendiente' && (
            <Boton variante="secundario" icono={Truck} className="boton-chico" onClick={() => cambiarEstado(p, 'en_transito', 'Pedido marcado en tránsito.')}>En tránsito</Boton>
          )}
          {['pendiente', 'en_transito'].includes(p.estado) && (
            <Boton icono={PackageCheck} className="boton-chico" onClick={() => setRecibiendo(p)}>Recibir</Boton>
          )}
          {['pendiente', 'en_transito'].includes(p.estado) && (
            <Boton variante="fantasma" icono={Pencil} className="boton-chico" onClick={() => setFormulario({ pedido: p })}>Editar</Boton>
          )}
          {['pendiente', 'en_transito'].includes(p.estado) && (
            <Boton variante="fantasma" className="boton-chico rojo" onClick={() => setACancelar(p)}>Cancelar pedido</Boton>
          )}
          {!['pendiente', 'en_transito'].includes(p.estado) && (
            <Boton variante="fantasma" icono={Trash2} className="boton-chico rojo" onClick={() => setAEliminar(p)}>Eliminar</Boton>
          )}
        </>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        titulo="Pedidos a proveedores"
        subtitulo="Lo que se pidió, lo que está en camino y lo que ya llegó."
        acciones={<Boton icono={Plus} onClick={() => setFormulario({})}>Nuevo pedido</Boton>}
      />

      <div className="chips" role="group" aria-label="Filtrar por estado">
        <button type="button" className="chip" aria-pressed={estado === ''} onClick={() => { setEstado(''); setPagina(0); }}>Todos</button>
        {Object.entries(ESTADOS).map(([k, e]) => (
          <button key={k} type="button" className="chip" aria-pressed={estado === k} onClick={() => { setEstado(k); setPagina(0); }}>{e.texto}</button>
        ))}
      </div>
      <div className="barra-filtros">
        <Selector etiqueta="Producto" items={opcionesProductos} valor={productoId} onChange={(v) => { setProductoId(v); setPagina(0); }} />
        <Selector etiqueta="Proveedor" items={opcionesProveedores} valor={proveedorId} onChange={(v) => { setProveedorId(v); setPagina(0); }} />
      </div>

      {cargando && !datos && <Cargando texto="Cargando pedidos…" />}
      {error && <ErrorCaja mensaje={error} onReintentar={recargar} />}
      {datos && filas.length === 0 && (
        <EstadoVacio titulo="No hay pedidos aquí" texto="Crea un pedido cuando un producto esté por agotarse." accion={<Boton icono={Plus} onClick={() => setFormulario({})}>Nuevo pedido</Boton>} />
      )}
      {filas.length > 0 && (
        <>
          <DataList etiqueta="Pedidos" columnas={columnas} filas={filas} clave={(p) => p.id} />
          <PaginadorServidor pagina={pagina} hayMas={filas.length === TAMANO} onCambiar={setPagina} />
        </>
      )}

      {formulario && (
        <PedidoForm
          pedido={formulario.pedido}
          productoIdInicial={formulario.productoId}
          onGuardado={() => { cerrarFormulario(); recargar(); }}
          onCerrar={cerrarFormulario}
        />
      )}
      {recibiendo && <RecibirPedido pedido={recibiendo} onListo={() => { setRecibiendo(null); recargar(); }} onCerrar={() => setRecibiendo(null)} />}
      {aCancelar && (
        <ConfirmDialog
          titulo="Cancelar pedido"
          mensaje={`¿Cancelar el pedido #${aCancelar.id} de ${nombreProducto(aCancelar.productoId)}? Podrás eliminarlo después.`}
          confirmarTexto="Cancelar pedido"
          peligro
          onConfirmar={async () => { await pedidos.actualizar(aCancelar.id, { estado: 'cancelado' }); toast.ok('Pedido cancelado.'); setACancelar(null); recargar(); }}
          onCancelar={() => setACancelar(null)}
        />
      )}
      {aEliminar && (
        <ConfirmDialog
          titulo="Eliminar pedido"
          mensaje={`¿Eliminar el pedido #${aEliminar.id}? Se borra definitivamente del historial.`}
          confirmarTexto="Eliminar"
          peligro
          onConfirmar={async () => { await pedidos.eliminar(aEliminar.id); toast.ok('Pedido eliminado.'); setAEliminar(null); recargar(); }}
          onCancelar={() => setAEliminar(null)}
        />
      )}
    </>
  );
}
