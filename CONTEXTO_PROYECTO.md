# Contexto del proyecto — Sistema By Cliza

Documento vivo para alinear trabajo futuro con la arquitectura y convenciones del repo. Última revisión orientativa: **2026-05-09**.

---

## Qué es

Aplicación web de **gestión comercial / taller / indumentaria**: clientes, ventas, compras, proveedores, inventario, órdenes de corte, cajas, cuentas corrientes (clientes, proveedores, talleres), personal y sueldos, productos con variantes (color/talle), insumos, gastos, sucursales, usuarios y **permisos por módulo**.

---

## Solución y capas

| Proyecto | Rol |
|----------|-----|
| **SistemaByCliza.Application** | ASP.NET Core MVC (`net6.0`): controllers, Razor Views, `wwwroot` (CSS/JS/imágenes), `Program.cs`, DI. Referencia BLL y Models. |
| **SistemaByCliza.BLL** | Servicios (`*Service.cs`) e interfaces (`I*Service.cs`). Lógica de negocio; referencia DAL y Models. |
| **SistemaByCliza.DAL** | `SistemaByClizaContext` (EF Core), repositorios (`*Repository.cs`). |
| **SistemaByCliza.Models** | Entidades POCO alineadas al esquema SQL Server (nombres de tablas vía `DbSet` en el context). |

Flujo típico: **Controller → Service → Repository → DbContext**.

Archivo de solución: `Sistema ByCliza.sln` (nota: hay un espacio en el nombre del archivo).

---

## Stack técnico

- **.NET 6** (nullable e implicit usings activados en los proyectos vistos).
- **Entity Framework Core** + **SQL Server** (`ConnectionStrings:SistemaDB` en `appsettings.json`).
- **Autenticación**: JWT Bearer como esquema por defecto; política global `RequireAuthenticatedUser`.
- **Vistas**: Razor + **Runtime Compilation** para desarrollo.
- **Front**: jQuery, Bootstrap, Select2 (CDN), scripts por pantalla en `wwwroot/js/`, estilos en `wwwroot/css/`.
- **JSON**: Newtonsoft.Json referenciado en la aplicación web.

---

## Arranque y configuración

- Punto de entrada: `SistemaByCliza.Application/Program.cs`.
- Cadena de conexión y `JwtSettings` en `appsettings.json`. **No versionar secretos reales**; rotar claves si el repo es compartido.
- `AppSettings:DEV_MODE` presente (valor `on` en el archivo actual).
- Ruta por defecto: `{controller=Login}/{action=Index}`.

---

## Autenticación y sesión en el cliente

1. `LoginController` valida usuario (servicio de login + `PasswordHasher<User>` de ASP.NET Core Identity).
2. Se genera un **JWT** y, vía `IUsuariosPermisosService`, un payload de **módulos y permisos**.
3. El front guarda en **localStorage** (entre otros): `JwtToken`, `userSession` (datos de usuario + estructura de permisos).
4. Las peticiones `fetch` / AJAX suelen enviar `Authorization: Bearer <token>`. En `site.js` se expone `window.token` leyendo `JwtToken` al cargar; algunos scripts usan `window.token` y otros `localStorage.getItem("JwtToken")` — conviene unificar si se refactoriza.

Claims útiles en servidor (extensiones en `Extensions/ClaimsPrincipalExtensions.cs`):

- `Id` → id de usuario numérico.
- `UsuariosRol` → id de rol.
- Nombre: `ClaimTypes.NameIdentifier` o `JwtRegisteredClaimNames.Sub`.

---

## Autorización y menú

- Permisos granulares: tablas y servicio `UsuariosPermisos` (repositorio/servicio registrados en `Program.cs`).
- **Menú dinámico** en `wwwroot/js/NavBarLogin.js`: se arma desde `userSession.Permisos` con normalización de códigos y **sinónimos** (`SINONIMOS_MENU_CODIGO_BD`) para alinear códigos de BD con rutas del menú.
- Scripts relacionados: `Permisos.js`, partial `Views/Shared/Partials/NavBarLogin.cshtml`, modales de configuración en `ModalsConfiguracionSistema.cshtml`.

---

## Dominio de datos (DbContext)

`SistemaByClizaContext` expone, entre otros, conjuntos para:

- **Comercial**: `Cliente`, `Venta`, `VentasProducto`, `VentasProductosVariante`, `ListasPrecio`, `Producto` y tablas de categorías, colores, talles, variantes, precios.
- **Compras / stock insumos**: `Compra`, `ComprasInsumo`, `ComprasPago`, `Insumo`, `InsumosCategoria`, `InsumosInventario`, `InsumosInventarioMovimiento`.
- **Inventario producto**: `Inventario`, `InventarioMovimiento`, transferencias entre sucursales, ingresos desde órdenes de corte (varias entidades `InventarioIngresosOrdenesCorte*`).
- **Órdenes de corte**: `OrdenesCorte`, estados, etapas, insumos y productos vinculados.
- **Caja y cuentas**: `Caja`, `Cuenta`, `CajasTransfEntreCuenta`, `Banco`.
- **Cuentas corrientes**: `ClientesCuentaCorriente`, `ClientesCobro`, `ProveedoresCuentaCorriente`, `TalleresCuentaCorriente`, `TalleresPago`.
- **RR.HH.**: `Personal`, `PersonalPuesto`, `PersonalSueldo`, `PersonalSueldosPago`.
- **Catálogo / config**: `Sucursal`, `Provincia`, `CondicionesIva`, `Proveedor`, `Taller`, `Gasto`, `GastosCategoria`, `Color`.
- **Usuarios**: `User` (entidad principal de usuario en BD según context), `UsuariosRol`, `EstadosUsuario`, `UsuariosModulo`, `UsuariosModulosGrupo`, `UsuariosPermiso`, `UsuariosPermisosUsuario`, `UsuariosRolesPermiso`, `UsuariosSucursal`.

El `OnModelCreating` es extenso (convenciones Fluent API para FKs y tipos).

---

## Controllers (lista de referencia)

Bajo `SistemaByCliza.Application/Controllers/` (nombres orientativos): Login, Home, Dashboard, Clientes, Ventas, Compras, Proveedores, Productos (+ categorías/talles), Insumos (+ categorías), Inventario, OrdenesCorte (+ estados/etapas), Cajas, Cuentas, CuentasCorrientes (+ Proveedores, Talleres), Gastos (+ categorías), Personal (+ puestos, sueldos), Talleres, ListasPrecios, Colores, CondicionesIVA, Provincias, Bancos, Sucursales, Usuarios, Roles, EstadosUsuarios, **UsuariosPermisos**.

Convención habitual: endpoints para vistas MVC + acciones JSON/Listas consumidas por JS.

---

## UI / vistas

- Layout principal: `Views/Shared/_Layout.cshtml` (logo, navbar partial, Bootstrap, `site.js`).
- Navbar autenticado: `Partials/NavBarLogin.cshtml`.
- Partials reutilizables recientes: `M_Producto`, `M_Personal`, `M_Insumos`, `ModalsConfiguracionSistema`, `Utils/Modals.cshtml`.
- CSS compartido: `site.css`, `ModalsShared.css`, `DisenoPantallas.css`, y hojas por módulo (ej. `Ventas`, `Cajas`, `Dashboard`).

Detalle de **z-index** en modales: `site.js` define constantes para modales de feedback por encima del modal de configuración del navbar.

---

## Convenciones y deuda técnica observada

1. **Namespace inconsistente**: `LoginController` declara `namespace SistemaBronx.Application.Controllers` mientras el resto del proyecto usa `SistemaByCliza` — revisar al tocar ese archivo.
2. **Versiones EF**: la web usa `Microsoft.EntityFrameworkCore.Design` **7.0.18** sobre **net6.0**; vigilar compatibilidad con el runtime EF del DAL.
3. **Seguridad**: JWT global implica que cualquier controller sin `[AllowAnonymous]` requiere Bearer; confirmar que login y assets estáticos queden accesibles según lo esperado.
4. **Tokens en localStorage**: conveniente para SPA-like dentro de MVC; considerar mitigaciones XSS en formularios y scripts externos.

---

## Cómo usar este archivo en el chat

Al iniciar tareas nuevas, se puede decir: *“Lee `CONTEXTO_PROYECTO.md` y continúa con X”* para mantener coherencia de capas, naming y flujo JWT/permisos.

---

## Rutas de carpetas clave

```
SistemaByCliza.Application/     → MVC + wwwroot
SistemaByCliza.BLL/Service/     → Servicios
SistemaByCliza.DAL/Repository/  → Repositorios
SistemaByCliza.DAL/DataContext/ → EF Core
SistemaByCliza.Models/          → Entidades
```

---

*Este documento resume el estado del código en el workspace; si cambia la arquitectura, conviene actualizar las secciones afectadas.*
