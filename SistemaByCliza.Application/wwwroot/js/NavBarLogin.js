/* =========================================================
   NAVBAR LOGIN - COMPLETO
   - Menú dinámico por permisos
   - Extras → Configuraciones: modal maestro y listas internas (permisos por catálogo o hub)
   - Reutiliza abrirConfiguracion / editar / eliminar / guardar
========================================================= */

(function (window, document, $) {
    "use strict";

    /* =========================================================
       ESTADO GLOBAL CONFIGURACIONES
    ========================================================= */
    let nombreConfiguracion = "";
    let controllerConfiguracion = "";
    let comboNombre = null;
    let comboController = null;
    let lblComboNombre = "";
    let listaVacia = false;

  
    let vieneDeModalConfiguraciones = false;
    window.esModoAtajo = false;


    /* =========================================================
       INIT
    ========================================================= */
    document.addEventListener("DOMContentLoaded", function () {
        inicializarNavbarLogin();
    });

    function inicializarNavbarLogin() {

    const userSession = JSON.parse(localStorage.getItem("userSession"));
    if (!userSession) return;

    const nombreCompleto = `${userSession.Nombre || ""} ${userSession.Apellido || ""}`.trim();

    const userNameEl = document.getElementById("userName");
    if (userNameEl) {
        userNameEl.innerHTML = `<i class="fa fa-user"></i> ${nombreCompleto || "Usuario"}`;
    }

    // 🔥 SIN ROL
    const menuFiltrado = buildMenuPorPermisos();

    renderMenu(menuFiltrado);
    marcarActivoSegunRuta();
}

function buildMenuPorPermisos() {

    const user = JSON.parse(localStorage.getItem("userSession"));
    const permisos = user?.Permisos || [];

    function normalizar(txt) {
        return (txt || "")
            .toString()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "")
            .replace(/[^\w]/g, "");
    }

    /** Clave de menú/código canónico → variantes reales en Usuarios_Modulos.Codigo (normalizadas). */
    const SINONIMOS_MENU_CODIGO_BD = {
        cuentascorrientes: ["ccclientes"],
        cuentascorrientesproveedores: ["ccproveedores"],
        cuentascorrientestalleres: ["cctalleres"],
        personal: ["empleados"],
        personalsueldos: ["sueldos"],
        /** BD a veces guarda nombre con espacios: "Ordenes de Corte" → ordenesdecorte */
        ordenescorte: ["ordenesdecorte", "ordenesdecortes"],
        /** Maestro /Talleres: solo código canónico + singular. CC va por cuentascorrientestalleres / cctalleres (otra entrada del menú). */
        talleres: ["taller"]
    };

    function clavesCompatibles(norm) {
        const set = new Set([norm]);
        for (const [k, alts] of Object.entries(SINONIMOS_MENU_CODIGO_BD)) {
            const altsN = alts.map(normalizar);
            if (norm === k || altsN.some(a => a === norm)) {
                set.add(k);
                altsN.forEach(a => set.add(a));
            }
        }
        return set;
    }

    function contarFilasConNombreNorm(nNorm) {
        if (!nNorm) return 0;
        return permisos.filter(m => normalizar(m.Modulo) === nNorm).length;
    }

    /**
     * Misma lista que Permisos.js (CATALOGOS_EXTRAS_CLAVE_SESION): catálogos del submenú Extras.
     * El hub "Configuraciones" en rol puede otorgar VER (y demás) si no hay fila propia del catálogo.
     */
    const CATALOGOS_EXTRAS_CLAVE_MENU = new Set([
        "listasprecios", "roles", "sucursales", "cuentas", "bancos", "colores",
        "personalpuestos", "gastoscategorias", "productoscategoria", "insumoscategoria",
        "productoscategoriastalle", "ordenescorteestados", "ordenescortetapasestados"
    ]);

    /**
     * CC Talleres (CuentasCorrientesTalleres). Se discrimina por CodigoModulo en sesión
     * (p. ej. "CC Talleres", "CuentasCorrientesTalleres") — no confundir con maestro "Talleres".
     */
    function esModuloCcTalleres(mod) {
        const c = normalizar(mod.CodigoModulo || "");
        if (!c) return false;
        if (c === "cctalleres" || c === "cuentascorrientestalleres") return true;
        return false;
    }

    /**
     * usuarios_modulos: maestro Talleres (IdGrupo Producción) con Codigo = "Ordenes de Corte" (duplicado del módulo OC).
     * CC Talleres usa Codigo "CC Talleres".
     */
    function esMaestroTalleresCodigoDuplicadoOrdenesCorte(mod) {
        if (esModuloCcTalleres(mod)) return false;
        const n = normalizar(mod.Modulo || "");
        const c = normalizar(mod.CodigoModulo || "");
        return n === "talleres" && (c === "ordenesdecorte" || c === "ordenescorte");
    }

    /** Permisos de OC no deben tomarse de la fila Talleres que reutiliza el mismo CodigoModulo. */
    function esSolicitudSoloOrdenesCorte(codigoModuloNorm) {
        const x = codigoModuloNorm || "";
        return x === "ordenescorte" || x === "ordenesdecorte" || x === "ordenescortes";
    }

    /** Maestro /Talleres: Codigo "Talleres"/"Taller" o fila BD con Codigo duplicado OC. */
    function moduloTieneMaestroTalleresPorSesion(codigoPerm) {
        const permNorm = (codigoPerm || "VER").toString().trim().toUpperCase();
        return permisos.some(mod => {
            if (esModuloCcTalleres(mod)) return false;
            const c = normalizar(mod.CodigoModulo || "");
            const n = normalizar(mod.Modulo || "");
            const okCod = c === "talleres" || c === "taller";
            const okBdDuplicado = esMaestroTalleresCodigoDuplicadoOrdenesCorte(mod);
            if (!okCod && !okBdDuplicado) return false;
            return (mod.Permisos || []).some(p =>
                (p.Codigo || "").toString().trim().toUpperCase() === permNorm && p.Activo === true
            );
        });
    }

    function moduloTiene(codigoModuloNorm, codigoPerm) {
        if (!codigoModuloNorm) return false;
        const keys = clavesCompatibles(codigoModuloNorm);
        const permNorm = (codigoPerm || "VER").toString().trim().toUpperCase();
        const directo = permisos.some(mod => {
            if (esMaestroTalleresCodigoDuplicadoOrdenesCorte(mod) && esSolicitudSoloOrdenesCorte(codigoModuloNorm)) {
                return false;
            }
            const c = normalizar(mod.CodigoModulo);
            const n = normalizar(mod.Modulo);
            const matchCod = c && keys.has(c);
            const matchNom = n && keys.has(n);
            if (!matchCod && !matchNom) return false;
            if (matchNom && !matchCod && contarFilasConNombreNorm(n) > 1) {
                const excepcionTalleresMaestro =
                    codigoModuloNorm === "talleres" && esMaestroTalleresCodigoDuplicadoOrdenesCorte(mod);
                if (!excepcionTalleresMaestro) return false;
            }
            return (mod.Permisos || []).some(p =>
                (p.Codigo || "").toString().trim().toUpperCase() === permNorm && p.Activo === true
            );
        });
        if (directo) return true;
        if (CATALOGOS_EXTRAS_CLAVE_MENU.has(codigoModuloNorm) && window.Permisos && typeof Permisos.tiene === "function") {
            try {
                Permisos.init();
                if (Permisos.tiene(codigoModuloNorm, permNorm)) return true;
            } catch (e) { /* noop */ }
        }
        return false;
    }

    /** Primer segmento de ruta (ej. /Personal/Sueldos → personal), sin ambigüedad tipo personal ⊂ personalsueldos */
    function primerSegmentoPath(url) {
        const path = String(url || "").split("?")[0].split("#")[0];
        const seg = path.split("/").filter(p => p.length > 0)[0] || "";
        return normalizar(seg);
    }

    function itemPermitido(item) {
        if (item.type === "action") {
            const lista = listaCodigosMenuItem(item.moduloCodigo);
            if (lista == null) return true;
            const reqA = item.requiredPerm || "VER";
            return lista.some(code => moduloTiene(normalizar(code), reqA));
        }
        if (item.type !== "link") return true;

        const req = item.requiredPerm || "VER";

        const listaMc = listaCodigosMenuItem(item.moduloCodigo);
        if (listaMc && listaMc.some(code => moduloTiene(normalizar(code), req))) {
            return true;
        }

        const pathOnly = String(item.url || "").split("?")[0].split("#")[0];
        if (listaMc && /^\/Talleres(\/|$)/i.test(pathOnly) && moduloTieneMaestroTalleresPorSesion(req)) {
            return true;
        }

        const pathKey = primerSegmentoPath(item.url);
        const keysPath = clavesCompatibles(pathKey);

        const reqNorm = (req || "VER").toString().trim().toUpperCase();
        return permisos.some(mod => {
            if (esMaestroTalleresCodigoDuplicadoOrdenesCorte(mod) && (pathKey === "ordenescorte" || pathKey === "ordenesdecorte" || pathKey === "ordenescortes")) {
                return false;
            }
            const codigo = normalizar(mod.CodigoModulo);
            const nombre = normalizar(mod.Modulo);
            const hitCod = codigo && keysPath.has(codigo);
            const hitNom = nombre && keysPath.has(nombre);
            if (!hitCod && !hitNom) return false;
            if (hitNom && !hitCod && contarFilasConNombreNorm(nombre) > 1) {
                const exTall = pathKey === "talleres" && esMaestroTalleresCodigoDuplicadoOrdenesCorte(mod);
                if (!exTall) return false;
            }
            return (mod.Permisos || []).some(p =>
                (p.Codigo || "").toString().trim().toUpperCase() === reqNorm && p.Activo === true
            );
        });
    }

    return MENU_CATALOG.map(section => {

        const itemsFiltrados = section.items.filter(item => itemPermitido(item));

        return {
            ...section,
            items: itemsFiltrados
        };

    }).filter(section => section.items.length > 0);
}

    function listaCodigosMenuItem(raw) {
        if (raw == null || raw === "") return null;
        const arr = Array.isArray(raw) ? raw : [raw];
        const filtrados = arr.map(x => String(x).trim()).filter(Boolean);
        return filtrados.length ? filtrados : null;
    }

    /* =========================================================
       HELPERS
    ========================================================= */
    function normalizarRol(valor) {
        return String(valor || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim()
            .toLowerCase();
    }

    function esAdministracion(UsuariosRol) {
        return UsuariosRol === "Administracion";
    }

    /** requiredPerm: VER = listado; CREAR = altas NuevoModif. moduloCodigo: string | string[] (Codigo y/o sinónimos en UsuariosModulos). */
    function makeLinkItem(text, url, requiredPerm, moduloCodigo) {
        const lista = listaCodigosMenuItem(moduloCodigo);
        return {
            type: "link",
            text,
            url,
            requiredPerm: requiredPerm || "VER",
            moduloCodigo: lista
        };
    }

    /** moduloCodigo: mismo Codigo que en UsuariosModulos (ej. ListasPrecios). null = siempre visible. */
    function makeActionItem(text, action, moduloCodigo) {
        return {
            type: "action",
            text,
            action,
            moduloCodigo: moduloCodigo != null ? moduloCodigo : null,
            requiredPerm: "VER"
        };
    }

    function cerrarDropdownsBootstrap() {
        document.querySelectorAll(".dropdown-menu.show").forEach(menu => {
            menu.classList.remove("show");
        });

        document.querySelectorAll('[data-bs-toggle="dropdown"][aria-expanded="true"]').forEach(toggle => {
            toggle.setAttribute("aria-expanded", "false");
        });
    }

    /* =========================================================
       CATÁLOGO REAL DEL SISTEMA
       Cada item.url es la misma ruta que @Url.Action("Index","<Controller>") en Views/Home/Index.cshtml
       (un segmento: /Talleres, /CuentasCorrientesTalleres, …).
    ========================================================= */
    const MENU_CATALOG = [

        // =========================================
        // 🏭 PRODUCCIÓN
        // =========================================
        {
            id: "produccion",
            title: "Producción",
            icon: "fa-industry",
            roles: ["Administracion", "produccion"],
            items: [
                makeLinkItem("Órdenes de Corte", "/OrdenesCorte", "VER", ["OrdenesCorte", "Ordenes de Corte"]),
                makeLinkItem("➕ Nueva Orden de Corte", "/OrdenesCorte/NuevoModif", "CREAR", ["OrdenesCorte", "Ordenes de Corte"]),
                makeLinkItem("Talleres", "/Talleres", "VER", ["Talleres", "Taller"])
            ]
        },

        // =========================================
        // 📦 INVENTARIO (OPERATIVO)
        // =========================================
        {
            id: "inventario",
            title: "Inventario",
            icon: "fa-boxes",
            roles: ["Administracion"],
            items: [
                makeLinkItem("Historial", "/Inventario", "VER", "Inventario"),
                makeLinkItem("Compras", "/Compras", "VER", "Compras"),
                makeLinkItem("➕ Nueva compra", "/Compras/NuevoModif", "CREAR", "Compras")
            ]
        },

        // =========================================
        // 📋 LISTAS (MAESTROS)
        // =========================================
        {
            id: "listas",
            title: "Listas",
            icon: "fa-list",
            roles: ["Administracion"],
            items: [
                makeLinkItem("Productos", "/Productos", "VER", "Productos"),
                makeLinkItem("Insumos", "/Insumos", "VER", "Insumos"),
                makeLinkItem("Clientes", "/Clientes", "VER", "Clientes"),
                makeLinkItem("Proveedores", "/Proveedores", "VER", "Proveedores"),
                
            ]
        },

        // =========================================
        // 💰 VENTAS
        // =========================================
        {
            id: "ventas",
            title: "Ventas",
            icon: "fa-shopping-cart",
            roles: ["Administracion", "ventas"],
            items: [
                makeLinkItem("Historial", "/Ventas", "VER", "Ventas"),
                makeLinkItem("➕ Nueva Venta", "/Ventas/NuevoModif", "CREAR", "Ventas"),
            ]
        },

        // =========================================
        // 💳 CUENTAS CORRIENTES (SEPARADO 🔥)
        // =========================================
        {
            id: "cuentas_corrientes",
            title: "Cuentas Corrientes",
            icon: "fa-wallet",
            roles: ["Administracion"],
            items: [
                makeLinkItem("Clientes", "/CuentasCorrientes", "VER", ["CuentasCorrientes", "CC Clientes"]),
                makeLinkItem("Proveedores", "/CuentasCorrientesProveedores", "VER", ["CuentasCorrientesProveedores", "CC Proveedores"]),
                makeLinkItem("Talleres", "/CuentasCorrientesTalleres", "VER", ["CuentasCorrientesTalleres", "CC Talleres"])
            ]
        },

        // =========================================
        // 💸 FINANZAS
        // =========================================
        {
            id: "finanzas",
            title: "Finanzas",
            icon: "fa-credit-card",
            roles: ["Administracion", "finanzas"],
            items: [
                makeLinkItem("Cajas", "/Cajas", "VER", "Cajas"),
                makeLinkItem("Gastos", "/Gastos", "VER", "Gastos")
            ]
        },

        // =========================================
        // 👤 PERSONAL (SEPARADO MÁS LIMPIO)
        // =========================================
        {
            id: "personal",
            title: "Personal",
            icon: "fa-users",
            roles: ["Administracion"],
            items: [
                makeLinkItem("Empleados", "/Personal", "VER", ["Personal", "Empleados"]),
                makeLinkItem("Sueldos", "/PersonalSueldos", "VER", ["PersonalSueldos", "Sueldos"]),
                makeLinkItem("➕ Nuevo Pago", "/PersonalSueldos/NuevoModif", "CREAR", ["PersonalSueldos", "Sueldos"]),
            ]
        },

        // =========================================
        // 🧩 EXTRAS (Configuraciones = modal maestro con listas internas; permiso hub o por catálogo)
        // =========================================
        {
            id: "extras",
            title: "Extras",
            icon: "fa-puzzle-piece",
            roles: ["Administracion"],
            items: [
                makeActionItem("Configuraciones", () => abrirConfiguraciones(), [
                    "Configuraciones",
                    "ListasPrecios", "Roles", "Sucursales", "Cuentas", "Bancos", "Colores",
                    "PersonalPuestos", "GastosCategorias", "ProductosCategoria", "InsumosCategoria",
                    "ProductosCategoriasTalle", "OrdenesCorteEstados", "OrdenesCorteEtapasEstados"
                ]),
                makeLinkItem("Usuarios", "/Usuarios", "VER", "Usuarios"),
                makeActionItem("Análisis de datos", () => {
                    if (typeof window.advertenciaModal === "function") {
                        advertenciaModal("Análisis de datos aún no disponible");
                    } else if (typeof window.errorModal === "function") {
                        errorModal("Análisis de datos aún no disponible");
                    }
                })
            ]
        }
    ];

    /* =========================================================
       FILTRO POR UsuariosRol
    ========================================================= */
   
    /* =========================================================
       RENDER MENU
    ========================================================= */
    function renderMenu(menu) {
        const container = document.getElementById("menuDinamico");
        if (!container) return;

        container.innerHTML = "";

        menu.forEach(section => {
            const li = document.createElement("li");
            li.className = "nav-item dropdown nav-section-dropdown";

            const a = document.createElement("a");
            a.className = "nav-link dropdown-toggle d-flex align-items-center gap-2";
            a.href = "#";
            a.setAttribute("data-bs-toggle", "dropdown");
            a.setAttribute("aria-expanded", "false");
            a.innerHTML = `
                <i class="fa ${section.icon}"></i>
                <span>${section.title}</span>
            `;

            const ul = document.createElement("ul");
            ul.className = "dropdown-menu";

            section.items.forEach(item => {
                const liItem = document.createElement("li");

                if (item.type === "link") {
                    const link = document.createElement("a");
                    link.className = "dropdown-item";
                    link.href = item.url;
                    link.textContent = item.text;
                    liItem.appendChild(link);
                }
                else if (item.type === "action") {
                    const btn = document.createElement("button");
                    btn.type = "button";
                    btn.className = "dropdown-item";
                    btn.textContent = item.text;
                    btn.addEventListener("click", function (e) {
                        e.preventDefault();
                        e.stopPropagation();

                        try {
                            item.action();
                        } finally {
                            cerrarDropdownsBootstrap();
                        }
                    });

                    liItem.appendChild(btn);
                }

                ul.appendChild(liItem);
            });

            li.appendChild(a);
            li.appendChild(ul);
            container.appendChild(li);
        });
    }

    function marcarActivoSegunRuta() {
        const actual = window.location.pathname.toLowerCase();

        let mejorMatch = null;
        let mejorLongitud = 0;

        document.querySelectorAll("#menuDinamico .dropdown-item[href]").forEach(a => {
            const href = (a.getAttribute("href") || "").toLowerCase();
            if (!href || href === "#") return;

            // match exacto o por prefijo
            if (actual === href || actual.startsWith(href + "/")) {
                if (href.length > mejorLongitud) {
                    mejorMatch = a;
                    mejorLongitud = href.length;
                }
            }
        });

        // limpiar todos
        document.querySelectorAll("#menuDinamico .dropdown-item").forEach(a => {
            a.classList.remove("active");
        });

        document.querySelectorAll("#menuDinamico .nav-link").forEach(a => {
            a.classList.remove("active");
        });

        // aplicar solo al mejor
        if (mejorMatch) {
            mejorMatch.classList.add("active");

            const parent = mejorMatch.closest(".nav-item.dropdown");
            parent?.querySelector(".nav-link")?.classList.add("active");
        }
    }

    /* =========================================================
       CONFIGURACIONES - COMPLETO
    ========================================================= */

    async function listaConfiguracion() {
        const url = `/${controllerConfiguracion}/Lista`;
        const response = await fetch(url, {
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) throw new Error('Error al cargar configuraciones');

        const data = await response.json();
        return data.map(configuracion => ({
            Id: configuracion.Id,
            Nombre: configuracion.Nombre,
            NombreCombo: configuracion.NombreCombo
        }));
    }
    async function abrirConfiguracion(
        _nombreConfiguracion,
        _controllerConfiguracion,
        _comboNombre = null,
        _comboController = null,
        _lblComboNombre,
        esAtajo = false,
        presetComboValue = null
    ) {
        try {

            nombreConfiguracion = _nombreConfiguracion;
            controllerConfiguracion = _controllerConfiguracion;
            comboNombre = _comboNombre;
            comboController = _comboController;
            lblComboNombre = _lblComboNombre;

            window.esModoAtajo = esAtajo; // 🔥 CLAVE

            const result = await llenarConfiguraciones();

            if (!result) {
                await errorModal("Ha ocurrido un error al cargar la lista");
                return;
            }

            //$('#ModalEdicionConfiguraciones').modal('hide');
            const modalCfgEl = document.getElementById("modalConfiguracion");
            if (typeof window.ponerModalConfiguracionAlFrente === "function") {
                window.ponerModalConfiguracionAlFrente();
            }
            const modal = new bootstrap.Modal(modalCfgEl);
            modal.show();
            if (typeof window.ponerModalConfiguracionAlFrente === "function") {
                requestAnimationFrame(() => window.ponerModalConfiguracionAlFrente());
            }
            cancelarModificarConfiguracion();

            $('#txtNombreConfiguracion').off('input').on('input', validarCamposConfiguracion);
            $('#cmbConfiguracion').off('change').on('change', validarCamposConfiguracion);
            $('#txtBuscarConfiguracion').off('input').on('input', filtrarConfiguraciones);

            // 🔥 MODO ATAJO
            if (esAtajo) {

                // ocultar eliminar
                document.querySelectorAll(".rp-icon-btn.danger").forEach(btn => {
                    btn.style.display = "none";
                });

                // abrir directamente en "nuevo"
                agregarConfiguracion();

                if (presetComboValue != null && String(presetComboValue) !== "" && comboNombre != null) {
                    const cmb = document.getElementById("cmbConfiguracion");
                    if (cmb) {
                        const raw = String(presetComboValue).trim();
                        let valorOpt = null;
                        if (cmb.querySelector(`option[value="${CSS.escape(raw)}"]`)) {
                            valorOpt = raw;
                        } else {
                            const n = Number(raw);
                            if (Number.isFinite(n)) {
                                for (let i = 0; i < cmb.options.length; i++) {
                                    const ov = cmb.options[i].value;
                                    if (ov === "") continue;
                                    if (Number(ov) === n) {
                                        valorOpt = ov;
                                        break;
                                    }
                                }
                            }
                        }
                        if (valorOpt != null) {
                            cmb.value = valorOpt;
                            if (typeof window.jQuery !== "undefined") {
                                window.jQuery(cmb).trigger("change");
                            } else {
                                cmb.dispatchEvent(new Event("change", { bubbles: true }));
                            }
                            validarCamposConfiguracion();
                        }
                    }
                }

            } else {

                // mostrar eliminar normal
                document.querySelectorAll(".rp-icon-btn.danger").forEach(btn => {
                    btn.style.display = "";
                });
            }

            document.getElementById("modalConfiguracionLabel").innerText =
                "Configuracion de " + nombreConfiguracion;

            const buscador = document.getElementById("txtBuscarConfiguracion");
            if (buscador) buscador.value = "";

        } catch (ex) {
            errorModal("Ha ocurrido un error al cargar la lista");
        }
    }
    async function editarConfiguracion(id) {
        fetch("/" + controllerConfiguracion + "/EditarInfo?id=" + id, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token // 👈 tu token aquí
            }
        })
            .then(response => {
                if (!response.ok) throw new Error("Ha ocurrido un error.");
                return response.json();
            })
            .then(dataJson => {
                if (dataJson !== null) {

                    document.getElementById("btnRegistrarModificarConfiguracion").textContent = "Modificar";
                    document.getElementById("agregarConfiguracion").setAttribute("hidden", "hidden");
                    document.getElementById("txtNombreConfiguracion").value = dataJson.Nombre;
                    document.getElementById("txtIdConfiguracion").value = dataJson.Id;

                    document.getElementById("contenedorNombreConfiguracion").removeAttribute("hidden");

                    if (comboNombre != null) {
                        document.getElementById("lblConfiguracionCombo").innerText = lblComboNombre;
                        document.getElementById("cmbConfiguracion").value = dataJson.IdCombo;
                    }

                    validarCamposConfiguracion();
                } else {
                    throw new Error("Ha ocurrido un error.");
                }
            })
            .catch(error => {
                errorModal("Ha ocurrido un error.");
            });
    }
    async function llenarConfiguraciones() {

        try {

            let ocultarEliminar = window.esModoAtajo || false;

            const buscador = document.getElementById("txtBuscarConfiguracion");
            if (buscador) {
                buscador.value = "";
            }

            let configuraciones = await listaConfiguracion();

            if (comboNombre != null) {
                await llenarComboConfiguracion();
                document.getElementById("divConfiguracionCombo").removeAttribute("hidden");
            } else {
                document.getElementById("divConfiguracionCombo").setAttribute("hidden", "hidden");
            }


            document.getElementById("lblListaVacia").innerText = "";
            document.getElementById("lblListaVacia").setAttribute("hidden", "hidden");

            $("#configuracion-list").empty();

            if (configuraciones.length == 0) {
                document.getElementById("lblListaVacia").innerText = `La lista de ${nombreConfiguracion} esta vacia.`;

                document.getElementById("lblListaVacia").style.color = 'red';
                document.getElementById("lblListaVacia").removeAttribute("hidden");
                listaVacia = true;

            } else {

                listaVacia = false;
                configuraciones.forEach((configuracion, index) => {

                    let nombreConfig = configuracion.Nombre;

                    if (configuracion.NombreCombo != null) {
                        nombreConfig += " - " + configuracion.NombreCombo;
                    }

                    var indexado = configuracion.Id
                    $("#configuracion-list").append(`
    <div class="rp-list-item" data-texto="${escapeHtml(nombreConfig).toLowerCase()}">
        <div class="rp-item-left">
            <div class="rp-item-icon">
                <i class="fa fa-tag"></i>
            </div>
            <div class="rp-item-text">${nombreConfig}</div>
        </div>

        <div class="rp-list-actions">
            <button class="rp-icon-btn"
                onclick="editarConfiguracion(${indexado})">
                <i class="fa fa-pencil"></i>
            </button>

          ${ocultarEliminar ? "" : `
<button class="rp-icon-btn danger"
    onclick="eliminarConfiguracion(${indexado})">
    <i class="fa fa-trash"></i>
</button>
`}
        </div>
    </div>
`);

                });


            }
            return true;
        } catch (ex) {
            return false;

        }
    }
    async function eliminarConfiguracion(id) {


        let resultado = await confirmarModal("¿Desea eliminar el/la" + nombreConfiguracion + "?");
        if (!resultado) return;

        if (resultado) {
            try {
                const response = await fetch("/" + controllerConfiguracion + "/Eliminar?id=" + id, {
                    method: "DELETE",
                    headers: {
                        'Authorization': 'Bearer ' + token,
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error("Error al eliminar " + nombreConfiguracion);
                }

                const dataJson = await response.json();

                if (dataJson.valor) {
                    llenarConfiguraciones()

                    if (dataJson.valor) {
                        await llenarConfiguraciones();

                        exitoModal(nombreConfiguracion + " eliminada correctamente");

                        document.dispatchEvent(new CustomEvent("configuracionActualizada", {
                            detail: {
                                tipo: controllerConfiguracion,
                                nuevoId: null,
                                accion: "eliminar"
                            }
                        }));
                    }
                }
            } catch (error) {
                console.error("Ha ocurrido un error:", error);
            }
        }
    }
    async function llenarComboConfiguracion() {
        const res = await fetch(`/${comboController}/Lista`, {
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            }
        });
        if (!res.ok) throw new Error('Error al cargar combo');

        const data = await res.json();
        llenarSelect("cmbConfiguracion", data);
    }
    function validarCamposConfiguracion() {
        const nombre = $("#txtNombreConfiguracion").val();
        const combo = $("#cmbConfiguracion").val();

        const camposValidos = nombre !== "";
        const selectValido = combo !== "";

        // estilos
        $("#lblNombreConfiguracion").css("color", camposValidos ? "" : "red");
        $("#txtNombreConfiguracion").css("border-color", camposValidos ? "" : "red");
        $("#cmbConfiguracion").css("border-color", selectValido ? "" : "red");

        // lógica de validación
        if (comboNombre != null) {
            return camposValidos && selectValido;
        } else {
            return camposValidos;
        }
    }
    function guardarCambiosConfiguracion() {
        if (validarCamposConfiguracion()) {
            const idConfiguracion = $("#txtIdConfiguracion").val();
            const idCombo = $("#cmbConfiguracion").val();
            const nuevoModelo = {
                "Id": idConfiguracion !== "" ? idConfiguracion : 0,
                "IdCombo": comboNombre !== "" ? idCombo : 0,
                "Nombre": $("#txtNombreConfiguracion").val(),
            };

            const url = idConfiguracion === "" ? "/" + controllerConfiguracion + "/Insertar" : "/" + controllerConfiguracion + "/Actualizar";
            const method = idConfiguracion === "" ? "POST" : "PUT";

            fetch(url, {
                method: method,
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(nuevoModelo)
            })
                .then(response => {
                    if (!response.ok) throw new Error(response.statusText);
                    return response.json();
                })
                .then(async dataJson => {

                    const esNuevo = idConfiguracion === "";

                    const mensaje = esNuevo
                        ? nombreConfiguracion + " registrado/a correctamente"
                        : nombreConfiguracion + " modificado/a correctamente";

                    cancelarModificarConfiguracion();

                    const ok = await llenarConfiguraciones();

                    if (!ok) {
                        errorModal("Error recargando la lista");
                        return;
                    }

                    exitoModal(mensaje);

                    const rawNuevoId = dataJson?.id ?? dataJson?.Id ?? dataJson?.ID;
                    const nuevoId = rawNuevoId != null && rawNuevoId !== ""
                        ? (Number.isFinite(Number(rawNuevoId)) && Number(rawNuevoId) > 0 ? Number(rawNuevoId) : null)
                        : null;

                    document.dispatchEvent(new CustomEvent("configuracionActualizada", {
                        detail: {
                            tipo: controllerConfiguracion,
                            nuevoId: nuevoId,
                            accion: esNuevo ? "insertar" : "actualizar",
                            esAtajo: !!window.esModoAtajo
                        }
                    }));


                    // 🔥🔥🔥 CLAVE
                    if (window.esModoAtajo) {
                        setTimeout(() => {
                            const modalEl = document.getElementById('modalConfiguracion');

                            let modal = bootstrap.Modal.getInstance(modalEl);

                            if (!modal) {
                                modal = new bootstrap.Modal(modalEl);
                            }

                            modal.hide();
                        }, 300);
                    }

                })
                .catch(error => {
                    console.error('Error:', error);
                });
        } else {
            errorModal('Debes completar los campos requeridos');
        }
    }
    function cancelarModificarConfiguracion() {
        document.getElementById("txtNombreConfiguracion").value = "";
        document.getElementById("txtIdConfiguracion").value = "";
        document.getElementById("contenedorNombreConfiguracion").setAttribute("hidden", "hidden");
        document.getElementById("agregarConfiguracion").removeAttribute("hidden");

        if (listaVacia == true) {
            document.getElementById("lblListaVacia").innerText = `La lista de ${nombreConfiguracion} esta vacia.`;
            document.getElementById("lblListaVacia").style.color = 'red';
            document.getElementById("lblListaVacia").removeAttribute("hidden");
        }
    }
    function agregarConfiguracion() {
        document.getElementById("txtNombreConfiguracion").value = "";
        document.getElementById("txtIdConfiguracion").value = "";
        document.getElementById("contenedorNombreConfiguracion").removeAttribute("hidden");
        document.getElementById("agregarConfiguracion").setAttribute("hidden", "hidden");
        document.getElementById("lblListaVacia").innerText = "";
        document.getElementById("lblListaVacia").setAttribute("hidden", "hidden");
        document.getElementById("btnRegistrarModificarConfiguracion").textContent = "Agregar";

        $('#lblNombreConfiguracion').css('color', 'red');
        $('#txtNombreConfiguracion').css('border-color', 'red');

        if (comboNombre != null) {
            document.getElementById("lblConfiguracionCombo").innerText = lblComboNombre;
            document.getElementById("cmbConfiguracion").value = "";
            $('#cmbConfiguracion').css('border-color', 'red');
        }
    }

    /** Definición del modal maestro (mismos argumentos que abrirConfiguracion). */
    function obtenerEntradasMaestroConfiguracion() {
        return [
            { label: "Listas de Precios", perm: "ListasPrecios", args: ["Lista de Precios", "ListasPrecios"] },
            { label: "Roles", perm: "Roles", args: ["UsuariosRol", "Roles"] },
            { label: "Sucursales", perm: "Sucursales", args: ["Sucursal", "Sucursales"] },
            { label: "Cuentas", perm: "Cuentas", args: ["Cuenta", "Cuentas"] },
            { label: "Bancos", perm: "Bancos", args: ["Banco", "Bancos"] },
            { label: "Colores", perm: "Colores", args: ["Color", "Colores"] },
            { label: "Personal Puestos", perm: "PersonalPuestos", args: ["Personal Puesto", "PersonalPuestos"] },
            { label: "Gastos Categorías", perm: "GastosCategorias", args: ["Gastos Categorias", "GastosCategorias"] },
            { label: "Productos Categorías", perm: "ProductosCategoria", args: ["Productos Categorias", "ProductosCategoria"] },
            { label: "Insumos Categorías", perm: "InsumosCategoria", args: ["Insumos Categorias", "InsumosCategoria"] },
            {
                label: "Productos Categorías Talles",
                perm: "ProductosCategoriasTalle",
                args: ["Productos Categorias Talles", "ProductosCategoriasTalle", "Productos Categoria", "ProductosCategoria", "Categoria"]
            },
            { label: "Estados Órdenes de Corte", perm: "OrdenesCorteEstados", args: ["Estados Ordenes de Corte", "OrdenesCorteEstados"] },
            {
                label: "Etapas Estados Órdenes de Corte",
                perm: "OrdenesCorteEtapasEstados",
                args: ["Etapas Estados Ordenes de Corte", "OrdenesCorteEtapasEstados"]
            }
        ];
    }

    function puedeVerEntradaMaestroConfig(perm) {
        if (!window.Permisos || typeof Permisos.tiene !== "function") return false;
        try {
            Permisos.init();
            return Permisos.tiene(perm, "Ver");
        } catch (e) {
            return false;
        }
    }

    function filtrarMaestroConfiguraciones() {
        const input = document.getElementById("txtBuscarMaestroConfig");
        const lista = document.getElementById("maestro-configuracion-list");
        const lblVacio = document.getElementById("lblMaestroConfigVacio");
        if (!input || !lista) return;
        const texto = String(input.value || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim()
            .toLowerCase();
        const items = lista.querySelectorAll(".rp-list-item");
        let visibles = 0;
        items.forEach(item => {
            const t = (item.getAttribute("data-texto") || "").toLowerCase();
            const ok = !texto || t.includes(texto);
            item.style.display = ok ? "" : "none";
            if (ok) visibles++;
        });
        if (!lblVacio) return;
        if (items.length > 0 && visibles === 0) {
            lblVacio.innerText = "No se encontraron resultados.";
            lblVacio.removeAttribute("hidden");
        } else {
            lblVacio.innerText = "";
            lblVacio.setAttribute("hidden", "hidden");
        }
    }

    function abrirConfiguraciones() {
        const Bs = window.bootstrap;
        if (!Bs || typeof Bs.Modal !== "function") {
            if (typeof window.errorModal === "function") {
                errorModal("No se pudo abrir configuraciones: recargá la página (Bootstrap no está listo).");
            }
            return;
        }

        vieneDeModalConfiguraciones = true;
        cerrarDropdownsBootstrap();
        if (window.Permisos && typeof Permisos.init === "function") Permisos.init();

        const entradas = obtenerEntradasMaestroConfiguracion().filter(e => puedeVerEntradaMaestroConfig(e.perm));
        if (!entradas.length) {
            vieneDeModalConfiguraciones = false;
            if (typeof window.errorModal === "function") {
                errorModal("No tenés permisos para ninguna configuración.");
            }
            return;
        }

        const listaEl = document.getElementById("maestro-configuracion-list");
        const modalEl = document.getElementById("modalMaestroConfiguraciones");
        if (!listaEl || !modalEl) {
            vieneDeModalConfiguraciones = false;
            if (typeof window.errorModal === "function") {
                errorModal("No se encontró el modal de configuraciones en esta página.");
            }
            return;
        }

        listaEl.innerHTML = entradas
            .map((ent, idx) => {
                const textoBuscar = String(ent.label || "")
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "")
                    .toLowerCase()
                    .replace(/"/g, "&quot;");
                return `
            <div class="rp-list-item maestro-cfg-row" data-idx="${idx}" data-texto="${textoBuscar}">
                <div class="rp-item-left">
                    <div class="rp-item-icon"><i class="fa fa-cog"></i></div>
                    <div class="rp-item-text">${escapeHtml(ent.label)}</div>
                </div>
                <div class="rp-list-actions"><i class="fa fa-angle-right text-muted"></i></div>
            </div>`;
            })
            .join("");

        listaEl.querySelectorAll(".maestro-cfg-row").forEach(row => {
            row.addEventListener("click", () => {
                const idx = Number(row.getAttribute("data-idx"), 10);
                const ent = entradas[idx];
                if (!ent || !Array.isArray(ent.args)) return;
                const mInst = bootstrap.Modal.getInstance(modalEl);
                if (mInst) mInst.hide();
                setTimeout(() => {
                    try {
                        abrirConfiguracion(...ent.args);
                    } catch (err) {
                        console.error(err);
                    }
                }, 280);
            });
        });

        const buscador = document.getElementById("txtBuscarMaestroConfig");
        if (buscador) {
            buscador.value = "";
            buscador.removeEventListener("input", filtrarMaestroConfiguraciones);
            buscador.addEventListener("input", filtrarMaestroConfiguraciones);
        }
        const lblVacio = document.getElementById("lblMaestroConfigVacio");
        if (lblVacio) {
            lblVacio.innerText = "";
            lblVacio.setAttribute("hidden", "hidden");
        }
        filtrarMaestroConfiguraciones();

        const modal = Bs.Modal.getOrCreateInstance(modalEl);
        modal.show();
    }

    function filtrarConfiguraciones() {
        const input = document.getElementById("txtBuscarConfiguracion");
        const lista = document.getElementById("configuracion-list");

        if (!input || !lista) return;

        const texto = input.value.trim().toLowerCase();
        const items = lista.querySelectorAll(".rp-list-item");

        let visibles = 0;

        items.forEach(item => {
            const textoItem = (item.getAttribute("data-texto") || "").toLowerCase();
            const coincide = textoItem.includes(texto);

            item.style.display = coincide ? "" : "none";

            if (coincide) visibles++;
        });

        const lblListaVacia = document.getElementById("lblListaVacia");

        if (items.length > 0 && visibles === 0) {
            lblListaVacia.innerText = `No se encontraron resultados para "${input.value}".`;
            lblListaVacia.style.color = 'red';
            lblListaVacia.removeAttribute("hidden");
        } else if (listaVacia === true) {
            lblListaVacia.innerText = `La lista de ${nombreConfiguracion} esta vacia.`;
            lblListaVacia.style.color = 'red';
            lblListaVacia.removeAttribute("hidden");
        } else {
            lblListaVacia.innerText = "";
            lblListaVacia.setAttribute("hidden", "hidden");
        }
    }

    /* =========================================================
       USER
    ========================================================= */
    function abrirConfiguracionUser() {
        window.location.href = '/Usuarios/Configuracion';
    }

    /* =========================================================
       HELPERS MODALES
    ========================================================= */
    function mostrarExito(msg) {
        if (typeof window.exitoModal === "function") return window.exitoModal(msg);
        console.info(msg);
    }

    function mostrarError(msg) {
        if (typeof window.errorModal === "function") return window.errorModal(msg);
        console.error(msg);
    }

    function confirmarAccion(msg) {
        if (typeof window.confirmarModal === "function") return window.confirmarModal(msg);
        return Promise.resolve(confirm(msg));
    }

    function escapeHtml(s) {
        return String(s ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function escapeJs(s) {
        return String(s ?? "").replaceAll("\\", "\\\\").replaceAll("'", "\\'");
    }

    /* =========================================================
       Modal configuración encima de otros modales (p. ej. Productos)
    ========================================================= */
    (function setupModalConfiguracionZIndex() {
        const modalEl = document.getElementById("modalConfiguracion");
        if (!modalEl) return;
        const baseZ = 32000;
        function alFrente() {
            modalEl.style.zIndex = String(baseZ + 10);
            const aplicarBackdrop = () => {
                const backs = document.querySelectorAll(".modal-backdrop");
                backs.forEach((b, i, arr) => {
                    if (i === arr.length - 1) b.style.zIndex = String(baseZ);
                });
            };
            aplicarBackdrop();
            requestAnimationFrame(aplicarBackdrop);
            requestAnimationFrame(() => requestAnimationFrame(aplicarBackdrop));
        }
        function limpiarZ() {
            modalEl.style.zIndex = "";
            document.querySelectorAll(".modal-backdrop").forEach((b) => {
                b.style.zIndex = "";
            });
        }
        window.ponerModalConfiguracionAlFrente = alFrente;
        modalEl.addEventListener("show.bs.modal", alFrente);
        modalEl.addEventListener("shown.bs.modal", alFrente);
        modalEl.addEventListener("hidden.bs.modal", limpiarZ);
    })();

    (function setupModalMaestroConfiguraciones() {
        const el = document.getElementById("modalMaestroConfiguraciones");
        if (!el) return;
        el.addEventListener("hidden.bs.modal", () => {
            vieneDeModalConfiguraciones = false;
        });
    })();

    /* =========================================================
       EXPONER GLOBALES
    ========================================================= */
    window.abrirConfiguracion = abrirConfiguracion;
    window.editarConfiguracion = editarConfiguracion;
    window.eliminarConfiguracion = eliminarConfiguracion;
    window.guardarCambiosConfiguracion = guardarCambiosConfiguracion;
    window.cancelarModificarConfiguracion = cancelarModificarConfiguracion;
    window.agregarConfiguracion = agregarConfiguracion;
    window.abrirConfiguraciones = abrirConfiguraciones;
    window.abrirConfiguracionUser = abrirConfiguracionUser;


})(window, document, window.jQuery);


