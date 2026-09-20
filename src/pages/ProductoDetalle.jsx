import { useMemo, useState } from 'react';
import { ArrowDownToLine, ArrowUpFromLine, Pencil, Receipt, RefreshCw, SlidersHorizontal, Trash2, Truck } from 'lucide-react';
import { productos as apiProductos, movimientos } from '../api/inventario';
import { pedidos, ventas } from '../api/ventas';
import { tiempos } from '../api/proveedores';
import { alertas, prediccion } from '../api/analisis';
import { irA } from '../hooks/useHashRoute';
import { useCatalogos } from '../hooks/useCatalogos';
import { useCargar } from '../hooks/useCargar';
import { cuandoTexto, fechaCorta, moneda } from '../utils/formato';
import { useToast } from '../ui/Toast';
import Boton from '../ui/Boton';
import ConfirmDialog from '../ui/ConfirmDialog';
import { Badge, Cargando, ErrorCaja, EstadoVacio, SemaforoBadge } from '../ui/Estado';
import PageHeader from '../ui/PageHeader';
import ProductoForm from './ProductoForm';
import MovimientoForm from './MovimientoForm';
import { TIPOS_MOVIMIENTO } from '../utils/movimientos';

const opcional = (promesa) => promesa.catch(() => null);

const ESTADOS_PEDIDO = {
  pendiente: ['amarillo', 'Pendiente'],
  en_transito: ['azul', 'En tránsito'],
  recibido: ['verde', 'Recibido'],
  cancelado: ['neutro', 'Cancelado'],
};

const FILTROS = [
  ['todo', 'Todo'],
  ['stock', 'Stock'],
  ['venta', 'Ventas'],
  ['pedido', 'Pedidos'],
];

export default function ProductoDetalle({ id }) {
  const { recargar: recargarCatalogos, nombreProveedor } = useCatalogos();
  const toast = useToast();
  const [formulario, setFormulario] = useState(false);
  const [movimiento, setMovimiento] = useState(null); // tipo inicial
  const [eliminando, setEliminando] = useState(false);
  const [recalculando, setRecalculando] = useState(false);
  const [filtro, setFiltro] = useState('todo');

  const { datos, cargando, error, recargar } = useCargar(async () => {
    const producto = await apiProductos.obtener(id);
    const [alerta, entrega, pred, movs, vts, peds] = await Promise.all([
      opcional(alertas.deProducto(id)),
      opcional(tiempos.deProducto(id)),
      opcional(prediccion.deProducto(id)),
      opcional(movimientos.listar({ producto_id: id, limit: 100 })),
      opcional(ventas.porProducto(id, 90)),
      opcional(pedidos.porProducto(id)),
    ]);
    return { producto, alerta, entrega, pred, movs, vts, peds };
  }, [id]);

  const eventos = useMemo(() => {
    if (!datos) return [];
    const { movs, vts, peds } = datos;
    const lista = [];
    (Array.isArray(movs) ? movs : []).forEach((m) => {
      const t = TIPOS_MOVIMIENTO[m.tipo_movimiento];
      lista.push({
        clave: `m${m.id}`,
        tipo: 'stock',
        cuando: m.fecha_movimiento,
        icono: m.tipo_movimiento === 'entrada' ? ArrowDownToLine : m.tipo_movimiento === 'salida' ? ArrowUpFromLine : SlidersHorizontal,
        clase: t?.clase,
        titulo:
          m.tipo_movimiento === 'ajuste'
            ? `Ajuste: stock contado ${m.cantidad}`
            : `${t?.etiqueta || m.tipo_movimiento} de ${m.cantidad} unidades`,
        detalle: [m.motivo, m.usuario && `por ${m.usuario}`].filter(Boolean).join(' · '),
      });
    });
    (Array.isArray(vts) ? vts : []).forEach((v) =>
      lista.push({
        clave: `v${v.id}`,
        tipo: 'venta',
        cuando: v.createdAt || v.fecha,
        icono: Receipt,
        clase: 'verde',
        titulo: `Venta: ${v.cantidadVendida} × ${moneda(v.precioUnitario)} = ${moneda(v.total)}`,
        detalle: `Fecha de venta ${fechaCorta(v.fecha)}`,
      }),
    );
    (Array.isArray(peds) ? peds : []).forEach((p) => {
      const [clase, texto] = ESTADOS_PEDIDO[p.estado] || ['neutro', p.estado];
      lista.push({
        clave: `p${p.id}`,
        tipo: 'pedido',
        cuando: p.createdAt || p.fechaPedido,
        icono: Truck,
        clase,
        titulo: `Pedido #${p.id} a ${nombreProveedor(p.proveedorId)}: ${p.cantidadPedida} unidades (${texto})`,
        detalle: p.fechaEstimadaEntrega ? `Entrega estimada ${fechaCorta(p.fechaEstimadaEntrega)}` : '',
      });
    });
    return lista.sort((a, b) => String(b.cuando).localeCompare(String(a.cuando)));
  }, [datos, nombreProveedor]);

  const visibles = filtro === 'todo' ? eventos : eventos.filter((e) => e.tipo === filtro);

  if (cargando && !datos) return <Cargando texto="Cargando producto…" />;
  if (error && !datos) {
    return (
      <>
        <PageHeader migas={<a href="#/inventario">Inventario</a>} titulo="Producto no disponible" />
        <ErrorCaja mensaje={error} onReintentar={recargar} />
      </>
    );
  }

  const { producto, alerta, entrega, pred } = datos;

  const recalcular = async () => {
    setRecalculando(true);
    try {
      await prediccion.calcular(id);
      toast.ok('Predicción recalculada.');
      await recargar();
    } catch (err) {
      toast.error(`No se pudo recalcular: ${err.message}`);
    }
    setRecalculando(false);
  };

  const eliminar = async () => {
    try {
      await apiProductos.eliminar(producto.id);
    } catch (err) {
      if (err.status === 409) {
        throw new Error('Este producto tiene movimientos de stock registrados y por eso no se puede eliminar. El historial se conserva.');
      }
      throw err;
    }
    toast.ok(`«${producto.nombre}» eliminado.`);
    await recargarCatalogos();
    irA('/inventario');
  };

  const bajo = producto.stock_actual <= producto.stock_minimo;

  return (
    <>
      <PageHeader
        migas={<a href="#/inventario">Inventario</a>}
        titulo={producto.nombre}
        subtitulo={`${producto.sku}${producto.categoria ? ` · ${producto.categoria}` : ''}`}
        acciones={
          <>
            <Boton icono={ArrowDownToLine} onClick={() => setMovimiento('entrada')}>Entrada</Boton>
            <Boton variante="secundario" icono={ArrowUpFromLine} onClick={() => setMovimiento('salida')}>Salida</Boton>
            <Boton variante="secundario" icono={SlidersHorizontal} onClick={() => setMovimiento('ajuste')}>Ajuste</Boton>
            <Boton variante="secundario" icono={Truck} onClick={() => irA(`/pedidos/nuevo/${producto.id}`)}>Pedir</Boton>
          </>
        }
      />

      <div className="kpis">
        <div className={`kpi ${bajo ? 'kpi-rojo' : 'kpi-verde'}`}>
          <span className="kpi-valor">{producto.stock_actual}</span>
          <span className="kpi-etiqueta">{producto.unidad_medida || 'unidades'} en stock {bajo && '· bajo el mínimo'}</span>
        </div>
        <div className="kpi kpi-neutro">
          <span className="kpi-valor">{producto.stock_minimo}</span>
          <span className="kpi-etiqueta">Stock mínimo</span>
        </div>
        <div className="kpi kpi-neutro">
          <span className="kpi-valor">
            {alerta?.dias_hasta_agotamiento != null ? `${Number(alerta.dias_hasta_agotamiento).toFixed(1)} d` : '—'}
          </span>
          <span className="kpi-etiqueta">Días hasta agotarse</span>
        </div>
        <div className="kpi kpi-neutro">
          <span className="kpi-valor">{moneda(producto.precio_unitario)}</span>
          <span className="kpi-etiqueta">Precio de venta</span>
        </div>
      </div>

      <div className="rejilla rejilla-2">
        <section className="panel">
          <div className="panel-cabecera">
            <h2>Reposición</h2>
            {alerta && <SemaforoBadge semaforo={alerta.semaforo} texto={alerta.pedir_ya ? 'Pedir ya' : undefined} />}
          </div>
          <dl className="datos">
            <div><dt>Proveedor</dt><dd>{entrega?.proveedor_nombre || 'No asignado'}</dd></div>
            <div><dt>Tiempo de entrega</dt><dd>{entrega?.dias_entrega_promedio != null ? `${entrega.dias_entrega_promedio} días (de ${entrega.dias_entrega_min} a ${entrega.dias_entrega_max})` : '—'}</dd></div>
            <div><dt>Venta diaria estimada</dt><dd>{pred ? `${Number(pred.velocidad_venta_diaria).toFixed(1)} u/día` : '—'}</dd></div>
            <div><dt>Riesgo de quiebre</dt><dd>{pred ? `${pred.nivel_riesgo} (${Math.round(pred.prob_quiebre * 100)}%)` : '—'}</dd></div>
          </dl>
          {(alerta?.advertencia || alerta?.error) && <p className="aviso aviso-aviso">{alerta.advertencia || alerta.error}</p>}
          {!alerta && !pred && <p className="aviso aviso-info">Aún no hay predicción para este producto o el servicio de alertas no responde.</p>}
          <Boton variante="secundario" icono={RefreshCw} cargando={recalculando} onClick={recalcular} className="boton-chico" style={{ marginTop: 14 }}>
            Recalcular predicción
          </Boton>
        </section>

        <section className="panel">
          <div className="panel-cabecera">
            <h2>Datos del producto</h2>
          </div>
          <dl className="datos">
            <div><dt>Código (SKU)</dt><dd>{producto.sku}</dd></div>
            <div><dt>Categoría</dt><dd>{producto.categoria || '—'}</dd></div>
            <div><dt>Unidad</dt><dd>{producto.unidad_medida || '—'}</dd></div>
            <div><dt>Última actualización</dt><dd>{cuandoTexto(producto.updated_at)}</dd></div>
          </dl>
          <div className="acciones-fila" style={{ justifyContent: 'flex-start', marginTop: 14 }}>
            <Boton variante="secundario" icono={Pencil} className="boton-chico" onClick={() => setFormulario(true)}>Editar</Boton>
            <Boton variante="fantasma" icono={Trash2} className="boton-chico rojo" onClick={() => setEliminando(true)}>Eliminar</Boton>
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="panel-cabecera">
          <h2>Historial y trazabilidad</h2>
          <div className="chips" style={{ margin: 0 }} role="group" aria-label="Filtrar historial">
            {FILTROS.map(([k, t]) => (
              <button key={k} type="button" className="chip" aria-pressed={filtro === k} onClick={() => setFiltro(k)}>{t}</button>
            ))}
          </div>
        </div>
        {visibles.length === 0 ? (
          <EstadoVacio titulo="Sin actividad" texto="Cuando haya movimientos, ventas o pedidos de este producto aparecerán aquí, del más reciente al más antiguo." />
        ) : (
          <ol className="linea-tiempo">
            {visibles.map((e) => (
              <li key={e.clave}>
                <span className={`linea-icono badge-${e.clase || 'neutro'}`}><e.icono size={16} /></span>
                <div>
                  <strong>{e.titulo}</strong>
                  {e.detalle && <span className="sub">{e.detalle}</span>}
                  <span className="sub">{cuandoTexto(e.cuando)}</span>
                </div>
              </li>
            ))}
          </ol>
        )}
        <p className="resumen-linea">
          Se muestran hasta 100 movimientos y las ventas de los últimos 90 días.
          {!Array.isArray(datos.movs) && <Badge clase="amarillo">No se pudieron cargar los movimientos</Badge>}
        </p>
      </section>

      {formulario && <ProductoForm producto={producto} onGuardado={() => { setFormulario(false); recargar(); }} onCerrar={() => setFormulario(false)} />}
      {movimiento && <MovimientoForm producto={producto} tipoInicial={movimiento} onGuardado={() => { setMovimiento(null); recargar(); }} onCerrar={() => setMovimiento(null)} />}
      {eliminando && (
        <ConfirmDialog
          titulo="Eliminar producto"
          mensaje={`¿Eliminar «${producto.nombre}»? Esta acción no se puede deshacer.`}
          confirmarTexto="Eliminar"
          peligro
          onConfirmar={eliminar}
          onCancelar={() => setEliminando(false)}
        />
      )}
    </>
  );
}
