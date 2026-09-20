import { useState } from 'react';
import { productos as apiProductos, movimientos } from '../api/inventario';
import { esEnteroNoNegativo } from '../utils/formato';
import { useCatalogos } from '../hooks/useCatalogos';
import { useOperador } from '../hooks/useOperador';
import { useToast } from '../ui/Toast';
import Modal from '../ui/Modal';
import Boton from '../ui/Boton';
import Campo from '../ui/Campo';

// Crea o edita un producto. `producto` presente = edición.
// El backend no permite cambiar stock_actual por PATCH: el stock solo se mueve con movimientos.
export default function ProductoForm({ producto, onGuardado, onCerrar }) {
  const editando = Boolean(producto);
  const { productos, recargar } = useCatalogos();
  const { operador } = useOperador();
  const toast = useToast();

  const [f, setF] = useState({
    sku: producto?.sku || '',
    nombre: producto?.nombre || '',
    categoria: producto?.categoria || '',
    unidad_medida: producto?.unidad_medida || 'unidad',
    stock_actual: '0',
    stock_minimo: String(producto?.stock_minimo ?? 0),
    precio_unitario: producto ? String(Number(producto.precio_unitario)) : '',
  });
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const categorias = [...new Set(productos.map((p) => p.categoria).filter(Boolean))].sort();
  const set = (campo) => (e) => setF((prev) => ({ ...prev, [campo]: e.target.value }));

  const validar = () => {
    const e = {};
    if (!f.sku.trim()) e.sku = 'El código (SKU) es obligatorio.';
    if (!f.nombre.trim()) e.nombre = 'El nombre es obligatorio.';
    if (!esEnteroNoNegativo(f.stock_minimo)) e.stock_minimo = 'Ingresa un número entero, 0 o más.';
    if (!editando && !esEnteroNoNegativo(f.stock_actual)) e.stock_actual = 'Ingresa un número entero, 0 o más.';
    if (f.precio_unitario === '' || Number(f.precio_unitario) < 0) e.precio_unitario = 'Ingresa un precio de 0 o más.';
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const guardar = async (ev) => {
    ev.preventDefault();
    setErrorGeneral(null);
    if (!validar()) return;
    setGuardando(true);

    const datos = {
      sku: f.sku.trim(),
      nombre: f.nombre.trim(),
      categoria: f.categoria.trim() || null,
      unidad_medida: f.unidad_medida.trim() || 'unidad',
      stock_minimo: Number(f.stock_minimo),
      precio_unitario: Number(f.precio_unitario),
    };

    try {
      let resultado;
      if (editando) {
        resultado = await apiProductos.actualizar(producto.id, datos);
        toast.ok('Producto actualizado.');
      } else {
        // Se crea con stock 0 y el stock inicial entra como movimiento, para que quede en el historial.
        resultado = await apiProductos.crear({ ...datos, stock_actual: 0 });
        const inicial = Number(f.stock_actual);
        if (inicial > 0) {
          try {
            await movimientos.crear({
              producto_id: resultado.id,
              tipo_movimiento: 'entrada',
              cantidad: inicial,
              motivo: 'Stock inicial',
              usuario: operador,
            });
            toast.ok('Producto creado con su stock inicial.');
          } catch (err) {
            toast.aviso(`El producto se creó, pero no se pudo registrar el stock inicial: ${err.message}`);
          }
        } else {
          toast.ok('Producto creado.');
        }
      }
      await recargar();
      onGuardado?.(resultado);
    } catch (err) {
      if (err.status === 409) setErrores({ sku: 'Ya existe otro producto con este código (SKU).' });
      else setErrorGeneral(err.message);
      setGuardando(false);
    }
  };

  return (
    <Modal
      titulo={editando ? 'Editar producto' : 'Nuevo producto'}
      onCerrar={onCerrar}
      pie={
        <>
          <Boton variante="secundario" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </Boton>
          <Boton type="submit" form="form-producto" cargando={guardando}>
            {editando ? 'Guardar cambios' : 'Crear producto'}
          </Boton>
        </>
      }
    >
      <form id="form-producto" className="form-grid" onSubmit={guardar} noValidate>
        <Campo etiqueta="Código (SKU) *" error={errores.sku}>
          <input className="input" value={f.sku} onChange={set('sku')} maxLength={50} aria-invalid={!!errores.sku} />
        </Campo>
        <Campo etiqueta="Nombre *" error={errores.nombre}>
          <input className="input" value={f.nombre} onChange={set('nombre')} maxLength={150} aria-invalid={!!errores.nombre} />
        </Campo>
        <Campo etiqueta="Categoría">
          <input className="input" list="lista-categorias" value={f.categoria} onChange={set('categoria')} maxLength={80} />
          <datalist id="lista-categorias">
            {categorias.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Campo>
        <Campo etiqueta="Unidad de medida">
          <input className="input" value={f.unidad_medida} onChange={set('unidad_medida')} maxLength={20} />
        </Campo>
        {editando ? (
          <Campo etiqueta="Stock actual" ayuda="Para cambiarlo usa Entrada, Salida o Ajuste en el detalle del producto.">
            <input className="input" value={producto.stock_actual} disabled />
          </Campo>
        ) : (
          <Campo etiqueta="Stock inicial" error={errores.stock_actual} ayuda="Se registra como una entrada «Stock inicial».">
            <input className="input" type="number" min="0" step="1" inputMode="numeric" value={f.stock_actual} onChange={set('stock_actual')} aria-invalid={!!errores.stock_actual} />
          </Campo>
        )}
        <Campo etiqueta="Stock mínimo" error={errores.stock_minimo} ayuda="Debajo de este número se avisa que hay que reponer.">
          <input className="input" type="number" min="0" step="1" inputMode="numeric" value={f.stock_minimo} onChange={set('stock_minimo')} aria-invalid={!!errores.stock_minimo} />
        </Campo>
        <Campo etiqueta="Precio de venta (S/) *" error={errores.precio_unitario} className="completo">
          <input className="input" type="number" min="0" step="0.01" inputMode="decimal" value={f.precio_unitario} onChange={set('precio_unitario')} aria-invalid={!!errores.precio_unitario} />
        </Campo>
      </form>
      {errorGeneral && (
        <p className="aviso aviso-error" role="alert">
          {errorGeneral}
        </p>
      )}
    </Modal>
  );
}
