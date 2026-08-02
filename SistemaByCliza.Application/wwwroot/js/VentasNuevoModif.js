// ===================== VentasNuevoModif.js (COMPLETO) =====================
// Requiere: jQuery, Bootstrap 5, DataTables, Select2, moment.js y *site.js*
// Usa: token, confirmarModal, exitoModal, errorModal, advertenciaModal,
// formatearMiles, formatearSinMiles, etc. (definidas en site.js)

// ---------------- Estado global ----------------
let gridItems = null;
let gridPagos = null;
let isSaving = false;
let wasSubmitVenta = false; // feedback sólo después de intentar guardar
let wasSubmitPago = false;  // feedback en modal pago después de intentar registrar
let __wasSubmitClienteRapido = false;
const CLIENTE_DEFAULT_ID = 15;

const State = {
    /** true si ?ver=1 (consulta explícita desde grilla; puede tener también Editar). */
    soloVer: false,
    idVenta: parseInt((document.getElementById("txtId")?.value || "0"), 10) || 0,
    clienteId: 0,
    listaPrecioId: 0,
    sucursalId: 0,
    productos: [],
    cuentas: [],
    clientes: [],
    transportes: [],
    remitoEmpresa: null,
    vendedores: [],
    listas: [],
    Sucursales: [],
    items: [],
    pagos: [],
    editItemIndex: -1,
    editPagoIndex: -1,
    estado: "PENDIENTE",
    tipoVenta: "Fisico",
    cargandoVenta: false,
    /** Datos de cliente/transporte cacheados al cargar venta (para remito). */
    remitoCliente: null,
};

function ventaEsSoloLectura() {
    return State.soloVer === true || (typeof document !== "undefined" && document.documentElement.dataset.nmSoloConsulta === "1");
}

/** Igual que PersonalSueldos / OrdenesCorte: solo consulta (Ver sin Editar, o ?ver=1). */
function aplicarModoSoloLecturaVenta() {
    if (!ventaEsSoloLectura()) return;
    document.body.classList.add("venta-solo-lectura");
    const sub = document.querySelector(".page-header small.text-muted");
    if (sub) {
        const id = State.idVenta || parseInt(document.getElementById("txtId")?.value || "0", 10) || 0;
        if (id > 0) sub.textContent = State.soloVer ? "Consulta" : "Solo lectura";
    }
    document.querySelectorAll("#formVenta input:not([type=hidden]), #formVenta select, #formVenta textarea").forEach((el) => { el.disabled = true; });
    try {
        if (window.jQuery && $.fn.select2) {
            $("#formVenta select").prop("disabled", true).trigger("change.select2");
        }
    } catch (_) { /* noop */ }
    ["btnGuardarVenta", "btnEliminarVenta"].forEach((id) => document.getElementById(id)?.classList.add("d-none"));
    document.querySelectorAll("#btnPlusClienteVenta, #btnPlusListaPrecioVenta, .venta-container-lg .pr-atajo-catalogo").forEach((el) => el.classList.add("d-none"));
    document.querySelectorAll('button[onclick="abrirModalItem()"], button[onclick="abrirModalPago()"]').forEach((b) => b.classList.add("d-none"));
    document.querySelectorAll("#modalItem .pr-atajo-catalogo, #modalItem .modal-footer .btn-success").forEach((el) => el.classList.add("d-none"));
    document.querySelectorAll("#modalPago .modal-footer .btn-success").forEach((el) => el.classList.add("d-none"));
    refrescarItems();
    refrescarPagos();
}

// ---------------- Helpers numéricos / fechas ----------------
function _fmtNumber(n) { const v = parseFloat(n || 0); return new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v); }
function _toNumber(s) { if (typeof formatearSinMiles === "function") return parseFloat(formatearSinMiles(s || 0)); return parseFloat(String(s || "0").replace(/\./g, "").replace(",", ".")) || 0; }
function _toMiles(n) { if (typeof formatearMiles === "function") return formatearMiles(n); return _fmtNumber(n); }

/** Importe pago: mismo criterio que insumos/productos ($ + miles + decimales al salir del campo). */
function parseImportePagoVenta(raw) {
    if (raw == null) return NaN;
    let s = String(raw).trim();
    if (s === "") return NaN;
    s = s.replace(/\$/g, "").replace(/\s/g, "");
    s = s.replace(/\./g, "").replace(",", ".");
    const n = parseFloat(s);
    return isNaN(n) ? NaN : n;
}
function formatImportePagoVentaDisplay(n) {
    if (typeof n !== "number" || isNaN(n)) return "";
    if (typeof formatNumber === "function") return formatNumber(n);
    return n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function refrescarAtajosAbmEn(scope) {
    if (typeof initAbmSelectShortcuts !== "function") return;
    const root = scope && (scope.nodeType === 1 || scope === document) ? scope : document;
    initAbmSelectShortcuts(root);
}

function refillCrListaPrecioDesdeState(preferId) {
    const sel = document.getElementById("cr_ListaPrecio");
    if (!sel) return;
    const modalOpen = document.getElementById("modalClienteRapido")?.classList.contains("show");
    if (modalOpen && $.fn.select2 && $("#cr_ListaPrecio").hasClass("select2-hidden-accessible")) {
        try { $("#cr_ListaPrecio").select2("destroy"); } catch (_) { /* noop */ }
    }
    const prev = sel.value;
    sel.innerHTML = `<option value="">Seleccione</option>` + (State.listas || []).map(x =>
        `<option value="${x.Id}">${x.Nombre || x.Descripcion || ("Lista " + x.Id)}</option>`).join("");
    const preferStr = (preferId != null && Number(preferId) > 0) ? String(preferId) : null;
    const use = (preferStr && [...sel.options].some(o => String(o.value) === preferStr))
        ? preferStr
        : (prev && [...sel.options].some(o => String(o.value) === String(prev)) ? prev : "");
    sel.value = use || "";
    if (modalOpen && $.fn.select2) {
        initSelect2Base("#cr_ListaPrecio", { dropdownParent: $("#modalClienteRapido") });
        removeEmptyOptionOnSelect("#cr_ListaPrecio");
        $("#cr_ListaPrecio").val(sel.value || "").trigger("change.select2");
    }
}

function parseNuevoIdConfig(d) {
    const raw = d?.nuevoId ?? d?.NuevoId ?? d?.nuevoID;
    if (raw == null || raw === "") return NaN;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : NaN;
}

async function recargarCrCondIvaEnModalCliente(preferId) {
    const sel = document.getElementById("cr_CondIva");
    if (!sel || !document.getElementById("modalClienteRapido")?.classList.contains("show")) return;
    const prev = sel.value;
    const r = await fetch("/CondicionesIva/Lista", { headers: { Authorization: "Bearer " + (token || "") } });
    const condIva = r.ok ? await r.json() : [];
    sel.innerHTML = `<option value="">Seleccione</option>` + condIva.map(x =>
        `<option value="${x.Id}">${x.Nombre || x.Descripcion || ("Cond IVA " + x.Id)}</option>`).join("");
    const preferStr = (preferId != null && Number(preferId) > 0) ? String(preferId) : null;
    const use = (preferStr && [...sel.options].some(o => String(o.value) === preferStr))
        ? preferStr
        : (prev && [...sel.options].some(o => String(o.value) === String(prev)) ? prev : "");
    sel.value = use || "";
    if ($.fn.select2) {
        try {
            if ($("#cr_CondIva").hasClass("select2-hidden-accessible")) $("#cr_CondIva").select2("destroy");
        } catch (_) { /* noop */ }
        initSelect2Base("#cr_CondIva", { dropdownParent: $("#modalClienteRapido") });
        removeEmptyOptionOnSelect("#cr_CondIva");
        $("#cr_CondIva").val(sel.value || "").trigger("change.select2");
    }
}

function bindVentasNuevoModifAtajosCatalogo() {
    const abrir = async (titulo, ctrl) => {
        if (typeof window.abrirConfiguracion !== "function") return;
        try {
            await window.abrirConfiguracion(titulo, ctrl, null, null, null, true);
        } catch (_) { /* noop */ }
    };
    $("#btnPlusClienteVenta").off("click.vtaCat").on("click.vtaCat", (e) => { e.preventDefault(); abrirModalNuevoClienteVenta(); });
    $("#btnPlusListaPrecioVenta").off("click.vtaCat").on("click.vtaCat", (e) => { e.preventDefault(); abrir("Lista de Precios", "ListasPrecios"); });
    $("#btnPlusCrCondIva").off("click.vtaCat").on("click.vtaCat", (e) => { e.preventDefault(); abrir("Condiciones IVA", "CondicionesIVA"); });
    $("#btnPlusCrListaPrecio").off("click.vtaCat").on("click.vtaCat", (e) => { e.preventDefault(); abrir("Lista de Precios", "ListasPrecios"); });
}

function installVentasNuevoModifConfigListener() {
    if (document.documentElement.dataset.ventasNuevoModifCfg === "1") return;
    document.documentElement.dataset.ventasNuevoModifCfg = "1";
    document.addEventListener("configuracionActualizada", async (e) => {
        if (!/\/Ventas\/NuevoModif/i.test(location.pathname || "")) return;
        const d = e?.detail || {};
        if (d.accion !== "insertar") return;
        const tipo = (d.tipo || "").trim();
        const nuevoId = parseNuevoIdConfig(d);
        try {
            if (tipo === "ListasPrecios") {
                await cargarListasPrecios();
                if (Number.isFinite(nuevoId)) {
                    const cmbLp = document.getElementById("cmbListaPrecio");
                    if (cmbLp && [...cmbLp.options].some(o => String(o.value) === String(nuevoId))) {
                        State.listaPrecioId = nuevoId;
                        cmbLp.value = String(nuevoId);
                        if ($.fn.select2) $("#cmbListaPrecio").val(String(nuevoId)).trigger("change.select2");
                    }
                }
                if (document.getElementById("modalClienteRapido")?.classList.contains("show")) {
                    refillCrListaPrecioDesdeState(Number.isFinite(nuevoId) ? nuevoId : undefined);
                }
            }
            if (tipo === "CondicionesIVA" && document.getElementById("modalClienteRapido")?.classList.contains("show")) {
                await recargarCrCondIvaEnModalCliente(Number.isFinite(nuevoId) ? nuevoId : undefined);
            }
        } catch (err) { console.error(err); }
    });
}

function bindPagoImporteVenta() {
    const $m = $("#modalPago");
    $m.off("input.vtaPagoImp", ".vta-pago-importe-input").on("input.vtaPagoImp", ".vta-pago-importe-input", function () {
        const raw = this.value;
        const num = raw.replace(/\D/g, "");
        if (!num) { this.value = ""; return; }
        this.value = "$ " + Number(num).toLocaleString("es-AR");
    });
    $m.off("focusout.vtaPagoImp", ".vta-pago-importe-input").on("focusout.vtaPagoImp", ".vta-pago-importe-input", function () {
        const raw = this.value;
        if (!String(raw).trim()) { this.value = ""; return; }
        const n = parseImportePagoVenta(raw);
        if (!isNaN(n) && n >= 0) this.value = formatImportePagoVentaDisplay(n);
    });
}
function hoyISO() { return moment().format("YYYY-MM-DD"); }
function dateToInputValue(f) { const m = moment(f, [moment.ISO_8601, "YYYY-MM-DD", "DD/MM/YYYY", "YYYY-MM-DDTHH:mm:ss", "YYYY-MM-DDTHH:mm:ssZ"]); return m.isValid() ? m.format("YYYY-MM-DD") : ""; }
function formatearFechaParaVista(f) { const m = moment(f, [moment.ISO_8601, "YYYY-MM-DD", "YYYY-MM-DDTHH:mm:ss"]); return m.isValid() ? m.format("DD/MM/YYYY") : ""; }

// ---------------- Helpers UI: Select2 + Invalid feedback ----------------
function initSelect2Base(sel, opts = {}) {
    if (!window.jQuery || !$.fn.select2) return;
    const $el = $(sel); if (!$el.length) return;
    const def = { theme: "bootstrap-5", width: "100%", placeholder: "Seleccione", language: { noResults: () => "No hay resultados", searching: () => "Buscando..." } };
    $el.select2({ ...def, ...opts });
}
function removeEmptyOptionOnSelect(sel) {
    const el = typeof sel === "string" ? document.querySelector(sel) : sel; if (!el) return;
    const onChange = () => { if (el.value && el.querySelector('option[value=""]')) { el.querySelector('option[value=""]').remove(); if ($.fn.select2 && $(el).hasClass("select2-hidden-accessible")) $(el).trigger("change.select2"); el.removeEventListener("change", onChange); } };
    el.addEventListener("change", onChange);
}

// ---- Validación visual unificada (inputs normales y Select2) ----
function isSelect2(el) { return !!(window.jQuery && $(el).hasClass("select2-hidden-accessible") && $(el).next(".select2").length); }
function getSelect2Selection(el) { return $(el).next(".select2").find(".select2-selection").get(0) || null; }
function getFeedbackAnchor(el) { return isSelect2(el) ? $(el).next(".select2").get(0) : el; }

// ¡No eliminamos feedback del servidor! Si no existe, lo creamos (p/Select2).
function ensureInvalidFeedback(el) {
    if (!el) return null;
    const anchor = getFeedbackAnchor(el);
    let fb = anchor?.nextElementSibling;
    if (!(fb && fb.classList?.contains("invalid-feedback"))) {
        fb = document.createElement("div");
        fb.className = "invalid-feedback";
        fb.style.display = "none";
        anchor?.parentNode?.insertBefore(fb, anchor.nextSibling);
    }
    return fb;
}

function setInvalid(selector, message = "Campo obligatorio") {
    const el = typeof selector === "string" ? document.querySelector(selector) : selector;
    if (!el) return false;
    let target = el; if (isSelect2(el)) { const s2 = getSelect2Selection(el); if (s2) target = s2; }
    target.classList.remove("is-valid");
    target.classList.add("is-invalid");
    const fb = ensureInvalidFeedback(el); if (fb) { fb.textContent = message; fb.style.display = "block"; }
    return false; // para poder encadenar con && ok
}
function setValid(selector) {
    const el = typeof selector === "string" ? document.querySelector(selector) : selector;
    if (!el) return true;
    let target = el; if (isSelect2(el)) { const s2 = getSelect2Selection(el); if (s2) target = s2; }
    target.classList.remove("is-invalid");
    target.classList.add("is-valid");
    const fb = getFeedbackAnchor(el)?.nextElementSibling; if (fb && fb.classList?.contains("invalid-feedback")) fb.style.display = "none";
    return true;
}
function clearValidation(selector) {
    const el = typeof selector === "string" ? document.querySelector(selector) : selector;
    if (!el) return;
    let target = el; if (isSelect2(el)) { const s2 = getSelect2Selection(el); if (s2) target = s2; }
    target.classList.remove("is-invalid", "is-valid");
    const fb = getFeedbackAnchor(el)?.nextElementSibling; if (fb && fb.classList?.contains("invalid-feedback")) fb.style.display = "none";
}

// ---------- Sincronizar State con los combos (nativo + select2) ----------
function addComboSync(selector, stateKey, { extra = null } = {}) {
    const el = document.querySelector(selector);
    if (!el) return;
    const sync = () => {
        const v = el.value;
        State[stateKey] = v ? (isFinite(+v) ? +v : v) : 0;
        if (wasSubmitVenta) {
            State[stateKey] ? setValid(selector) : setInvalid(selector);
            updateFormErrorBanner();
        } else {
            clearValidation(selector);
        }
        if (typeof extra === "function") extra();
        updateGates();
    };
    ["change", "input"].forEach(evt => el.addEventListener(evt, sync));
    if ($.fn.select2) $(el).on("select2:select select2:clear", sync);
    sync();
}

function syncStateFromUI() {
    const dtp = document.getElementById("dtpFecha");
    if (dtp) { if (wasSubmitVenta) (dtp.value ? setValid(dtp) : setInvalid(dtp)); else clearValidation(dtp); }
    [["#cmbCliente", "clienteId"], ["#cmbListaPrecio", "listaPrecioId"], ["#cmbSucursal", "sucursalId"], ["#cmbEstado", "estado"], ["#cmbTipoVenta", "tipoVenta"]].forEach(([sel, key]) => {
        const el = document.querySelector(sel); if (!el) return;
        State[key] = el.value ? (isFinite(+el.value) ? +el.value : el.value) : 0;
        if (wasSubmitVenta) (State[key] ? setValid(el) : setInvalid(el)); else clearValidation(el);
    });
    updateGates();
    updateFormErrorBanner();
}

// Apaga TODA la validación visible (para la 1ra apertura o un reset manual)
async function hideInitialRequiredHints(root = document) {
    wasSubmitVenta = false;
    ["#dtpFecha", "#cmbCliente", "#cmbListaPrecio", "#cmbSucursal", "#cmbEstado", "#cmbTipoVenta"].forEach(clearValidation);
    root.querySelectorAll(".invalid-feedback").forEach(fb => fb.style.display = "none");
    document.getElementById("errorCamposVenta")?.classList.add("d-none");
    updateGates();
}

// ---------------- Gates de botones ----------------
// Habilitar si hay Cliente + Vendedor + Lista Precio
function updateGates() {
    const ok = !!State.clienteId && !!State.listaPrecioId;
    const btnItem = document.querySelector('button[onclick="abrirModalItem()"]');
    const btnPago = document.querySelector('button[onclick="abrirModalPago()"]');
    [btnItem, btnPago].forEach(b => { if (!b) return; b.disabled = !ok; b.classList.toggle("disabled", !ok); b.style.opacity = ok ? 1 : .6; b.style.pointerEvents = ok ? "auto" : "none"; });
}

// ---------------- Carga inicial ----------------
document.addEventListener("DOMContentLoaded", async () => {
    Permisos.init();
    const qs = new URLSearchParams(window.location.search || "");
    State.soloVer = qs.get("ver") === "1";
    const idFromQs = (qs.get("id") || "").trim();
    const idNumEarly = parseInt((document.getElementById("txtId")?.value || idFromQs || "0"), 10) || 0;

    if (State.soloVer) {
        if (idNumEarly <= 0) {
            if (typeof errorModal === "function") await errorModal("Consulta no válida.");
            window.location.href = "/Ventas/Index";
            return;
        }
        if (!Permisos.tiene("Ventas", "Ver")) {
            if (typeof errorModal === "function") await errorModal("No tenés permisos.");
            window.location.href = "/Ventas/Index";
            return;
        }
    } else {
        Permisos.aplicarUINuevoModif("Ventas", { permitirConsultaSinEditar: true });
    }

    try {
        const dtp = document.getElementById("dtpFecha");
        if (dtp && !dtp.value) dtp.value = hoyISO();

        // Select2
        initSelect2Base("#cmbCliente");
        initSelect2Base("#cmbListaPrecio");
        initSelect2Base("#cmbSucursal");
        removeEmptyOptionOnSelect("#cmbCliente");
        removeEmptyOptionOnSelect("#cmbListaPrecio");
        removeEmptyOptionOnSelect("#cmbSucursal");
        initSelect2Base("#cmbEstado");
        removeEmptyOptionOnSelect("#cmbEstado");
        initSelect2Base("#cmbTipoVenta");
        removeEmptyOptionOnSelect("#cmbTipoVenta");
        initSelect2Base("#cmbTransporte");

        bindPagoImporteVenta();
        bindVentasNuevoModifAtajosCatalogo();
        installVentasNuevoModifConfigListener();
        document.getElementById("modalPago")?.addEventListener("shown.bs.modal", () => {
            requestAnimationFrame(() => refrescarAtajosAbmEn(document.getElementById("modalPago")));
        });

        // listeners de revalidación (fecha)
        document.getElementById("dtpFecha")?.addEventListener("change", () => {
            if (!wasSubmitVenta) { clearValidation("#dtpFecha"); return; }
            document.getElementById("dtpFecha").value ? setValid("#dtpFecha") : setInvalid("#dtpFecha");
            updateFormErrorBanner();
        });

        // listeners de sincronización de combos
        addComboSync("#cmbCliente", "clienteId", {
            extra: () => {
                if (State.pagos.length) { State.pagos = []; refrescarPagos(); }
                aplicarTransporteDefaultCliente();
            }
        });
        addComboSync("#cmbListaPrecio", "listaPrecioId", {
            extra: () => { if (State.items.length) { State.items = []; refrescarItems(); recalcularTotales(); } }
        });
        addComboSync("#cmbSucursal", "sucursalId");
        addComboSync("#cmbEstado", "estado");
        addComboSync("#cmbTipoVenta", "tipoVenta");

        $("#cmbTransporte").on("change select2:select select2:clear", actualizarLblDireccionTransporte);

        // Cargar datos de combos/maestros
        await Promise.all([
            cargarClientes(), cargarListasPrecios(), cargarEstadosVentaCombo(),
            cargarProductos(), cargarCuentas(), cargarSucursalesUsuario(),
            cargarTransportes(), cargarRemitoEmpresa()
        ]);


        $('#cmbCliente').val(String(CLIENTE_DEFAULT_ID)).trigger('change.select2');
        // Grillas
        configurarTablaItems();
        configurarTablaPagos();

        // Exportar PDF
        document.getElementById("btnExportarVentaPdf")?.addEventListener("click", exportarVentaPdf);

        // Modo Edición / Nuevo
        const id = (new URLSearchParams(location.search).get("id")) || "";
        if (id) {
            State.idVenta = parseInt(id, 10);
            await cargarVentaExistente(State.idVenta);
            document.getElementById("btnEliminarVenta")?.classList.remove("d-none");
            setGuardarButtonMode("editar");
        } else {
            setGuardarButtonMode("crear");

            State.estado = "PENDIENTE";
            const cmbEstado = document.getElementById("cmbEstado");
            if (cmbEstado) {
                cmbEstado.value = "PENDIENTE";
                if ($.fn.select2) $("#cmbEstado").val("PENDIENTE").trigger("change.select2");
            }
            const cmbTipo = document.getElementById("cmbTipoVenta");
            if (cmbTipo) {
                cmbTipo.value = "Fisico";
                State.tipoVenta = "Fisico";
                if ($.fn.select2) $("#cmbTipoVenta").val("Fisico").trigger("change.select2");
            }


            clearAllValidationVenta();
        }

        // Sync final por si vino con valores del servidor
        syncStateFromUI();
        await hideInitialRequiredHints();

        if (ventaEsSoloLectura()) aplicarModoSoloLecturaVenta();

    } catch (e) { console.error(e); }
});

// ---------------- Fetch combos ----------------
async function cargarClientes() {
    const r = await fetch("/Clientes/Lista", { headers: { Authorization: "Bearer " + (token || "") } });
    const d = r.ok ? await r.json() : []; State.clientes = d || [];
    const cmb = document.getElementById("cmbCliente"); if (!cmb) return;
    cmb.innerHTML = `<option value="">Seleccione</option>` + State.clientes.map(x => `<option value="${x.Id}">${x.Nombre || x.Denominacion || x.RazonSocial || ("Cliente " + x.Id)}</option>`).join("");
    if ($.fn.select2) $("#cmbCliente").trigger("change.select2");
    syncStateFromUI();
}

async function cargarTransportes() {
    const r = await fetch("/Transportes/Lista", { headers: { Authorization: "Bearer " + (token || ""), "Content-Type": "application/json" } });
    const d = r.ok ? await r.json() : [];
    State.transportes = (d || []).filter(t => t.Activo !== false);
    const cmb = document.getElementById("cmbTransporte"); if (!cmb) return;
    cmb.innerHTML = `<option value="">Seleccione</option>` + State.transportes.map(x =>
        `<option value="${x.Id}">${x.Nombre || ("Transporte " + x.Id)}</option>`
    ).join("");
    if ($.fn.select2) $("#cmbTransporte").trigger("change.select2");
    actualizarLblDireccionTransporte();
}

async function cargarRemitoEmpresa() {
    try {
        const r = await fetch("/Ventas/RemitoEmpresa", { headers: { Authorization: "Bearer " + (token || ""), "Content-Type": "application/json" } });
        State.remitoEmpresa = r.ok ? await r.json() : null;
    } catch {
        State.remitoEmpresa = null;
    }
}

function actualizarLblDireccionTransporte() {
    const cmb = document.getElementById("cmbTransporte");
    const lbl = document.getElementById("lblDireccionTransporte");
    if (!lbl) return;
    const id = parseInt(cmb?.value || "0", 10) || 0;
    const t = (State.transportes || []).find(x => Number(x.Id) === id);
    const dir = (t?.Direccion || "").trim();
    lbl.textContent = dir ? `Dirección de transporte: ${dir}` : (id ? "Sin dirección de transporte" : "");
}

function aplicarTransporteDefaultCliente() {
    if (State.cargandoVenta) return;
    const idCli = State.clienteId || parseInt(document.getElementById("cmbCliente")?.value || "0", 10) || 0;
    const cli = (State.clientes || []).find(c => Number(c.Id) === idCli);
    State.remitoCliente = cli || null;
    const cmb = document.getElementById("cmbTransporte");
    if (!cmb) return;
    const idT = cli?.IdTransporte ? String(cli.IdTransporte) : "";
    cmb.value = idT;
    if ($.fn.select2) $("#cmbTransporte").val(idT).trigger("change.select2");
    actualizarLblDireccionTransporte();
}

function sumarPrendasItems() {
    return (State.items || []).reduce((a, it) => a + (parseFloat(it.cantidad) || 0), 0);
}

function syncCantidadPrendasDesdeItems() {
    const el = document.getElementById("txtCantidadPrendas");
    if (!el) return;
    const sum = Math.round(sumarPrendasItems());
    el.value = sum > 0 ? String(sum) : "";
}

async function cargarListasPrecios() {
    const r = await fetch("/ListasPrecios/Lista", { headers: { Authorization: "Bearer " + (token || "") } });
    const d = r.ok ? await r.json() : []; State.listas = d || [];
    const cmb = document.getElementById("cmbListaPrecio"); if (!cmb) return;
    cmb.innerHTML = `<option value="">Seleccione</option>` + State.listas.map(x => `<option value="${x.Id}">${x.Nombre || x.Descripcion || ("Lista " + x.Id)}</option>`).join("");
    if ($.fn.select2) $("#cmbListaPrecio").trigger("change.select2");
    refillCrListaPrecioDesdeState();
    syncStateFromUI();
}

/** Opciones de estado: DISTINCT Ventas.Estado + PENDIENTE/FINALIZADA (sin tabla catálogo). */
async function cargarEstadosVentaCombo() {
    let rows = [];
    try {
        const r = await fetch("/Ventas/EstadosDesdeVentas", { headers: { Authorization: "Bearer " + (token || ""), "Content-Type": "application/json" } });
        rows = r.ok ? await r.json() : [];
    } catch (_) { rows = []; }
    if (!Array.isArray(rows) || rows.length === 0) {
        rows = [{ Nombre: "PENDIENTE" }, { Nombre: "FINALIZADA" }];
    }
    const cmb = document.getElementById("cmbEstado");
    if (!cmb) return;
    const prev = (State.estado || cmb.value || "PENDIENTE").toString().trim().toUpperCase();
    cmb.innerHTML = rows.map(x => {
        const nom = String(x.Nombre || "").trim();
        const val = nom.toUpperCase();
        return `<option value="${val}">${nom || val}</option>`;
    }).join("");
    const pick = prev && [...cmb.options].some(o => String(o.value).toUpperCase() === prev)
        ? prev
        : (String(rows[0]?.Nombre || "PENDIENTE").trim().toUpperCase() || "PENDIENTE");
    State.estado = pick;
    cmb.value = pick;
    if ($.fn.select2) $("#cmbEstado").val(pick).trigger("change.select2");
    syncStateFromUI();
}
async function cargarProductos() {
    const r = await fetch("/Productos/Lista", { headers: { Authorization: "Bearer " + (token || "") } });
    const d = r.ok ? await r.json() : []; State.productos = d || [];
}
async function cargarCuentas() {
    const r = await fetch("/Cuentas/Lista", { headers: { Authorization: "Bearer " + (token || "") } });
    const d = r.ok ? await r.json() : []; State.cuentas = d || [];
}

// ================== Sucursales (rol admin: todas; resto: asignadas en servidor) ==================
async function cargarSucursalesUsuario() {
    try {
        const raw = localStorage.getItem("userSession");
        const session = raw ? JSON.parse(raw) : null;
        const idSucursalPreferida = Number(session?.IdSucursal ?? session?.SucursalId ?? session?.sucursalId ?? 0);
        const cmb = document.getElementById("cmbSucursal"); if (!cmb) return;

        cmb.innerHTML = `<option value="">Seleccione</option>`;

        const r = await fetch("/Ventas/SucursalesOpciones", { headers: { Authorization: "Bearer " + (token || ""), "Content-Type": "application/json" } });
        if (!r.ok) throw new Error("No se pudo obtener sucursales");
        const data = await r.json();
        const Sucursales = (data || []).map(s => ({ Id: Number(s.Id || 0), Nombre: String(s.Nombre || "") })).filter(s => s.Id > 0 && s.Nombre);
        State.Sucursales = Sucursales;

        cmb.innerHTML = `<option value="">Seleccione</option>` + Sucursales.map(s => `<option value="${s.Id}">${s.Nombre}</option>`).join("");
        if ($.fn.select2) $("#cmbSucursal").trigger("change.select2");

        let valueToSelect = 0;
        if (State.idVenta && State.sucursalId && Sucursales.some(s => s.Id === State.sucursalId)) valueToSelect = State.sucursalId;
        else if (idSucursalPreferida && Sucursales.some(s => s.Id === idSucursalPreferida)) valueToSelect = idSucursalPreferida;
        else if (Sucursales.length === 1) valueToSelect = Sucursales[0].Id;

        if (valueToSelect) {
            cmb.value = String(valueToSelect);
            if ($.fn.select2) $("#cmbSucursal").val(String(valueToSelect)).trigger("change.select2");
            State.sucursalId = valueToSelect;
            clearValidation("#cmbSucursal");
        } else {
            if ($.fn.select2) $("#cmbSucursal").trigger("change.select2");
        }
        if (Sucursales.length === 1) cmb.setAttribute("disabled", "disabled"); else cmb.removeAttribute("disabled");
        updateGates();
    } catch (e) {
        console.error("Error cargando Sucursales usuario:", e);
        const cmb = document.getElementById("cmbSucursal");
        if (cmb) { cmb.innerHTML = `<option value="">Seleccione</option>`; cmb.removeAttribute("disabled"); if ($.fn.select2) $("#cmbSucursal").trigger("change.select2"); }
        State.Sucursales = [];
    }
}

// ---------------- 1 sola llamada: precio + variantes ----------------
async function obtenerProductoInfoVenta(idProducto, idListaPrecio) {
    if (!idProducto || !idListaPrecio) return { precio: 0, variantes: [] };
    try {
        const r = await fetch(`/Ventas/ProductoInfoVenta?idProducto=${idProducto}&idListaPrecio=${idListaPrecio}`, { headers: { Authorization: "Bearer " + (token || "") } });
        if (!r.ok) throw new Error(r.statusText);
        const j = await r.json();
        return {
            precio: j?.precio ?? 0,
            variantes: (j?.variantes || []).map(v => ({ id: v.Id, idProducto: v.IdProducto, nombre: v.Nombre || `${v.Color || ""} / ${v.Talle || ""}`.trim() }))
        };
    } catch (e) { console.error(e); return { precio: 0, variantes: [] }; }
}

// ---------------- Variantes (UI) ----------------
function renderVariantesUI(variantes, existentes = []) {
    const wrap = document.getElementById("variantesWrap");
    const empty = document.getElementById("variantesEmpty");
    const container = document.getElementById("variantesContainer");
    if (!wrap || !container) return;

    wrap.innerHTML = "";
    container.classList.remove("d-none");

    if (!Array.isArray(variantes) || variantes.length === 0) {
        if (empty) { empty.hidden = false; empty.classList.add("alert-ghost"); empty.innerHTML = `<i class="fa fa-info-circle"></i> <span>Este producto no tiene variantes disponibles.</span>`; }
        return;
    }
    if (empty) empty.hidden = true;

    const cantidades = new Map(); (existentes || []).forEach(v => { cantidades.set(v.idProductoVariante || v.id, parseFloat(v.cantidad || 0)); });

    const head = document.createElement("div");
    head.className = "var-row";
    head.innerHTML = `<div class="text-muted fw-bold">Color / Talle</div><div class="text-muted fw-bold text-center">Cant.</div>`;
    wrap.appendChild(head);

    variantes.forEach(v => {
        const row = document.createElement("div");
        row.className = "var-row";
        row.dataset.idVar = v.id;
        const cant = cantidades.get(v.id) || 0;
        row.innerHTML = `
      <div class="var-name">${v.nombre || "-"}</div>
      <div class="var-input"><input type="number" min="0" step="1" class="form-control form-control-sm var-qty" value="${cant}"></div>`;
        row.querySelector(".var-qty").addEventListener("input", onVariantInputsChanged);
        wrap.appendChild(row);
    });

    onVariantInputsChanged();
}
function leerVariantesDesdeUI() {
    const wrap = document.getElementById("variantesWrap"); if (!wrap) return [];
    const rows = [...wrap.querySelectorAll(".var-row[data-id-var]")];
    const res = [];
    rows.forEach(r => {
        const idVar = parseInt(r.dataset.idVar, 10);
        const nombre = r.querySelector(".var-name")?.textContent?.trim() || "";
        const cantidad = _toNumber(r.querySelector(".var-qty")?.value);
        if (idVar && cantidad > 0) res.push({ idProductoVariante: idVar, nombre, cantidad });
    });
    return res;
}
function lockQtyByVariants(sum) {
    const qtyInput = document.getElementById("txtItemCant");
    const hint = document.getElementById("qtyLockHint");
    if (qtyInput) { qtyInput.value = _toMiles(sum); qtyInput.disabled = true; qtyInput.classList.add("bg-disabled"); }
    if (hint) { hint.hidden = false; hint.textContent = `Cant. bloqueada por variantes`; }
}
function unlockQtyByVariants() {
    const qtyInput = document.getElementById("txtItemCant");
    const hint = document.getElementById("qtyLockHint");
    if (qtyInput) { qtyInput.disabled = false; qtyInput.classList.remove("bg-disabled"); }
    if (hint) hint.hidden = true;
}
function onVariantInputsChanged() {
    const sumVars = leerVariantesDesdeUI().reduce((a, v) => a + (parseFloat(v.cantidad) || 0), 0);
    if (sumVars > 0) lockQtyByVariants(sumVars); else unlockQtyByVariants();
    recalcularSubtotalModal();
}

// ---------------- Cargar Venta existente ----------------
async function cargarVentaExistente(id) {
    const r = await fetch(`/Ventas/EditarInfo?id=${id}`, { headers: { Authorization: "Bearer " + (token || ""), "Content-Type": "application/json" } });
    if (!r.ok) { errorModal?.("No se pudo cargar la venta."); return; }
    const v = await r.json();
    State.cargandoVenta = true;

    // Cabecera
    const f = dateToInputValue(v.Fecha);
    const dtp = document.getElementById("dtpFecha"); if (dtp) dtp.value = f || hoyISO();
    document.getElementById("cmbCliente").value = v.IdCliente || "";
    document.getElementById("cmbListaPrecio").value = v.IdListaPrecio || "";

    if (document.getElementById("cmbSucursal")) {
        document.getElementById("cmbSucursal").removeAttribute("disabled");
        document.getElementById("cmbSucursal").value = v.IdSucursal || "";
        if ($.fn.select2) $("#cmbSucursal").trigger("change.select2");
        State.sucursalId = v.IdSucursal || 0;
        if (State.Sucursales.length === 1) document.getElementById("cmbSucursal").setAttribute("disabled", "disabled");
    }

    // Estado (catálogo; si el string guardado no está en la lista, se agrega una opción para no perderlo)
    const rawEst = (v.Estado || v.estado || "PENDIENTE").toString().trim();
    const est = rawEst ? rawEst.toUpperCase() : "PENDIENTE";
    const cmbEstado = document.getElementById("cmbEstado");
    if (cmbEstado) {
        const exists = [...cmbEstado.options].some(o => String(o.value).toUpperCase() === est);
        if (!exists && est) {
            const opt = document.createElement("option");
            opt.value = est;
            opt.textContent = rawEst || est;
            cmbEstado.appendChild(opt);
        }
        State.estado = est;
        cmbEstado.value = est;
        if ($.fn.select2) $("#cmbEstado").val(est).trigger("change.select2");
    } else {
        State.estado = est;
    }

    const tipoVenta = ((v.TipoVenta || v.tipoVenta || "Fisico") + "").trim() === "Online" ? "Online" : "Fisico";
    State.tipoVenta = tipoVenta;
    const cmbTipoVenta = document.getElementById("cmbTipoVenta");
    if (cmbTipoVenta) {
        cmbTipoVenta.value = tipoVenta;
        if ($.fn.select2) $("#cmbTipoVenta").val(tipoVenta).trigger("change.select2");
    }

    if ($.fn.select2) $("#cmbCliente, #cmbListaPrecio").trigger("change.select2");

    syncStateFromUI();

    document.getElementById("txtNota").value = v.NotaInterna || "";
    document.getElementById("txtNotaCliente").value = v.NotaCliente || "";

    State.remitoCliente = {
        Nombre: v.Cliente,
        Cuit: v.ClienteCuit,
        Domicilio: v.ClienteDomicilio,
        Localidad: v.ClienteLocalidad,
        CodigoPostal: v.ClienteCodigoPostal,
        Telefono: v.ClienteTelefono,
        Email: v.ClienteEmail,
        CondicionIva: v.ClienteCondicionIva,
        DireccionEntrega: v.ClienteDireccionEntrega,
        Referencias: v.ClienteReferencias,
        IdTransporte: v.IdTransporte
    };

    const cmbTransporte = document.getElementById("cmbTransporte");
    if (cmbTransporte) {
        const idT = v.IdTransporte ? String(v.IdTransporte) : "";
        cmbTransporte.value = idT;
        if ($.fn.select2) $("#cmbTransporte").val(idT).trigger("change.select2");
        actualizarLblDireccionTransporte();
    }
    const txtBultos = document.getElementById("txtCantidadBultos");
    if (txtBultos) txtBultos.value = v.CantidadBultos != null ? String(v.CantidadBultos) : "";

    // Items (+ variantes)
    State.items = (v.Productos || []).map(i => {
        const variantes = (i.Variantes || []).map(vr => ({ id: vr.Id || 0, idProductoVariante: vr.IdProductoVariante, nombre: vr.Variante || "", cantidad: parseFloat(vr.Cantidad || 0) }));
        const base = parseFloat(i.Cantidad || 0) * parseFloat(i.PrecioUnitario || 0);
        return {
            id: i.Id || 0, idProducto: i.IdProducto, productoNombre: i.Producto || "",
            cantidad: parseFloat(i.Cantidad || 0), precioUnitario: parseFloat(i.PrecioUnitario || 0),
            porcDesc: parseFloat(i.PorcDescuento || 0), porcIva: parseFloat(i.PorcIva || 0),
            base, descImporte: parseFloat(i.DescuentoTotal || 0), ivaImporte: parseFloat(i.IvaTotal || 0), subtotal: parseFloat(i.Subtotal || 0),
            variantes
        };
    });
    refrescarItems();
    syncCantidadPrendasDesdeItems();

    // Pagos
    State.pagos = (v.Pagos || []).map(p => ({ id: p.Id || 0, fecha: dateToInputValue(p.Fecha), idCuenta: p.IdCuenta, cuentaNombre: p.Cuenta || "", importe: parseFloat(p.Importe || 0), nota: p.NotaInterna || "" }));
    refrescarPagos();

    recalcularTotales();
    updateGates();
    State.cargandoVenta = false;
}

// ---------------- DataTables: Items ----------------
function renderChipsVariantes(variantes, rowIndex) {
    if (!Array.isArray(variantes) || variantes.length === 0) return '<span class="text-muted">—</span>';
    if (ventaEsSoloLectura()) {
        return variantes.map((v) => `
    <span class="var-chip" title="${v.nombre}">
      <span class="chip-label">${v.nombre} <span class="qty">×${_fmtNumber(v.cantidad)}</span></span>
    </span>`).join("");
    }
    return variantes.map((v, i) => `
    <span class="var-chip" title="${v.nombre}">
      <span class="chip-label">${v.nombre} <span class="qty">×${_fmtNumber(v.cantidad)}</span></span>
      <button class="chip-x" title="Quitar" onclick="quitarVarDesdeGrid(${rowIndex}, ${i});return false;">×</button>
    </span>`).join("");
}
function recalcItemDerived(it) {
    const base = (parseFloat(it.cantidad) || 0) * (parseFloat(it.precioUnitario) || 0);
    const descImporte = base * ((parseFloat(it.porcDesc) || 0) / 100);
    const baseCd = base - descImporte;
    const ivaImporte = baseCd * ((parseFloat(it.porcIva) || 0) / 100);
    const subtotal = baseCd + ivaImporte;
    it.base = base; it.descImporte = descImporte; it.ivaImporte = ivaImporte; it.subtotal = subtotal;
}
window.quitarVarDesdeGrid = function (rowIndex, varIndex) {
    if (ventaEsSoloLectura()) return;
    const it = State.items[rowIndex]; if (!it || !Array.isArray(it.variantes)) return;
    it.variantes.splice(varIndex, 1);
    const sum = it.variantes.reduce((a, v) => a + (parseFloat(v.cantidad) || 0), 0);
    if (sum > 0) it.cantidad = sum;
    recalcItemDerived(it);
    refrescarItems(); recalcularTotales();
};
function configurarTablaItems() {
    if (gridItems) return;
    gridItems = $("#grd_Items").DataTable({
        data: [], language: { url: "//cdn.datatables.net/plug-ins/2.0.7/i18n/es-MX.json" }, scrollX: true,
        columns: [
            {
                data: null, orderable: false, width: "60px", className: "text-center",
                render: (_, __, ___, meta) => (ventaEsSoloLectura()
                    ? '<span class="text-muted">—</span>'
                    : `<button class="btn btn-link p-0 me-2 text-success" title="Editar" onclick="editarItem(${meta.row})"><i class="fa fa-pencil"></i></button>
          <button class="btn btn-link p-0 text-danger" title="Eliminar" onclick="eliminarItem(${meta.row})"><i class="fa fa-trash"></i></button>`)
            },
            { data: "productoNombre", title: "Producto" },
            { data: "variantes", title: "Variantes", className: "text-center", render: (v, _t, _r, meta) => renderChipsVariantes(v, meta.row) },
            { data: "cantidad", className: "text-end", title: "Cant", render: v => _fmtNumber(v) },
            { data: "precioUnitario", className: "text-end", title: "P.Unit", render: v => `$ ${_fmtNumber(v)}` },
            { data: "porcDesc", className: "text-end", title: "Desc%", render: v => `${_fmtNumber(v)} %` },
            { data: "porcIva", className: "text-end", title: "IVA%", render: v => `${_fmtNumber(v)} %` },
            { data: "subtotal", className: "text-end", title: "Subtotal", render: v => `$ ${_fmtNumber(v)}` }
        ],
        order: [[1, "asc"]], dom: "t", pageLength: 1000,
        createdRow: function (row) { $("td", row).eq(2).css({ "white-space": "normal" }); }
    });
    if (typeof bindDataTableSeleccionFila === "function") {
        bindDataTableSeleccionFila("#grd_Items", "vtaItems");
    }
}
function refrescarItems() { if (!gridItems) return; gridItems.clear().rows.add(State.items).draw(); }

// ---------------- DataTables: Pagos ----------------
function configurarTablaPagos() {
    if (gridPagos) return;
    gridPagos = $("#grd_Pagos").DataTable({
        data: [], language: { url: "//cdn.datatables.net/plug-ins/2.0.7/i18n/es-MX.json" }, scrollX: true,
        columns: [
            {
                data: null, orderable: false, width: "60px", className: "text-center",
                render: (_, __, ___, meta) => (ventaEsSoloLectura()
                    ? '<span class="text-muted">—</span>'
                    : `<button class="btn btn-link p-0 me-2 text-success" title="Editar" onclick="editarPago(${meta.row})"><i class="fa fa-pencil"></i></button>
          <button class="btn btn-link p-0 text-danger" title="Eliminar" onclick="eliminarPago(${meta.row})"><i class="fa fa-trash"></i></button>`)
            },
            { data: "fecha", render: f => formatearFechaParaVista(f), title: "Fecha" },
            { data: "cuentaNombre", title: "Cuenta" },
            { data: "importe", className: "text-end", title: "Importe", render: v => `$ ${_fmtNumber(v)}` },
            { data: "nota", title: "Nota" }
        ],
        order: [[1, "desc"]], dom: "t", pageLength: 1000
    });
    if (typeof bindDataTableSeleccionFila === "function") {
        bindDataTableSeleccionFila("#grd_Pagos", "vtaPagos");
    }
}
function refrescarPagos() { if (!gridPagos) return; gridPagos.clear().rows.add(State.pagos).draw(); }

// ---------------- Modal Producto (M_Producto embebido) ----------------
window.abrirAltaProductoDesdeVenta = function () {
    if (ventaEsSoloLectura()) return;
    if (!window.MProductoByCliza || typeof window.MProductoByCliza.abrir !== "function") {
        if (typeof errorModal === "function") errorModal("No se cargó el alta de producto.");
        return;
    }
    window.MProductoByCliza.abrir({
        onSuccess: async (nuevoId) => {
            await cargarProductos();
            const id = Number(nuevoId) || 0;
            const cmb = document.getElementById("cmbItemProducto");
            if (!cmb || !id) return;
            const $cmb = $(cmb);
            if ($cmb.hasClass("select2-hidden-accessible")) {
                try { $cmb.select2("destroy"); } catch (_) { /* noop */ }
            }
            cmb.innerHTML = `<option value="">Seleccione</option>` + State.productos.map(p => `<option value="${p.Id}">${p.Descripcion}</option>`).join("");
            initSelect2Base("#cmbItemProducto", { dropdownParent: $("#modalItem") });
            removeEmptyOptionOnSelect("#cmbItemProducto");
            attachItemEvents();
            $cmb.val(String(id)).trigger("change");
        }
    });
};

window.abrirModalItem = async function () {
    if (ventaEsSoloLectura()) return;
    if (!(State.clienteId && State.listaPrecioId)) {
        advertenciaModal?.("Completá Cliente, Vendedor y Lista de Precios antes de agregar ítems.");
        return;
    }
    State.editItemIndex = -1;

    // Botón verde → Registrar

    const btn = document.querySelector("#modalItem .modal-footer .btn.btn-success");
    if (btn) btn.innerHTML = `<i class="fa fa-check me-1"></i> Registrar`;

    const $cmbP = $("#cmbItemProducto");
    if ($cmbP.length && $cmbP.hasClass("select2-hidden-accessible")) {
        try { $cmbP.select2("destroy"); } catch (_) { /* noop */ }
    }
    const cmbHtml = `<option value="">Seleccione</option>` + State.productos.map(p => `<option value="${p.Id}">${p.Descripcion}</option>`).join("");
    const cmb = document.getElementById("cmbItemProducto"); cmb.innerHTML = cmbHtml;
    initSelect2Base("#cmbItemProducto", { dropdownParent: $("#modalItem") });
    removeEmptyOptionOnSelect("#cmbItemProducto");

    document.getElementById("txtItemCant").value = "1";
    document.getElementById("txtItemPrecio").value = "";
    document.getElementById("txtItemDesc").value = "0";
    document.getElementById("txtItemIva").value = "0";
    document.getElementById("txtItemSubtotal").value = "$ 0,00";
    setItemInputsEnabled(false);

    renderVariantesUI([]);
    attachItemEvents();
    document.getElementById("errorCamposItem")?.classList.add("d-none");

    new bootstrap.Modal(document.getElementById("modalItem")).show();
};
function setItemInputsEnabled(enabled) {
    ["txtItemCant", "txtItemPrecio", "txtItemDesc", "txtItemIva"].forEach(id => {
        const el = document.getElementById(id); if (!el) return;
        el.disabled = !enabled; el.classList.toggle("disabled", !enabled); el.style.opacity = enabled ? 1 : .7;
    });
}

/**
 * Tras elegir producto: trae precio lista + variantes.
 * En edición usar conservarPrecio + variantesExistentes para no pisar P.Unit ni cantidades por variante.
 */
async function aplicarProductoEnModalItem(opts) {
    opts = opts || {};
    const conservarPrecio = opts.conservarPrecio === true;
    const variantesExistentes = opts.variantesExistentes || null;
    const cmb = document.getElementById("cmbItemProducto");
    const container = document.getElementById("variantesContainer");
    const empty = document.getElementById("variantesEmpty");
    if (!cmb) return;
    const idProd = parseInt(cmb.value || 0, 10);
    if (!idProd) {
        if (container) container.classList.add("d-none");
        document.getElementById("txtItemPrecio").value = "";
        document.getElementById("txtItemSubtotal").value = "$ 0,00";
        setItemInputsEnabled(false);
        return;
    }
    const { precio, variantes } = await obtenerProductoInfoVenta(idProd, State.listaPrecioId);
    if (!conservarPrecio) {
        document.getElementById("txtItemPrecio").value = _toMiles(precio || 0);
    }
    setItemInputsEnabled(true);
    renderVariantesUI(variantes, variantesExistentes || []);
    if (empty && (!variantes || variantes.length > 0)) empty.hidden = true;
    recalcularSubtotalModal();
}

function attachItemEvents() {
    const cmb = document.getElementById("cmbItemProducto");
    cmb.onchange = function () { void aplicarProductoEnModalItem({}); };
    ["txtItemCant", "txtItemPrecio", "txtItemDesc", "txtItemIva"].forEach(id => { const el = document.getElementById(id); if (el) el.oninput = recalcularSubtotalModal; });
}
function recalcularSubtotalModal() {
    const sumVars = leerVariantesDesdeUI().reduce((a, v) => a + (parseFloat(v.cantidad) || 0), 0);
    const qty = sumVars > 0 ? sumVars : _toNumber(document.getElementById("txtItemCant").value);
    const precio = _toNumber(document.getElementById("txtItemPrecio").value);
    const desc = _toNumber(document.getElementById("txtItemDesc").value);
    const iva = _toNumber(document.getElementById("txtItemIva").value);

    const base = qty * precio;
    const descImporte = base * (desc / 100);
    const baseCd = base - descImporte;
    const ivaImporte = baseCd * (iva / 100);
    const subtotal = baseCd + ivaImporte;
    document.getElementById("txtItemSubtotal").value = `$ ${_fmtNumber(subtotal)}`;
}
window.guardarItem = function () {
    if (ventaEsSoloLectura()) return;
    const idProd = parseInt(document.getElementById("cmbItemProducto").value || 0, 10);
    const cantBase = _toNumber(document.getElementById("txtItemCant").value);
    const precio = _toNumber(document.getElementById("txtItemPrecio").value);
    const desc = _toNumber(document.getElementById("txtItemDesc").value);
    const iva = _toNumber(document.getElementById("txtItemIva").value);

    const variantesSel = leerVariantesDesdeUI();
    const sumVars = variantesSel.reduce((a, v) => a + (parseFloat(v.cantidad) || 0), 0);
    const cantidadFinal = sumVars > 0 ? sumVars : cantBase;

    const okCampos = idProd && precio >= 0 && cantidadFinal > 0;
    if (!okCampos) { setInvalid("#cmbItemProducto"); document.getElementById("errorCamposItem")?.classList.remove("d-none"); return; }
    document.getElementById("errorCamposItem")?.classList.add("d-none");

    const prod = State.productos.find(p => p.Id === idProd);
    const base = cantidadFinal * precio;
    const descImporte = base * (desc / 100);
    const baseCd = base - descImporte;
    const ivaImporte = baseCd * (iva / 100);
    const subtotal = baseCd + ivaImporte;

    const row = {
        id: 0, idProducto: idProd, productoNombre: prod?.Descripcion || (`Producto ${idProd}`),
        cantidad: cantidadFinal, precioUnitario: precio, porcDesc: desc, porcIva: iva,
        base, descImporte, ivaImporte, subtotal, variantes: variantesSel
    };

    if (State.editItemIndex >= 0) State.items[State.editItemIndex] = { ...State.items[State.editItemIndex], ...row };
    else State.items.push(row);

    State.editItemIndex = -1;
    refrescarItems(); recalcularTotales();
    bootstrap.Modal.getInstance(document.getElementById("modalItem"))?.hide();
};
window.editarItem = async function (idx) {
    if (ventaEsSoloLectura()) return;
    const it = State.items[idx]; if (!it) return;
    State.editItemIndex = idx;

    // Botón verde → Guardar
    const btn = document.querySelector("#modalItem .modal-footer .btn.btn-success");
    if (btn) btn.innerHTML = `<i class="fa fa-check me-1"></i> Guardar`;

    const $cmbE = $("#cmbItemProducto");
    if ($cmbE.length && $cmbE.hasClass("select2-hidden-accessible")) {
        try { $cmbE.select2("destroy"); } catch (_) { /* noop */ }
    }
    const cmb = document.getElementById("cmbItemProducto");
    cmb.innerHTML = `<option value="">Seleccione</option>` + State.productos.map(p => `<option value="${p.Id}">${p.Descripcion}</option>`).join("");
    initSelect2Base("#cmbItemProducto", { dropdownParent: $("#modalItem") });
    removeEmptyOptionOnSelect("#cmbItemProducto");

    cmb.value = String(it.idProducto);
    if ($.fn.select2) $("#cmbItemProducto").val(String(it.idProducto));

    const pu = it.precioUnitario != null ? it.precioUnitario : it.preciounitario;
    document.getElementById("txtItemCant").value = _toMiles(it.cantidad);
    document.getElementById("txtItemPrecio").value = _toMiles(parseFloat(pu) || 0);
    document.getElementById("txtItemDesc").value = _toMiles(it.porcDesc);
    document.getElementById("txtItemIva").value = _toMiles(it.porcIva);
    setItemInputsEnabled(true);

    // Sin trigger("change"): evita pisar precio/desc/iva con el de lista y rearmar variantes sin cantidades.
    await aplicarProductoEnModalItem({ conservarPrecio: true, variantesExistentes: it.variantes || [] });

    attachItemEvents();

    document.getElementById("errorCamposItem")?.classList.add("d-none");
    new bootstrap.Modal(document.getElementById("modalItem")).show();
};
window.eliminarItem = async function (idx) {
    if (ventaEsSoloLectura()) return;
    const ok = await confirmarModal("¿Eliminar el producto?"); if (!ok) return;
    State.items.splice(idx, 1);
    refrescarItems(); recalcularTotales();
};

// ---------------- Modal Pago ----------------
function resetPagoValidation() {
    ["#dtpPagoFecha", "#cmbCuenta", "#txtPagoImporte"].forEach(clearValidation);
    document.getElementById("errorCamposPago")?.classList.add("d-none");
}
function validarPagoCampos() {
    const f = document.getElementById("dtpPagoFecha")?.value;
    const c = parseInt(document.getElementById("cmbCuenta")?.value || 0, 10);
    const impRaw = document.getElementById("txtPagoImporte")?.value;
    const imp = parseImportePagoVenta(impRaw);

    let ok = true;
    if (!f) ok = setInvalid("#dtpPagoFecha") && ok; else ok = setValid("#dtpPagoFecha") && ok;
    if (!c) ok = setInvalid("#cmbCuenta") && ok; else ok = setValid("#cmbCuenta") && ok;
    if (!(imp > 0) || isNaN(imp)) ok = setInvalid("#txtPagoImporte") && ok; else ok = setValid("#txtPagoImporte") && ok;

    document.getElementById("errorCamposPago")?.classList.toggle("d-none", ok);
    return ok;
}
function attachPagoLiveValidation() {
    const apply = () => { if (!wasSubmitPago) return; validarPagoCampos(); };
    ["dtpPagoFecha", "cmbCuenta", "txtPagoImporte", "txtPagoNota"].forEach(id => {
        const el = document.getElementById(id); if (!el) return;
        ["input", "change"].forEach(evt => { el.addEventListener(evt, apply); });
    });
}

window.abrirModalPago = function () {
    if (ventaEsSoloLectura()) return;
    if (!(State.clienteId && State.listaPrecioId)) {
        advertenciaModal?.("Completá Cliente y Lista de Precios antes de registrar pagos.");
        return;
    }
    State.editPagoIndex = -1;
    wasSubmitPago = false;
    resetPagoValidation();

    // Título → Registrar Pago
    const title = document.querySelector("#modalPago .modal-title");
    if (title) title.innerHTML = `<i class="fa fa-plus-circle me-2 text-success"></i>Registrar Pago`;

    document.getElementById("dtpPagoFecha").value = hoyISO();
    const cmb = document.getElementById("cmbCuenta");
    cmb.innerHTML = `<option value="">Seleccione</option>` + State.cuentas.map(c => `<option value="${c.Id}">${c.Nombre || c.Descripcion || ("Cuenta " + c.Id)}</option>`).join("");

    // precargar importe con el restante de la venta
    const tot = calcularTotalesInterno();
    const abonado = (State.pagos || []).reduce((a, p) => a + (parseFloat(p.importe) || 0), 0);
    const restante = Math.max(tot.total - abonado, 0);

    document.getElementById("txtPagoImporte").value =
        restante > 0 ? formatImportePagoVentaDisplay(restante) : formatImportePagoVentaDisplay(0);

    document.getElementById("txtPagoNota").value = "";

    attachPagoLiveValidation();
    refrescarAtajosAbmEn(document.getElementById("modalPago"));
    new bootstrap.Modal(document.getElementById("modalPago")).show();
};
window.guardarPago = function () {
    if (ventaEsSoloLectura()) return;
    wasSubmitPago = true;
    if (!validarPagoCampos()) return;

    const fecha = document.getElementById("dtpPagoFecha").value;
    const idCuenta = parseInt(document.getElementById("cmbCuenta").value || 0, 10);
    const cuentaNombre = document.getElementById("cmbCuenta").selectedOptions[0]?.textContent || "";
    const importe = parseImportePagoVenta(document.getElementById("txtPagoImporte").value);
    if (isNaN(importe) || importe <= 0) return;
    const nota = (document.getElementById("txtPagoNota").value || "").trim();

    const tot = calcularTotalesInterno();
    const pagadoExcl = State.pagos.reduce((acc, p, i) => (State.editPagoIndex >= 0 && i === State.editPagoIndex) ? acc : acc + (parseFloat(p.importe) || 0), 0);
    if ((pagadoExcl + importe) - tot.total > 1e-6) { errorModal?.(`El pago supera el total de la venta ($${_fmtNumber(tot.total)}).`); return; }

    const row = { id: 0, fecha, idCuenta, cuentaNombre, importe, nota };
    if (State.editPagoIndex >= 0) { State.pagos[State.editPagoIndex] = { ...State.pagos[State.editPagoIndex], ...row }; State.editPagoIndex = -1; }
    else State.pagos.push(row);

    refrescarPagos(); recalcularTotales();
    bootstrap.Modal.getInstance(document.getElementById("modalPago"))?.hide();
};
window.editarPago = function (idx) {
    if (ventaEsSoloLectura()) return;
    const p = State.pagos[idx]; if (!p) return;
    State.editPagoIndex = idx;
    wasSubmitPago = false;
    resetPagoValidation();

    // Título → Editar Pago
    const title = document.querySelector("#modalPago .modal-title");
    if (title) title.innerHTML = `<i class="fa fa-pen-to-square me-2 text-success"></i>Editar Pago`;

    document.getElementById("dtpPagoFecha").value = dateToInputValue(p.fecha) || hoyISO();
    const cmb = document.getElementById("cmbCuenta");
    cmb.innerHTML = `<option value="">Seleccione</option>` + State.cuentas.map(c => `<option value="${c.Id}">${c.Nombre || c.Descripcion || ("Cuenta " + c.Id)}</option>`).join("");
    document.getElementById("cmbCuenta").value = p.idCuenta;
    document.getElementById("txtPagoImporte").value = formatImportePagoVentaDisplay(parseFloat(p.importe) || 0);
    document.getElementById("txtPagoNota").value = p.nota || "";

    attachPagoLiveValidation();
    refrescarAtajosAbmEn(document.getElementById("modalPago"));
    new bootstrap.Modal(document.getElementById("modalPago")).show();
};
window.eliminarPago = async function (idx) {
    if (ventaEsSoloLectura()) return;
    const ok = await confirmarModal("¿Eliminar este pago?"); if (!ok) return;
    State.pagos.splice(idx, 1); refrescarPagos(); recalcularTotales();
};

// ---------------- Totales / Guardar / Eliminar ----------------
function calcularTotalesInterno() {
    let sub = 0, desc = 0, iva = 0;
    for (const it of State.items) { sub += it.base; desc += it.descImporte; iva += it.ivaImporte; }
    const total = sub - desc + iva;
    return { sub, desc, iva, total };
}
function recalcularTotales() {
    const t = calcularTotalesInterno();
    document.getElementById("statSub").textContent = `$ ${_fmtNumber(t.sub)}`;
    document.getElementById("statDesc").textContent = `$ ${_fmtNumber(t.desc)}`;
    document.getElementById("statIva").textContent = `$ ${_fmtNumber(t.iva)}`;
    document.getElementById("statTotal").textContent = `$ ${_fmtNumber(t.total)}`;

    const abonado = (State.pagos || []).reduce((a, p) => a + (parseFloat(p.importe) || 0), 0);
    const restante = Math.max(t.total - abonado, 0);
    const elAb = document.getElementById("statAbonado");
    const elRs = document.getElementById("statRestante");
    if (elAb) elAb.textContent = `$ ${_fmtNumber(abonado)}`;
    if (elRs) { elRs.textContent = `$ ${_fmtNumber(restante)}`; elRs.classList.toggle("text-success", restante <= 0.000001); elRs.classList.toggle("text-warning", restante > 0.000001); }

    syncCantidadPrendasDesdeItems();

    // AUTO estado SOLO para ventas nuevas (no en solo lectura)
    if (!State.idVenta && !ventaEsSoloLectura()) {
        const nuevoEstado = (restante <= 0.000001) ? "FINALIZADA" : "PENDIENTE";
        State.estado = nuevoEstado;

        const cmbEstado = document.getElementById("cmbEstado");
        if (cmbEstado && cmbEstado.value !== nuevoEstado) {
            cmbEstado.value = nuevoEstado;
            if ($.fn.select2) $("#cmbEstado").val(nuevoEstado).trigger("change.select2");
        }
    }


}

function setGuardarButtonMode(mode) {
    const btn = document.getElementById("btnGuardarVenta"); if (!btn) return;
    const icon = '<i class="fa fa-check me-1"></i>';
    btn.innerHTML = icon + (mode === "editar" ? "Guardar" : "Registrar");
}

function camposVentaValidos() {
    let ok = true;
    ok = (document.getElementById("dtpFecha").value ? setValid("#dtpFecha") : setInvalid("#dtpFecha")) && ok;
    ok = (State.clienteId ? setValid("#cmbCliente") : setInvalid("#cmbCliente")) && ok;
    ok = (State.listaPrecioId ? setValid("#cmbListaPrecio") : setInvalid("#cmbListaPrecio")) && ok;
    ok = (State.sucursalId ? setValid("#cmbSucursal") : setInvalid("#cmbSucursal")) && ok;
    ok = (State.estado ? setValid("#cmbEstado") : setInvalid("#cmbEstado")) && ok;
    ok = (State.tipoVenta ? setValid("#cmbTipoVenta") : setInvalid("#cmbTipoVenta")) && ok;

    return ok;
}

function updateFormErrorBanner() {
    const ok = camposVentaValidos();
    const errorVenta = document.getElementById("errorCamposVenta");
    if (errorVenta) errorVenta.classList.toggle("d-none", ok);
    return ok;
}

function clearAllValidationVenta() {
    wasSubmitVenta = false;
    ["#dtpFecha", "#cmbCliente", "#cmbListaPrecio", "#cmbSucursal", "#cmbEstado", "#cmbTipoVenta"].forEach(clearValidation);
    document.getElementById("errorCamposVenta")?.classList.add("d-none");
}

window.guardarVenta = async function () {
    if (ventaEsSoloLectura()) return;
    if (isSaving) return;

    wasSubmitVenta = true;
    if (!updateFormErrorBanner()) return;
    if (State.items.length === 0) { errorModal?.("Agregá al menos un producto."); return; }

    const fecha = document.getElementById("dtpFecha").value;
    const notaInterna = (document.getElementById("txtNota").value || "").trim();
    const notaCliente = (document.getElementById("txtNotaCliente").value || "").trim();
    const idTransporte = parseInt(document.getElementById("cmbTransporte")?.value || "0", 10) || null;
    const cantBultosRaw = document.getElementById("txtCantidadBultos")?.value;
    const cantidadBultos = cantBultosRaw === "" || cantBultosRaw == null ? null : parseInt(cantBultosRaw, 10);
    const cantidadPrendas = Math.round(sumarPrendasItems()) || null;

    const tot = calcularTotalesInterno();
    const payload = {
        Id: State.idVenta || 0, Fecha: fecha,
        IdCliente: State.clienteId, IdListaPrecio: State.listaPrecioId, IdSucursal: State.sucursalId,
        Subtotal: tot.sub, Descuentos: tot.desc, TotalIva: tot.iva, ImporteTotal: tot.total,
        NotaInterna: notaInterna, NotaCliente: notaCliente,
        Estado: State.estado,
        TipoVenta: State.tipoVenta || document.getElementById("cmbTipoVenta")?.value || "Fisico",
        IdTransporte: idTransporte || null,
        CantidadBultos: Number.isFinite(cantidadBultos) ? cantidadBultos : null,
        CantidadPrendas: Number.isFinite(cantidadPrendas) ? cantidadPrendas : null,
        Productos: State.items.map(i => ({
            Id: i.id || 0, IdProducto: i.idProducto,
            PrecioUnitario: i.precioUnitario,
            PorcDescuento: i.porcDesc,
            DescuentoUnit: i.precioUnitario * (i.porcDesc / 100),
            DescuentoTotal: i.descImporte,
            PrecioUnitCdesc: i.precioUnitario * (1 - i.porcDesc / 100),
            PorcIva: i.porcIva,
            IvaUnit: (i.precioUnitario ?? 0) * (1 - i.porcDesc / 100) * (i.porcIva / 100),
            IvaTotal: i.ivaImporte,
            PrecioUnitFinal: i.precioUnitario * (1 - i.porcDesc / 100) * (1 + i.porcIva / 100),
            Cantidad: i.cantidad,
            Subtotal: i.subtotal,
            Variantes: (i.variantes || []).map(v => ({ Id: v.id || 0, IdProducto: i.idProducto, IdProductoVariante: v.idProductoVariante, Cantidad: v.cantidad }))
        })),
        Pagos: State.pagos.map(p => ({ Id: p.id || 0, Fecha: p.fecha, IdCuenta: p.idCuenta, Importe: p.importe, NotaInterna: p.nota }))
    };

    const url = State.idVenta ? "/Ventas/Actualizar" : "/Ventas/Insertar";
    const method = State.idVenta ? "PUT" : "POST";

    try {
        isSaving = true;
        const res = await fetch(url, { method, headers: { Authorization: "Bearer " + (token || ""), "Content-Type": "application/json;charset=utf-8" }, body: JSON.stringify(payload) });
        if (!res.ok) throw new Error(res.statusText);
        const r = await res.json();
        if ((r === true) || (r?.valor === true) || (r?.valor === "OK")) { exitoModal?.(State.idVenta ? "Venta actualizada" : "Venta registrada"); volverIndex(); }
        else { errorModal?.("No se pudo guardar la venta."); }
    } catch (e) {
        console.error(e); errorModal?.("Error al guardar la venta.");
    } finally {
        isSaving = false;
    }
};

window.eliminarVenta = async function () {
    if (ventaEsSoloLectura()) return;
    if (!State.idVenta) return;
    const ok = await confirmarModal("¿Eliminar esta venta?"); if (!ok) return;
    try {
        const r = await fetch(`/Ventas/Eliminar?id=${State.idVenta}`, { method: "DELETE", headers: { Authorization: "Bearer " + (token || "") } });
        const j = await r.json();
        if (!r.ok || !j?.valor) throw new Error(j?.mensaje || "No se pudo eliminar.");
        exitoModal("Eliminado correctamente"); volverIndex();
    } catch (e) {
        console.error(e); errorModal(e?.message || "Error al eliminar");
    }
};
window.volverIndex = function () { window.location.href = "/Ventas/Index"; };

// ================== Exportación PDF ==================
function _textSel(id) { const el = document.getElementById(id); return el?.selectedOptions?.[0]?.text?.trim() || ""; }
let __logoDataURL = null;
let __logoRemitoDataURL = null;
async function _loadLogoDataURL() {
    if (__logoDataURL) return __logoDataURL;
    const candidatas = ["/Imagenes/Logo.png", "/Imagenes/logo.png", "/Imagenes/Logo.jpg", "/Imagenes/logo.jpg", "/Imagenes/Logo.jpeg", "/Imagenes/logo.jpeg"];
    for (const url of candidatas) {
        try {
            const res = await fetch(url, { cache: "no-cache" }); if (!res.ok) continue;
            const blob = await res.blob();
            __logoDataURL = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob); });
            return __logoDataURL;
        } catch { }
    }
    return null;
}

/** Logo remito azul (sin "BY CLIZA"). Prioriza /Imagenes/LogoRemito.png */
async function _loadLogoRemitoDataURL() {
    if (__logoRemitoDataURL) return __logoRemitoDataURL;

    try {
        const r = await fetch("/Imagenes/LogoRemito.png?v=3", { cache: "no-cache" });
        if (r.ok) {
            const blob = await r.blob();
            __logoRemitoDataURL = await new Promise(res => {
                const fr = new FileReader();
                fr.onload = () => res(fr.result);
                fr.readAsDataURL(blob);
            });
            return __logoRemitoDataURL;
        }
    } catch { /* fallback */ }

    // Fallback: Logo.png → recortar texto e pintar azul
    const src = await _loadLogoDataURL();
    if (!src) return null;
    try {
        const img = await new Promise((resolve, reject) => {
            const i = new Image();
            i.onload = () => resolve(i);
            i.onerror = reject;
            i.src = src;
        });
        const cropH = Math.floor(img.height * 0.58);
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = cropH;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, img.width, cropH, 0, 0, img.width, cropH);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = imageData.data;
        // Azul oscuro remito #0A1F4A
        const br = 10, bg = 31, bb = 74;
        for (let p = 0; p < d.length; p += 4) {
            const lum = (d[p] + d[p + 1] + d[p + 2]) / 3;
            if (lum > 140) {
                d[p] = br; d[p + 1] = bg; d[p + 2] = bb; d[p + 3] = 255;
            } else {
                d[p] = 255; d[p + 1] = 255; d[p + 2] = 255; d[p + 3] = 255;
            }
        }
        ctx.putImageData(imageData, 0, 0);
        __logoRemitoDataURL = canvas.toDataURL("image/png");
        return __logoRemitoDataURL;
    } catch {
        return null;
    }
}
function _calcTotales() {
    let sub = 0, desc = 0, iva = 0;
    for (const it of (State.items || [])) { sub += Number(it.base || (it.cantidad || 0) * (it.precioUnitario || 0)); desc += Number(it.descImporte || 0); iva += Number(it.ivaImporte || 0); }
    const total = sub - desc + iva;
    const abonado = (State.pagos || []).reduce((a, p) => a + (Number(p.importe || 0)), 0);
    const restante = Math.max(total - abonado, 0);
    return { sub, desc, iva, total, abonado, restante };
}
function _addFooter(doc) {
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) { doc.setPage(i); const w = doc.internal.pageSize.getWidth(); const h = doc.internal.pageSize.getHeight(); doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(120); doc.text(`Página ${i} de ${pageCount}`, w - 60, h - 20, { align: "right" }); }
}
function _hr(doc, y, color = [230, 230, 230]) { const w = doc.internal.pageSize.getWidth(); doc.setDrawColor(...color); doc.setLineWidth(0.7); doc.line(40, y, w - 40, y); }

async function exportarVentaPdf() {
    if (!Array.isArray(State.items) || State.items.length === 0) { errorModal?.("Agregá al menos un producto para exportar."); return; }
    const { jsPDF } = window.jspdf || {}; if (!jsPDF || !window.jspdf?.jsPDF?.API?.autoTable) { errorModal?.("Falta jsPDF y/o autoTable en la página."); return; }
    const doc = new jsPDF({ unit: "pt", format: "a4" }); const W = doc.internal.pageSize.getWidth(); const H = doc.internal.pageSize.getHeight(); const padX = 40;
    const DARK = [20, 28, 38], TXT = [33, 33, 33];

    doc.setFillColor(...DARK); doc.rect(0, 0, W, 105, "F");
    const logo = await (_loadLogoDataURL?.()); if (logo) { try { doc.addImage(logo, "PNG", padX, 22, 120, 45, undefined, "FAST"); } catch { } } else { doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.setTextColor(255); doc.text("Tu Empresa", padX, 55); }

    doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.text("Comprobante de Venta", W - padX, 40, { align: "right" });
    const fecha = document.getElementById("dtpFecha")?.value || hoyISO();
    doc.setFont("helvetica", "normal"); doc.setFontSize(11); doc.text(`Fecha: ${formatearFechaParaVista(fecha)}`, W - padX, 62, { align: "right" });
    const sucursalTexto = _textSel("cmbSucursal") || "—"; doc.text(`Sucursal: ${sucursalTexto}`, W - padX, 80, { align: "right" });

    let y = 135;
    doc.setTextColor(...TXT); doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.text("Datos de la operación", padX, y); y += 16;
    const clienteTxt = _textSel("cmbCliente") || "—";
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold"); doc.text("Cliente:", padX, y); doc.setFont("helvetica", "normal"); doc.text(clienteTxt, padX + 55, y);

    y += 14; _hr(doc, y); y += 18;

    // ---------------- Nota Cliente ----------------
    const notaCliente = document.getElementById("txtNotaCliente")?.value?.trim();

    if (notaCliente) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text("Nota cliente:", padX, y);

        y += 14;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);

        const maxWidth = W - padX * 2;
        const notaLines = doc.splitTextToSize(notaCliente, maxWidth);

        doc.text(notaLines, padX, y);

        y += (notaLines.length * 14) + 6;
        _hr(doc, y);
        y += 18;
    }


    const fixedCols = [{ header: "Cant", width: 60 }, { header: "P.Unit", width: 90 }, { header: "Subtotal", width: 110 }];
    const fixedWidth = fixedCols.reduce((a, c) => a + c.width, 0);
    const firstColWidth = Math.max(220, (W - padX * 2) - fixedWidth - 2);

    const itemsBody = (State.items || []).map(it => {
        const variantes = (it.variantes || []).map(v => `- ${v.nombre} × ${_fmtNumber(v.cantidad)}`).join("\n");
        const prod = it.productoNombre || `Producto ${it.idProducto}`;
        const prodCol = variantes ? `${prod}\n${variantes}` : prod;
        const subtotalLinea = Number(it.subtotal ?? ((it.cantidad || 0) * (it.precioUnitario || 0)));
        return [prodCol, _fmtNumber(it.cantidad), `$ ${_fmtNumber(it.precioUnitario)}`, `$ ${_fmtNumber(subtotalLinea)}`];
    });

    doc.autoTable({
        startY: y, head: [["Producto", ...fixedCols.map(c => c.header)]], body: itemsBody, theme: "grid",
        margin: { left: padX, right: padX },
        styles: { fontSize: 10, cellPadding: 6, overflow: "linebreak", valign: "top" },
        headStyles: { fillColor: DARK, textColor: [255, 255, 255] },
        bodyStyles: { textColor: TXT, lineWidth: .1 },
        alternateRowStyles: { fillColor: [247, 248, 250] },
        columnStyles: { 0: { cellWidth: firstColWidth }, 1: { halign: "right", cellWidth: fixedCols[0].width }, 2: { halign: "right", cellWidth: fixedCols[1].width }, 3: { halign: "right", cellWidth: fixedCols[2].width } }
    });

    y = doc.lastAutoTable.finalY + 18;

    const { sub, desc, iva, total, abonado, restante } = _calcTotales();
    const panelW = 300, panelX = W - padX - panelW, rowH = 24, headH = 26;
    const rowsData = [
        { label: "Subtotal", value: `$ ${_fmtNumber(sub)}` },
        { label: "Descuentos", value: `$ ${_fmtNumber(desc)}` },
        { label: "IVA", value: `$ ${_fmtNumber(iva)}` },
        { label: "TOTAL", value: `$ ${_fmtNumber(total)}`, strong: true, bg: [234, 248, 240] },
        { label: "Abonado", value: `$ ${_fmtNumber(abonado)}`, bg: [239, 252, 246] },
        { label: "Saldo", value: `$ ${_fmtNumber(restante)}`, strong: true, bg: [255, 251, 235] },
    ];
    const neededH = headH + rowsData.length * rowH + 10; if (y + neededH > H - 60) { doc.addPage(); y = 60; }
    doc.setDrawColor(190); doc.roundedRect(panelX, y, panelW, headH + rowsData.length * rowH, 6, 6, "S");
    doc.setFillColor(245); doc.setDrawColor(190); doc.rect(panelX, y, panelW, headH, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(60); doc.text("Resumen de importes", panelX + 10, y + headH - 9);
    const colLabelX = panelX + 12, colValueX = panelX + panelW - 12;
    let ry = y + headH;
    rowsData.forEach((r, idx) => {
        if (r.bg) { doc.setFillColor(...r.bg); doc.rect(panelX, ry, panelW, rowH, "F"); }
        if (idx === 3) { doc.setLineWidth(1.1); doc.setDrawColor(160); doc.line(panelX, ry, panelX + panelW, ry); doc.setLineWidth(.5); doc.setDrawColor(190); }
        doc.setFont("helvetica", r.strong ? "bold" : "normal"); doc.setFontSize(11); doc.setTextColor(50); doc.text(r.label, colLabelX, ry + 16);
        doc.setFont("helvetica", r.strong ? "bold" : "normal"); doc.setFontSize(12); doc.setTextColor(30); doc.text(r.value, colValueX, ry + 16, { align: "right" });
        doc.setDrawColor(225); doc.line(panelX, ry + rowH, panelX + panelW, ry + rowH);
        ry += rowH;
    });

    _addFooter(doc);
    const suc = (sucursalTexto || "Sucursal").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "_");
    const nombre = `Comprobante_Venta_${formatearFechaParaVista(fecha)}_${suc}.pdf`;
    doc.save(nombre);
}

async function exportarRemitoPdf() {
    if (!Array.isArray(State.items) || State.items.length === 0) {
        errorModal?.("Agregá al menos un producto para exportar el remito.");
        return;
    }
    const { jsPDF } = window.jspdf || {};
    if (!jsPDF) {
        errorModal?.("Falta jsPDF en la página.");
        return;
    }

    if (!State.remitoEmpresa) await cargarRemitoEmpresa();
    const emp = State.remitoEmpresa || {};
    const idCli = State.clienteId || parseInt(document.getElementById("cmbCliente")?.value || "0", 10) || 0;
    const cliLista = (State.clientes || []).find(c => Number(c.Id) === idCli) || {};
    const cli = { ...(State.remitoCliente || {}), ...cliLista };
    const idTrans = parseInt(document.getElementById("cmbTransporte")?.value || "0", 10) || 0;
    const tr = (State.transportes || []).find(t => Number(t.Id) === idTrans) || {};
    const transporteNombre = (tr.Nombre || "").trim() || "—";
    const transporteDir = (tr.Direccion || "").trim();
    const bultosRaw = document.getElementById("txtCantidadBultos")?.value;
    const bultos = (bultosRaw === "" || bultosRaw == null) ? "—" : String(bultosRaw);
    const prendasSum = Math.round(sumarPrendasItems());
    const prendas = prendasSum > 0 ? String(prendasSum) : "—";
    const tot = calcularTotalesInterno();
    const valorDecl = `PS ${_fmtNumber(tot.total)}`;
    const fecha = document.getElementById("dtpFecha")?.value || hoyISO();
    const nro = State.idVenta ? `RT - ${State.idVenta}` : "RT - BORRADOR";
    const pedidoNro = State.idVenta
        ? `0091-NP-${String(State.idVenta).padStart(10, "0")}`
        : "—";
    const observaciones = (document.getElementById("txtNotaCliente")?.value || "").trim();
    let vendedor = "—";
    try {
        const u = JSON.parse(localStorage.getItem("userSession") || "null");
        if (u) vendedor = [u.Nombre, u.Apellido].filter(Boolean).join(" ") || u.Usuario || u.Nombre || "—";
    } catch { /* noop */ }

    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const mL = 36;
    const mR = 36;
    const contentW = W - mL - mR;
    // Solo el logo es azul oscuro; el resto negro / gris como el remito original
    const BLACK = [0, 0, 0];
    const GRAY_BAR = [210, 210, 210];

    const dash = (v) => {
        const s = (v == null ? "" : String(v)).trim();
        return s || "—";
    };

    // ========== HEADER ==========
    // Ubicaciones del original:
    // [LOGO]  ROPA DEPORTIVA... / JATUN S.R.L.     |  [R] REMITO FABRICA
    // Boedoá / CP / CUIT / Tel... (debajo del logo) |  Fecha / Nº / Pedidos / Facturas
    __logoRemitoDataURL = null;
    const logo = await _loadLogoRemitoDataURL();
    const logoSize = 48;
    const logoX = mL;
    const logoY = 26;
    if (logo) {
        try { doc.addImage(logo, "PNG", logoX, logoY, logoSize, logoSize); }
        catch { try { doc.addImage(logo, "JPEG", logoX, logoY, logoSize, logoSize); } catch { /* noop */ } }
    }

    // Nombre al LADO del logo
    const nameX = mL + logoSize + 10;
    doc.setTextColor(...BLACK);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(emp.RazonSocial || "ROPA DEPORTIVA POR MAYOR Y MENOR", nameX, logoY + 16);
    doc.setFontSize(9);
    doc.text(emp.RazonSocialLinea2 || "JATUN S.R.L.", nameX, logoY + 28);

    // Dirección y datos DEBAJO del logo (misma columna izquierda que el logo)
    let yEmp = logoY + logoSize + 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const empLines = [
        emp.DomicilioLinea1 || null,
        emp.DomicilioLinea2 || null,
        emp.DomicilioLinea3 || null,
        emp.Cuit ? `CUIT: ${emp.Cuit}` : null,
        emp.CondicionIva || null,
        emp.Telefonos ? `Tel.: ${emp.Telefonos}` : null,
        emp.TelefonoLocal ? `Tel. local : ${emp.TelefonoLocal}` : null
    ].filter(Boolean);
    if (!emp.DomicilioLinea1 && emp.Domicilio) empLines.unshift(emp.Domicilio);
    empLines.forEach(l => { doc.text(String(l), mL, yEmp); yEmp += 10; });

    // Caja R + REMITO FABRICA (arriba a la derecha)
    const rBox = 32;
    const rX = W - mR - 175;
    const rY = 26;
    doc.setDrawColor(...BLACK);
    doc.setLineWidth(1);
    doc.rect(rX, rY, rBox, rBox);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(...BLACK);
    doc.text("R", rX + rBox / 2, rY + 22, { align: "center" });

    const metaX = rX + rBox + 10;
    let yMeta = 36;
    doc.setFontSize(12);
    doc.text("REMITO FABRICA", metaX, yMeta);
    yMeta += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Fecha: ${formatearFechaParaVista(fecha)}`, metaX, yMeta); yMeta += 12;
    doc.text(`Nº Remito: ${nro}`, metaX, yMeta); yMeta += 12;
    doc.text(`Pedidos: ${pedidoNro}`, metaX, yMeta); yMeta += 12;
    doc.text("Facturas: 000000000000", metaX, yMeta);

    let y = Math.max(yEmp, yMeta) + 8;
    doc.setDrawColor(...BLACK);
    doc.setLineWidth(1);
    doc.line(mL, y, W - mR, y);
    y += 8;

    // ========== CAJA CLIENTE / VENDEDOR ==========
    const boxTop = y;
    const boxH = 175;
    const midX = mL + contentW * 0.58;
    const headerH = 15;
    const rightRowH = (boxH - headerH) / 3;

    doc.setDrawColor(...BLACK);
    doc.setLineWidth(0.9);
    doc.rect(mL, boxTop, contentW, boxH);
    doc.line(midX, boxTop, midX, boxTop + boxH);

    // Encabezados sin fondo gris
    doc.line(mL, boxTop + headerH, midX, boxTop + headerH);
    doc.line(midX, boxTop + headerH, W - mR, boxTop + headerH);
    doc.line(midX, boxTop + headerH + rightRowH, W - mR, boxTop + headerH + rightRowH);
    doc.line(midX, boxTop + headerH + rightRowH * 2, W - mR, boxTop + headerH + rightRowH * 2);
    doc.line(midX, boxTop + headerH + rightRowH * 2 + headerH, W - mR, boxTop + headerH + rightRowH * 2 + headerH);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...BLACK);
    doc.text("Datos de cliente", mL + 6, boxTop + 11);
    doc.text("Datos del vendedor", midX + 6, boxTop + 11);

    // Cliente
    const leftPad = mL + 8;
    let yL = boxTop + headerH + 13;
    const labelW = 92;
    const writeLeft = (label, value, opts = {}) => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(...BLACK);
        doc.text(label, leftPad, yL);
        doc.setFont("helvetica", "normal");
        const val = dash(value);
        const maxW = midX - leftPad - labelW - 8;
        const lines = doc.splitTextToSize(val, maxW);
        if (opts.underline && lines.length && val !== "—") {
            doc.text(lines[0], leftPad + labelW, yL);
            const tw = doc.getTextWidth(lines[0]);
            doc.setLineWidth(0.5);
            doc.line(leftPad + labelW, yL + 1.5, leftPad + labelW + tw, yL + 1.5);
            doc.setLineWidth(0.9);
            yL += 12;
            for (let i = 1; i < lines.length; i++) { doc.text(lines[i], leftPad + labelW, yL); yL += 11; }
        } else {
            doc.text(lines, leftPad + labelW, yL);
            yL += Math.max(12, lines.length * 11);
        }
    };

    const cp = dash(cli.CodigoPostal);
    const loc = dash(cli.Localidad);
    writeLeft("Señor(es):", cli.Nombre || _textSel("cmbCliente"));
    writeLeft("CUIT:", cli.Cuit);
    writeLeft("Domicilio:", cli.Domicilio);
    writeLeft("CP:", `${cp}${loc !== "—" ? " - " + loc : ""}`.replace(/\s-\s$/, "") || "—");
    if (cli.Localidad || cli.CodigoPostal) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.text(dash(cli.Provincia) !== "—" ? String(cli.Provincia).toUpperCase() : "BUENOS AIRES", leftPad + labelW, yL);
        yL += 12;
    }
    writeLeft("Teléfono:", cli.Telefono);
    writeLeft("IVA:", cli.CondicionIva);
    writeLeft("Referencias:", cli.Referencias);
    writeLeft("Correo electrónico:", cli.Email, { underline: true });

    // Derecha
    const rightPad = midX + 8;
    const rightW = W - mR - midX - 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...BLACK);
    doc.text(`Vendedor ${dash(vendedor)}`, rightPad, boxTop + headerH + 16);

    // Celda media: nombre del transporte
    const yT = boxTop + headerH + rightRowH + 14;
    doc.setFont("helvetica", "bold");
    doc.text(`Transporte: ${dash(transporteNombre)}`, rightPad, yT);

    // Celda inferior: Datos del transporte (no repetir "Datos del vendedor")
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Datos del transporte", midX + 6, boxTop + headerH + rightRowH * 2 + 11);
    doc.setFont("helvetica", "normal");
    const dirLines = doc.splitTextToSize(
        transporteDir ? `Dirección: ${transporteDir}` : "—",
        rightW
    );
    doc.text(dirLines, rightPad, boxTop + headerH + rightRowH * 2 + headerH + 12);

    y = boxTop + boxH + 16;

    // ========== BULTOS / PRENDAS / VALOR ==========
    const writeStar = (label, value) => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(...BLACK);
        doc.text(`*  ${label}`, mL, y);
        doc.text(String(value), mL + 150, y);
        y += 14;
    };
    writeStar("Cantidad de bultos:", bultos);
    writeStar("Cantidad de prendas:", prendas);
    writeStar("Valor declarado:", valorDecl);
    y += 4;

    // Barra gris gruesa
    doc.setFillColor(...GRAY_BAR);
    doc.rect(mL, y, contentW, 8, "F");
    y += 22;

    // ========== OBSERVACIONES ==========
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...BLACK);
    const obsLine = `Observaciones: ${transporteNombre !== "—" ? transporteNombre : "—"}`;
    doc.text(obsLine, mL, y);
    y += 13;
    doc.setFont("helvetica", "normal");
    if (observaciones) {
        const rest = doc.splitTextToSize(observaciones, contentW);
        doc.text(rest, mL, y);
    }

    // ========== FIRMAS ==========
    const firmY = H - 68;
    const firmW = 200;
    doc.setDrawColor(...BLACK);
    doc.setLineWidth(1);
    doc.line(mL + 24, firmY, mL + 24 + firmW, firmY);
    doc.line(W - mR - 24 - firmW, firmY, W - mR - 24, firmY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("FIRMA", mL + 24 + firmW / 2, firmY + 14, { align: "center" });
    doc.text("ACLARACIÓN", W - mR - 24 - firmW / 2, firmY + 14, { align: "center" });

    doc.save(`Remito_Fabrica_${nro.replace(/\s+/g, "")}_${formatearFechaParaVista(fecha)}.pdf`);
}


async function abrirModalNuevoClienteVenta() {
    if (ventaEsSoloLectura()) return;
    try {
        __wasSubmitClienteRapido = false;

        // limpiar (antes de init)
        resetClienteRapidoForm();

        // cargar combos
        const rIva = await fetch("/CondicionesIva/Lista", { headers: { Authorization: "Bearer " + (token || "") } });
        const condIva = rIva.ok ? await rIva.json() : [];
        const selIva = document.getElementById("cr_CondIva");
        selIva.innerHTML = `<option value="">Seleccione</option>` +
            condIva.map(x => `<option value="${x.Id}">${x.Nombre || x.Descripcion || ("Cond IVA " + x.Id)}</option>`).join("");

        if (!Array.isArray(State.listas) || State.listas.length === 0) await cargarListasPrecios();
        const selLP = document.getElementById("cr_ListaPrecio");
        selLP.innerHTML = `<option value="">Seleccione</option>` +
            (State.listas || []).map(x => `<option value="${x.Id}">${x.Nombre || x.Descripcion || ("Lista " + x.Id)}</option>`).join("");

        // init select2 con dropdown en el modal
        if ($.fn.select2) {
            initSelect2Base("#cr_CondIva", { dropdownParent: $("#modalClienteRapido") });
            initSelect2Base("#cr_ListaPrecio", { dropdownParent: $("#modalClienteRapido") });
            removeEmptyOptionOnSelect("#cr_CondIva");
            removeEmptyOptionOnSelect("#cr_ListaPrecio");
        }

        // prefijar lista de precios con la de la venta
        if (State.listaPrecioId) {
            selLP.value = String(State.listaPrecioId);
            if ($.fn.select2) $("#cr_ListaPrecio").val(String(State.listaPrecioId)).trigger("change.select2");
        }

        // limpiar validación una vez inicializado (también para select2)
        ["#cr_Nombre", "#cr_CondIva", "#cr_ListaPrecio"].forEach(clearValidation);

        // live validation
        attachClienteRapidoLiveValidation();

        new bootstrap.Modal(document.getElementById("modalClienteRapido")).show();
    } catch (e) {
        console.error(e);
        errorModal?.("No se pudo abrir el alta rápida de cliente.");
    }
}

function validarClienteRapido() {
    let ok = true;
    const nombre = document.getElementById("cr_Nombre")?.value.trim();
    const condIva = document.getElementById("cr_CondIva")?.value;
    const listaPrecio = document.getElementById("cr_ListaPrecio")?.value;

    ok = (nombre ? setValid("#cr_Nombre") : setInvalid("#cr_Nombre")) && ok;
    ok = (condIva ? setValid("#cr_CondIva") : setInvalid("#cr_CondIva")) && ok;
    ok = (listaPrecio ? setValid("#cr_ListaPrecio") : setInvalid("#cr_ListaPrecio")) && ok;

    document.getElementById("cr_Error")?.classList.toggle("d-none", ok);
    return ok;
}

async function guardarClienteRapido() {
    try {
        __wasSubmitClienteRapido = true;
        if (!validarClienteRapido()) return;

        const payload = {
            Id: 0,
            Nombre: document.getElementById("cr_Nombre").value.trim(),
            Telefono: document.getElementById("cr_Telefono").value.trim(),
            TelefonoAlternativo: "",
            Dni: document.getElementById("cr_Dni").value.trim(),
            Cuit: document.getElementById("cr_Cuit").value.trim(),
            IdCondicionIva: document.getElementById("cr_CondIva").value || null,
            Domicilio: document.getElementById("cr_Domicilio").value.trim(),
            IdProvincia: null,
            Localidad: "",
            Email: document.getElementById("cr_Email").value.trim(),
            CodigoPostal: "",
            IdListaPrecio: document.getElementById("cr_ListaPrecio").value || null
        };

        const res = await fetch("/Clientes/Insertar", {
            method: "POST",
            headers: { Authorization: "Bearer " + (token || ""), "Content-Type": "application/json;charset=utf-8" },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error("No se pudo registrar el cliente.");
        const j = await res.json();

        await cargarClientes();

        let newId = (j?.Id || j?.id || j?.valor?.Id || 0);
        if (!newId) {
            const candidatos = (State.clientes || []).filter(c => (c.Nombre || "").trim().toLowerCase() === payload.Nombre.toLowerCase());
            if (candidatos.length) newId = Math.max(...candidatos.map(c => c.Id));
        }

        if (newId) {
            const cmb = document.getElementById("cmbCliente");
            cmb.value = String(newId);
            if ($.fn.select2) $("#cmbCliente").val(String(newId)).trigger("change.select2");
            State.clienteId = newId;
            clearValidation("#cmbCliente");
        }

        // si cambió LP en el alta, reflejar en la venta
        const selLP = document.getElementById("cr_ListaPrecio");
        if (selLP?.value && Number(selLP.value) !== Number(State.listaPrecioId)) {
            const cmbLP = document.getElementById("cmbListaPrecio");
            cmbLP.value = selLP.value;
            if ($.fn.select2) $("#cmbListaPrecio").val(selLP.value).trigger("change.select2");
            State.listaPrecioId = Number(selLP.value);
            if (State.items.length) { State.items = []; refrescarItems(); recalcularTotales(); }
        }

        exitoModal?.("Cliente registrado correctamente");
        bootstrap.Modal.getInstance(document.getElementById("modalClienteRapido"))?.hide();
        updateGates();
    } catch (e) {
        console.error(e);
        errorModal?.(e.message || "Error al registrar el cliente.");
    }
}
function resetClienteRapidoForm() {
    // valores
    ["#cr_Nombre", "#cr_Telefono", "#cr_Email", "#cr_Dni", "#cr_Cuit", "#cr_Domicilio"].forEach(sel => {
        const el = document.querySelector(sel);
        if (el) el.value = "";
    });
    // limpiar validaciones (nativo + select2)
    ["#cr_Nombre", "#cr_CondIva", "#cr_ListaPrecio"].forEach(clearValidation);
    const err = document.getElementById("cr_Error");
    if (err) err.classList.add("d-none");
}

function attachClienteRapidoLiveValidation() {
    // desengancho por si se abrió antes
    $(document)
        .off("input.cr change.cr", "#cr_Nombre,#cr_Telefono,#cr_Email,#cr_Dni,#cr_Cuit,#cr_Domicilio,#cr_CondIva,#cr_ListaPrecio");

    const applySingle = (sel) => {
        if (!__wasSubmitClienteRapido) return;
        if (sel === "#cr_Nombre") {
            document.querySelector(sel).value.trim() ? setValid(sel) : setInvalid(sel);
        } else if (sel === "#cr_CondIva" || sel === "#cr_ListaPrecio") {
            document.querySelector(sel).value ? setValid(sel) : setInvalid(sel);
        }
        // ocultar banner si todo OK
        document.getElementById("cr_Error")?.classList.toggle("d-none", validarClienteRapido(true));
    };

    // inputs comunes
    ["#cr_Nombre", "#cr_Telefono", "#cr_Email", "#cr_Dni", "#cr_Cuit", "#cr_Domicilio"].forEach(sel => {
        $(document).on("input.cr change.cr", sel, () => applySingle(sel));
    });

    // selects (nativo + select2)
    ["#cr_CondIva", "#cr_ListaPrecio"].forEach(sel => {
        $(document).on("change.cr", sel, () => applySingle(sel));
        if ($.fn.select2) {
            $(sel).on("select2:select select2:clear", () => applySingle(sel));
        }
    });
}

function validarClienteRapido(soloCheck = false) {
    let ok = true;
    ok = (document.getElementById("cr_Nombre").value.trim() ? setValid("#cr_Nombre") : setInvalid("#cr_Nombre")) && ok;
    ok = (document.getElementById("cr_CondIva").value ? setValid("#cr_CondIva") : setInvalid("#cr_CondIva")) && ok;
    ok = (document.getElementById("cr_ListaPrecio").value ? setValid("#cr_ListaPrecio") : setInvalid("#cr_ListaPrecio")) && ok;

    if (!soloCheck) {
        document.getElementById("cr_Error")?.classList.toggle("d-none", ok);
    }
    return ok;
}
