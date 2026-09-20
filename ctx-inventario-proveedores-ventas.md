# VM1 — Producción A · Bodega Inteligente (CS2032)

Instancia sugerida: **t3.small** (2 vCPU / 2 GB), Ubuntu 22.04, Docker + docker-compose.

VM1 corre 3 de los 6 microservicios del sistema (los otros 3, p. ej. `prediccion-api` y `alertas-api`, viven fuera de esta carpeta y **consumen** estas APIs por HTTP). Cada servicio tiene su propia base de datos alojada en VM3.

| Servicio | Lenguaje | Puerto | Base de datos (en VM3) | Prefijo de rutas | Swagger |
|---|---|---|---|---|---|
| `inventario-api` | Python (FastAPI) | 8001 | MySQL — `inventario_db` | `/api/inventario` | `/docs` |
| `ventas-api` | Java 17 (Spring Boot 3) | 8002 | PostgreSQL — `ventas_db` | `/api/ventas` | `/swagger-ui.html` |
| `proveedores-api` | Python (FastAPI) | 8003 | MySQL — `proveedores_db` | `/api/proveedores` | `/docs` |

Cada servicio expone además `GET /health` → `{"status": "ok", "service": "<nombre>"}`.

## Índice

1. [Cómo levantar](#cómo-levantar)
2. [Modelo de datos e interconexión entre servicios](#modelo-de-datos-e-interconexión-entre-servicios)
3. [Convenciones comunes de las APIs](#convenciones-comunes-de-las-apis)
4. [inventario-api](#inventario-api)
5. [proveedores-api](#proveedores-api)
6. [ventas-api](#ventas-api)
7. [Cobertura CRUD](#cobertura-crud)
8. [Flujos de negocio e integración](#flujos-de-negocio-e-integración)
9. [Limitaciones conocidas](#limitaciones-conocidas)
10. [Red y seguridad](#red-y-seguridad-despliegue-aws-real)

---

## Cómo levantar

1. Copiar `.env.example` a `.env` dentro de cada subcarpeta (`inventario-api/.env`, `ventas-api/.env`, `proveedores-api/.env`) y completar `DB_HOST` con la IP privada de VM3.
2. Variables por servicio (el `.env.example` de la raíz las resume):

   | Variable | inventario / proveedores (MySQL) | ventas (PostgreSQL) |
   |---|---|---|
   | `DB_HOST` | IP privada de VM3 | IP privada de VM3 |
   | `DB_PORT` | `3306` | `5432` |
   | `DB_USER` / `DB_PASSWORD` | `bodega` / `changeme` | `bodega` / `changeme` |
   | `DB_NAME` | `inventario_db` / `proveedores_db` | `ventas_db` |

3. Desde esta carpeta:

```bash
docker-compose up --build
```

4. Verificar salud: `curl http://localhost:8001/health`, `:8002/health`, `:8003/health`.
5. Swagger: `http://localhost:8001/docs`, `http://localhost:8002/swagger-ui.html`, `http://localhost:8003/docs`.

> `docker-compose.yml` **no** incluye las bases de datos: las bases (VM3) deben existir y ser alcanzables. Las **tablas se crean solas** al arrancar (`Base.metadata.create_all` en Python, `ddl-auto: update` en Spring). No hay migraciones (Flyway/Alembic): si cambia una columna de una tabla ya creada, hay que migrarla a mano.

---

## Modelo de datos e interconexión entre servicios

Los servicios **no comparten base de datos ni tienen claves foráneas entre sí**. Se relacionan solo por ids numéricos guardados como enteros simples:

```
inventario-api.productos.id  ──►  producto_id   en proveedores.tiempos_entrega
                             ──►  productoId    en ventas_diarias
                             ──►  productoId    en pedidos_proveedor
proveedores-api.proveedores.id ─► proveedor_id  en proveedores.tiempos_entrega (FK real, misma BD)
                               ─► proveedorId   en pedidos_proveedor (sin FK, otra BD)
```

**Regla clave para integradores:** el identificador de producto en todo el sistema es el `id` autoincremental de `inventario-api` (`productos.id`), **no** el `sku`. Del mismo modo, el identificador de proveedor es el `id` de `proveedores-api`.

Ningún servicio valida que un `producto_id` / `proveedor_id` recibido de otro servicio exista. Quien orquesta (cliente, `alertas-api`, etc.) debe garantizarlo.

### Entidades y atributos

**`productos`** (inventario-api, MySQL)

| Atributo | Tipo | Notas |
|---|---|---|
| `id` | int PK autoincrement | **Id de producto para todo el sistema** |
| `sku` | string(50), único, requerido | Código de negocio |
| `nombre` | string(150), requerido | |
| `categoria` | string(80), opcional | |
| `unidad_medida` | string(20), opcional | Por defecto `"unidad"` |
| `stock_actual` | int, requerido | Solo cambia vía movimientos |
| `stock_minimo` | int, requerido | Umbral de reposición |
| `precio_unitario` | decimal(10,2), requerido | Precio de venta de referencia |
| `created_at`, `updated_at` | datetime | Los pone el servidor |

**`movimientos_inventario`** (inventario-api)

| Atributo | Tipo | Notas |
|---|---|---|
| `id` | int PK | |
| `producto_id` | int FK → `productos.id` | |
| `tipo_movimiento` | enum `entrada` \| `salida` \| `ajuste` | |
| `cantidad` | int | Ver semántica por tipo en [movimientos](#movimientos) |
| `fecha_movimiento`, `created_at` | datetime | Los pone el servidor |
| `motivo` | string(150), opcional | |
| `usuario` | string(80), opcional | |

**`proveedores`** (proveedores-api, MySQL)

| Atributo | Tipo | Notas |
|---|---|---|
| `id` | int PK | **Id de proveedor para todo el sistema** |
| `nombre` | string(150), requerido | No vacío |
| `contacto` | string(100), opcional | |
| `telefono` | string(20), opcional | |
| `email` | string(100), opcional | Formato `algo@dominio.ext` |
| `direccion` | string(200), opcional | |
| `created_at` | datetime | |

**`tiempos_entrega`** (proveedores-api)

| Atributo | Tipo | Notas |
|---|---|---|
| `id` | int PK | |
| `proveedor_id` | int FK → `proveedores.id` | |
| `producto_id` | int (sin FK) | Id de `inventario-api` |
| `dias_entrega_promedio` / `_min` / `_max` | int ≥ 0 | Se exige `min <= promedio <= max` |
| `updated_at` | datetime | |

Único lógico: un par (`proveedor_id`, `producto_id`) solo puede existir una vez (409 si se repite).

**`ventas_diarias`** (ventas-api, PostgreSQL)

| Atributo | Tipo | Notas |
|---|---|---|
| `id` | long PK | |
| `productoId` | int, requerido | Id de `inventario-api` |
| `fecha` | date `YYYY-MM-DD`, requerido | |
| `cantidadVendida` | int ≥ 1, requerido | |
| `precioUnitario` | decimal(10,2) ≥ 0, requerido | |
| `total` | decimal(12,2) | **Calculado por el servidor** = `precioUnitario × cantidadVendida` (también al hacer PATCH) |
| `createdAt` | datetime | |

Una fila = ventas de **un producto en un día** (no hay cabecera de venta ni líneas).

**`pedidos_proveedor`** (ventas-api)

| Atributo | Tipo | Notas |
|---|---|---|
| `id` | long PK | |
| `productoId` | int, requerido | Id de `inventario-api` |
| `proveedorId` | int, requerido | Id de `proveedores-api` |
| `fechaPedido` | date, requerido | |
| `cantidadPedida` | int ≥ 1, requerido | |
| `estado` | string | `pendiente` (por defecto) \| `en_transito` \| `recibido` \| `cancelado` |
| `fechaEstimadaEntrega` | date, opcional | |
| `createdAt` | datetime | |

---

## Convenciones comunes de las APIs

Hay diferencias entre los servicios Python y Java que un cliente debe tener en cuenta:

| Aspecto | inventario-api / proveedores-api (Python) | ventas-api (Java) |
|---|---|---|
| Nombres JSON | `snake_case` (`producto_id`) | `camelCase` (`productoId`) |
| Paginación | `skip` (default 0) y `limit` (default 50, tope 200) | `page` (base 0, default 0) y `size` (default 50, tope 200) |
| Decimales en respuesta | **string** (`"12.50"`, Pydantic v2) | **número** (`12.5`) |
| Error de validación | `422` con `{"detail": [...]}` | `400` |
| No encontrado | `404` `{"detail": "..."}` | `404` |
| Conflicto (duplicado / dependencias) | `409` | — |
| Actualizaciones | `PATCH` parcial: solo se modifican los campos enviados | `PATCH` parcial: campos omitidos o `null` no cambian |
| Fechas | ISO 8601 (`datetime` sin zona horaria) | ISO 8601 (`date` / `datetime`) |

Los listados devuelven un arreglo simple (sin total ni metadatos de página).

---

## inventario-api

Puerto 8001 · prefijo `/api/inventario` · MySQL `inventario_db`.

### Productos

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/inventario/productos` | Crea un producto → `201`. `409` si el `sku` ya existe |
| GET | `/api/inventario/productos` | Lista productos (`skip`, `limit`), ordenados por id |
| GET | `/api/inventario/productos/{id}` | Detalle. `404` si no existe |
| PATCH | `/api/inventario/productos/{id}` | Actualización parcial. `409` si el nuevo `sku` ya existe |
| DELETE | `/api/inventario/productos/{id}` | `204`. `409` si el producto tiene movimientos registrados |

**Crear** — cuerpo:

```jsonc
{
  "sku": "ARR-001",            // requerido, 1-50 caracteres
  "nombre": "Arroz 1kg",       // requerido, 1-150 caracteres
  "categoria": "Abarrotes",    // opcional
  "unidad_medida": "unidad",   // opcional, default "unidad"
  "stock_actual": 0,           // opcional, >= 0, default 0
  "stock_minimo": 10,          // opcional, >= 0, default 0
  "precio_unitario": "4.50"    // opcional, >= 0, default 0.00
}
```

**Actualizar (PATCH)** acepta `sku`, `nombre`, `categoria`, `unidad_medida`, `stock_minimo` (≥ 0), `precio_unitario` (≥ 0). **No** acepta `stock_actual`: el stock solo cambia vía movimientos. `sku`, `nombre`, `precio_unitario` y `stock_minimo` no pueden ser nulos.

**Respuesta** (`ProductoOut`): `id, sku, nombre, categoria, unidad_medida, stock_actual, stock_minimo, precio_unitario, created_at, updated_at`.

### Stock

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/inventario/stock/{producto_id}` | Stock de un producto. `404` si no existe |

```jsonc
{
  "producto_id": 1, "sku": "ARR-001", "nombre": "Arroz 1kg",
  "stock_actual": 8, "stock_minimo": 10,
  "en_riesgo": true          // true si stock_actual <= stock_minimo
}
```

Es el endpoint natural para `alertas-api`.

### Movimientos

Registro histórico: **solo se crean y consultan** (no se editan ni borran).

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/inventario/movimientos` | Registra el movimiento y actualiza el stock en la misma transacción (bloqueo de fila) → `201` |
| GET | `/api/inventario/movimientos` | Lista, más recientes primero. Filtros: `producto_id`, `tipo_movimiento`; `skip`, `limit` |
| GET | `/api/inventario/movimientos/{id}` | Detalle. `404` si no existe |

**Crear** — cuerpo:

```jsonc
{
  "producto_id": 1,                 // requerido; 404 si no existe
  "tipo_movimiento": "entrada",     // "entrada" | "salida" | "ajuste"
  "cantidad": 50,
  "motivo": "Compra a proveedor",   // opcional
  "usuario": "diego"                // opcional
}
```

Semántica de `cantidad` según el tipo:

| Tipo | Efecto sobre `stock_actual` | Validación |
|---|---|---|
| `entrada` | `stock += cantidad` | `cantidad > 0` |
| `salida` | `stock -= cantidad` | `cantidad > 0`; `400` si `cantidad` supera el stock disponible |
| `ajuste` | `stock = cantidad` (**stock resultante** de un conteo físico) | `cantidad >= 0` (admite 0); el movimiento guarda el valor final, no la diferencia |

**Respuesta** (`MovimientoOut`): `id, producto_id, tipo_movimiento, cantidad, fecha_movimiento, motivo, usuario`.

---

## proveedores-api

Puerto 8003 · prefijo `/api/proveedores` · MySQL `proveedores_db`.

### Proveedores

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/proveedores` | Crea un proveedor → `201` |
| GET | `/api/proveedores` | Lista (`skip`, `limit`), ordenados por id |
| GET | `/api/proveedores/{proveedor_id}` | Detalle. `404` si no existe |
| PATCH | `/api/proveedores/{proveedor_id}` | Actualización parcial (`nombre` no puede ser nulo ni vacío) |
| DELETE | `/api/proveedores/{proveedor_id}` | `204`. `409` si tiene tiempos de entrega registrados |

Cuerpo de creación: `nombre` (requerido, 1-150), `contacto`, `telefono`, `email` (formato `a@b.c`), `direccion` (todos opcionales). Respuesta: `id, nombre, contacto, telefono, email, direccion, created_at`.

### Tiempos de entrega (proveedor ↔ producto)

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/proveedores/tiempos-entrega` | Crea → `201`. `404` si el proveedor no existe, `422` si no se cumple `min <= promedio <= max`, `409` si el par proveedor-producto ya existe |
| GET | `/api/proveedores/tiempos-entrega` | Lista. Filtros: `proveedor_id`, `producto_id`; `skip`, `limit` |
| GET | `/api/proveedores/tiempos-entrega/{tiempo_id}` | Detalle. `404` si no existe |
| PATCH | `/api/proveedores/tiempos-entrega/{tiempo_id}` | Actualiza `dias_entrega_promedio/min/max` (no permite cambiar proveedor ni producto). Revalida el rango con los valores resultantes |
| DELETE | `/api/proveedores/tiempos-entrega/{tiempo_id}` | `204` |
| GET | `/api/proveedores/producto/{producto_id}/tiempo-entrega` | **Endpoint de integración**: tiempo de entrega de un producto |

Cuerpo de creación:

```jsonc
{
  "proveedor_id": 1,
  "producto_id": 1,               // id de inventario-api; no se valida su existencia
  "dias_entrega_promedio": 3,
  "dias_entrega_min": 1,
  "dias_entrega_max": 5
}
```

Respuesta (`TiempoEntregaOut`): `id, producto_id, proveedor_id, proveedor_nombre, dias_entrega_promedio, dias_entrega_min, dias_entrega_max`.

`GET /producto/{producto_id}/tiempo-entrega` lo usan `prediccion-api` y `alertas-api`. Si el producto tiene varios proveedores, devuelve el de **menor `dias_entrega_promedio`**. `404` si no hay ninguno registrado.

> Orden de rutas: las rutas fijas (`/tiempos-entrega`, `/producto/...`) se declaran antes de `/{proveedor_id}` para que no se interpreten como un id.

---

## ventas-api

Puerto 8002 · prefijo `/api/ventas` · PostgreSQL `ventas_db`. JSON en `camelCase`.

### Ventas diarias

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/ventas` | Registra una venta diaria → `201` (calcula `total`) |
| GET | `/api/ventas` | Lista, más recientes primero. Filtros: `productoId`, `desde`, `hasta` (`YYYY-MM-DD`); `page`, `size` |
| GET | `/api/ventas/{id}` | Detalle. `404` si no existe |
| PATCH | `/api/ventas/{id}` | Actualización parcial; **recalcula `total`** |
| DELETE | `/api/ventas/{id}` | `204` (borrado físico) |
| GET | `/api/ventas/producto/{productoId}?dias=N` | Historial de un producto, más recientes primero; `dias` (opcional) limita a los últimos N días. Sin paginación |

Cuerpo de creación:

```jsonc
{
  "productoId": 1,           // requerido (id de inventario-api)
  "fecha": "2026-09-19",     // requerido
  "cantidadVendida": 3,      // requerido, >= 1
  "precioUnitario": 4.50     // requerido, >= 0
}
```

Respuesta (`VentaDiaria`): `id, productoId, fecha, cantidadVendida, precioUnitario, total, createdAt`.

`GET /api/ventas/producto/{productoId}` es la fuente de historial de demanda para `prediccion-api`.

### Pedidos a proveedor

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/ventas/pedidos-proveedor` | Registra un pedido → `201` |
| GET | `/api/ventas/pedidos-proveedor` | Lista, más recientes primero. Filtros: `productoId`, `proveedorId`, `estado`; `page`, `size` |
| GET | `/api/ventas/pedidos-proveedor/detalle/{id}` | Detalle por id del pedido. `404` si no existe |
| GET | `/api/ventas/pedidos-proveedor/producto/{productoId}` | Historial de pedidos de un producto |
| GET | `/api/ventas/pedidos-proveedor/{productoId}` | **Obsoleto**: igual que la anterior, se conserva por compatibilidad. Ojo: este `{id}` es un producto, no un pedido |
| PATCH | `/api/ventas/pedidos-proveedor/{id}` | Actualización parcial |
| DELETE | `/api/ventas/pedidos-proveedor/{id}` | `204` (borrado físico) |

Cuerpo de creación:

```jsonc
{
  "productoId": 1,                         // requerido
  "proveedorId": 2,                        // requerido
  "fechaPedido": "2026-09-19",             // requerido
  "cantidadPedida": 100,                   // requerido, >= 1
  "estado": "pendiente",                   // opcional: pendiente | en_transito | recibido | cancelado
  "fechaEstimadaEntrega": "2026-09-24"     // opcional
}
```

Respuesta (`PedidoProveedor`): `id, productoId, proveedorId, fechaPedido, cantidadPedida, estado, fechaEstimadaEntrega, createdAt`.

Un `estado` fuera de la lista devuelve `400`. No hay control de transiciones entre estados.

---

## Cobertura CRUD

| Servicio | Entidad | Crear | Leer (lista / detalle) | Actualizar | Eliminar |
|---|---|---|---|---|---|
| inventario-api | productos | ✅ | ✅ / ✅ | ✅ (sin stock) | ✅ (bloqueado con movimientos) |
| inventario-api | movimientos | ✅ | ✅ / ✅ | — (historial) | — (historial) |
| inventario-api | stock | — | ✅ | vía movimientos | — |
| proveedores-api | proveedores | ✅ | ✅ / ✅ | ✅ | ✅ (bloqueado con tiempos de entrega) |
| proveedores-api | tiempos-entrega | ✅ | ✅ / ✅ | ✅ | ✅ |
| ventas-api | ventas diarias | ✅ | ✅ / ✅ | ✅ | ✅ |
| ventas-api | pedidos-proveedor | ✅ | ✅ / ✅ | ✅ | ✅ |

---

## Flujos de negocio e integración

Quién consume qué:

| Consumidor | Endpoint | Para qué |
|---|---|---|
| `prediccion-api` | `GET /api/ventas/producto/{productoId}?dias=N` | Historial de demanda |
| `prediccion-api`, `alertas-api` | `GET /api/proveedores/producto/{producto_id}/tiempo-entrega` | Lead time del proveedor |
| `alertas-api` | `GET /api/inventario/stock/{producto_id}` | Detectar `en_riesgo` |

Flujo de reposición esperado (orquestado por el cliente u otro servicio, ver limitaciones):

1. Registrar el producto: `POST /api/inventario/productos` → obtener `id`.
2. Registrar proveedor y su tiempo de entrega: `POST /api/proveedores` y `POST /api/proveedores/tiempos-entrega` con el `id` del producto.
3. Cada venta: `POST /api/ventas` (ventas) **y** `POST /api/inventario/movimientos` con `salida` (inventario).
4. Detectar necesidad: `GET /api/inventario/stock/{id}` → `en_riesgo`.
5. Pedir: `POST /api/ventas/pedidos-proveedor` (estado `pendiente`).
6. Al recibir la mercadería: `PATCH /api/ventas/pedidos-proveedor/{id}` con `{"estado": "recibido"}` **y** `POST /api/inventario/movimientos` con `entrada`.
7. Conteo físico: `POST /api/inventario/movimientos` con `ajuste` y `cantidad` = stock contado.

---

## Limitaciones conocidas

- **Sin sincronización automática entre servicios**: registrar una venta no descuenta stock y marcar un pedido como `recibido` no genera la `entrada`. Hoy lo debe hacer el cliente (pasos 3 y 6 arriba).
- **Sin validación cruzada de ids**: se pueden crear ventas, pedidos o tiempos de entrega con `productoId` / `proveedorId` inexistentes.
- **Ventas simplificadas**: una fila por producto y día; sin cliente, comprobante ni varios ítems por venta.
- **Sin costo de compra**: no se guarda el precio al que cada proveedor vende un producto.
- **Ajustes**: el movimiento guarda el stock resultante, no la diferencia respecto al stock anterior.
- **Borrado físico** en ventas y pedidos (sin `activo` ni historial de cambios).
- **Estados de pedido**: la lista es cerrada pero no hay control de transiciones.
- **Sin autenticación**: la protección depende de la red (ver siguiente sección).
- **Sin migraciones de esquema** (ver "Cómo levantar").

---

## Red y seguridad (despliegue AWS real)

- Subred privada de aplicación, **sin IP pública**.
- Security group: entrada solo desde el Security Group del balanceador de carga (ALB) en los puertos 8001-8003.
- Acceso administrativo vía **AWS SSM Session Manager** — sin puerto 22 (SSH) abierto a internet.
- Salida permitida hacia VM3 (puertos 3306 y 5432) para que los 3 servicios puedan conectarse a sus bases de datos.

## Dueños

Integrante 1 (Inventario), Integrante 3 (Proveedores), Integrante 2 (Ventas).

Documentación específica de cada servicio: `inventario-api/README.md`, `proveedores-api/README.md`, `ventas-api/README.md`.
