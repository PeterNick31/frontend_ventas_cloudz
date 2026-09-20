import { URLS, apiFetch } from './http';

export const alertas = {
  lista: () => apiFetch(URLS.alertas),
  resumen: () => apiFetch(`${URLS.alertas}/resumen`),
  deProducto: (id) => apiFetch(`${URLS.alertas}/${id}`),
};

export const prediccion = {
  deProducto: (id) => apiFetch(`${URLS.prediccion}/${id}`),
  calcular: (id) => apiFetch(`${URLS.prediccion}/calcular/${id}`, { method: 'POST' }),
};

export const analitica = {
  rotacionCategoria: () => apiFetch(`${URLS.analitica}/rotacion-categoria`),
  productosMasQuiebres: () => apiFetch(`${URLS.analitica}/productos-mas-quiebres`),
};
