import { useMemo, useState } from 'react';
import { ArrowLeftRight, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { productos as apiProductos } from '../api/inventario';
import { alertas } from '../api/analisis';
import { irA } from '../hooks/useHashRoute';
import { useCatalogos } from '../hooks/useCatalogos';
import { useCargar } from '../hooks/useCargar';
import { usePaginacion } from '../hooks/usePaginacion';
import { moneda } from '../utils/formato';
import { useToast } from '../ui/Toast';
import Boton from '../ui/Boton';
import ConfirmDialog from '../ui/ConfirmDialog';
import DataList from '../ui/DataList';
import { Badge, Cargando, ErrorCaja, EstadoVacio, SemaforoBadge } from '../ui/Estado';
import PageHeader from '../ui/PageHeader';
import Paginacion from '../ui/Paginacion';
import ProductoForm from './ProductoForm';
import MovimientoForm from './MovimientoForm';

const FILTROS_ESTADO = [
  ['todos', 'Todos'],
  ['bajo', 'Bajo mínimo'],
  ['rojo', 'Pedir ya'],
  ['amarillo', 'Vigilar'],
  ['verde', 'Saludables'],
];

export default function Inventario() {
  const { productos, cargando, error, recargar } = useCatalogos();
  const toast = useToast();
  // El semáforo es opcional: si alertas-api no responde, el inventario funciona igual.
  const alertasQ = useCargar(() => alertas.lista(), []);
  const semaforoPorId = useMemo(
    () => new Map((Array.isArray(alertasQ.datos) ? alertasQ.datos : []).map((a) => [a.producto_id, a])),
    [alertasQ.datos],
  );

  const [busqueda, setBusqueda] = useState('');
  const [categoria, setCategoria] = useState('');
  const [estado, setEstado] = useState('todos');
  const [orden, setOrden] = useState('nombre');
  const [formulario, setFormulario] = useState(null); // { producto? }
  const [movimiento, setMovimiento] = useState(null); // producto
  const [aEliminar, setAEliminar] = useState(null);

  const categorias = useMemo(() => [...new Set(productos.map((p) => p.categoria).filter(Boolean))].sort(), [productos]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const lista = productos.filter((p) => {
      if (q && !`${p.nombre} ${p.sku}`.toLowerCase().includes(q)) return false;
      if (categoria && p.categoria !== categoria) return false;
      if (estado === 'bajo') return p.stock_actual <= p.stock_minimo;
      if (estado !== 'todos') return semaforoPorId.get(p.id)?.semaforo === estado;
      return true;
    });
    const orden_ = {
      nombre: (a, b) => a.nombre.localeCompare(b.nombre),
      stock_asc: (a, b) => a.stock_actual - b.stock_actual,
      stock_desc: (a, b) => b.stock_actual - a.stock_actual,
    }[orden];
    return [...lista].sort(orden_);
  }, [productos, busqueda, categoria, estado, orden, semaforoPorId]);

  const { pagina, totalPaginas, itemsPagina, setPagina } = usePaginacion(filtrados);

  const eliminar = async () => {
    try {
      await apiProductos.eliminar(aEliminar.id);
    } catch (err) {
      if (err.status === 409) {
        throw new Error('Este producto tiene movimientos de stock registrados y por eso no se puede eliminar. El historial se conserva.');
      }
      throw err;
    }
    toast.ok(`«${aEliminar.nombre}» eliminado.`);
    setAEliminar(null);
    await recargar();
  };

  const columnas = [
    {
      titulo: 'Producto',
      principal: true,
      render: (p) => (
        <>
          {p.nombre}
          <span className="sub">{p.sku}</span>
        </>
      ),
    },
    { titulo: 'Categoría', render: (p) => p.categoria || '—' },
    {
      titulo: 'Stock',
      alinear: 'derecha',
      render: (p) => (
        <>
          <strong>{p.stock_actual}</strong> <span className="sub" style={{ display: 'inline' }}>{p.unidad_medida}</span>
        </>
      ),
    },
    { titulo: 'Mínimo', alinear: 'derecha', render: (p) => p.stock_minimo },
    { titulo: 'Precio', alinear: 'derecha', render: (p) => moneda(p.precio_unitario) },
    {
      titulo: 'Estado',
      render: (p) => {
        const a = semaforoPorId.get(p.id);
        if (a) return <SemaforoBadge semaforo={a.semaforo} texto={a.pedir_ya ? 'Pedir ya' : undefined} />;
        return p.stock_actual <= p.stock_minimo ? <Badge clase="rojo">Bajo mínimo</Badge> : <Badge clase="verde">Stock normal</Badge>;
      },
    },
    {
      titulo: 'Acciones',
      acciones: true,
      render: (p) => (
        <>
          <Boton variante="fantasma" icono={ArrowLeftRight} className="boton-chico" onClick={() => setMovimiento(p)}>
            Movimiento
          </Boton>
          <Boton variante="fantasma" icono={Pencil} className="boton-chico" onClick={() => setFormulario({ producto: p })} aria-label={`Editar ${p.nombre}`}>
            Editar
          </Boton>
          <Boton variante="fantasma" icono={Trash2} className="boton-chico rojo" onClick={() => setAEliminar(p)} aria-label={`Eliminar ${p.nombre}`}>
            Eliminar
          </Boton>
        </>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        titulo="Inventario"
        subtitulo={`${productos.length} productos registrados`}
        acciones={
          <>
            <Boton variante="secundario" onClick={() => irA('/inventario/movimientos')}>
              Ver movimientos
            </Boton>
            <Boton icono={Plus} onClick={() => setFormulario({})}>
              Nuevo producto
            </Boton>
          </>
        }
      />

      <div className="barra-filtros">
        <label className="campo buscador-campo">
          <span className="campo-etiqueta">Buscar</span>
          <span className="buscador">
            <Search size={18} />
            <input className="input" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Nombre o código…" />
          </span>
        </label>
        <label className="campo">
          <span className="campo-etiqueta">Categoría</span>
          <select className="input" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
            <option value="">Todas</option>
            {categorias.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="campo">
          <span className="campo-etiqueta">Ordenar por</span>
          <select className="input" value={orden} onChange={(e) => setOrden(e.target.value)}>
            <option value="nombre">Nombre</option>
            <option value="stock_asc">Menos stock primero</option>
            <option value="stock_desc">Más stock primero</option>
          </select>
        </label>
      </div>
      <div className="chips" role="group" aria-label="Filtrar por estado">
        {FILTROS_ESTADO.map(([clave, texto]) => (
          <button
            key={clave}
            type="button"
            className="chip"
            aria-pressed={estado === clave}
            onClick={() => setEstado(clave)}
            disabled={['rojo', 'amarillo', 'verde'].includes(clave) && semaforoPorId.size === 0}
            title={['rojo', 'amarillo', 'verde'].includes(clave) && semaforoPorId.size === 0 ? 'Las alertas no están disponibles ahora' : undefined}
          >
            {texto}
          </button>
        ))}
      </div>

      {cargando && <Cargando texto="Cargando productos…" />}
      {error && <ErrorCaja mensaje={error} onReintentar={recargar} />}
      {!cargando && !error && filtrados.length === 0 && (
        <EstadoVacio
          titulo={productos.length === 0 ? 'Aún no hay productos' : 'Ningún producto coincide'}
          texto={productos.length === 0 ? 'Crea el primero para empezar a controlar tu stock.' : 'Prueba con otra búsqueda o quita algún filtro.'}
          accion={productos.length === 0 && <Boton icono={Plus} onClick={() => setFormulario({})}>Nuevo producto</Boton>}
        />
      )}
      {!cargando && filtrados.length > 0 && (
        <>
          <DataList etiqueta="Productos" columnas={columnas} filas={itemsPagina} clave={(p) => p.id} onFila={(p) => irA(`/inventario/${p.id}`)} />
          <Paginacion paginaActual={pagina} totalPaginas={totalPaginas} onCambiarPagina={setPagina} />
        </>
      )}

      {formulario && <ProductoForm producto={formulario.producto} onGuardado={() => setFormulario(null)} onCerrar={() => setFormulario(null)} />}
      {movimiento && <MovimientoForm producto={movimiento} onGuardado={() => setMovimiento(null)} onCerrar={() => setMovimiento(null)} />}
      {aEliminar && (
        <ConfirmDialog
          titulo="Eliminar producto"
          mensaje={`¿Eliminar «${aEliminar.nombre}»? Esta acción no se puede deshacer.`}
          confirmarTexto="Eliminar"
          peligro
          onConfirmar={eliminar}
          onCancelar={() => setAEliminar(null)}
        />
      )}
    </>
  );
}
