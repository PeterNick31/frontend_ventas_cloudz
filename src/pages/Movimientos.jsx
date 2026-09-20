import { useState } from 'react';
import { movimientos } from '../api/inventario';
import { irA } from '../hooks/useHashRoute';
import { useCatalogos } from '../hooks/useCatalogos';
import { useCargar } from '../hooks/useCargar';
import { fechaHora } from '../utils/formato';
import { Badge, Cargando, ErrorCaja, EstadoVacio } from '../ui/Estado';
import DataList from '../ui/DataList';
import PageHeader from '../ui/PageHeader';
import { PaginadorServidor } from '../ui/Paginacion';
import Selector from '../ui/Selector';
import { TIPOS_MOVIMIENTO, textoCantidad } from '../utils/movimientos';

const TAMANO = 30;

// Feed global de movimientos de stock (solo lectura: el backend no permite editarlos ni borrarlos).
export default function Movimientos() {
  const { opcionesProductos, nombreProducto } = useCatalogos();
  const [tipo, setTipo] = useState('');
  const [productoId, setProductoId] = useState('');
  const [pagina, setPagina] = useState(0);

  const { datos, cargando, error, recargar } = useCargar(
    () => movimientos.listar({ producto_id: productoId, tipo_movimiento: tipo, skip: pagina * TAMANO, limit: TAMANO }),
    [tipo, productoId, pagina],
  );
  const filas = datos || [];

  const columnas = [
    { titulo: 'Fecha', principal: true, render: (m) => fechaHora(m.fecha_movimiento) },
    { titulo: 'Producto', render: (m) => <a href={`#/inventario/${m.producto_id}`}>{nombreProducto(m.producto_id)}</a> },
    {
      titulo: 'Tipo',
      render: (m) => <Badge clase={TIPOS_MOVIMIENTO[m.tipo_movimiento]?.clase}>{TIPOS_MOVIMIENTO[m.tipo_movimiento]?.etiqueta || m.tipo_movimiento}</Badge>,
    },
    { titulo: 'Cantidad', alinear: 'derecha', render: (m) => <strong>{textoCantidad(m)}</strong> },
    { titulo: 'Motivo', render: (m) => m.motivo || '—' },
    { titulo: 'Registró', render: (m) => m.usuario || '—' },
  ];

  return (
    <>
      <PageHeader
        migas={<a href="#/inventario">Inventario</a>}
        titulo="Movimientos de stock"
        subtitulo="Historial de entradas, salidas y ajustes. No se puede editar ni borrar: es el registro de trazabilidad."
      />
      <div className="barra-filtros">
        <Selector etiqueta="Producto" items={opcionesProductos} valor={productoId} onChange={(v) => { setProductoId(v); setPagina(0); }} />
        <label className="campo">
          <span className="campo-etiqueta">Tipo</span>
          <select className="input" value={tipo} onChange={(e) => { setTipo(e.target.value); setPagina(0); }}>
            <option value="">Todos</option>
            {Object.entries(TIPOS_MOVIMIENTO).map(([k, t]) => (
              <option key={k} value={k}>{t.etiqueta}</option>
            ))}
          </select>
        </label>
      </div>

      {cargando && !datos && <Cargando />}
      {error && <ErrorCaja mensaje={error} onReintentar={recargar} />}
      {datos && filas.length === 0 && <EstadoVacio titulo="Sin movimientos" texto="Aquí aparecerán las entradas, salidas y ajustes que se registren." accion={<a href="#/inventario" onClick={(e) => { e.preventDefault(); irA('/inventario'); }}>Ir a inventario</a>} />}
      {filas.length > 0 && (
        <>
          <DataList etiqueta="Movimientos de stock" columnas={columnas} filas={filas} clave={(m) => m.id} />
          <PaginadorServidor pagina={pagina} hayMas={filas.length === TAMANO} onCambiar={setPagina} />
        </>
      )}
    </>
  );
}
