import { useMemo, useState } from 'react';
import { Pencil, Plus, Search, Timer, Trash2 } from 'lucide-react';
import { proveedores as apiProveedores, tiempos } from '../api/proveedores';
import { useCatalogos } from '../hooks/useCatalogos';
import { useCargar } from '../hooks/useCargar';
import { usePaginacion } from '../hooks/usePaginacion';
import { esEnteroNoNegativo } from '../utils/formato';
import { useToast } from '../ui/Toast';
import Boton from '../ui/Boton';
import Campo from '../ui/Campo';
import ConfirmDialog from '../ui/ConfirmDialog';
import DataList from '../ui/DataList';
import { Cargando, ErrorCaja, EstadoVacio } from '../ui/Estado';
import Modal from '../ui/Modal';
import PageHeader from '../ui/PageHeader';
import Paginacion from '../ui/Paginacion';
import Selector from '../ui/Selector';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function ProveedorForm({ proveedor, onGuardado, onCerrar }) {
  const editando = Boolean(proveedor);
  const { recargar } = useCatalogos();
  const toast = useToast();
  const [f, setF] = useState({
    nombre: proveedor?.nombre || '',
    contacto: proveedor?.contacto || '',
    telefono: proveedor?.telefono || '',
    email: proveedor?.email || '',
    direccion: proveedor?.direccion || '',
  });
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const set = (campo) => (e) => setF((prev) => ({ ...prev, [campo]: e.target.value }));

  const guardar = async (ev) => {
    ev.preventDefault();
    const e = {};
    if (!f.nombre.trim()) e.nombre = 'El nombre es obligatorio.';
    if (f.email.trim() && !EMAIL.test(f.email.trim())) e.email = 'Escribe un correo válido, como nombre@dominio.com.';
    setErrores(e);
    if (Object.keys(e).length) return;

    setGuardando(true);
    setErrorGeneral(null);
    const datos = Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v.trim() || null]));
    datos.nombre = f.nombre.trim();
    try {
      const r = editando ? await apiProveedores.actualizar(proveedor.id, datos) : await apiProveedores.crear(datos);
      toast.ok(editando ? 'Proveedor actualizado.' : 'Proveedor creado.');
      await recargar();
      onGuardado(r);
    } catch (err) {
      setErrorGeneral(err.message);
      setGuardando(false);
    }
  };

  return (
    <Modal
      titulo={editando ? 'Editar proveedor' : 'Nuevo proveedor'}
      onCerrar={onCerrar}
      pie={
        <>
          <Boton variante="secundario" onClick={onCerrar} disabled={guardando}>Cancelar</Boton>
          <Boton type="submit" form="form-proveedor" cargando={guardando}>{editando ? 'Guardar cambios' : 'Crear proveedor'}</Boton>
        </>
      }
    >
      <form id="form-proveedor" className="form-grid" onSubmit={guardar} noValidate>
        <Campo etiqueta="Nombre *" error={errores.nombre} className="completo">
          <input className="input" value={f.nombre} onChange={set('nombre')} maxLength={150} aria-invalid={!!errores.nombre} />
        </Campo>
        <Campo etiqueta="Persona de contacto"><input className="input" value={f.contacto} onChange={set('contacto')} maxLength={100} /></Campo>
        <Campo etiqueta="Teléfono"><input className="input" type="tel" value={f.telefono} onChange={set('telefono')} maxLength={20} /></Campo>
        <Campo etiqueta="Correo" error={errores.email} className="completo">
          <input className="input" type="email" value={f.email} onChange={set('email')} maxLength={100} aria-invalid={!!errores.email} />
        </Campo>
        <Campo etiqueta="Dirección" className="completo"><input className="input" value={f.direccion} onChange={set('direccion')} maxLength={200} /></Campo>
      </form>
      {errorGeneral && <p className="aviso aviso-error" role="alert">{errorGeneral}</p>}
    </Modal>
  );
}

// Productos que surte un proveedor y en cuántos días los entrega.
function TiemposPanel({ proveedor, onCerrar }) {
  const { opcionesProductos, nombreProducto } = useCatalogos();
  const toast = useToast();
  const { datos, cargando, error, recargar } = useCargar(() => tiempos.listar({ proveedor_id: proveedor.id }), [proveedor.id]);
  const filas = useMemo(() => (Array.isArray(datos) ? datos : []), [datos]);

  const [edicion, setEdicion] = useState(null); // null = cerrado; {} = nuevo; objeto = editar
  const [f, setF] = useState({ producto_id: '', dias_entrega_promedio: '', dias_entrega_min: '', dias_entrega_max: '' });
  const [errorForm, setErrorForm] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [quitando, setQuitando] = useState(null);

  const opcionesDisponibles = useMemo(() => {
    const usados = new Set(filas.map((t) => t.producto_id));
    return opcionesProductos.filter((p) => !usados.has(p.id));
  }, [opcionesProductos, filas]);

  const abrir = (t) => {
    setErrorForm(null);
    setEdicion(t);
    setF(
      t.id
        ? { producto_id: String(t.producto_id), dias_entrega_promedio: String(t.dias_entrega_promedio), dias_entrega_min: String(t.dias_entrega_min), dias_entrega_max: String(t.dias_entrega_max) }
        : { producto_id: '', dias_entrega_promedio: '', dias_entrega_min: '', dias_entrega_max: '' },
    );
  };
  const set = (campo) => (e) => setF((prev) => ({ ...prev, [campo]: e.target.value }));

  const { producto_id, dias_entrega_promedio: prom, dias_entrega_min: min, dias_entrega_max: max } = f;
  let problema = null;
  if (edicion) {
    if (!edicion.id && !producto_id) problema = 'Elige un producto.';
    else if (![prom, min, max].every(esEnteroNoNegativo)) problema = 'Los días deben ser números enteros, 0 o más.';
    else if (!(Number(min) <= Number(prom) && Number(prom) <= Number(max))) problema = 'Se debe cumplir: mínimo ≤ promedio ≤ máximo.';
  }

  const guardar = async (e) => {
    e.preventDefault();
    if (problema) return;
    setGuardando(true);
    setErrorForm(null);
    const dias = { dias_entrega_promedio: Number(prom), dias_entrega_min: Number(min), dias_entrega_max: Number(max) };
    try {
      if (edicion.id) await tiempos.actualizar(edicion.id, dias);
      else await tiempos.crear({ proveedor_id: proveedor.id, producto_id: Number(producto_id), ...dias });
      toast.ok('Tiempo de entrega guardado.');
      setEdicion(null);
      await recargar();
    } catch (err) {
      setErrorForm(err.status === 409 ? 'Este proveedor ya tiene un tiempo de entrega para ese producto. Edítalo en la lista.' : err.message);
    }
    setGuardando(false);
  };

  const quitar = async (t) => {
    try {
      await tiempos.eliminar(t.id);
      toast.ok('Tiempo de entrega quitado.');
      setQuitando(null);
      await recargar();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const columnas = [
    { titulo: 'Producto', principal: true, render: (t) => nombreProducto(t.producto_id) },
    { titulo: 'Promedio', alinear: 'derecha', render: (t) => `${t.dias_entrega_promedio} d` },
    { titulo: 'Mín.', alinear: 'derecha', render: (t) => `${t.dias_entrega_min} d` },
    { titulo: 'Máx.', alinear: 'derecha', render: (t) => `${t.dias_entrega_max} d` },
    {
      titulo: 'Acciones',
      acciones: true,
      render: (t) =>
        quitando === t.id ? (
          <>
            <span style={{ alignSelf: 'center' }}>¿Quitar?</span>
            <Boton variante="peligro" className="boton-chico" onClick={() => quitar(t)}>Sí, quitar</Boton>
            <Boton variante="secundario" className="boton-chico" onClick={() => setQuitando(null)}>No</Boton>
          </>
        ) : (
          <>
            <Boton variante="fantasma" icono={Pencil} className="boton-chico" onClick={() => abrir(t)}>Editar</Boton>
            <Boton variante="fantasma" icono={Trash2} className="boton-chico rojo" onClick={() => setQuitando(t.id)}>Quitar</Boton>
          </>
        ),
    },
  ];

  return (
    <Modal titulo={`Productos que surte · ${proveedor.nombre}`} onCerrar={onCerrar} ancho="lg">
      <p className="subtitulo" style={{ marginBottom: 14 }}>
        Cuántos días tarda este proveedor en entregar cada producto. Sirve para calcular cuándo hay que pedir.
      </p>
      {cargando && !datos && <Cargando />}
      {error && <ErrorCaja mensaje={error} onReintentar={recargar} />}
      {datos && filas.length === 0 && !edicion && <EstadoVacio titulo="Aún no surte ningún producto" texto="Agrega el primero para que el sistema conozca su tiempo de entrega." />}
      {filas.length > 0 && <DataList etiqueta="Tiempos de entrega" columnas={columnas} filas={filas} clave={(t) => t.id} />}

      {edicion ? (
        <form className="panel" style={{ marginTop: 16 }} onSubmit={guardar}>
          <h2>{edicion.id ? `Editar: ${nombreProducto(edicion.producto_id)}` : 'Agregar producto'}</h2>
          <div className="form-grid">
            {!edicion.id && (
              <Selector etiqueta="Producto" items={opcionesDisponibles} valor={producto_id} onChange={(v) => setF((prev) => ({ ...prev, producto_id: v }))} placeholder="Escribe nombre o código…" className="completo" />
            )}
            <Campo etiqueta="Días mínimo"><input className="input" type="number" min="0" step="1" inputMode="numeric" value={min} onChange={set('dias_entrega_min')} /></Campo>
            <Campo etiqueta="Días promedio"><input className="input" type="number" min="0" step="1" inputMode="numeric" value={prom} onChange={set('dias_entrega_promedio')} /></Campo>
            <Campo etiqueta="Días máximo"><input className="input" type="number" min="0" step="1" inputMode="numeric" value={max} onChange={set('dias_entrega_max')} /></Campo>
          </div>
          {(prom !== '' || min !== '' || max !== '') && problema && <p className="campo-error" style={{ marginTop: 10 }}>{problema}</p>}
          {errorForm && <p className="aviso aviso-error" role="alert">{errorForm}</p>}
          <div className="acciones-fila" style={{ marginTop: 14 }}>
            <Boton variante="secundario" onClick={() => setEdicion(null)} disabled={guardando}>Cancelar</Boton>
            <Boton type="submit" cargando={guardando} disabled={!!problema}>Guardar</Boton>
          </div>
        </form>
      ) : (
        <Boton icono={Plus} onClick={() => abrir({})} style={{ marginTop: 16 }} disabled={opcionesDisponibles.length === 0}>
          Agregar producto
        </Boton>
      )}
    </Modal>
  );
}

export default function Proveedores() {
  const { proveedores, cargando, error, recargar } = useCatalogos();
  const toast = useToast();
  const [busqueda, setBusqueda] = useState('');
  const [formulario, setFormulario] = useState(null);
  const [tiemposDe, setTiemposDe] = useState(null);
  const [aEliminar, setAEliminar] = useState(null);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return proveedores
      .filter((p) => !q || `${p.nombre} ${p.contacto || ''} ${p.email || ''}`.toLowerCase().includes(q))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [proveedores, busqueda]);
  const { pagina, totalPaginas, itemsPagina, setPagina } = usePaginacion(filtrados);

  const eliminar = async () => {
    try {
      await apiProveedores.eliminar(aEliminar.id);
    } catch (err) {
      if (err.status === 409) {
        throw new Error('Este proveedor todavía tiene productos asignados. Quítalos primero con «Productos que surte» y vuelve a intentar.');
      }
      throw err;
    }
    toast.ok(`«${aEliminar.nombre}» eliminado.`);
    setAEliminar(null);
    await recargar();
  };

  const columnas = [
    { titulo: 'Proveedor', principal: true, render: (p) => <>{p.nombre}{p.direccion && <span className="sub">{p.direccion}</span>}</> },
    { titulo: 'Contacto', render: (p) => p.contacto || '—' },
    { titulo: 'Teléfono', render: (p) => (p.telefono ? <a href={`tel:${p.telefono}`}>{p.telefono}</a> : '—') },
    { titulo: 'Correo', render: (p) => (p.email ? <a href={`mailto:${p.email}`}>{p.email}</a> : '—') },
    {
      titulo: 'Acciones',
      acciones: true,
      render: (p) => (
        <>
          <Boton variante="fantasma" icono={Timer} className="boton-chico" onClick={() => setTiemposDe(p)}>Productos que surte</Boton>
          <Boton variante="fantasma" icono={Pencil} className="boton-chico" onClick={() => setFormulario({ proveedor: p })}>Editar</Boton>
          <Boton variante="fantasma" icono={Trash2} className="boton-chico rojo" onClick={() => setAEliminar(p)}>Eliminar</Boton>
        </>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        titulo="Proveedores"
        subtitulo={`${proveedores.length} proveedores registrados`}
        acciones={<Boton icono={Plus} onClick={() => setFormulario({})}>Nuevo proveedor</Boton>}
      />
      <div className="barra-filtros">
        <label className="campo buscador-campo">
          <span className="campo-etiqueta">Buscar</span>
          <span className="buscador">
            <Search size={18} />
            <input className="input" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Nombre, contacto o correo…" />
          </span>
        </label>
      </div>

      {cargando && <Cargando />}
      {error && <ErrorCaja mensaje={error} onReintentar={recargar} />}
      {!cargando && !error && filtrados.length === 0 && (
        <EstadoVacio
          titulo={proveedores.length === 0 ? 'Aún no hay proveedores' : 'Ningún proveedor coincide'}
          texto={proveedores.length === 0 ? 'Registra a quién le compras para poder hacer pedidos.' : 'Prueba con otra búsqueda.'}
          accion={proveedores.length === 0 && <Boton icono={Plus} onClick={() => setFormulario({})}>Nuevo proveedor</Boton>}
        />
      )}
      {filtrados.length > 0 && (
        <>
          <DataList etiqueta="Proveedores" columnas={columnas} filas={itemsPagina} clave={(p) => p.id} />
          <Paginacion paginaActual={pagina} totalPaginas={totalPaginas} onCambiarPagina={setPagina} />
        </>
      )}

      {formulario && <ProveedorForm proveedor={formulario.proveedor} onGuardado={() => setFormulario(null)} onCerrar={() => setFormulario(null)} />}
      {tiemposDe && <TiemposPanel proveedor={tiemposDe} onCerrar={() => setTiemposDe(null)} />}
      {aEliminar && (
        <ConfirmDialog
          titulo="Eliminar proveedor"
          mensaje={`¿Eliminar a «${aEliminar.nombre}»? Esta acción no se puede deshacer.`}
          confirmarTexto="Eliminar"
          peligro
          onConfirmar={eliminar}
          onCancelar={() => setAEliminar(null)}
        />
      )}
    </>
  );
}
