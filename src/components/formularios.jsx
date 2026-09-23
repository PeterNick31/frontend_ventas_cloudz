import { useState } from 'react';
import { inventario, proveedores, ventas } from '../api/endpoints';
import { olvidarNombre } from '../hooks';
import { CampoReferencia } from './referencias';
import { Campo, FormModal, fmt, hoyISO, sumarDias, useApp } from './ui';

export const CATEGORIAS = ['Abarrotes', 'Bebidas', 'Limpieza', 'Lacteos', 'Snacks', 'Cuidado Personal', 'Panaderia', 'Congelados'];
export const UNIDADES = ['unidad', 'kg', 'litro', 'paquete', 'caja'];
export const ESTADOS_PEDIDO = [
  { valor: 'pendiente', texto: 'Pendiente' },
  { valor: 'en_transito', texto: 'En tránsito' },
  { valor: 'recibido', texto: 'Recibido' },
  { valor: 'cancelado', texto: 'Cancelado' },
];

const vacioANull = (v) => (v === '' ? null : v);

// ------------------------------------------------------------------ Producto
export function FormProducto({ producto, onCerrar, onGuardado }) {
  const { toast } = useApp();
  const editando = Boolean(producto);
  const [f, setF] = useState({
    sku: producto?.sku ?? '',
    nombre: producto?.nombre ?? '',
    categoria: producto?.categoria ?? '',
    unidad_medida: producto?.unidad_medida ?? 'unidad',
    stock_actual: producto?.stock_actual ?? 0,
    stock_minimo: producto?.stock_minimo ?? 10,
    precio_unitario: producto?.precio_unitario ?? '',
  });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const enviar = async () => {
    const base = {
      sku: f.sku.trim(),
      nombre: f.nombre.trim(),
      categoria: vacioANull(f.categoria.trim()),
      unidad_medida: f.unidad_medida,
      stock_minimo: Number(f.stock_minimo),
      precio_unitario: Number(f.precio_unitario),
    };
    const r = editando
      ? await inventario.actualizarProducto(producto.id, base)
      : await inventario.crearProducto({ ...base, stock_actual: Number(f.stock_actual) });
    olvidarNombre('producto', r.id);
    toast(editando ? `Producto #${r.id} actualizado` : `Producto #${r.id} creado`);
    onGuardado?.(r);
  };

  return (
    <FormModal
      titulo={editando ? `Editar producto #${producto.id}` : 'Nuevo producto'}
      subtitulo={editando ? 'El stock no se edita aquí: cambia registrando movimientos.' : null}
      accion={editando ? 'Guardar cambios' : 'Crear producto'}
      onEnviar={enviar}
      onCerrar={onCerrar}
    >
      <Campo etiqueta="Nombre" ancho="completo">
        <input required maxLength={150} value={f.nombre} onChange={set('nombre')} placeholder="Arroz extra Costeño x1kg" />
      </Campo>
      <Campo etiqueta="SKU" ayuda="Código único del producto">
        <input required maxLength={50} value={f.sku} onChange={set('sku')} placeholder="SKU-01501" />
      </Campo>
      <Campo etiqueta="Categoría">
        <input list="lista-categorias" maxLength={80} value={f.categoria} onChange={set('categoria')} />
        <datalist id="lista-categorias">
          {CATEGORIAS.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </Campo>
      <Campo etiqueta="Unidad de medida">
        <select value={f.unidad_medida} onChange={set('unidad_medida')}>
          {UNIDADES.map((u) => (
            <option key={u}>{u}</option>
          ))}
        </select>
      </Campo>
      <Campo etiqueta="Precio unitario (S/)">
        <input required type="number" min="0" step="0.01" value={f.precio_unitario} onChange={set('precio_unitario')} />
      </Campo>
      {!editando && (
        <Campo etiqueta="Stock inicial">
          <input required type="number" min="0" step="1" value={f.stock_actual} onChange={set('stock_actual')} />
        </Campo>
      )}
      <Campo etiqueta="Stock mínimo" ayuda="Por debajo de este valor el producto se considera en riesgo">
        <input required type="number" min="0" step="1" value={f.stock_minimo} onChange={set('stock_minimo')} />
      </Campo>
    </FormModal>
  );
}

// ------------------------------------------------------------------ Movimiento
export function FormMovimiento({ productoId, onCerrar, onGuardado }) {
  const { toast } = useApp();
  const [f, setF] = useState({ producto_id: productoId ?? '', tipo_movimiento: 'entrada', cantidad: '', motivo: '', usuario: '' });
  const [producto, setProducto] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const cantidad = Number(f.cantidad) || 0;
  let resultante = null;
  if (producto) {
    if (f.tipo_movimiento === 'entrada') resultante = producto.stock_actual + cantidad;
    if (f.tipo_movimiento === 'salida') resultante = producto.stock_actual - cantidad;
    if (f.tipo_movimiento === 'ajuste') resultante = cantidad;
  }

  const enviar = async () => {
    const r = await inventario.registrarMovimiento({
      producto_id: Number(f.producto_id),
      tipo_movimiento: f.tipo_movimiento,
      cantidad,
      motivo: vacioANull(f.motivo.trim()),
      usuario: vacioANull(f.usuario.trim()),
    });
    olvidarNombre('producto', r.producto_id);
    toast(`Movimiento #${r.id} registrado`);
    onGuardado?.(r);
  };

  return (
    <FormModal
      titulo="Registrar movimiento de inventario"
      subtitulo="Los movimientos no se editan ni se borran: son el historial del stock."
      accion="Registrar movimiento"
      onEnviar={enviar}
      onCerrar={onCerrar}
    >
      <Campo etiqueta="Producto" ancho="completo">
        <CampoReferencia tipo="producto" valor={f.producto_id} onCambiar={(v) => setF({ ...f, producto_id: v })} onResuelto={setProducto} />
      </Campo>
      <Campo etiqueta="Tipo">
        <select value={f.tipo_movimiento} onChange={set('tipo_movimiento')}>
          <option value="entrada">Entrada (suma al stock)</option>
          <option value="salida">Salida (resta del stock)</option>
          <option value="ajuste">Ajuste (conteo físico)</option>
        </select>
      </Campo>
      <Campo etiqueta={f.tipo_movimiento === 'ajuste' ? 'Stock contado' : 'Cantidad'}>
        <input required type="number" min={f.tipo_movimiento === 'ajuste' ? 0 : 1} step="1" value={f.cantidad} onChange={set('cantidad')} />
      </Campo>
      <Campo etiqueta="Motivo">
        <input maxLength={150} value={f.motivo} onChange={set('motivo')} placeholder="reposición de stock" />
      </Campo>
      <Campo etiqueta="Usuario">
        <input maxLength={80} value={f.usuario} onChange={set('usuario')} placeholder="bodeguero1" />
      </Campo>
      {resultante != null && f.cantidad !== '' && (
        <p className={`resumen-calculo campo-completo ${resultante < 0 ? 'texto-rojo' : ''}`}>
          Stock actual {fmt.entero(producto.stock_actual)} → quedará en <strong>{fmt.entero(resultante)}</strong>
          {resultante < 0 && ' (no alcanza: el servicio rechazará la salida)'}
        </p>
      )}
    </FormModal>
  );
}

// ------------------------------------------------------------------ Proveedor
export function FormProveedor({ proveedor, onCerrar, onGuardado }) {
  const { toast } = useApp();
  const editando = Boolean(proveedor);
  const [f, setF] = useState({
    nombre: proveedor?.nombre ?? '',
    contacto: proveedor?.contacto ?? '',
    telefono: proveedor?.telefono ?? '',
    email: proveedor?.email ?? '',
    direccion: proveedor?.direccion ?? '',
  });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const enviar = async () => {
    const datos = {
      nombre: f.nombre.trim(),
      contacto: vacioANull(f.contacto.trim()),
      telefono: vacioANull(f.telefono.trim()),
      email: vacioANull(f.email.trim()),
      direccion: vacioANull(f.direccion.trim()),
    };
    const r = editando ? await proveedores.actualizar(proveedor.id, datos) : await proveedores.crear(datos);
    olvidarNombre('proveedor', r.id);
    toast(editando ? `Proveedor #${r.id} actualizado` : `Proveedor #${r.id} creado`);
    onGuardado?.(r);
  };

  return (
    <FormModal titulo={editando ? `Editar proveedor #${proveedor.id}` : 'Nuevo proveedor'} accion={editando ? 'Guardar cambios' : 'Crear proveedor'} onEnviar={enviar} onCerrar={onCerrar}>
      <Campo etiqueta="Razón social" ancho="completo">
        <input required maxLength={150} value={f.nombre} onChange={set('nombre')} placeholder="Distribuidora Andina S.A.C." />
      </Campo>
      <Campo etiqueta="Persona de contacto">
        <input maxLength={100} value={f.contacto} onChange={set('contacto')} />
      </Campo>
      <Campo etiqueta="Teléfono">
        <input maxLength={20} value={f.telefono} onChange={set('telefono')} placeholder="+51 999 999 999" />
      </Campo>
      <Campo etiqueta="Correo">
        <input type="email" maxLength={100} value={f.email} onChange={set('email')} placeholder="ventas@proveedor.pe" />
      </Campo>
      <Campo etiqueta="Dirección">
        <input maxLength={200} value={f.direccion} onChange={set('direccion')} />
      </Campo>
    </FormModal>
  );
}

// ------------------------------------------------------------------ Tiempo de entrega
export function FormTiempo({ tiempo, inicial, onCerrar, onGuardado }) {
  const { toast } = useApp();
  const editando = Boolean(tiempo);
  const [f, setF] = useState({
    proveedor_id: tiempo?.proveedor_id ?? inicial?.proveedor_id ?? '',
    producto_id: tiempo?.producto_id ?? inicial?.producto_id ?? '',
    dias_entrega_min: tiempo?.dias_entrega_min ?? '',
    dias_entrega_promedio: tiempo?.dias_entrega_promedio ?? '',
    dias_entrega_max: tiempo?.dias_entrega_max ?? '',
  });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const [min, prom, max] = [f.dias_entrega_min, f.dias_entrega_promedio, f.dias_entrega_max].map(Number);
  const rangoInvalido = f.dias_entrega_min !== '' && f.dias_entrega_max !== '' && f.dias_entrega_promedio !== '' && !(min <= prom && prom <= max);

  const enviar = async () => {
    if (rangoInvalido) throw new Error('Debe cumplirse: mínimo ≤ promedio ≤ máximo.');
    const dias = { dias_entrega_min: min, dias_entrega_promedio: prom, dias_entrega_max: max };
    const r = editando
      ? await proveedores.actualizarTiempo(tiempo.id, dias)
      : await proveedores.crearTiempo({ ...dias, proveedor_id: Number(f.proveedor_id), producto_id: Number(f.producto_id) });
    toast(editando ? `Tiempo de entrega #${r.id} actualizado` : `Tiempo de entrega #${r.id} creado`);
    onGuardado?.(r);
  };

  return (
    <FormModal
      titulo={editando ? `Editar tiempo de entrega #${tiempo.id}` : 'Nuevo tiempo de entrega'}
      subtitulo="Cuántos días tarda un proveedor en entregar un producto. Predicción y Alertas usan el promedio."
      accion={editando ? 'Guardar cambios' : 'Crear tiempo de entrega'}
      onEnviar={enviar}
      onCerrar={onCerrar}
    >
      <Campo etiqueta="Proveedor" ancho="completo">
        <CampoReferencia tipo="proveedor" valor={f.proveedor_id} onCambiar={(v) => setF({ ...f, proveedor_id: v })} deshabilitado={editando} />
      </Campo>
      <Campo etiqueta="Producto" ancho="completo">
        <CampoReferencia tipo="producto" valor={f.producto_id} onCambiar={(v) => setF({ ...f, producto_id: v })} deshabilitado={editando} />
      </Campo>
      <Campo etiqueta="Días mínimo">
        <input required type="number" min="0" value={f.dias_entrega_min} onChange={set('dias_entrega_min')} />
      </Campo>
      <Campo etiqueta="Días promedio">
        <input required type="number" min="0" value={f.dias_entrega_promedio} onChange={set('dias_entrega_promedio')} />
      </Campo>
      <Campo etiqueta="Días máximo">
        <input required type="number" min="0" value={f.dias_entrega_max} onChange={set('dias_entrega_max')} />
      </Campo>
      {rangoInvalido && <p className="form-error campo-completo">Debe cumplirse: mínimo ≤ promedio ≤ máximo.</p>}
    </FormModal>
  );
}

// ------------------------------------------------------------------ Venta
export function FormVenta({ venta, productoId, onCerrar, onGuardado }) {
  const { toast } = useApp();
  const editando = Boolean(venta);
  const [f, setF] = useState({
    productoId: venta?.productoId ?? productoId ?? '',
    fecha: venta?.fecha ?? hoyISO(),
    cantidadVendida: venta?.cantidadVendida ?? '',
    precioUnitario: venta?.precioUnitario ?? '',
  });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const total = (Number(f.cantidadVendida) || 0) * (Number(f.precioUnitario) || 0);

  const alResolverProducto = (p) => {
    if (p && !editando && f.precioUnitario === '') setF((x) => ({ ...x, precioUnitario: p.precio_unitario }));
  };

  const enviar = async () => {
    const datos = {
      productoId: Number(f.productoId),
      fecha: f.fecha,
      cantidadVendida: Number(f.cantidadVendida),
      precioUnitario: Number(f.precioUnitario),
    };
    const r = editando ? await ventas.actualizar(venta.id, datos) : await ventas.crear(datos);
    toast(editando ? `Venta #${r.id} actualizada` : `Venta #${r.id} registrada por ${fmt.soles(r.total)}`);
    onGuardado?.(r);
  };

  return (
    <FormModal
      titulo={editando ? `Editar venta #${venta.id}` : 'Registrar venta'}
      subtitulo={editando ? null : 'Registrar la venta no descuenta stock: para eso registra una salida en Inventario.'}
      accion={editando ? 'Guardar cambios' : 'Registrar venta'}
      onEnviar={enviar}
      onCerrar={onCerrar}
    >
      <Campo etiqueta="Producto" ancho="completo">
        <CampoReferencia tipo="producto" valor={f.productoId} onCambiar={(v) => setF({ ...f, productoId: v })} onResuelto={alResolverProducto} />
      </Campo>
      <Campo etiqueta="Fecha">
        <input required type="date" value={f.fecha} onChange={set('fecha')} />
      </Campo>
      <Campo etiqueta="Cantidad vendida">
        <input required type="number" min="1" step="1" value={f.cantidadVendida} onChange={set('cantidadVendida')} />
      </Campo>
      <Campo etiqueta="Precio unitario (S/)" ayuda="Se completa con el precio del producto">
        <input required type="number" min="0" step="0.01" value={f.precioUnitario} onChange={set('precioUnitario')} />
      </Campo>
      <p className="resumen-calculo">
        Total <strong>{fmt.soles(total)}</strong>
      </p>
    </FormModal>
  );
}

// ------------------------------------------------------------------ Pedido a proveedor
export function FormPedido({ pedido, inicial, onCerrar, onGuardado }) {
  const { toast } = useApp();
  const editando = Boolean(pedido);
  const [f, setF] = useState({
    productoId: pedido?.productoId ?? inicial?.productoId ?? '',
    proveedorId: pedido?.proveedorId ?? inicial?.proveedorId ?? '',
    fechaPedido: pedido?.fechaPedido ?? hoyISO(),
    cantidadPedida: pedido?.cantidadPedida ?? inicial?.cantidadPedida ?? '',
    estado: pedido?.estado ?? 'pendiente',
    fechaEstimadaEntrega: pedido?.fechaEstimadaEntrega ?? inicial?.fechaEstimadaEntrega ?? '',
  });
  const [sugerencia, setSugerencia] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  // Al elegir el producto se busca su proveedor más rápido (Proveedores) para sugerir proveedor y fecha.
  const alResolverProducto = async (p) => {
    if (!p || editando) return;
    try {
      const t = await proveedores.tiempoDeProducto(p.id);
      setSugerencia(t);
      setF((x) => ({
        ...x,
        proveedorId: x.proveedorId || t.proveedor_id,
        fechaEstimadaEntrega: x.fechaEstimadaEntrega || sumarDias(x.fechaPedido, t.dias_entrega_promedio),
        cantidadPedida: x.cantidadPedida || Math.max(1, p.stock_minimo * 3 - p.stock_actual),
      }));
    } catch {
      setSugerencia(null);
    }
  };

  const enviar = async () => {
    const datos = {
      productoId: Number(f.productoId),
      proveedorId: Number(f.proveedorId),
      fechaPedido: f.fechaPedido,
      cantidadPedida: Number(f.cantidadPedida),
      estado: f.estado,
      fechaEstimadaEntrega: vacioANull(f.fechaEstimadaEntrega),
    };
    const r = editando ? await ventas.actualizarPedido(pedido.id, datos) : await ventas.crearPedido(datos);
    toast(editando ? `Pedido #${r.id} actualizado` : `Pedido #${r.id} registrado`);
    onGuardado?.(r);
  };

  return (
    <FormModal
      titulo={editando ? `Editar pedido #${pedido.id}` : 'Registrar pedido a proveedor'}
      subtitulo={sugerencia ? `Proveedor más rápido: ${sugerencia.proveedor_nombre}, ${sugerencia.dias_entrega_promedio} días en promedio.` : null}
      accion={editando ? 'Guardar cambios' : 'Registrar pedido'}
      onEnviar={enviar}
      onCerrar={onCerrar}
    >
      <Campo etiqueta="Producto" ancho="completo">
        <CampoReferencia tipo="producto" valor={f.productoId} onCambiar={(v) => setF({ ...f, productoId: v })} onResuelto={alResolverProducto} />
      </Campo>
      <Campo etiqueta="Proveedor" ancho="completo">
        <CampoReferencia tipo="proveedor" valor={f.proveedorId} onCambiar={(v) => setF({ ...f, proveedorId: v })} />
      </Campo>
      <Campo etiqueta="Cantidad">
        <input required type="number" min="1" step="1" value={f.cantidadPedida} onChange={set('cantidadPedida')} />
      </Campo>
      <Campo etiqueta="Estado">
        <select value={f.estado} onChange={set('estado')}>
          {ESTADOS_PEDIDO.map((e) => (
            <option key={e.valor} value={e.valor}>
              {e.texto}
            </option>
          ))}
        </select>
      </Campo>
      <Campo etiqueta="Fecha del pedido">
        <input required type="date" value={f.fechaPedido} onChange={set('fechaPedido')} />
      </Campo>
      <Campo etiqueta="Entrega estimada">
        <input type="date" value={f.fechaEstimadaEntrega || ''} onChange={set('fechaEstimadaEntrega')} />
      </Campo>
    </FormModal>
  );
}
