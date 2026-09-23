import { useState } from 'react';
import { inventario } from '../api/endpoints';
import { navegar, olvidarNombre, registrarNombre, useNombres, usePaged } from '../hooks';
import { BarraFiltros, conBusquedaPorId } from '../components/filtros';
import { FormMovimiento, FormProducto } from '../components/formularios';
import { CeldaProducto } from '../components/referencias';
import { Acciones, BarraStock, Cabecera, Cargando, Confirmar, ErrorCarga, Paginador, Tabs, Vacio, fmt, useApp } from '../components/ui';

const TIPOS = [
  { valor: 'entrada', texto: 'Entrada' },
  { valor: 'salida', texto: 'Salida' },
  { valor: 'ajuste', texto: 'Ajuste' },
];

const listarProductos = conBusquedaPorId(async (p, f, o) => {
  const r = await inventario.listarProductos(p, f, o);
  r.items.forEach((x) => registrarNombre('producto', x.id, x));
  return r;
}, inventario.obtenerProducto);
const listarMovimientos = conBusquedaPorId(inventario.listarMovimientos, inventario.obtenerMovimiento);

export default function Inventario({ seccion, params }) {
  const activa = seccion === 'movimientos' ? 'movimientos' : 'productos';
  return (
    <>
      <Cabecera titulo="Inventario" descripcion="Catálogo de productos y el historial de entradas, salidas y ajustes que mueven su stock." />
      <Tabs
        activa={activa}
        onCambiar={(t) => navegar(`/inventario/${t}`)}
        tabs={[
          { clave: 'productos', texto: 'Productos' },
          { clave: 'movimientos', texto: 'Movimientos de stock' },
        ]}
      />
      {activa === 'productos' ? <Productos params={params} /> : <Movimientos params={params} />}
    </>
  );
}

function Productos({ params }) {
  const { abrirProducto, toast } = useApp();
  const filtros = { id: params.id || '' };
  const pag = usePaged(listarProductos, filtros, 25);
  const [form, setForm] = useState(null); // {producto?} para crear/editar
  const [movimiento, setMovimiento] = useState(null);
  const [borrar, setBorrar] = useState(null);

  return (
    <>
      <BarraFiltros ruta="/inventario/productos" params={filtros} campos={[{ clave: 'id', etiqueta: 'Producto #', placeholder: 'ID' }]}>
        <button type="button" className="btn btn-primary" onClick={() => setForm({})}>
          Nuevo producto
        </button>
      </BarraFiltros>

      <div className="tabla-marco">
        {pag.error ? (
          <ErrorCarga error={pag.error} onReintentar={pag.recargar} />
        ) : pag.cargando && !pag.items.length ? (
          <Cargando />
        ) : !pag.items.length ? (
          <Vacio>{filtros.id ? `No existe el producto #${filtros.id}.` : 'Aún no hay productos. Crea el primero.'}</Vacio>
        ) : (
          <table className={pag.cargando ? 'tabla tabla-cargando' : 'tabla'}>
            <thead>
              <tr>
                <th>Producto</th>
                <th>SKU</th>
                <th>Categoría</th>
                <th>Stock (mínimo marcado)</th>
                <th className="num">Precio</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pag.items.map((p) => (
                <tr key={p.id}>
                  <td>
                    <button className="celda-ref" onClick={() => abrirProducto(p.id)}>
                      <span className="celda-id">#{p.id}</span>
                      <span className="celda-nombre">{p.nombre}</span>
                    </button>
                    <div className="sub">{p.unidad_medida}</div>
                  </td>
                  <td className="muted">{p.sku}</td>
                  <td>{p.categoria || '—'}</td>
                  <td>
                    <BarraStock actual={p.stock_actual} minimo={p.stock_minimo} />
                  </td>
                  <td className="num">{fmt.soles(p.precio_unitario)}</td>
                  <td className="celda-acciones">
                    <Acciones>
                      <button className="btn btn-sm" onClick={() => setMovimiento(p.id)}>
                        Mover stock
                      </button>
                      <button className="btn btn-sm btn-texto" onClick={() => setForm({ producto: p })}>
                        Editar
                      </button>
                      <button className="btn btn-sm btn-texto texto-rojo" onClick={() => setBorrar(p)}>
                        Eliminar
                      </button>
                    </Acciones>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!filtros.id && <Paginador {...pag} cantidad={pag.items.length} />}
      </div>

      {form && <FormProducto producto={form.producto} onCerrar={() => setForm(null)} onGuardado={pag.recargar} />}
      {movimiento && <FormMovimiento productoId={movimiento} onCerrar={() => setMovimiento(null)} onGuardado={pag.recargar} />}
      {borrar && (
        <Confirmar
          titulo={`Eliminar producto #${borrar.id}`}
          mensaje={`Se eliminará "${borrar.nombre}". Si tiene movimientos registrados, Inventario no permitirá borrarlo.`}
          onConfirmar={async () => {
            await inventario.eliminarProducto(borrar.id);
            olvidarNombre('producto', borrar.id);
            toast(`Producto #${borrar.id} eliminado`);
            pag.recargar();
          }}
          onCerrar={() => setBorrar(null)}
        />
      )}
    </>
  );
}

function Movimientos({ params }) {
  const filtros = { id: params.id || '', producto_id: params.producto_id || '', tipo_movimiento: params.tipo_movimiento || '' };
  const pag = usePaged(listarMovimientos, filtros, 25);
  const nombres = useNombres('producto', pag.items.map((m) => m.producto_id));
  const [nuevo, setNuevo] = useState(false);

  return (
    <>
      <BarraFiltros
        ruta="/inventario/movimientos"
        params={filtros}
        campos={[
          { clave: 'producto_id', etiqueta: 'Producto #', placeholder: 'ID' },
          { clave: 'tipo_movimiento', etiqueta: 'Tipo', opciones: TIPOS },
          { clave: 'id', etiqueta: 'Movimiento #', placeholder: 'ID' },
        ]}
      >
        <button type="button" className="btn btn-primary" onClick={() => setNuevo(true)}>
          Registrar movimiento
        </button>
      </BarraFiltros>

      <div className="tabla-marco">
        {pag.error ? (
          <ErrorCarga error={pag.error} onReintentar={pag.recargar} />
        ) : pag.cargando && !pag.items.length ? (
          <Cargando />
        ) : !pag.items.length ? (
          <Vacio>No hay movimientos con estos filtros.</Vacio>
        ) : (
          <table className={pag.cargando ? 'tabla tabla-cargando' : 'tabla'}>
            <thead>
              <tr>
                <th>#</th>
                <th>Fecha</th>
                <th>Producto</th>
                <th>Tipo</th>
                <th className="num">Cantidad</th>
                <th>Motivo</th>
                <th>Usuario</th>
              </tr>
            </thead>
            <tbody>
              {pag.items.map((m) => (
                <tr key={m.id}>
                  <td className="muted">{m.id}</td>
                  <td>{fmt.fechaHora(m.fecha_movimiento)}</td>
                  <td>
                    <CeldaProducto id={m.producto_id} nombres={nombres} />
                  </td>
                  <td>
                    <span className={`pill pill-mov-${m.tipo_movimiento}`}>{TIPOS.find((t) => t.valor === m.tipo_movimiento)?.texto}</span>
                  </td>
                  <td className="num">
                    {m.tipo_movimiento === 'entrada' ? '+' : m.tipo_movimiento === 'salida' ? '−' : '='}
                    {fmt.entero(m.cantidad)}
                  </td>
                  <td>{m.motivo || '—'}</td>
                  <td className="muted">{m.usuario || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!filtros.id && <Paginador {...pag} cantidad={pag.items.length} />}
      </div>

      {nuevo && <FormMovimiento productoId={filtros.producto_id} onCerrar={() => setNuevo(false)} onGuardado={pag.recargar} />}
    </>
  );
}
