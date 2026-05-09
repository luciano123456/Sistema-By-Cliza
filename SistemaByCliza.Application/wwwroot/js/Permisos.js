/** Global explícito (var) para que exista window.Permisos; el patrón es Permisos.init() + aplicarUI como en el otro sistema. */
var Permisos = (() => {

    let user = null;
    let permisos = [];

    function init() {
        try {
            user = JSON.parse(localStorage.getItem("userSession"));
            permisos = user?.Permisos || [];
        } catch {
            permisos = [];
        }
        const rid = Number(user?.IdRol ?? user?.idRol ?? 0);
        document.documentElement.dataset.rolFinanzasVisible = rid === 1 ? "1" : "0";
    }

    /** KPIs / totales sensibles: solo rol administrador IdRol = 1 (alineado con backend). */
    function esRolAdministrador() {
        init();
        return document.documentElement.dataset.rolFinanzasVisible === "1";
    }

    /** Misma lógica que NavBar/Dashboard: ignora mayúsculas, espacios y signos al comparar código o nombre de módulo. */
    function claveModuloSesion(s) {
        return (s || "")
            .toString()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "")
            .replace(/[^\w]/g, "");
    }

    /** Código canónico de pantalla → variantes en Usuarios_Modulos.Codigo (BD). Sincronizar con NavBarLogin.js */
    const SINONIMOS_MENU_CODIGO_BD = {
        cuentascorrientes: ["ccclientes"],
        cuentascorrientesproveedores: ["ccproveedores"],
        cuentascorrientestalleres: ["cctalleres"],
        personal: ["empleados"],
        personalsueldos: ["sueldos"],
        ordenescorte: ["ordenesdecorte", "ordenesdecortes"],
        /** Maestro /Talleres. CC Talleres usa claves cuentascorrientestalleres / cctalleres (otro módulo). */
        talleres: ["taller"]
    };

    /**
     * Claves normalizadas (claveModuloSesion) de los catálogos del menú Extras / dashboard.
     * Si el rol solo tiene el módulo hub "Configuraciones", estos permisos se toman de esa fila.
     * Sincronizar con NavBarLogin.js (CATALOGOS_EXTRAS_CLAVE_MENU).
     */
    const CATALOGOS_EXTRAS_CLAVE_SESION = new Set([
        "listasprecios", "roles", "sucursales", "cuentas", "bancos", "colores",
        "personalpuestos", "gastoscategorias", "productoscategoria", "insumoscategoria",
        "productoscategoriastalle", "ordenescorteestados", "ordenescortetapasestados"
    ]);

    function hubConfiguracionesTienePermiso(permWantUpper) {
        return permisos.some(x => {
            const c = claveModuloSesion(x.CodigoModulo || "");
            const n = claveModuloSesion(x.Modulo || "");
            if (c !== "configuraciones" && n !== "configuraciones") return false;
            return (x.Permisos || []).some(p =>
                (p.Codigo || "").toString().trim().toUpperCase() === permWantUpper && p.Activo === true
            );
        });
    }

    function clavesCompatibles(norm) {
        const set = new Set([norm]);
        for (const [k, alts] of Object.entries(SINONIMOS_MENU_CODIGO_BD)) {
            const altsN = alts.map(claveModuloSesion);
            if (norm === k || altsN.some(a => a === norm)) {
                set.add(k);
                altsN.forEach(a => set.add(a));
            }
        }
        return set;
    }

    /** Misma regla que NavBar: fila maestro Talleres con Codigo duplicado "Ordenes de Corte". */
    function esMaestroTalleresCodigoDuplicadoOcSesion(x) {
        const c = claveModuloSesion(x.CodigoModulo || "");
        const n = claveModuloSesion(x.Modulo || "");
        if (c === "cctalleres" || c === "cuentascorrientestalleres") return false;
        return n === "talleres" && (c === "ordenesdecorte" || c === "ordenescorte");
    }

    /** Pantalla / módulo "OrdenesCorte" (clave normalizada). */
    function esContextoOrdenesCorteSesion(mod, keys) {
        return mod === "ordenescorte" || mod === "ordenesdecorte" || mod === "ordenescortes" || keys.has("ordenescorte");
    }

    function esClaveNombreModuloOcSesion(clave) {
        return clave === "ordenesdecorte" || clave === "ordenescorte" || clave === "ordenescortes";
    }

    /**
     * Fila real de Órdenes de corte en la sesión: excluye el maestro Talleres con Codigo duplicado OC
     * y coincide por CodigoModulo o por nombre de módulo (Órdenes de corte, etc.).
     */
    function filaOrdenesCorteRealSesion(lista) {
        if (!lista || !lista.length) return null;
        const hit = lista.find(x => {
            if (esMaestroTalleresCodigoDuplicadoOcSesion(x)) return false;
            const c = claveModuloSesion(x.CodigoModulo || "");
            const n = claveModuloSesion(x.Modulo || "");
            const codigoEsOc = c && esClaveNombreModuloOcSesion(c);
            const nombreEsOc = n && esClaveNombreModuloOcSesion(n);
            return codigoEsOc || nombreEsOc;
        });
        return hit || null;
    }

    function getModulo(modulo) {

        const mod = claveModuloSesion(modulo);
        if (!mod) return null;

        const keys = clavesCompatibles(mod);
        const soloOc = esContextoOrdenesCorteSesion(mod, keys);

        const conCodigo = permisos.filter(x => {
            const c = claveModuloSesion(x.CodigoModulo);
            return c && keys.has(c);
        });
        if (conCodigo.length === 1) {
            const only = conCodigo[0];
            /** Solo matchea la fila duplicada (Talleres + código OC): buscar la fila OC real en toda la sesión. */
            if (soloOc && esMaestroTalleresCodigoDuplicadoOcSesion(only)) {
                const real = filaOrdenesCorteRealSesion(permisos);
                if (real) return real;
            }
            return only;
        }
        if (conCodigo.length > 1) {
            if (soloOc) {
                const sinDup = conCodigo.filter(x => !esMaestroTalleresCodigoDuplicadoOcSesion(x));
                if (sinDup.length >= 1) {
                    return filaOrdenesCorteRealSesion(sinDup) || sinDup[0];
                }
                const real = filaOrdenesCorteRealSesion(permisos);
                if (real) return real;
            }
            return conCodigo[0];
        }

        const conNombre = permisos.filter(x => {
            const n = claveModuloSesion(x.Modulo);
            return n && keys.has(n);
        });
        if (conNombre.length === 1) return conNombre[0];
        /** Dos filas "Talleres" (maestro Codigo=Ordenes de Corte vs CC Talleres): priorizar maestro Producción. */
        if (conNombre.length > 1 && mod === "talleres") {
            const esCc = (c) => c === "cctalleres" || c === "cuentascorrientestalleres";
            const maestroBd = conNombre.find(x => {
                const c = claveModuloSesion(x.CodigoModulo || "");
                const n = claveModuloSesion(x.Modulo || "");
                if (esCc(c)) return false;
                return n === "talleres" && (c === "ordenesdecorte" || c === "ordenescorte" || c === "talleres" || c === "taller");
            });
            if (maestroBd) return maestroBd;
        }
        if (conNombre.length > 1) return conNombre[0];
        return null;
    }

    /**
     * Códigos en BD (VER, CREAR, …) + alias como en otros clientes:
     * tiene("Ventas", "Crear"), ("Ventas", "Visualizar"), ("Ventas", "VER").
     */
    function normalizarAccion(accion) {
        const s = (accion ?? "").toString().trim().toLowerCase();
        if (!s) return "";
        const alias = {
            ver: "VER",
            visualizar: "VER",
            listar: "VER",
            crear: "CREAR",
            alta: "CREAR",
            editar: "EDITAR",
            modificar: "EDITAR",
            eliminar: "ELIMINAR",
            borrar: "ELIMINAR",
            exportar: "EXPORTAR"
        };
        if (alias[s]) return alias[s];
        return s.toUpperCase();
    }

    function tiene(modulo, accion) {
        init();

        const want = normalizarAccion(accion);
        const m = getModulo(modulo);
        if (m) {
            const perms = m.Permisos;
            if (!Array.isArray(perms) || perms.length === 0) return false;
            const permiso = perms.find(p =>
                (p.Codigo || "").toString().trim().toUpperCase() === want
            );
            return !!permiso?.Activo;
        }

        const modNorm = claveModuloSesion(modulo);
        if (modNorm && CATALOGOS_EXTRAS_CLAVE_SESION.has(modNorm) && hubConfiguracionesTienePermiso(want)) {
            return true;
        }

        return false;
    }

    function selectorPermiso(modulo, perm) {

        return $(`[data-permiso="${perm}"]`).filter(function () {
            const modEl = ($(this).attr("data-modulo") || "").toLowerCase();
            return modEl === (modulo || "").toLowerCase();
        });
    }

    /**
     * Pantalla de bloqueo (estilos .no-access-* en site.css).
     * @param {string} mensaje
     * @param {boolean} [irInicio] true = botón va a / ; false = history.back()
     */
    function mostrarPantallaSinAcceso(mensaje, irInicio) {
        const safe = String(mensaje || "No tenés permisos para visualizar esta pantalla.")
            .replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const btnOnclick = irInicio ? "window.location.href='/'" : "window.history.back()";
        const btnLabel = irInicio ? "← Inicio" : "← Volver";
        document.body.innerHTML = `
            <div class="no-access-wrapper">
                <div class="no-access-card">
                    <div class="no-access-icon"><i class="fa fa-lock"></i></div>
                    <div class="no-access-title">Acceso restringido</div>
                    <div class="no-access-text">${safe}</div>
                    <button type="button" class="no-access-btn" onclick="${btnOnclick}">${btnLabel}</button>
                </div>
            </div>`;
    }

    function aplicarUI(modulo) {

        init();

        if (!tiene(modulo, "Ver")) {
            mostrarPantallaSinAcceso("No tenés permisos para visualizar esta pantalla.", false);
            return;
        }

        if (!tiene(modulo, "Crear")) {
            selectorPermiso(modulo, "crear").remove();
        }

        if (!tiene(modulo, "Editar")) {
            selectorPermiso(modulo, "editar").remove();
        }

        if (!tiene(modulo, "Eliminar")) {
            selectorPermiso(modulo, "eliminar").remove();
        }

        if (!tiene(modulo, "Exportar")) {
            selectorPermiso(modulo, "exportar").remove();
        }
    }

    /**
     * Pantallas NuevoModif: siempre VER; alta sin id requiere CREAR; edición con id requiere EDITAR,
     * salvo `permitirConsultaSinEditar` (solo lectura con VER, p. ej. Ordenes de Corte).
     * @param {string} modulo
     * @param {{ permitirConsultaSinEditar?: boolean }} [opciones]
     */
    function aplicarUINuevoModif(modulo, opciones) {
        init();
        opciones = opciones || {};

        const qsId = new URLSearchParams(window.location.search).get("id");
        const hid = document.getElementById("txtId");
        let idNum = 0;
        if (qsId != null && qsId !== "") {
            idNum = parseInt(qsId, 10) || 0;
        } else if (hid && hid.value) {
            idNum = parseInt(hid.value, 10) || 0;
        }

        const esEdicion = idNum > 0;

        function bloquear(mensaje) {
            mostrarPantallaSinAcceso(mensaje, true);
        }

        document.documentElement.dataset.nmSoloConsulta = "0";

        if (!tiene(modulo, "Ver")) {
            bloquear("No tenés permisos para visualizar esta pantalla.");
            return;
        }
        if (!esEdicion && !tiene(modulo, "Crear")) {
            bloquear("No tenés permisos para crear registros en esta pantalla.");
            return;
        }
        if (esEdicion && !tiene(modulo, "Editar")) {
            if (opciones.permitirConsultaSinEditar === true) {
                document.documentElement.dataset.nmSoloConsulta = "1";
            } else {
                bloquear("No tenés permisos para editar registros en esta pantalla.");
                return;
            }
        }

        if (!tiene(modulo, "Exportar")) {
            selectorPermiso(modulo, "exportar").remove();
        }
    }

    /** Uso en DataTables / lógica: init + tiene en una sola lectura */
    function puede(modulo, accion) {
        init();
        return tiene(modulo, accion);
    }

    return {
        init,
        tiene,
        puede,
        esRolAdministrador,
        aplicarUI,
        aplicarUINuevoModif
    };

})();