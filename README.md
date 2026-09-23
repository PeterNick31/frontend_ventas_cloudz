# Bodega Inteligente — Frontend (React + Vite, AWS Amplify)

Panel web que consume los 6 microservicios a través de la URL pública de API Gateway.

## Configuración

Una sola variable: `VITE_API_BASE_URL` = output `ApiUrl` de la pila CloudFormation, sin `/` final.

- **Amplify:** Hosting → Variables de entorno → `VITE_API_BASE_URL`, y vuelve a desplegar. `amplify.yml` detiene el build si falta.
- **Local:** `cp .env.example .env.local`, completa la URL y ejecuta `npm install && npm run dev`.

## Secciones y métodos REST que usa

| Sección | Microservicio | Métodos |
|---|---|---|
| Alertas de stock (inicio) | Alertas + Inventario | `GET /api/alertas?skip&limit`, `GET /api/alertas/{id}`, `GET /api/inventario/productos` |
| Inventario → Productos | Inventario | `GET` lista paginada, `GET /{id}`, `POST`, `PATCH /{id}`, `DELETE /{id}`, `GET /stock/{id}` |
| Inventario → Movimientos | Inventario | `GET` lista con filtros, `GET /{id}`, `POST` |
| Ventas → Ventas | Ventas | `GET ?page&size` con filtros, `GET /{id}`, `POST`, `PATCH /{id}`, `DELETE /{id}`, `GET /producto/{id}?dias` |
| Ventas → Pedidos | Ventas | `GET` lista con filtros, `GET /detalle/{id}`, `POST`, `PATCH /{id}` (incluye cambio de estado), `DELETE /{id}` |
| Proveedores → Proveedores | Proveedores | `GET` lista paginada, `GET /{id}`, `POST`, `PATCH /{id}`, `DELETE /{id}` |
| Proveedores → Tiempos de entrega | Proveedores | `GET` lista con filtros, `POST`, `PATCH /{id}`, `DELETE /{id}`, `GET /producto/{id}/tiempo-entrega` |
| Predicciones | Predicción | `GET ?skip&limit`, `GET /{productoId}`, `POST /calcular/{productoId}` |
| Analítica | Analítica (Athena) | `GET /rotacion-categoria`, `GET /productos-mas-quiebres` |

El detalle de producto (clic en cualquier producto) combina los 6 servicios en una sola vista.

La paginación se hace en el servidor en todas las listas. Los filtros quedan en la URL (`#/ventas/pedidos?estado=pendiente`), así que sobreviven a recargas y se pueden compartir.
