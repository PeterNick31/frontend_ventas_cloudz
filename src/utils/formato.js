const pad = (n) => String(n).padStart(2, '0');

// Fecha local en YYYY-MM-DD. toISOString() usa UTC y en Perú (UTC-5) devuelve "mañana" después de las 19:00.
export function aISO(fecha) {
  return `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())}`;
}

export const hoyISO = () => aISO(new Date());

export function sumarDias(iso, dias) {
  const [y, m, d] = iso.split('-').map(Number);
  return aISO(new Date(y, m - 1, d + dias));
}

export const moneda = (n) =>
  `S/ ${Number(n || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// "2026-09-19" -> "19/09/2026" (sin pasar por Date para no correr el día por zona horaria)
export function fechaCorta(iso) {
  if (!iso) return '—';
  const [y, m, d] = String(iso).slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

export function fechaHora(iso) {
  if (!iso) return '—';
  const f = new Date(iso);
  if (Number.isNaN(f.getTime())) return fechaCorta(iso);
  return `${pad(f.getDate())}/${pad(f.getMonth() + 1)}/${f.getFullYear()} ${pad(f.getHours())}:${pad(f.getMinutes())}`;
}

export const esEnteroNoNegativo = (v) => v !== '' && Number.isInteger(Number(v)) && Number(v) >= 0;

// Fecha con hora si el texto la trae ("2026-09-19T14:03:22"); solo fecha si no ("2026-09-19").
export const cuandoTexto = (iso) => (String(iso || '').includes('T') ? fechaHora(iso) : fechaCorta(iso));
