import { useMemo, useState } from 'react';
import { CircleAlert, CircleCheck, Minus, Plus, Search, X } from 'lucide-react';
import { movimientos } from '../api/inventario';
import { ventas } from '../api/ventas';
import { useCatalogos } from '../hooks/useCatalogos';
import { useOperador } from '../hooks/useOperador';
import { hoyISO, moneda } from '../utils/formato';
import { useToast } from '../ui/Toast';
import Boton from '../ui/Boton';
import { Cargando, ErrorCaja } from '../ui/Estado';
import PageHeader from '../ui/PageHeader';

let contador = 0;

// Venta rápida. El backend guarda una fila por producto y día y NO descuenta stock,
// así que por cada línea se hace: POST /ventas y luego POST /movimientos (salida).
export default function Vender() {
  const { productos, cargando, error, recargar } = useCatalogos();
  const { operador } = useOperador();
  const toast = useToast();
  const [busqueda, setBusqueda] = useState('');
  const [lineas, setLineas] = useState([]);
  const [cobrando, setCobrando] = useState(false);
  const [ultima, setUltima] = useState(null);

  const resultados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const lista = [...productos].sort((a, b) => a.nombre.localeCompare(b.nombre));
    return (q ? lista.filter((p) => `${p.nombre} ${p.sku}`.toLowerCase().includes(q)) : lista).slice(0, 8);
  }, [productos, busqueda]);

  const cambiar = (key, cambios) => setLineas((ls) => ls.map((l) => (l.key === key ? { ...l, ...cambios } : l)));

  const agregar = (p) => {
    setUltima(null);
    setLineas((ls) => {
      const existente = ls.find((l) => l.producto.id === p.id && !l.ventaId);
      if (existente) return ls.map((l) => (l === existente ? { ...l, cantidad: l.cantidad + 1 } : l));
      contador += 1;
      return [...ls, { key: contador, producto: p, cantidad: 1, precio: String(Number(p.precio_unitario)), estado: 'nueva', ventaId: null, error: null }];
    });
    setBusqueda('');
  };

  const problemaDe = (l) => {
    if (l.estado === 'lista' || l.ventaId) return null; // la venta ya se guardó: solo falta el stock
    if (!Number.isInteger(l.cantidad) || l.cantidad < 1) return 'La cantidad debe ser 1 o más.';
    if (l.precio === '' || Number(l.precio) < 0) return 'Ingresa un precio válido.';
    if (l.cantidad > l.producto.stock_actual) return `Solo quedan ${l.producto.stock_actual} en stock.`;
    return null;
  };

  const pendientes = lineas.filter((l) => l.estado !== 'lista');
  const total = lineas.reduce((s, l) => s + l.cantidad * Number(l.precio || 0), 0);
  const hayProblemas = pendientes.some((l) => problemaDe(l));

  const cobrar = async () => {
    setCobrando(true);
    let fallos = 0;
    for (const l of lineas) {
      if (l.estado === 'lista') continue;
      let ventaId = l.ventaId;
      if (!ventaId) {
        try {
          const v = await ventas.crear({
            productoId: l.producto.id,
            fecha: hoyISO(),
            cantidadVendida: l.cantidad,
            precioUnitario: Number(l.precio),
          });
          ventaId = v.id;
          cambiar(l.key, { ventaId, estado: 'venta_ok', error: null });
        } catch (err) {
          cambiar(l.key, { error: `No se registró la venta: ${err.message}` });
          fallos += 1;
          continue;
        }
      }
      try {
        await movimientos.crear({
          producto_id: l.producto.id,
          tipo_movimiento: 'salida',
          cantidad: l.cantidad,
          motivo: `Venta #${ventaId}`,
          usuario: operador,
        });
        cambiar(l.key, { estado: 'lista', error: null });
      } catch (err) {
        cambiar(l.key, { error: `La venta se guardó, pero el stock no bajó: ${err.message}` });
        fallos += 1;
      }
    }
    await recargar(); // refresca stock de los productos
    setCobrando(false);
    if (fallos === 0) {
      setUltima({ total, lineas: lineas.length });
      setLineas([]);
      toast.ok('Venta registrada.');
    } else {
      toast.aviso(`${fallos} línea(s) con problemas. Revisa el detalle y vuelve a intentar: solo se repite lo que falta.`);
    }
  };

  return (
    <>
      <PageHeader titulo="Vender" subtitulo="Busca el producto, ajusta la cantidad y cobra. El stock baja solo." />

      {cargando && <Cargando texto="Cargando productos…" />}
      {error && <ErrorCaja mensaje={error} onReintentar={recargar} />}

      {ultima && (
        <div className="aviso aviso-ok" role="status" style={{ marginBottom: 16, fontSize: 16 }}>
          <CircleCheck size={18} style={{ verticalAlign: '-3px' }} /> Venta registrada por {moneda(ultima.total)} ({ultima.lineas}{' '}
          {ultima.lineas === 1 ? 'producto' : 'productos'}). ¿Otra venta? Busca el siguiente producto.
        </div>
      )}

      <div className="vender-grid">
        <section aria-label="Buscar producto">
          <label className="campo buscador-campo" style={{ marginBottom: 12 }}>
            <span className="campo-etiqueta">Buscar producto por nombre o código</span>
            <span className="buscador">
              <Search size={18} />
              <input
                className="input input-grande"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && resultados[0] && resultados[0].stock_actual > 0) {
                    e.preventDefault();
                    agregar(resultados[0]);
                  }
                }}
                placeholder="Ej. arroz"
                autoFocus
                autoComplete="off"
              />
            </span>
          </label>
          <ul className="resultados">
            {resultados.map((p) => (
              <li key={p.id}>
                <button type="button" className="resultado" onClick={() => agregar(p)} disabled={p.stock_actual <= 0}>
                  <span>
                    <strong>{p.nombre}</strong>
                    <span className="sub">{p.sku} · {moneda(p.precio_unitario)}</span>
                  </span>
                  <span className={`resultado-stock ${p.stock_actual <= 0 ? 'sin' : ''}`}>
                    {p.stock_actual <= 0 ? 'Sin stock' : `${p.stock_actual} disp.`}
                  </span>
                </button>
              </li>
            ))}
            {!cargando && resultados.length === 0 && <li className="estado estado-vacio">Ningún producto coincide con «{busqueda}».</li>}
          </ul>
        </section>

        <section className="panel carrito" aria-label="Venta actual">
          <h2>Venta actual</h2>
          {lineas.length === 0 ? (
            <p className="subtitulo">Toca un producto de la lista para agregarlo.</p>
          ) : (
            <ul className="lineas-venta">
              {lineas.map((l) => {
                const problema = problemaDe(l);
                const bloqueada = Boolean(l.ventaId);
                return (
                  <li key={l.key} className={`linea-venta ${l.error ? 'con-error' : ''}`}>
                    <div className="linea-venta-cab">
                      <strong>{l.producto.nombre}</strong>
                      {l.estado === 'lista' ? (
                        <span className="badge badge-verde"><CircleCheck size={14} /> Listo</span>
                      ) : (
                        !bloqueada && (
                          <button type="button" className="icono-boton" onClick={() => setLineas((ls) => ls.filter((x) => x.key !== l.key))} aria-label={`Quitar ${l.producto.nombre}`}>
                            <X size={18} />
                          </button>
                        )
                      )}
                    </div>
                    <div className="linea-venta-controles">
                      <div className="stepper" role="group" aria-label="Cantidad">
                        <button type="button" onClick={() => cambiar(l.key, { cantidad: Math.max(1, l.cantidad - 1) })} disabled={bloqueada || l.cantidad <= 1} aria-label="Menos">
                          <Minus size={18} />
                        </button>
                        <input
                          type="number"
                          min="1"
                          inputMode="numeric"
                          value={l.cantidad}
                          onChange={(e) => cambiar(l.key, { cantidad: e.target.value === '' ? 0 : Number(e.target.value) })}
                          disabled={bloqueada}
                          aria-label={`Cantidad de ${l.producto.nombre}`}
                        />
                        <button type="button" onClick={() => cambiar(l.key, { cantidad: l.cantidad + 1 })} disabled={bloqueada} aria-label="Más">
                          <Plus size={18} />
                        </button>
                      </div>
                      <label className="precio-linea">
                        <span className="solo-lector">Precio unitario</span>
                        S/
                        <input
                          className="input"
                          type="number"
                          min="0"
                          step="0.01"
                          inputMode="decimal"
                          value={l.precio}
                          onChange={(e) => cambiar(l.key, { precio: e.target.value })}
                          disabled={bloqueada}
                        />
                      </label>
                      <strong className="subtotal">{moneda(l.cantidad * Number(l.precio || 0))}</strong>
                    </div>
                    {problema && (
                      <p className="campo-error"><CircleAlert size={14} style={{ verticalAlign: '-2px' }} /> {problema}</p>
                    )}
                    {l.error && <p className="aviso aviso-error" role="alert">{l.error}</p>}
                  </li>
                );
              })}
            </ul>
          )}

          <div className="total-venta">
            <span>Total</span>
            <strong>{moneda(total)}</strong>
          </div>
          <Boton
            grande
            className="cobrar"
            onClick={cobrar}
            cargando={cobrando}
            disabled={pendientes.length === 0 || hayProblemas}
          >
            {lineas.some((l) => l.ventaId) ? 'Reintentar lo pendiente' : `Cobrar ${moneda(total)}`}
          </Boton>
          {lineas.length > 0 && !cobrando && !lineas.some((l) => l.ventaId) && (
            <Boton variante="fantasma" onClick={() => setLineas([])} style={{ width: '100%', marginTop: 6 }}>
              Vaciar venta
            </Boton>
          )}
          {!operador && <p className="campo-ayuda" style={{ marginTop: 10 }}>Sin nombre de operador: los movimientos quedarán sin firma.</p>}
        </section>
      </div>
    </>
  );
}
