import { useState } from 'react';
import { proveedores } from '../api/endpoints';
import { navegar, olvidarNombre, registrarNombre, useNombres, usePaged } from '../hooks';
import { BarraFiltros, conBusquedaPorId } from '../components/filtros';
import { FormProveedor, FormTiempo } from '../components/formularios';
import { CeldaProducto, CeldaProveedor } from '../components/referencias';
import { Acciones, Cabecera, Cargando, Confirmar, ErrorCarga, Paginador, Tabs, Vacio, useApp } from '../components/ui';

const listarProveedores = conBusquedaPorId(async (p, f, o) => {
  const r = await proveedores.listar(p, f, o);
  r.items.forEach((x) => registrarNombre('proveedor', x.id, x));
  return r;
}, proveedores.obtener);

export default function Proveedores({ seccion, params }) {
  const activa = seccion === 'tiempos' ? 'tiempos' : 'lista';
  return (
    <>
      <Cabecera titulo="Proveedores" descripcion="Quién abastece la bodega y cuántos días tarda en entregar cada producto." />
      <Tabs
        activa={activa}
        onCambiar={(t) => navegar(`/proveedores/${t}`)}
        tabs={[
          { clave: 'lista', texto: 'Proveedores' },
          { clave: 'tiempos', texto: 'Tiempos de entrega' },
        ]}
      />
      {activa === 'lista' ? <Lista params={params} /> : <Tiempos params={params} />}
    </>
  );
}

function Lista({ params }) {
  const { toast } = useApp();
  const filtros = { id: params.id || '' };
  const pag = usePaged(listarProveedores, filtros, 25);
  const [form, setForm] = useState(null);
  const [borrar, setBorrar] = useState(null);

  return (
    <>
      <BarraFiltros ruta="/proveedores/lista" params={filtros} campos={[{ clave: 'id', etiqueta: 'Proveedor #', placeholder: 'ID' }]}>
        <button type="button" className="btn btn-primary" onClick={() => setForm({})}>
          Nuevo proveedor
        </button>
      </BarraFiltros>

      <div className="tabla-marco">
        {pag.error ? (
          <ErrorCarga error={pag.error} onReintentar={pag.recargar} />
        ) : pag.cargando && !pag.items.length ? (
          <Cargando />
        ) : !pag.items.length ? (
          <Vacio>{filtros.id ? `No existe el proveedor #${filtros.id}.` : 'Aún no hay proveedores.'}</Vacio>
        ) : (
          <table className={pag.cargando ? 'tabla tabla-cargando' : 'tabla'}>
            <thead>
              <tr>
                <th>Proveedor</th>
                <th>Contacto</th>
                <th>Teléfono</th>
                <th>Correo</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pag.items.map((p) => (
                <tr key={p.id}>
                  <td>
                    <CeldaProveedor id={p.id} nombre={p.nombre} />
                    <div className="sub">{p.direccion}</div>
                  </td>
                  <td>{p.contacto || '—'}</td>
                  <td className="muted">{p.telefono || '—'}</td>
                  <td>{p.email ? <a href={`mailto:${p.email}`}>{p.email}</a> : '—'}</td>
                  <td className="celda-acciones">
                    <Acciones>
                      <button className="btn btn-sm" onClick={() => navegar('/proveedores/tiempos', { proveedor_id: p.id })}>
                        Tiempos de entrega
                      </button>
                      <button className="btn btn-sm btn-texto" onClick={() => setForm({ proveedor: p })}>
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

      {form && <FormProveedor proveedor={form.proveedor} onCerrar={() => setForm(null)} onGuardado={pag.recargar} />}
      {borrar && (
        <Confirmar
          titulo={`Eliminar proveedor #${borrar.id}`}
          mensaje={`Se eliminará "${borrar.nombre}". Si tiene tiempos de entrega registrados, primero hay que borrarlos.`}
          onConfirmar={async () => {
            await proveedores.eliminar(borrar.id);
            olvidarNombre('proveedor', borrar.id);
            toast(`Proveedor #${borrar.id} eliminado`);
            pag.recargar();
          }}
          onCerrar={() => setBorrar(null)}
        />
      )}
    </>
  );
}

function Tiempos({ params }) {
  const { toast } = useApp();
  const filtros = { proveedor_id: params.proveedor_id || '', producto_id: params.producto_id || '' };
  const pag = usePaged(proveedores.listarTiempos, filtros, 25);
  const nombres = useNombres('producto', pag.items.map((t) => t.producto_id));
  const [form, setForm] = useState(null);
  const [borrar, setBorrar] = useState(null);

  return (
    <>
      <BarraFiltros
        ruta="/proveedores/tiempos"
        params={filtros}
        campos={[
          { clave: 'proveedor_id', etiqueta: 'Proveedor #', placeholder: 'ID' },
          { clave: 'producto_id', etiqueta: 'Producto #', placeholder: 'ID' },
        ]}
      >
        <button type="button" className="btn btn-primary" onClick={() => setForm({ inicial: filtros })}>
          Nuevo tiempo de entrega
        </button>
      </BarraFiltros>

      <div className="tabla-marco">
        {pag.error ? (
          <ErrorCarga error={pag.error} onReintentar={pag.recargar} />
        ) : pag.cargando && !pag.items.length ? (
          <Cargando />
        ) : !pag.items.length ? (
          <Vacio>No hay tiempos de entrega con estos filtros.</Vacio>
        ) : (
          <table className={pag.cargando ? 'tabla tabla-cargando' : 'tabla'}>
            <thead>
              <tr>
                <th>#</th>
                <th>Proveedor</th>
                <th>Producto</th>
                <th className="num">Mínimo</th>
                <th className="num">Promedio</th>
                <th className="num">Máximo</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pag.items.map((t) => (
                <tr key={t.id}>
                  <td className="muted">{t.id}</td>
                  <td>
                    <CeldaProveedor id={t.proveedor_id} nombre={t.proveedor_nombre} />
                  </td>
                  <td>
                    <CeldaProducto id={t.producto_id} nombres={nombres} />
                  </td>
                  <td className="num">{t.dias_entrega_min} d</td>
                  <td className="num">
                    <strong>{t.dias_entrega_promedio} d</strong>
                  </td>
                  <td className="num">{t.dias_entrega_max} d</td>
                  <td className="celda-acciones">
                    <Acciones>
                      <button className="btn btn-sm btn-texto" onClick={() => setForm({ tiempo: t })}>
                        Editar
                      </button>
                      <button className="btn btn-sm btn-texto texto-rojo" onClick={() => setBorrar(t)}>
                        Eliminar
                      </button>
                    </Acciones>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Paginador {...pag} cantidad={pag.items.length} />
      </div>

      {form && <FormTiempo tiempo={form.tiempo} inicial={form.inicial} onCerrar={() => setForm(null)} onGuardado={pag.recargar} />}
      {borrar && (
        <Confirmar
          titulo={`Eliminar tiempo de entrega #${borrar.id}`}
          mensaje={`${borrar.proveedor_nombre} dejará de figurar como proveedor del producto #${borrar.producto_id}.`}
          onConfirmar={async () => {
            await proveedores.eliminarTiempo(borrar.id);
            toast(`Tiempo de entrega #${borrar.id} eliminado`);
            pag.recargar();
          }}
          onCerrar={() => setBorrar(null)}
        />
      )}
    </>
  );
}
