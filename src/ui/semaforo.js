// Estado de reabastecimiento. Siempre se muestra con icono + texto, nunca solo con color.
export const SEMAFORO_INFO = {
  rojo: { clase: 'rojo', texto: 'Pedir ya' },
  amarillo: { clase: 'amarillo', texto: 'Vigilar' },
  verde: { clase: 'verde', texto: 'Stock saludable' },
  desconocido: { clase: 'neutro', texto: 'Sin predicción' },
};

export const infoSemaforo = (clave) => SEMAFORO_INFO[clave] || SEMAFORO_INFO.desconocido;
