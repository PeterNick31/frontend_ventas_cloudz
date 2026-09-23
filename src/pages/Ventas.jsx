import { useState } from 'react';
import { ventas } from '../api/endpoints';
import { navegar, useNombres, usePaged } from '../hooks';
import { BarraFiltros, conBusquedaPorId } from '../components/filtros';
import { ESTADOS_PEDIDO, FormPedido, FormVenta } from '../components/formularios';
import { CeldaProducto, CeldaProveedor } from '../components/referencias';
import { Acciones, Cabecera, Cargando, Confirmar, ErrorCarga, Paginador, Tabs, Vacio, fmt, useApp } from '../components/ui';

const listarVentas = conBusquedaPorId(ventas.listar, ventas.obtener);
const listarPedidos = conBusquedaPorId(ventas.listarPedidos, ventas.obtenerPedido);

export default function Ventas({ seccion, params }) {
  const activa = seccion === 'pedidos' ? 'pedidos' : 'diarias';
  return (
    <>
      <Cabecera titulo="Ventas" descripcion="Ventas registradas por día y producto, y los pedidos de reposición hechos a proveedores." />
      <Tabs
        activa={activa}
        onCambiar={(t) => navegar(`/ventas/${t}`)}
        tabs={[
          { clave: 'diarias', texto: 'Ventas' },
          { clave: 'pedidos', texto: 'Pedidos a proveedores' },
        ]}
      />
      {activa === 'diarias' ? <Diarias params={params} /> : <Pedidos params={params} />}
    </>
  );
}

function Diarias({ params }) {
  const { toast } = useApp();
  const filtros = { id: params.id || '', productoId: params.productoId || '', desde: params.desde || '', hasta: params.hasta || '' };
  const pag = usePaged(listarVentas, filtros, 25);
  const nombres = useNombres('producto', pag.items.map((v) => v.productoId));
  const [form, setForm] = useState(null);
  const [borrar, setBorrar] = useState(null);
  const totalPagina = pag.items.reduce((s, v) => s + Number(v.total || 0), 0);

  return (
    <>
      <BarraFiltros
        ruta="/ventas/diarias"
        params={filtros}
        campos={[
          { clave: 'productoId', etiqueta: 'Producto #', placeholder: 'ID' },
          { clave: 'desde', etiqueta: 'Desde', tipo: 'date', ancho: 150 },
          { clave: 'hasta', etiqueta: 'Hasta', tipo: 'date', ancho: 150 },
          { clave: 'id', etiqueta: 'Venta #', placeholder: 'ID' },
        ]}
      >
        <button type="button" className="btn btn-primary" onClick={() => setForm({ productoId: filtros.productoId })}>
          Registrar venta
        </button>
      </BarraFiltros>

      <div className="tabla-marco">
        {pag.error ? (
          <ErrorCarga error={pag.error} onReintentar={pag.recargar} />
        ) : pag.cargando && !pag.items.length ? (
          <Cargando />
        ) : !pag.items.length ? (
          <Vacio>No hay ventas con estos filtros.</Vacio>
        ) : (
          <table className={pag.cargando ? 'tabla tabla-cargando' : 'tabla'}>
            <thead>
              <tr>
                <th>#</th>
                <th>Fecha</th>
                <th>Producto</th>
                <th className="num">Cantidad</th>
                <th className="num">Precio unit.</th>
                <th className="num">Total</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pag.items.map((v) => (
                <tr key={v.id}>
                  <td className="muted">{v.id}</td>
                  <td>{fmt.fecha(v.fecha)}</td>
                  <td>
                    <CeldaProducto id={v.productoId} nombres={nombres} />
                  </td>
                  <td className="num">{fmt.entero(v.cantidadVendida)}</td>
                  <td className="num">{fmt.soles(v.precioUnitario)}</td>
                  <td className="num">
                    <strong>{fmt.soles(v.total)}</strong>
                  </td>
                  <td className="celda-acciones">
                    <Acciones>
                      <button className="btn btn-sm btn-texto" onClick={() => setForm({ venta: v })}>
                        Editar
                      </button>
                      <button className="btn btn-sm btn-texto texto-rojo" onClick={() => setBorrar(v)}>
                        Eliminar
                      </button>
                    </Acciones>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={5} className="num muted">
                  Total de esta página
                </td>
                <td className="num">
                  <strong>{fmt.soles(totalPagina)}</strong>
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        )}
        {!filtros.id && <Paginador {...pag} cantidad={pag.items.length} />}
      </div>

      {form && <FormVenta venta={form.venta} productoId={form.productoId} onCerrar={() => setForm(null)} onGuardado={pag.recargar} />}
      {borrar && (
        <Confirmar
          titulo={`Eliminar venta #${borrar.id}`}
          mensaje={`Se eliminará la venta del ${fmt.fecha(borrar.fecha)} por ${fmt.soles(borrar.total)}. Los pedidos vinculados a ella quedarán sin vínculo.`}
          onConfirmar={async () => {
            await ventas.eliminar(borrar.id);
            toast(`Venta #${borrar.id} eliminada`);
            pag.recargar();
          }}
          onCerrar={() => setBorrar(null)}
        />
      )}
    </>
  );
}

function Pedidos({ params }) {
  const { toast } = useApp();
  const filtros = { id: params.id || '', productoId: params.productoId || '', proveedorId: params.proveedorId || '', estado: params.estado || '' };
  const pag = usePaged(listarPedidos, filtros, 25);
  const nombresProd = useNombres('producto', pag.items.map((p) => p.productoId));
  const nombresProv = useNombres('proveedor', pag.items.map((p) => p.proveedorId));
  const [form, setForm] = useState(null);
  const [borrar, setBorrar] = useState(null);

  const cambiarEstado = async (p, estado) => {
    try {
      await ventas.actualizarPedido(p.id, { estado });
      toast(`Pedido #${p.id}: ${ESTADOS_PEDIDO.find((e) => e.valor === estado).texto.toLowerCase()}`);
      pag.recargar();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  return (
    <>
      <BarraFiltros
        ruta="/ventas/pedidos"
        params={filtros}
        campos={[
          { clave: 'productoId', etiqueta: 'Producto #', placeholder: 'ID' },
          { clave: 'proveedorId', etiqueta: 'Proveedor #', placeholder: 'ID' },
          { clave: 'estado', etiqueta: 'Estado', opciones: ESTADOS_PEDIDO },
          { clave: 'id', etiqueta: 'Pedido #', placeholder: 'ID' },
        ]}
      >
        <button type="button" className="btn btn-primary" onClick={() => setForm({ inicial: { productoId: filtros.productoId, proveedorId: filtros.proveedorId } })}>
          Registrar pedido
        </button>
      </BarraFiltros>

      <div className="tabla-marco">
        {pag.error ? (
          <ErrorCarga error={pag.error} onReintentar={pag.recargar} />
        ) : pag.cargando && !pag.items.length ? (
          <Cargando />
        ) : !pag.items.length ? (
          <Vacio>No hay pedidos con estos filtros.</Vacio>
        ) : (
          <table className={pag.cargando ? 'tabla tabla-cargando' : 'tabla'}>
            <thead>
              <tr>
                <th>#</th>
                <th>Pedido</th>
                <th>Producto</th>
                <th>Proveedor</th>
                <th className="num">Cantidad</th>
                <th>Entrega estimada</th>
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pag.items.map((p) => (
                <tr key={p.id}>
                  <td className="muted">{p.id}</td>
                  <td>{fmt.fecha(p.fechaPedido)}</td>
                  <td>
                    <CeldaProducto id={p.productoId} nombres={nombresProd} />
                  </td>
                  <td>
                    <CeldaProveedor id={p.proveedorId} nombres={nombresProv} />
                  </td>
                  <td className="num">{fmt.entero(p.cantidadPedida)}</td>
                  <td>{fmt.fecha(p.fechaEstimadaEntrega)}</td>
                  <td>
                    <select
                      className={`select-estado estado-${p.estado}`}
                      value={p.estado}
                      onChange={(e) => cambiarEstado(p, e.target.value)}
                      aria-label={`Estado del pedido ${p.id}`}
                    >
                      {ESTADOS_PEDIDO.map((e) => (
                        <option key={e.valor} value={e.valor}>
                          {e.texto}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="celda-acciones">
                    <Acciones>
                      <button className="btn btn-sm btn-texto" onClick={() => setForm({ pedido: p })}>
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

      {form && <FormPedido pedido={form.pedido} inicial={form.inicial} onCerrar={() => setForm(null)} onGuardado={pag.recargar} />}
      {borrar && (
        <Confirmar
          titulo={`Eliminar pedido #${borrar.id}`}
          mensaje={`Se eliminará el pedido de ${fmt.entero(borrar.cantidadPedida)} unidades del producto #${borrar.productoId}.`}
          onConfirmar={async () => {
            await ventas.eliminarPedido(borrar.id);
            toast(`Pedido #${borrar.id} eliminado`);
            pag.recargar();
          }}
          onCerrar={() => setBorrar(null)}
        />
      )}
    </>
  );
}
