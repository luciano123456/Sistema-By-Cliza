document.addEventListener("DOMContentLoaded", () => {
    renderUser();
    renderDashboard();
});

/* =========================
   USER
========================= */

function renderUser() {

    const user = JSON.parse(localStorage.getItem("userSession"));
    if (!user) return;

    const nombre = `${user.Nombre || ""} ${user.Apellido || ""}`.trim();

    document.getElementById("dashboardUser").innerText = nombre;
}

/* =========================
   LOGOUT (MISMO ESTILO TUYO)
========================= */

function logout() {
    if (window.SessionManager?.beginVoluntaryLogout) {
        window.SessionManager.beginVoluntaryLogout();
    } else {
        sessionStorage.removeItem("sesionExpirada");
        sessionStorage.setItem("logoutVoluntario", "1");
        localStorage.removeItem("userSession");
        localStorage.removeItem("JwtToken");
        localStorage.removeItem("sessionExpiresAt");
        if (typeof window.syncTokenFromStorage === "function") {
            window.syncTokenFromStorage();
        } else if (typeof window !== "undefined") {
            window.token = null;
        }
    }
    window.location.href = "/Login/Logout";
}

/* =========================
   RUTAS = mismas que Home y los controllers MVC
   En Views/Home/Index.cshtml cada tile usa href="@Url.Action("Index","<Controller>")"
   → en convención default la URL es "/" + nombre del controller (sin "Controller").
   Aquí solo mapeamos cuando Usuarios_Modulos.Codigo NO coincide con ese nombre
   (p. ej. "CC Talleres" → controller CuentasCorrientesTalleres).
========================= */

/** CodigoModulo en BD → nombre del Controller (segundo argumento de Url.Action("Index", …)). */
const CODIGO_MODULO_EXCEPCION_CONTROLLER = {
    "CC Clientes": "CuentasCorrientes",
    "CC Proveedores": "CuentasCorrientesProveedores",
    "CC Talleres": "CuentasCorrientesTalleres",
    Empleados: "Personal",
    Sueldos: "PersonalSueldos",
    "Ordenes de Corte": "OrdenesCorte",
    "Órdenes de Corte": "OrdenesCorte",
    Taller: "Talleres"
};

/** Texto legible / alias → mismo controller que los tiles de Home. */
const ALIAS_TEXTO_A_CONTROLLER = {
    "cc talleres": "CuentasCorrientesTalleres",
    "cc de talleres": "CuentasCorrientesTalleres",
    "cuentas corrientes talleres": "CuentasCorrientesTalleres",
    "cc clientes": "CuentasCorrientes",
    "cc de clientes": "CuentasCorrientes",
    "cuentas corrientes clientes": "CuentasCorrientes",
    "cc proveedores": "CuentasCorrientesProveedores",
    "cc de proveedores": "CuentasCorrientesProveedores",
    "cuentas corrientes proveedores": "CuentasCorrientesProveedores",
    "ordenes de corte": "OrdenesCorte",
    "ordenes de cortes": "OrdenesCorte",
    taller: "Talleres"
};

/** Dedup y comparaciones: mismo módulo puede aparecer con distinto casing en sesión. */
function claveCodigoModulo(cod) {
    return (cod || "").trim().toLowerCase();
}

/** Hub “Configuraciones” en usuarios_modulos: sin tile propio; el acceso es el tile maestro (modal). */
function esModuloHubConfiguraciones(m) {
    const c = claveCodigoModulo(m.CodigoModulo || "").replace(/\s+/g, "");
    const n = claveCodigoModulo(m.Modulo || "").replace(/\s+/g, "");
    return c === "configuraciones" || n === "configuraciones";
}

/** Misma idea que NavBar → Extras: catálogos bajo grupo “Extras” en el dashboard. */
const CONTROLLERS_CATALOGO_EXTRAS = new Set([
    "ListasPrecios", "Roles", "Sucursales", "Cuentas", "Bancos", "Colores",
    "PersonalPuestos", "GastosCategorias", "ProductosCategoria", "InsumosCategoria",
    "ProductosCategoriasTalle", "OrdenesCorteEstados", "OrdenesCorteEtapasEstados"
]);

function grupoDashboardDesdeModulo(m) {
    const ctrl = controllerIndexDesdeModuloSesion(m);
    if (ctrl && CONTROLLERS_CATALOGO_EXTRAS.has(ctrl)) return "Extras";
    return (m.Grupo || "General").trim() || "General";
}

function esModuloUsuarios(m) {
    const c = claveCodigoModulo(m.CodigoModulo || "");
    const n = claveCodigoModulo(m.Modulo || "");
    return c === "usuarios" || n === "usuarios";
}

/**
 * En BD a veces el maestro Talleres (Producción) tiene el mismo Codigo que Ordenes de Corte (Id 24 en usuarios_modulos).
 * Se distingue por Nombre = "Talleres" y Codigo distinto de "CC Talleres".
 */
function esMaestroTalleresCodigoDuplicadoOrdenesCorte(m) {
    const nomF = foldModuloDashboard(m.Modulo || "");
    const codF = foldModuloDashboard(m.CodigoModulo || "");
    if (nomF !== "talleres") return false;
    if (esFoldCodigoCcTalleres(codF)) return false;
    return codF === "ordenesdecorte" || codF === "ordenescorte";
}

/** Controller MVC (Index) asociado a un ítem de sesión; sirve para reagrupar Producción. */
function controllerIndexDesdeModuloSesion(m) {
    const cod = (m.CodigoModulo || "").trim();
    const nom = (m.Modulo || "").trim();
    const codF = cod ? foldModuloDashboard(cod) : "";

    if (codF && esFoldCodigoCcTalleres(codF)) return "CuentasCorrientesTalleres";

    if (esMaestroTalleresCodigoDuplicadoOrdenesCorte(m)) return "Talleres";

    const porCod = cod ? controllerIndexDesdeCodigoModulo(cod) : null;
    if (porCod) return porCod;
    return nom ? controllerIndexDesdeCodigoModulo(nom) : null;
}

/** Junta Órdenes de Corte y Talleres (maestro) en el grupo "Producción", alineado con Home. */
function aplicarGrupoProduccionDashboard(grupos) {
    const targets = new Set(["OrdenesCorte", "Talleres"]);
    const sacados = [];

    for (const k of Object.keys(grupos)) {
        const arr = grupos[k] || [];
        const keep = [];
        for (const m of arr) {
            const ctrl = controllerIndexDesdeModuloSesion(m);
            if (ctrl && targets.has(ctrl)) {
                sacados.push(m);
            } else {
                keep.push(m);
            }
        }
        if (keep.length) grupos[k] = keep;
        else delete grupos[k];
    }

    if (!sacados.length) return;

    sacados.sort((a, b) => {
        const ca = controllerIndexDesdeModuloSesion(a);
        const cb = controllerIndexDesdeModuloSesion(b);
        if (ca === cb) return (a.OrdenModulo ?? 999) - (b.OrdenModulo ?? 999);
        if (ca === "OrdenesCorte") return -1;
        if (cb === "OrdenesCorte") return 1;
        return (a.OrdenModulo ?? 999) - (b.OrdenModulo ?? 999);
    });

    const keyProduccion = "Producción";
    if (!grupos[keyProduccion]) grupos[keyProduccion] = [];
    grupos[keyProduccion].push(...sacados);
}

/**
 * Quita “Usuarios” de todos los grupos y lo deja solo en “Extras”.
 * Si no existía grupo Extras, se crea al agregar Usuarios.
 */
function aplicarReglasDashboardExtras(grupos) {
    const puedeUsuarios =
        Permisos.tiene("Usuarios", "Ver") ||
        Permisos.tiene("usuarios", "Ver");

    const keys = Object.keys(grupos);
    let extrasKey = keys.find(k => k.trim().toLowerCase() === "extras") || null;

    keys.forEach(k => {
        grupos[k] = (grupos[k] || []).filter(m => !esModuloUsuarios(m));
    });

    if (!puedeUsuarios) {
        Object.keys(grupos).forEach(k => {
            if (!grupos[k] || grupos[k].length === 0) delete grupos[k];
        });
        return;
    }

    if (!extrasKey) {
        extrasKey = "Extras";
        grupos[extrasKey] = [];
    }

    const ya = (grupos[extrasKey] || []).some(esModuloUsuarios);
    if (!ya) {
        grupos[extrasKey].push({
            CodigoModulo: "Usuarios",
            Modulo: "Usuarios",
            Grupo: extrasKey,
            OrdenModulo: 0
        });
    }

    Object.keys(grupos).forEach(k => {
        if (!grupos[k] || grupos[k].length === 0) delete grupos[k];
    });
}

function normalizarTextoAlias(cod) {
    return (cod || "").trim().toLowerCase().replace(/\s+/g, " ");
}

/** Igual que NavBar/Permisos: clave estable para Codigo/Nombre de módulo (sin acentos). */
function foldModuloDashboard(codRaw) {
    return String(codRaw || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "")
        .replace(/[^\w]/g, "");
}

/** Fold de CodigoModulo que siempre es CC Talleres (nunca maestro /Talleres). */
function esFoldCodigoCcTalleres(f) {
    if (!f) return false;
    return f === "cctalleres" || f === "cuentascorrientestalleres" || f === "cctaller";
}

/**
 * Resuelve el controller del índice (como Home): si CodigoModulo es ya el nombre del .cs, se usa tal cual.
 */
function controllerIndexDesdeCodigoModulo(codRaw) {
    const c = (codRaw || "").trim();
    if (!c) return null;

    if (CODIGO_MODULO_EXCEPCION_CONTROLLER[c]) return CODIGO_MODULO_EXCEPCION_CONTROLLER[c];

    const exKey = Object.keys(CODIGO_MODULO_EXCEPCION_CONTROLLER).find(
        k => k.toLowerCase() === c.toLowerCase()
    );
    if (exKey) return CODIGO_MODULO_EXCEPCION_CONTROLLER[exKey];

    const porAlias = ALIAS_TEXTO_A_CONTROLLER[normalizarTextoAlias(c)];
    if (porAlias) return porAlias;

    const f = foldModuloDashboard(c);
    if (esFoldCodigoCcTalleres(f)) return "CuentasCorrientesTalleres";
    if (f === "talleres" || f === "taller") return "Talleres";

    if (/^[A-Za-z][A-Za-z0-9]*$/.test(c)) return c;

    return null;
}

/** URL del listado: equivalente a @Url.Action("Index", controllerName). */
function obtenerRutaPorCodigoModulo(codRaw) {
    const ctrl = controllerIndexDesdeCodigoModulo(codRaw);
    return ctrl ? ("/" + ctrl) : null;
}

/** Iconos por controller (mismos módulos que Home / NavBar). */
const ICONO_POR_CONTROLLER = {
    OrdenesCorte: "fa-cut",
    Talleres: "fa-industry",
    Inventario: "fa-database",
    Compras: "fa-shopping-bag",
    Productos: "fa-cubes",
    Insumos: "fa-cog",
    Clientes: "fa-users",
    Proveedores: "fa-truck",
    Personal: "fa-id-badge",
    CuentasCorrientes: "fa-balance-scale",
    CuentasCorrientesProveedores: "fa-book",
    CuentasCorrientesTalleres: "fa-bar-chart",
    Ventas: "fa-shopping-cart",
    Cajas: "fa-money",
    Gastos: "fa-line-chart",
    PersonalSueldos: "fa-credit-card",
    Usuarios: "fa-user",
    /* Catálogos / configuración (mismos que Extras en NavBar) */
    ListasPrecios: "fa-tags",
    Roles: "fa-shield",
    Sucursales: "fa-building",
    Cuentas: "fa-bank",
    Bancos: "fa-university",
    Colores: "fa-paint-brush",
    PersonalPuestos: "fa-briefcase",
    GastosCategorias: "fa-folder-open",
    ProductosCategoria: "fa-sitemap",
    InsumosCategoria: "fa-leaf",
    ProductosCategoriasTalle: "fa-text-height",
    OrdenesCorteEstados: "fa-flag",
    OrdenesCorteEtapasEstados: "fa-tasks",
    Configuraciones: "fa-cogs"
};

function controllerParaUi(codRaw) {
    return controllerIndexDesdeCodigoModulo(codRaw) || (codRaw || "").trim();
}

function iconoPorCodigoModulo(codigo) {
    const ctrl = controllerParaUi(codigo);
    if (!ctrl) return "fa-cube";
    if (ICONO_POR_CONTROLLER[ctrl]) return ICONO_POR_CONTROLLER[ctrl];
    const found = Object.keys(ICONO_POR_CONTROLLER).find(
        k => k.toLowerCase() === ctrl.toLowerCase()
    );
    return found ? ICONO_POR_CONTROLLER[found] : "fa-cube";
}

/* =========================
   DASHBOARD
========================= */

/**
 * Ver en dashboard: probamos CodigoModulo y Nombre (Modulo) para Ver.
 * Así un módulo con código raro pero nombre estándar (p. ej. maestro Talleres) no queda fuera.
 */
function moduloPuedeVerDashboard(m) {
    const cod = (m.CodigoModulo || "").trim();
    const nom = (m.Modulo || "").trim();
    if (cod && Permisos.tiene(cod, "Ver")) return true;
    if (nom && Permisos.tiene(nom, "Ver")) return true;
    return false;
}

/** Un solo tile "Configuraciones" (modal maestro); hub o cualquier catálogo Extras con Ver. */
function puedeVerAlgunaConfiguracionMaestroDashboard() {
    if (Permisos.tiene("Configuraciones", "Ver")) return true;
    for (const ctrl of CONTROLLERS_CATALOGO_EXTRAS) {
        if (Permisos.tiene(ctrl, "Ver")) return true;
    }
    return false;
}

/** Ruta del tile: misma resolución que controller (incluye maestro Talleres con Codigo duplicado OC). */
function urlDashboardDesdeModulo(m) {
    const ctrl = controllerIndexDesdeModuloSesion(m);
    return ctrl ? ("/" + ctrl) : null;
}

function renderDashboard() {

    Permisos.init();

    const cont = document.getElementById("dashboardModulos");
    cont.innerHTML = "";

    const user = JSON.parse(localStorage.getItem("userSession"));

    if (!user) {
        window.location.href = "/Login";
        return;
    }

    if (!user.Permisos || !user.Permisos.length) {
        renderSinPermisos(cont);
        return;
    }

    /** CodigoModulo + Permisos.tiene (igual que NavBar/Home). Rutas: mapa o /{CodigoModulo}. */
    const vistos = new Set();
    const modulos = [];

    for (const m of user.Permisos) {
        const cod = (m.CodigoModulo || "").trim();
        const nom = (m.Modulo || "").trim();
        if (!cod && !nom) continue;

        const idMod = m.IdModulo;
        const clave = idMod != null && idMod !== "" && !Number.isNaN(Number(idMod))
            ? `id:${Number(idMod)}`
            : claveCodigoModulo(cod || nom);
        if (vistos.has(clave)) continue;

        const puedeVer = moduloPuedeVerDashboard(m);
        if (!puedeVer) continue;

        if (esModuloHubConfiguraciones(m)) continue;

        const ctrlSkip = controllerIndexDesdeModuloSesion(m);
        if (ctrlSkip && CONTROLLERS_CATALOGO_EXTRAS.has(ctrlSkip)) continue;

        const url = urlDashboardDesdeModulo(m);
        if (!url) continue;

        vistos.add(clave);
        modulos.push(m);
    }

    if (puedeVerAlgunaConfiguracionMaestroDashboard()) {
        const claveM = "dash:maestroConfig";
        if (!vistos.has(claveM)) {
            vistos.add(claveM);
            modulos.push({
                CodigoModulo: "Configuraciones",
                Modulo: "Configuraciones",
                OrdenModulo: 50,
                Grupo: "Extras",
                _dashAbrirConfig: true
            });
        }
    }

    if (modulos.length === 0) {
        renderSinPermisos(cont);
        return;
    }

    // Agrupar
    const grupos = {};

    modulos.forEach(m => {

        const grupo = grupoDashboardDesdeModulo(m);

        if (!grupos[grupo]) {
            grupos[grupo] = [];
        }

        grupos[grupo].push(m);
    });

    aplicarReglasDashboardExtras(grupos);
    aplicarGrupoProduccionDashboard(grupos);

    const getMinOrden = (mods) =>
        Math.min(...mods.map(m => m.OrdenModulo ?? 999));

    cont.innerHTML = `<div class="dash-grid-pro"></div>`;
    const grid = cont.querySelector(".dash-grid-pro");

    Object.keys(grupos)
        .sort((a, b) => getMinOrden(grupos[a]) - getMinOrden(grupos[b]))
        .forEach(grupo => {

            const mods = grupos[grupo]
                .sort((a, b) => (a.OrdenModulo ?? 999) - (b.OrdenModulo ?? 999));

            grid.innerHTML += `
                <div class="dash-box">

                    <div class="dash-box-header">
                        ${grupo}
                    </div>

                    <div class="dash-box-content">

                        ${mods.map(m => {

                const cod = (m.CodigoModulo || "").trim();
                const nom = (m.Modulo || "").trim();
                const esTileConfigMaestro = m._dashAbrirConfig === true;
                const url = esTileConfigMaestro ? "" : (urlDashboardDesdeModulo(m) || "");
                const nombre = nom || cod;
                const ctrlUi = controllerIndexDesdeModuloSesion(m) || cod || nom;
                const clickCfg = "if(typeof window.abrirConfiguraciones==='function')window.abrirConfiguraciones();";

                return `
                                <div class="dash-tile" onclick="${esTileConfigMaestro ? clickCfg : `goTo('${url.replace(/'/g, "\\'")}')`}">

                                    <div class="dash-tile-icon">
                                        <i class="fa ${iconoPorCodigoModulo(ctrlUi)}"></i>
                                    </div>

                                    <div class="dash-tile-text">
                                        ${nombre}
                                    </div>

                                </div>
                            `;
            }).join("")}

                    </div>

                </div>
            `;
        });
}
function renderSinPermisos(cont) {

    cont.innerHTML = `
        <div class="dash-empty-pro">

            <div class="dash-empty-card">

                <div class="dash-empty-icon-pro">
                    <i class="fa fa-lock"></i>
                </div>

                <div class="dash-empty-title-pro">
                    Acceso restringido
                </div>

                <div class="dash-empty-text-pro">
                    No tenés permisos para acceder a ningún módulo.<br>
                    Si creés que esto es un error, hablá con un administrador.
                </div>

                <button class="dash-empty-btn" onclick="location.reload()">
                    Reintentar
                </button>

            </div>

        </div>
    `;
}

/* =========================
   NAV
========================= */

function goTo(url) {
    window.location.href = url;
}
