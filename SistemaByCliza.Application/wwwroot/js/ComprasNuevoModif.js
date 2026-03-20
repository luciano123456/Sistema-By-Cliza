// ===================== ComprasNuevoModif.js (COMPLETO) =====================
// Requiere: jQuery, Bootstrap 5, DataTables, Select2, moment.js y *site.js*
// Usa: token, confirmarModal, exitoModal, errorModal, advertenciaModal,
// formatearMiles, formatearSinMiles, etc. (definidas en site.js)
//
// Endpoints esperados (server):
//  GET  /Proveedores/Lista
//  GET  /Insumos/Lista
//  GET  /Cuentas/Lista
//  GET  /Compras/EditarInfo?id={id}
//  POST /Compras/Insertar
//  PUT  /Compras/Actualizar
//  DELETE /Compras/Eliminar?id={id}
//
// Notas importantes:
// - Tu entidad ComprasInsumo (según tu modelo) NO tiene IdInsumo. El front permite
//   elegir un insumo para tomar costo sugerido y mostrar nombre, pero al guardar
//   solo envía los campos que tu modelo declara (costos, %, cantidad, subtotal).
//   Si en tu VM **sí** manejás IdInsumo, descomentá el marcado “// (opcional: IdInsumo)”.
//

// ---------------- Estado global ----------------
let gridItems = null;
let gridPagos = null;
let isSaving = false;
let wasSubmitCompra = false; // feedback sólo después de intentar guardar
let wasSubmitPago = false;   // feedback en modal pago después de intentar registrar

const State = {
    idCompra: parseInt((document.getElementById("txtId")?.value || "0"), 10) || 0,
    proveedorId: 0,

    // maestros
    proveedores: [],
    insumosCat: [], // catálago de insumos (para combo del modal)
    cuentas: [],

    // detalle
    insumos: [],   // filas de compra (items)
    pagos: [],     // pagos (ComprasPago)

    editItemIndex: -1,
    editPagoIndex: -1,
};

// ---------------- Helpers numéricos / fechas ----------------
function _fmtNumber(n) { const v = parseFloat(n || 0); return new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v); }
function _toNumber(s) { if (typeof formatearSinMiles === "function") return parseFloat(formatearSinMiles(s || 0)); return parseFloat(String(s || "0").replace(/\./g, "").replace(",", ".")) || 0; }
function _toMiles(n) { if (typeof formatearMiles === "function") return formatearMiles(n); return _fmtNumber(n); }
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
    const onChange = () => {
        if (el.value && el.querySelector('option[value=""]')) {
            el.querySelector('option[value=""]').remove();
            if ($.fn.select2 && $(el).hasClass("select2-hidden-accessible")) $(el).trigger("change.select2");
            el.removeEventListener("change", onChange);
        }
    };
    el.addEventListener("change", onChange);
}

function isSelect2(el) { return !!(window.jQuery && $(el).hasClass("select2-hidden-accessible") && $(el).next(".select2").length); }
function getSelect2Selection(el) { return $(el).next(".select2").find(".select2-selection").get(0) || null; }
function getFeedbackAnchor(el) { return isSelect2(el) ? $(el).next(".select2").get(0) : el; }
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
    return false;
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

// ---------- Sincronizar State con combos ----------
function addComboSync(selector, stateKey, { extra = null } = {}) {
    const el = document.querySelector(selector);
    if (!el) return;
    const sync = () => {
        const v = el.value;
        State[stateKey] = v ? (isFinite(+v) ? +v : v) : 0;
        if (wasSubmitCompra) {
            State[stateKey] ? setValid(selector) : setInvalid(selector);
            updateFormErrorBannerCompra();
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
    if (dtp) { if (wasSubmitCompra) (dtp.value ? setValid(dtp) : setInvalid(dtp)); else clearValidation(dtp); }
    const elProv = document.getElementById("cmbProveedor");
    if (elProv) {
        State.proveedorId = elProv.value ? (isFinite(+elProv.value) ? +elProv.value : elProv.value) : 0;
        if (wasSubmitCompra) (State.proveedorId ? setValid(elProv) : setInvalid(elProv)); else clearValidation(elProv);
    }
    updateGates();
    updateFormErrorBannerCompra();
}

// Apaga TODA la validación visible (1ra apertura o reset)
async function hideInitialRequiredHintsCompra(root = document) {
    wasSubmitCompra = false;
    ["#dtpFecha", "#cmbProveedor"].forEach(clearValidation);
    root.querySelectorAll(".invalid-feedback").forEach(fb => fb.style.display = "none");
    document.getElementById("errorCamposCompra")?.classList.add("d-none");
    updateGates();
}

// ---------------- Gates ----------------
// Habilitar si hay Proveedor
function updateGates() {
    const ok = !!State.proveedorId;
    const btnItem = document.querySelector('button[onclick="abrirModalItem()"]') || document.getElementById("btnAgregarItem");
    const btnPago = document.querySelector('button[onclick="abrirModalPago()"]') || document.getElementById("btnAgregarPago");
    [btnItem, btnPago].forEach(b => { if (!b) return; b.disabled = !ok; b.classList.toggle("disabled", !ok); b.style.opacity = ok ? 1 : .6; b.style.pointerEvents = ok ? "auto" : "none"; });
}

// ---------------- Carga inicial ----------------
document.addEventListener("DOMContentLoaded", async () => {
    try {
        const dtp = document.getElementById("dtpFecha");
        if (dtp && !dtp.value) dtp.value = hoyISO();

        // Select2
        initSelect2Base("#cmbProveedor");
        removeEmptyOptionOnSelect("#cmbProveedor");

        // Listeners
        document.getElementById("dtpFecha")?.addEventListener("change", () => {
            if (!wasSubmitCompra) { clearValidation("#dtpFecha"); return; }
            document.getElementById("dtpFecha").value ? setValid("#dtpFecha") : setInvalid("#dtpFecha");
            updateFormErrorBannerCompra();
        });

        addComboSync("#cmbProveedor", "proveedorId", {
            extra: () => {
                // si cambia proveedor, limpiamos ítems y pagos
                if (State.insumos.length) { State.insumos = []; refrescarItems(); recalcularTotales(); }
                if (State.pagos.length) { State.pagos = []; refrescarPagos(); recalcularTotales(); }
                // filtrar combo de insumos por proveedor al abrir modal
            }
        });

        // Cargar datos de combos/maestros
        await Promise.all([cargarProveedores(), cargarInsumos(), cargarCuentas()]);

        // Grillas
        configurarTablaInsumos();
        configurarTablaPagos();

        // Exportar PDF
        document.getElementById("btnExportarCompraPdf")?.addEventListener("click", exportarCompraPdf);

        // Modo Edición / Nuevo
        const id = (new URLSearchParams(location.search).get("id")) || "";
        if (id) {
            State.idCompra = parseInt(id, 10);
            await cargarCompraExistente(State.idCompra);
            document.getElementById("btnEliminarCompra")?.classList.remove("d-none");
            setGuardarButtonMode("editar");
        } else {
            setGuardarButtonMode("crear");
            clearAllValidationCompra();
        }

        // Sync final
        syncStateFromUI();
        await hideInitialRequiredHintsCompra();
    } catch (e) { console.error(e); }
});

// ---------------- Fetch combos ----------------
async function cargarProveedores() {
    const r = await fetch("/Proveedores/Lista", { headers: { Authorization: "Bearer " + (token || "") } });
    const d = r.ok ? await r.json() : []; State.proveedores = d || [];
    const cmb = document.getElementById("cmbProveedor"); if (!cmb) return;
    cmb.innerHTML = `<option value="">Seleccione</option>` + State.proveedores.map(p => `<option value="${p.Id}">${p.Nombre || ("Proveedor " + p.Id)}</option>`).join("");
    if ($.fn.select2) $("#cmbProveedor").trigger("change.select2");
    syncStateFromUI();
}
async function cargarInsumos() {
    const r = await fetch("/Insumos/Lista", { headers: { Authorization: "Bearer " + (token || "") } });
    const d = r.ok ? await r.json() : []; State.insumosCat = d || [];
}
async function cargarCuentas() {
    const r = await fetch("/Cuentas/Lista", { headers: { Authorization: "Bearer " + (token || "") } });
    const d = r.ok ? await r.json() : []; State.cuentas = d || [];
}

// ---------------- Cargar Compra existente ----------------
async function cargarCompraExistente(id) {
    const r = await fetch(`/Compras/EditarInfo?id=${id}`, { headers: { Authorization: "Bearer " + (token || ""), "Content-Type": "application/json" } });
    if (!r.ok) { errorModal?.("No se pudo cargar la compra."); return; }
    const v = await r.json();

    // Cabecera
    const f = dateToInputValue(v.Fecha);
    const dtp = document.getElementById("dtpFecha"); if (dtp) dtp.value = f || hoyISO();
    document.getElementById("cmbProveedor").value = v.IdProveedor || "";
    if ($.fn.select2) $("#cmbProveedor").trigger("change.select2");
    syncStateFromUI();

    document.getElementById("txtNota").value = v.NotaInterna || "";

    // Ítems (sin IdInsumo en modelo; mostramos nombre si podemos inferir por costo y proveedor)
    State.insumos = (v.Insumos || []).map(i => ({
        id: i.Id || 0,
        // idInsumo: (opcional, si tu VM lo trae)
        insumoNombre: "", // no viene del back; queda vacío (—) en grilla
        cantidad: parseFloat(i.Cantidad || 0),
        costoUnitario: parseFloat(i.CostoUnitario || 0),
        porcDesc: parseFloat(i.PorcDescuento || 0),
        porcIva: parseFloat(i.PorcIva || 0),
        base: parseFloat(i.Cantidad || 0) * parseFloat(i.CostoUnitario || 0),
        descImporte: parseFloat(i.DescuentoTotal || 0),
        ivaImporte: parseFloat(i.IvaTotal || 0),
        subtotal: parseFloat(i.Subtotal || 0),
    }));
    refrescarItems();

    // Pagos
    State.pagos = (v.Pagos || []).map(p => ({
        id: p.Id || 0,
        fecha: dateToInputValue(p.Fecha),
        idCuenta: p.IdCuenta,
        cuentaNombre: p.Cuenta || "", // si el back no lo trae, quedará vacío
        concepto: p.Concepto || "PAGO COMPRA",
        importe: parseFloat(p.Importe || 0),
        nota: p.NotaInterna || ""
    }));
    refrescarPagos();

    recalcularTotales();
    updateGates();
}

// ---------------- DataTables: Insumos ----------------
function recalcItemDerived(it) {
    const base = (parseFloat(it.cantidad) || 0) * (parseFloat(it.costoUnitario) || 0);
    const descImporte = base * ((parseFloat(it.porcDesc) || 0) / 100);
    const baseCd = base - descImporte;
    const ivaImporte = baseCd * ((parseFloat(it.porcIva) || 0) / 100);
    const subtotal = baseCd + ivaImporte;
    it.base = base; it.descImporte = descImporte; it.ivaImporte = ivaImporte; it.subtotal = subtotal;
}
function configurarTablaInsumos() {
    if (gridItems) return;
    gridItems = $("#grd_Insumos").DataTable({
        data: [], language: { url: "//cdn.datatables.net/plug-ins/2.0.7/i18n/es-MX.json" }, scrollX: true,
        columns: [
            {
                data: null, orderable: false, width: "60px", className: "text-center",
                render: (_, __, ___, meta) => `
          <button class="btn btn-link p-0 me-2 text-success" title="Editar" onclick="editarItem(${meta.row})"><i class="fa fa-pencil"></i></button>
          <button class="btn btn-link p-0 text-danger" title="Eliminar" onclick="eliminarItem(${meta.row})"><i class="fa fa-trash"></i></button>`
            },
            { data: "insumoNombre", title: "Insumo", render: v => v || "<span class='text-muted'>—</span>" },
            { data: "cantidad", className: "text-end", title: "Cant", render: v => _fmtNumber(v) },
            { data: "costoUnitario", className: "text-end", title: "C.Unit", render: v => `$ ${_fmtNumber(v)}` },
            { data: "porcDesc", className: "text-end", title: "Desc%", render: v => `${_fmtNumber(v)} %` },
            { data: "porcIva", className: "text-end", title: "IVA%", render: v => `${_fmtNumber(v)} %` },
            { data: "subtotal", className: "text-end", title: "Subtotal", render: v => `$ ${_fmtNumber(v)}` }
        ],
        order: [[1, "asc"]], dom: "t", pageLength: 1000
    });
}
function refrescarItems() { if (!gridItems) return; gridItems.clear().rows.add(State.insumos).draw(); }

// ---------------- DataTables: Pagos ----------------
function configurarTablaPagos() {
    if (gridPagos) return;
    gridPagos = $("#grd_Pagos").DataTable({
        data: [], language: { url: "//cdn.datatables.net/plug-ins/2.0.7/i18n/es-MX.json" }, scrollX: true,
        columns: [
            {
                data: null, orderable: false, width: "60px", className: "text-center",
                render: (_, __, ___, meta) => `
          <button class="btn btn-link p-0 me-2 text-success" title="Editar" onclick="editarPago(${meta.row})"><i class="fa fa-pencil"></i></button>
          <button class="btn btn-link p-0 text-danger" title="Eliminar" onclick="eliminarPago(${meta.row})"><i class="fa fa-trash"></i></button>`
            },
            { data: "fecha", render: f => formatearFechaParaVista(f), title: "Fecha" },
            { data: "cuentaNombre", title: "Cuenta" },
            { data: "concepto", title: "Concepto" },
            { data: "importe", className: "text-end", title: "Importe", render: v => `$ ${_fmtNumber(v)}` },
            { data: "nota", title: "Nota" }
        ],
        order: [[1, "desc"]], dom: "t", pageLength: 1000
    });
}
function refrescarPagos() { if (!gridPagos) return; gridPagos.clear().rows.add(State.pagos).draw(); }

// ---------------- Modal Item (Insumo) ----------------
window.abrirModalItem = async function () {
    if (!(State.proveedorId)) {
        advertenciaModal?.("Seleccioná un Proveedor antes de agregar ítems."); return;
    }
    State.editItemIndex = -1;

    // Botón verde → Registrar
    const btn = document.querySelector("#modalItem .modal-footer .btn.btn-success");
    if (btn) btn.innerHTML = `<i class="fa fa-check me-1"></i> Registrar`;

    // Combo de Insumo (filtrado por proveedor si coincide)
    const lista = (State.insumosCat || []).filter(x => !x.IdProveedor || !State.proveedorId || x.IdProveedor === State.proveedorId);
    const cmb = document.getElementById("cmbItemInsumo");
    cmb.innerHTML = `<option value="">Seleccione</option>` + lista.map(p => `<option value="${p.Id}" data-costo="${p.CostoUnitario || 0}">${p.Descripcion}</option>`).join("");
    initSelect2Base("#cmbItemInsumo", { dropdownParent: $("#modalItem") });
    removeEmptyOptionOnSelect("#cmbItemInsumo");

    document.getElementById("txtItemCant").value = "1";
    document.getElementById("txtItemCosto").value = "";
    document.getElementById("txtItemDesc").value = "0";
    document.getElementById("txtItemIva").value = "21";
    document.getElementById("txtItemSubtotal").value = "$ 0,00";
    setItemInputsEnabled(true);

    attachItemEvents();
    document.getElementById("errorCamposItem")?.classList.add("d-none");

    new bootstrap.Modal(document.getElementById("modalItem")).show();
};
function setItemInputsEnabled(enabled) {
    ["txtItemCant", "txtItemCosto", "txtItemDesc", "txtItemIva"].forEach(id => {
        const el = document.getElementById(id); if (!el) return;
        el.disabled = !enabled; el.classList.toggle("disabled", !enabled); el.style.opacity = enabled ? 1 : .7;
    });
}
function attachItemEvents() {
    const cmb = document.getElementById("cmbItemInsumo");
    const changeInsumo = async () => {
        const idIns = parseInt(cmb.value || 0, 10);
        if (!idIns) { document.getElementById("txtItemCosto").value = ""; document.getElementById("txtItemSubtotal").value = "$ 0,00"; return; }
        const opt = cmb.selectedOptions[0];
        const sugerido = parseFloat(opt?.dataset?.costo || 0);
        document.getElementById("txtItemCosto").value = _toMiles(sugerido || 0);
        recalcularSubtotalModal();
    };
    cmb.onchange = changeInsumo;
    ["txtItemCant", "txtItemCosto", "txtItemDesc", "txtItemIva"].forEach(id => { const el = document.getElementById(id); if (el) el.oninput = recalcularSubtotalModal; });
}
function recalcularSubtotalModal() {
    const qty = _toNumber(document.getElementById("txtItemCant").value);
    const costo = _toNumber(document.getElementById("txtItemCosto").value);
    const desc = _toNumber(document.getElementById("txtItemDesc").value);
    const iva = _toNumber(document.getElementById("txtItemIva").value);

    const base = qty * costo;
    const descImporte = base * (desc / 100);
    const baseCd = base - descImporte;
    const ivaImporte = baseCd * (iva / 100);
    const subtotal = baseCd + ivaImporte;
    document.getElementById("txtItemSubtotal").value = `$ ${_fmtNumber(subtotal)}`;
}
window.guardarItem = function () {
    const idIns = parseInt(document.getElementById("cmbItemInsumo").value || 0, 10);
    const cant = _toNumber(document.getElementById("txtItemCant").value);
    const costo = _toNumber(document.getElementById("txtItemCosto").value);
    const desc = _toNumber(document.getElementById("txtItemDesc").value);
    const iva = _toNumber(document.getElementById("txtItemIva").value);

    const okCampos = costo >= 0 && cant > 0; // si querés volver obligatorio seleccionar insumo: && idIns
    if (!okCampos) { setInvalid("#cmbItemInsumo"); document.getElementById("errorCamposItem")?.classList.remove("d-none"); return; }
    document.getElementById("errorCamposItem")?.classList.add("d-none");

    const nombre = document.getElementById("cmbItemInsumo").selectedOptions[0]?.textContent?.trim() || "";

    const base = cant * costo;
    const descImporte = base * (desc / 100);
    const baseCd = base - descImporte;
    const ivaImporte = baseCd * (iva / 100);
    const subtotal = baseCd + ivaImporte;

    const row = {
        id: 0,
        // idInsumo: idIns,                 // (opcional: si tu VM lo maneja)
        insumoNombre: nombre,
        cantidad: cant,
        costoUnitario: costo,
        porcDesc: desc,
        porcIva: iva,
        base, descImporte, ivaImporte, subtotal
    };

    if (State.editItemIndex >= 0) State.insumos[State.editItemIndex] = { ...State.insumos[State.editItemIndex], ...row };
    else State.insumos.push(row);

    State.editItemIndex = -1;
    refrescarItems(); recalcularTotales();
    bootstrap.Modal.getInstance(document.getElementById("modalItem"))?.hide();
};
window.editarItem = async function (idx) {
    const it = State.insumos[idx]; if (!it) return;
    State.editItemIndex = idx;

    // Botón verde → Guardar
    const btn = document.querySelector("#modalItem .modal-footer .btn.btn-success");
    if (btn) btn.innerHTML = `<i class="fa fa-check me-1"></i> Guardar`;

    const lista = (State.insumosCat || []).filter(x => !x.IdProveedor || !State.proveedorId || x.IdProveedor === State.proveedorId);
    const cmb = document.getElementById("cmbItemInsumo");
    cmb.innerHTML = `<option value="">Seleccione</option>` + lista.map(p => `<option value="${p.Id}" data-costo="${p.CostoUnitario || 0}">${p.Descripcion}</option>`).join("");
    initSelect2Base("#cmbItemInsumo", { dropdownParent: $("#modalItem") });
    removeEmptyOptionOnSelect("#cmbItemInsumo");

    // Intentar matchear por nombre si existe
    if (it.insumoNombre) {
        const opt = [...cmb.options].find(o => (o.textContent || "").trim() === it.insumoNombre);
        if (opt) cmb.value = opt.value;
    }
    if ($.fn.select2) $("#cmbItemInsumo").trigger("change.select2");

    document.getElementById("txtItemCant").value = _toMiles(it.cantidad);
    document.getElementById("txtItemCosto").value = _toMiles(it.costoUnitario);
    document.getElementById("txtItemDesc").value = _toMiles(it.porcDesc);
    document.getElementById("txtItemIva").value = _toMiles(it.porcIva);
    setItemInputsEnabled(true);
    attachItemEvents();
    recalcularSubtotalModal();

    document.getElementById("errorCamposItem")?.classList.add("d-none");
    new bootstrap.Modal(document.getElementById("modalItem")).show();
};
window.eliminarItem = async function (idx) {
    const ok = await confirmarModal("¿Eliminar el ítem?"); if (!ok) return;
    State.insumos.splice(idx, 1);
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
    const imp = _toNumber(document.getElementById("txtPagoImporte")?.value);

    let ok = true;
    if (!f) ok = setInvalid("#dtpPagoFecha") && ok; else ok = setValid("#dtpPagoFecha") && ok;
    if (!c) ok = setInvalid("#cmbCuenta") && ok; else ok = setValid("#cmbCuenta") && ok;
    if (!(imp > 0)) ok = setInvalid("#txtPagoImporte") && ok; else ok = setValid("#txtPagoImporte") && ok;

    document.getElementById("errorCamposPago")?.classList.toggle("d-none", ok);
    return ok;
}
function attachPagoLiveValidation() {
    const apply = () => { if (!wasSubmitPago) return; validarPagoCampos(); };
    ["dtpPagoFecha", "cmbCuenta", "txtPagoImporte", "txtPagoNota", "txtPagoConcepto"].forEach(id => {
        const el = document.getElementById(id); if (!el) return;
        ["input", "change"].forEach(evt => { el.addEventListener(evt, apply); });
    });
}
window.abrirModalPago = function () {
    if (!State.proveedorId) { advertenciaModal?.("Seleccioná Proveedor antes de registrar pagos."); return; }
    State.editPagoIndex = -1; wasSubmitPago = false; resetPagoValidation();

    // Título → Registrar Pago
    const title = document.querySelector("#modalPago .modal-title");
    if (title) title.innerHTML = `<i class="fa fa-plus-circle me-2 text-success"></i>Registrar Pago`;

    document.getElementById("dtpPagoFecha").value = hoyISO();
    const cmb = document.getElementById("cmbCuenta");
    cmb.innerHTML = `<option value="">Seleccione</option>` + State.cuentas.map(c => `<option value="${c.Id}">${c.Nombre || c.Descripcion || ("Cuenta " + c.Id)}</option>`).join("");

    document.getElementById("txtPagoImporte").value = "";
    document.getElementById("txtPagoNota").value = "";
    document.getElementById("txtPagoConcepto").value = "PAGO COMPRA";

    attachPagoLiveValidation();
    new bootstrap.Modal(document.getElementById("modalPago")).show();
};
window.guardarPago = function () {
    wasSubmitPago = true;
    if (!validarPagoCampos()) return;

    const fecha = document.getElementById("dtpPagoFecha").value;
    const idCuenta = parseInt(document.getElementById("cmbCuenta").value || 0, 10);
    const cuentaNombre = document.getElementById("cmbCuenta").selectedOptions[0]?.textContent || "";
    const concepto = (document.getElementById("txtPagoConcepto").value || "PAGO COMPRA").trim() || "PAGO COMPRA";
    const importe = _toNumber(document.getElementById("txtPagoImporte").value);
    const nota = (document.getElementById("txtPagoNota").value || "").trim();

    const tot = calcularTotalesInterno();
    const pagadoExcl = State.pagos.reduce((acc, p, i) => (State.editPagoIndex >= 0 && i === State.editPagoIndex) ? acc : acc + (parseFloat(p.importe) || 0), 0);
    if ((pagadoExcl + importe) - tot.total > 1e-6) { errorModal?.(`El pago supera el total de la compra ($${_fmtNumber(tot.total)}).`); return; }

    const row = { id: 0, fecha, idCuenta, cuentaNombre, concepto, importe, nota };
    if (State.editPagoIndex >= 0) { State.pagos[State.editPagoIndex] = { ...State.pagos[State.editPagoIndex], ...row }; State.editPagoIndex = -1; }
    else State.pagos.push(row);

    refrescarPagos(); recalcularTotales();
    bootstrap.Modal.getInstance(document.getElementById("modalPago"))?.hide();
};
window.editarPago = function (idx) {
    const p = State.pagos[idx]; if (!p) return;
    State.editPagoIndex = idx; wasSubmitPago = false; resetPagoValidation();

    // Título → Editar Pago
    const title = document.querySelector("#modalPago .modal-title");
    if (title) title.innerHTML = `<i class="fa fa-pen-to-square me-2 text-success"></i>Editar Pago`;

    document.getElementById("dtpPagoFecha").value = dateToInputValue(p.fecha) || hoyISO();
    const cmb = document.getElementById("cmbCuenta");
    cmb.innerHTML = `<option value="">Seleccione</option>` + State.cuentas.map(c => `<option value="${c.Id}">${c.Nombre || c.Descripcion || ("Cuenta " + c.Id)}</option>`).join("");
    document.getElementById("cmbCuenta").value = p.idCuenta;
    document.getElementById("txtPagoConcepto").value = p.concepto || "PAGO COMPRA";
    document.getElementById("txtPagoImporte").value = _toMiles(p.importe);
    document.getElementById("txtPagoNota").value = p.nota || "";

    attachPagoLiveValidation();
    new bootstrap.Modal(document.getElementById("modalPago")).show();
};
window.eliminarPago = async function (idx) {
    const ok = await confirmarModal("¿Eliminar este pago?"); if (!ok) return;
    State.pagos.splice(idx, 1); refrescarPagos(); recalcularTotales();
};

// ---------------- Totales / Guardar / Eliminar ----------------
function calcularTotalesInterno() {
    let sub = 0, desc = 0, iva = 0;
    for (const it of State.insumos) { sub += it.base; desc += it.descImporte; iva += it.ivaImporte; }
    const total = sub - desc + iva;
    return { sub, desc, iva, total };
}
function recalcularTotales() {
    const t = calcularTotalesInterno();
    document.getElementById("statSub") && (document.getElementById("statSub").textContent = `$ ${_fmtNumber(t.sub)}`);
    document.getElementById("statDesc") && (document.getElementById("statDesc").textContent = `$ ${_fmtNumber(t.desc)}`);
    document.getElementById("statIva") && (document.getElementById("statIva").textContent = `$ ${_fmtNumber(t.iva)}`);
    document.getElementById("statTotal") && (document.getElementById("statTotal").textContent = `$ ${_fmtNumber(t.total)}`);

    const abonado = (State.pagos || []).reduce((a, p) => a + (parseFloat(p.importe) || 0), 0);
    const restante = Math.max(t.total - abonado, 0);
    const elAb = document.getElementById("statAbonado");
    const elRs = document.getElementById("statRestante");
    if (elAb) elAb.textContent = `$ ${_fmtNumber(abonado)}`;
    if (elRs) { elRs.textContent = `$ ${_fmtNumber(restante)}`; elRs.classList.toggle("text-success", restante <= 0.000001); elRs.classList.toggle("text-warning", restante > 0.000001); }
}
function setGuardarButtonMode(mode) {
    const btn = document.getElementById("btnGuardarCompra"); if (!btn) return;
    const icon = '<i class="fa fa-check me-1"></i>';
    btn.innerHTML = icon + (mode === "editar" ? "Guardar" : "Registrar");
}
function camposCompraValidos() {
    let ok = true;
    ok = (document.getElementById("dtpFecha").value ? setValid("#dtpFecha") : setInvalid("#dtpFecha")) && ok;
    ok = (State.proveedorId ? setValid("#cmbProveedor") : setInvalid("#cmbProveedor")) && ok;
    return ok;
}
function updateFormErrorBannerCompra() {
    const ok = camposCompraValidos();
    const errorDiv = document.getElementById("errorCamposCompra");
    if (errorDiv) errorDiv.classList.toggle("d-none", ok);
    return ok;
}
function clearAllValidationCompra() {
    wasSubmitCompra = false;
    ["#dtpFecha", "#cmbProveedor"].forEach(clearValidation);
    document.getElementById("errorCamposCompra")?.classList.add("d-none");
}

window.guardarCompra = async function () {
    if (isSaving) return;

    wasSubmitCompra = true;
    if (!updateFormErrorBannerCompra()) return;
    if (State.insumos.length === 0) { errorModal?.("Agregá al menos un insumo."); return; }

    const fecha = document.getElementById("dtpFecha").value;
    const notaInterna = (document.getElementById("txtNota")?.value || "").trim();
    const tot = calcularTotalesInterno();

    const payload = {
        Id: State.idCompra || 0, Fecha: fecha,
        IdProveedor: State.proveedorId, IdCuentaCorriente: 0,
        Subtotal: tot.sub, Descuentos: tot.desc, TotalIva: tot.iva, ImporteTotal: tot.total,
        NotaInterna: notaInterna,
        Insumos: State.insumos.map(i => ({
            Id: i.id || 0,
            IdCompra: State.idCompra || 0,
            // IdInsumo: i.idInsumo || 0, // (opcional si tu VM lo admite)
            CostoUnitario: i.costoUnitario,
            PorcDescuento: i.porcDesc,
            DescuentoUnit: i.costoUnitario * (i.porcDesc / 100),
            DescuentoTotal: i.descImporte,
            CostoUnitCdesc: i.costoUnitario * (1 - i.porcDesc / 100),
            PorcIva: i.porcIva,
            IvaUnit: i.costoUnitario * (1 - i.porcDesc / 100) * (i.porcIva / 100),
            IvaTotal: i.ivaImporte,
            CostoUnitFinal: i.costoUnitario * (1 - i.porcDesc / 100) * (1 + i.porcIva / 100),
            Cantidad: i.cantidad,
            Subtotal: i.subtotal
        })),
        Pagos: State.pagos.map(p => ({
            Id: p.id || 0, Fecha: p.fecha, IdCuenta: p.idCuenta,
            Concepto: p.concepto || "PAGO COMPRA",
            Importe: p.importe, NotaInterna: p.nota
        }))
    };

    const url = State.idCompra ? "/Compras/Actualizar" : "/Compras/Insertar";
    const method = State.idCompra ? "PUT" : "POST";

    try {
        isSaving = true;
        const res = await fetch(url, {
            method, headers: { Authorization: "Bearer " + (token || ""), "Content-Type": "application/json;charset=utf-8" },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error(res.statusText);
        const r = await res.json();
        if ((r === true) || (r?.valor === true) || (r?.valor === "OK")) { exitoModal?.(State.idCompra ? "Compra actualizada" : "Compra registrada"); volverIndex(); }
        else { errorModal?.("No se pudo guardar la compra."); }
    } catch (e) {
        console.error(e); errorModal?.("Error al guardar la compra.");
    } finally { isSaving = false; }
};

window.eliminarCompra = async function () {
    if (!State.idCompra) return;
    const ok = await confirmarModal("¿Eliminar esta compra?"); if (!ok) return;
    try {
        const r = await fetch(`/Compras/Eliminar?id=${State.idCompra}`, { method: "DELETE", headers: { Authorization: "Bearer " + (token || "") } });
        const j = await r.json();
        if (!r.ok || !j?.valor) throw new Error(j?.mensaje || "No se pudo eliminar.");
        exitoModal("Eliminado correctamente"); volverIndex();
    } catch (e) {
        console.error(e); errorModal(e?.message || "Error al eliminar");
    }
};
window.volverIndex = function () { window.location.href = "/Compras/Index"; };

// ================== Exportación PDF ==================
function _textSel(id) { const el = document.getElementById(id); return el?.selectedOptions?.[0]?.text?.trim() || ""; }
let __logoDataURL = null;
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
function _calcTotalesC() {
    let sub = 0, desc = 0, iva = 0;
    for (const it of (State.insumos || [])) { sub += Number(it.base || (it.cantidad || 0) * (it.costoUnitario || 0)); desc += Number(it.descImporte || 0); iva += Number(it.ivaImporte || 0); }
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

async function exportarCompraPdf() {
    if (!Array.isArray(State.insumos) || State.insumos.length === 0) { errorModal?.("Agregá al menos un insumo para exportar."); return; }
    const { jsPDF } = window.jspdf || {}; if (!jsPDF || !window.jspdf?.jsPDF?.API?.autoTable) { errorModal?.("Falta jsPDF y/o autoTable en la página."); return; }
    const doc = new jsPDF({ unit: "pt", format: "a4" }); const W = doc.internal.pageSize.getWidth(); const H = doc.internal.pageSize.getHeight(); const padX = 40;
    const DARK = [20, 28, 38], TXT = [33, 33, 33];

    doc.setFillColor(...DARK); doc.rect(0, 0, W, 105, "F");
    const logo = await (_loadLogoDataURL?.()); if (logo) { try { doc.addImage(logo, "PNG", padX, 22, 120, 45, undefined, "FAST"); } catch { } } else { doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.setTextColor(255); doc.text("Tu Empresa", padX, 55); }

    doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.text("Comprobante de Compra", W - padX, 40, { align: "right" });
    const fecha = document.getElementById("dtpFecha")?.value || hoyISO();
    doc.setFont("helvetica", "normal"); doc.setFontSize(11); doc.text(`Fecha: ${formatearFechaParaVista(fecha)}`, W - padX, 62, { align: "right" });
    const proveedorTexto = _textSel("cmbProveedor") || "—"; doc.text(`Proveedor: ${proveedorTexto}`, W - padX, 80, { align: "right" });

    let y = 135;
    doc.setTextColor(...TXT); doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.text("Datos de la operación", padX, y); y += 16;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold"); doc.text("Proveedor:", padX, y); doc.setFont("helvetica", "normal"); doc.text(proveedorTexto, padX + 70, y);
    y += 14; _hr(doc, y); y += 18;

    const fixedCols = [{ header: "Cant", width: 60 }, { header: "C.Unit", width: 90 }, { header: "Subtotal", width: 110 }];
    const fixedWidth = fixedCols.reduce((a, c) => a + c.width, 0);
    const firstColWidth = Math.max(220, (W - padX * 2) - fixedWidth - 2);

    const itemsBody = (State.insumos || []).map(it => {
        const ins = it.insumoNombre || "Insumo";
        const subtotalLinea = Number(it.subtotal ?? ((it.cantidad || 0) * (it.costoUnitario || 0)));
        return [ins, _fmtNumber(it.cantidad), `$ ${_fmtNumber(it.costoUnitario)}`, `$ ${_fmtNumber(subtotalLinea)}`];
    });

    doc.autoTable({
        startY: y, head: [["Insumo", ...fixedCols.map(c => c.header)]], body: itemsBody, theme: "grid",
        margin: { left: padX, right: padX },
        styles: { fontSize: 10, cellPadding: 6, overflow: "linebreak", valign: "top" },
        headStyles: { fillColor: DARK, textColor: [255, 255, 255] },
        bodyStyles: { textColor: TXT, lineWidth: .1 },
        alternateRowStyles: { fillColor: [247, 248, 250] },
        columnStyles: { 0: { cellWidth: firstColWidth }, 1: { halign: "right", cellWidth: fixedCols[0].width }, 2: { halign: "right", cellWidth: fixedCols[1].width }, 3: { halign: "right", cellWidth: fixedCols[2].width } }
    });

    y = doc.lastAutoTable.finalY + 18;

    const { sub, desc, iva, total, abonado, restante } = _calcTotalesC();
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
    const prov = (proveedorTexto || "Proveedor").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "_");
    const nombre = `Comprobante_Compra_${formatearFechaParaVista(fecha)}_${prov}.pdf`;
    doc.save(nombre);
}
