export const TIPOS_MOVIMIENTO = {
  entrada: { etiqueta: 'Entrada', ayuda: 'Llegó mercadería', motivo: 'Compra a proveedor', clase: 'verde' },
  salida: { etiqueta: 'Salida', ayuda: 'Se retiró mercadería', motivo: 'Merma / consumo', clase: 'rojo' },
  ajuste: { etiqueta: 'Ajuste', ayuda: 'Conteo físico', motivo: 'Conteo físico', clase: 'azul' },
};

export function textoCantidad(m) {
  if (m.tipo_movimiento === 'entrada') return `+${m.cantidad}`;
  if (m.tipo_movimiento === 'salida') return `\u2212${m.cantidad}`;
  return `= ${m.cantidad}`;
}
