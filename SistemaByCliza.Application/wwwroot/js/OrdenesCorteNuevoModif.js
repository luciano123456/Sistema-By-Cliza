
let gridProductos = null, gridInsumos = null, gridEtapas = null;
let wasSubmitOC = false, wasSubmitItem = false, wasSubmitInsumo = false, wasSubmitEtapa = false;
let isSaving = false;

const State = {
    idOC: 0,
    // cabecera
    fechaInicio: null, idEstado: 0, idPersonal: 0,
    aProducir: 0, producidas: 0, difCorte: 0, finalReal: 0, difFinal: 0,
    largo: 0, ancho: 0, capas: 0, horaIni: "", horaFin: "",
    // detalle
    items: [], insumos: [], etapas: [],
    // catálogos
    productos: [], personal: [], estadosOC: [], insumosCat: [], talleres: [], etapasEstados: [],
    editItemIndex: -1, editInsumoIndex: -1, editEtapaIndex: -1
};

/* ---------------- helpers numéricos/fechas ---------------- */
function _fmtNumber(n) { const v = parseFloat(n || 0); return new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v); }
function _toNumber(s) { return parseFloat(String(s ?? "0").replace(/\./g, "").replace(",", ".")) || 0; }
function _toMiles(n) { if (typeof formatearMiles === "function") return formatearMiles(n); return _fmtNumber(n); }
const hoyISO = () => moment().format("YYYY-MM-DD");

// Usa helpers del proyecto si existen; si no, fallback compatible
const fInput = (f) => {
    if (typeof formatearFechaParaInput === "function") return formatearFechaParaInput(f);
    const m = moment(f, [moment.ISO_8601, "YYYY-MM-DD HH:mm:ss", "YYYY-MM-DD"]);
    return m.isValid() ? m.format("YYYY-MM-DD") : "";
};
const fView = (f) => {
    if (typeof formatearFechaParaVista === "function") return formatearFechaParaVista(f);
    const m = moment(f, [moment.ISO_8601, "YYYY-MM-DD HH:mm:ss", "YYYY-MM-DD"]);
    return m.isValid() ? m.format("DD/MM/YYYY") : "";
};

/* ===== Helpers fecha/hora ===== */
function setDateInput(id, value) { const el = document.getElementById(id); if (el) el.value = value ? fInput(value) : ""; }
function setTimeInput(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = hInput(value); // <--- SIEMPRE HH:mm
}

function getFechaInicioISO() {
    const raw = document.getElementById("dtpFechaInicio")?.value || "";
    const m = moment(raw, ["YYYY-MM-DD", "DD/MM/YYYY", moment.ISO_8601], true);
    return m.isValid() ? m.format("YYYY-MM-DD") : moment().format("YYYY-MM-DD");
}
/* Botón principal */
function syncSaveButton() {
    const btn = document.getElementById("btnGuardarOC");
    if (!btn) return;
    btn.innerHTML = State.idOC > 0
        ? `<i class="fa fa-save me-1"></i> Guardar`
        : `<i class="fa fa-check me-1"></i> Registrar`;
}

/* ---------------- UI helpers: Select2 + invalid feedback ---------------- */
function initSelect2Base(sel, opts = {}) {
    if (!window.jQuery || !$.fn.select2) return;
    const $el = $(sel); if (!$el.length) return;
    const $parentModal = $el.closest('.modal');
    const def = {
        theme: "bootstrap-5", width: "100%", placeholder: "Seleccione",
        language: { noResults: () => "No hay resultados", searching: () => "Buscando..." },
        dropdownParent: $parentModal.length ? $parentModal : $(document.body)
    };
    if ($el.hasClass("select2-hidden-accessible")) $el.select2('destroy');
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
        fb = document.createElement("div"); fb.className = "invalid-feedback"; fb.style.display = "none";
        anchor?.parentNode?.insertBefore(fb, anchor.nextSibling);
    }
    return fb;
}
function setInvalid(selector, msg = "Campo obligatorio") {
    const el = typeof selector === "string" ? document.querySelector(selector) : selector;
    if (!el) return false;
    let target = el; if (isSelect2(el)) { const s2 = getSelect2Selection(el); if (s2) target = s2; }
    target.classList.remove("is-valid"); target.classList.add("is-invalid");
    const fb = ensureInvalidFeedback(el); if (fb) { fb.textContent = msg; fb.style.display = "block"; }
    return false;
}
function setValid(selector) {
    const el = typeof selector === "string" ? document.querySelector(selector) : selector;
    if (!el) return true;
    let target = el; if (isSelect2(el)) { const s2 = getSelect2Selection(el); if (s2) target = s2; }
    target.classList.remove("is-invalid"); target.classList.add("is-valid");
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

/* ---------------- Marcado visual editable vs auto ---------------- */
function markAutoEditable() {
    const autoIds = ["txtCantAProducir", "txtDifCorte", "txtCantFinalReal", "txtDifFinalReal", "txtEtDif", "txtEtDiasReales", "dtpEtSalidaAprox"];
    const editableIds = ["txtCantProducidas", "txtLargo", "txtAncho", "txtCapas", "txtEtAP", "txtEtP", "txtEtNota", "dtpEtEntrada", "dtpEtSalidaReal", "cmbTaller", "cmbEtEstado"];
    autoIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.classList.add("auto-field");
            // salida aprox no editable
            if (id === "dtpEtSalidaAprox") {
                el.readOnly = true;
                el.setAttribute("tabindex", "-1");
                el.addEventListener("keydown", e => e.preventDefault());
                el.addEventListener("keypress", e => e.preventDefault());
                el.addEventListener("paste", e => e.preventDefault());
                el.addEventListener("focus", function () { this.blur(); });
            } else {
                el.readOnly = true;
                el.setAttribute("tabindex", "-1");
            }
        }
    });
    editableIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.classList.add("editable-field"); el.readOnly = false; el.removeAttribute("tabindex"); }
    });
}

/* ---------------- Debounce helper ---------------- */
function debounce(fn, wait = 120) { let t = null; return (...a) => { clearTimeout(t); t = setTimeout(() => fn.apply(null, a), wait); }; }

/* ---------------- Init ---------------- */
document.addEventListener("DOMContentLoaded", async () => {
    State.idOC = parseInt((document.getElementById("txtId")?.value || "0"), 10) || 0;
    const dtp = document.getElementById("dtpFechaInicio"); if (dtp && !dtp.value) dtp.value = hoyISO();

    // Select2
    ["#cmbEstado", "#cmbPersonal", "#cmbProdModal", "#cmbInsumo", "#cmbTaller", "#cmbEtEstado"].forEach(s => { initSelect2Base(s); removeEmptyOptionOnSelect(s); });

    // Live revalidation cabecera
    const wireHead = (id) => {
        const el = document.getElementById(id); if (!el) return;
        const apply = () => { if (!wasSubmitOC) { clearValidation(el); } else { el.value ? setValid(el) : setInvalid(el); } updateBanner(); };
        ["change", "input"].forEach(e => el.addEventListener(e, apply));
        if ($.fn.select2) $(el).on("select2:select select2:clear", apply);
    };
    ["dtpFechaInicio", "cmbEstado", "cmbPersonal"].forEach(wireHead);

    // Producidas => recalcular
    bindProducidasRecalc();

    await Promise.all([loadEstados(), loadPersonal(), loadProductos(), loadInsumos(), loadTalleres(), loadEtapasEstados()]);

    configTablaProductos();
    configTablaInsumos();
    configTablaEtapas();

    if (State.idOC) {
        await cargarOC(State.idOC);
        document.getElementById("btnEliminarOC")?.classList.remove("d-none");
    }

    markAutoEditable();
    syncSaveButton();
    await hideInitial();
    recomputeAll(); // coherencia inicial
});

/* ---- Binding robusto para #txtCantProducidas ---- */
function bindProducidasRecalc() {
    const el = document.getElementById("txtCantProducidas");
    if (!el) return;
    const recalc = debounce(() => { const v = _toNumber(el.value); el.value = _toMiles(v); recomputeAll(); }, 80);
    ["input", "change", "keyup", "blur"].forEach(ev => el.addEventListener(ev, recalc));
    try { el.addEventListener("formatted", recalc); } catch { }
}

/* ---------------- Ocultar pistas iniciales ---------------- */
async function hideInitial() {
    wasSubmitOC = false;
    ["#dtpFechaInicio", "#cmbEstado", "#cmbPersonal", "#cmbProdModal"].forEach(clearValidation);
    document.getElementById("errorCamposOC")?.classList.add("d-none");
}

/* ---------------- util fetch con fallbacks ---------------- */
async function fetchFirstOk(urls, opts) {
    for (const u of urls) {
        try { const r = await fetch(u, opts); if (r.ok) return await r.json(); } catch (_) { }
    }
    return null;
}
const authHeaders = () => ({ headers: { Authorization: "Bearer " + (token || "") } });

/* ---------------- Catálogos ---------------- */
async function loadEstados() {
    const data = await fetchFirstOk(["/OrdenesCorte/Estados", "/OrdenesCorteEstados/Lista"], authHeaders());
    State.estadosOC = Array.isArray(data) ? data : [];
    const cmb = document.getElementById("cmbEstado");
    if (cmb) { cmb.innerHTML = `<option value="">Seleccione</option>` + State.estadosOC.map(x => `<option value="${x.Id}">${x.Nombre}</option>`).join(""); if ($.fn.select2) { initSelect2Base("#cmbEstado"); $("#cmbEstado").trigger("change.select2"); } }
}
async function loadPersonal() {
    const r = await fetch("/Personal/Lista", authHeaders());
    State.personal = r.ok ? await r.json() : [];
    const cmb = document.getElementById("cmbPersonal");
    if (cmb) { cmb.innerHTML = `<option value="">Seleccione</option>` + State.personal.map(x => `<option value="${x.Id}">${x.Nombre}</option>`).join(""); if ($.fn.select2) { initSelect2Base("#cmbPersonal"); $("#cmbPersonal").trigger("change.select2"); } }
}
async function loadProductos() {
    const r = await fetch("/Productos/Lista", authHeaders());
    State.productos = r.ok ? await r.json() : [];
}
async function loadInsumos() {
    const r = await fetch("/Insumos/Lista", authHeaders());
    State.insumosCat = r.ok ? await r.json() : [];
}
async function loadTalleres() {
    const data = await fetchFirstOk(["/Talleres/Lista", "/Taller/Lista"], authHeaders());
    State.talleres = Array.isArray(data) ? data : [];
}
async function loadEtapasEstados() {
    const data = await fetchFirstOk(["/OrdenesCorteEtapas/Estados", "/OrdenesCorteEtapasEstados/Lista"], authHeaders());
    State.etapasEstados = Array.isArray(data) ? data : [];
}

/* ---------------- Variantes (endpoint Ventas, lista 1) ---------------- */
async function obtenerVariantesProducto(idProducto) {
    if (!idProducto) return [];
    try {
        const r = await fetch(`/Ventas/ProductoInfoVenta?idProducto=${idProducto}&idListaPrecio=1`, authHeaders());
        if (!r.ok) throw new Error(r.statusText);
        const j = await r.json();
        return (j?.variantes || []).map(v => ({ id: v.Id, idProducto: v.IdProducto, nombre: v.Nombre || `${v.Color || ""} / ${v.Talle || ""}`.trim() }));
    } catch (e) { console.error("variantes:", e); return []; }
}

/* ---------------- Productos: modal + tabla ---------------- */
function lockQtyByVariants(sum) {
    const qtyInput = document.getElementById("txtProdCantModal");
    const hint = document.getElementById("qtyLockHint");
    if (qtyInput) { qtyInput.value = _toMiles(sum); qtyInput.disabled = true; qtyInput.classList.add("bg-disabled"); }
    if (hint) { hint.hidden = false; hint.textContent = `Cant. bloqueada por variantes`; }
}
function unlockQtyByVariants() {
    const qtyInput = document.getElementById("txtProdCantModal");
    const hint = document.getElementById("qtyLockHint");
    if (qtyInput) { qtyInput.disabled = false; qtyInput.classList.remove("bg-disabled"); }
    if (hint) hint.hidden = true;
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
function onVariantInputsChanged() {
    const sumVars = leerVariantesDesdeUI().reduce((a, v) => a + (parseFloat(v.cantidad) || 0), 0);
    if (sumVars > 0) lockQtyByVariants(sumVars); else unlockQtyByVariants();
    // Habilitar/Deshabilitar Guardar según haya al menos 1 variante con cantidad > 0
    const btn = document.getElementById("btnGuardarProducto");
    if (btn) btn.disabled = sumVars <= 0;
}
function attachItemLiveValidation() {
    const apply = () => { if (!wasSubmitItem) return; validarItem(); };
    ["cmbProdModal", "txtProdCantModal"].forEach(id => {
        const el = document.getElementById(id); if (!el) return;
        ["input", "change"].forEach(evt => { el.addEventListener(evt, apply); });
        if ($.fn.select2) $("#cmbProdModal").on("select2:select select2:clear", apply);
    });
}
function setModalFooterAction(modalSel, editing) {
    const btn = document.querySelector(`${modalSel} .modal-footer .btn.btn-success`);
    if (!btn) return;
    btn.innerHTML = editing ? `<i class="fa fa-check me-1"></i> Guardar` : `<i class="fa fa-check me-1"></i> Registrar`;
}
function abrirModalProducto() {
    State.editItemIndex = -1; wasSubmitItem = false;
    setModalFooterAction("#modalProducto", false);

    const cmb = document.getElementById("cmbProdModal");
    const btnSave = document.getElementById("btnGuardarProducto");
    if (btnSave) btnSave.disabled = true;

    cmb.innerHTML = `<option value="">Seleccione</option>` + State.productos.map(p => `<option value="${p.Id}">${p.Descripcion}</option>`).join("");
    if ($.fn.select2) { initSelect2Base("#cmbProdModal"); $("#cmbProdModal").prop("disabled", false).val("").trigger("change.select2"); }

    document.getElementById("txtProdCantModal").value = "1";
    unlockQtyByVariants();

    const wrap = document.getElementById("variantesWrap");
    const cont = document.getElementById("variantesContainer");
    const empty = document.getElementById("variantesEmpty");
    wrap.innerHTML = ""; cont.style.display = "none"; empty.hidden = true;

    clearValidation("#cmbProdModal"); clearValidation("#txtProdCantModal");
    document.getElementById("errorCamposItem")?.classList.add("d-none");

    cmb.onchange = async () => {
        const idProd = parseInt(cmb.value || 0, 10);
        wrap.innerHTML = ""; cont.style.display = "none"; empty.hidden = true;
        if (btnSave) btnSave.disabled = true;
        if (!idProd) return;

        const vars = await obtenerVariantesProducto(idProd);
        cont.style.display = "block";
        if (vars.length === 0) {
            // NO se permite producto sin variantes
            empty.hidden = false;
            wrap.innerHTML = `<div class="alert alert-danger py-2">Este producto no tiene variantes. No se puede agregar.</div>`;
            lockQtyByVariants(0);
            if (btnSave) btnSave.disabled = true;
            return;
        }

        const head = document.createElement("div"); head.className = "var-row";
        head.innerHTML = `<div class="text-muted fw-bold">Color / Talle</div><div class="text-muted fw-bold text-center">Cant.</div>`;
        wrap.appendChild(head);

        vars.forEach(v => {
            const row = document.createElement("div"); row.className = "var-row"; row.dataset.idVar = v.id;
            row.innerHTML = `<div class="var-name">${v.nombre || "-"}</div><div class="var-input"><input type="number" min="0" step="1" class="form-control form-control-sm var-qty" value="0"></div>`;
            row.querySelector(".var-qty").addEventListener("input", onVariantInputsChanged);
            wrap.appendChild(row);
        });
        onVariantInputsChanged(); // evalúa habilitar Guardar
    };

    attachItemLiveValidation();
    new bootstrap.Modal(document.getElementById("modalProducto")).show();
}
function validarItem() {
    const id = parseInt(document.getElementById("cmbProdModal").value || 0, 10);
    const variantes = leerVariantesDesdeUI();
    const sumVars = variantes.reduce((a, v) => a + _toNumber(v.cantidad), 0);
    let ok = true;
    ok = (id ? setValid("#cmbProdModal") : setInvalid("#cmbProdModal")) && ok;

    // Reglas: Debe haber variantes y al menos 1 con cantidad > 0
    if (!id) ok = false;
    if (sumVars <= 0) {
        ok = setInvalid("#txtProdCantModal", "Debe cargar cantidades por variante") && ok;
    } else {
        ok = setValid("#txtProdCantModal") && ok;
    }

    document.getElementById("errorCamposItem")?.classList.toggle("d-none", ok);
    return ok;
}
function guardarProducto() {
    wasSubmitItem = true; if (!validarItem()) return;

    const id = parseInt(document.getElementById("cmbProdModal").value, 10);
    const prod = State.productos.find(p => p.Id === id);
    const variantes = leerVariantesDesdeUI();

    // Regla fuerte: no guardar si no hay variantes con cantidad > 0
    const sumVars = variantes.reduce((a, v) => a + _toNumber(v.cantidad), 0);
    if (sumVars <= 0) {
        setInvalid("#txtProdCantModal", "Debe cargar cantidades por variante");
        return;
    }

    const cantidad = sumVars; // bloquea base; cantidad = suma variantes

    const row = { id: 0, idProducto: id, productoNombre: prod?.Descripcion || ("Producto " + id), cantidad, variantes };
    if (State.editItemIndex >= 0) State.items[State.editItemIndex] = { ...State.items[State.editItemIndex], ...row };
    else State.items.push(row);

    refreshProductos();
    afterProductsChanged();
    bootstrap.Modal.getInstance(document.getElementById("modalProducto"))?.hide();
}
function editarProducto(idx) {
    const it = State.items[idx]; if (!it) return;
    State.editItemIndex = idx; wasSubmitItem = false;
    setModalFooterAction("#modalProducto", true);

    const cmb = document.getElementById("cmbProdModal");
    const btnSave = document.getElementById("btnGuardarProducto");
    if (btnSave) btnSave.disabled = true;

    cmb.innerHTML = `<option value="">Seleccione</option>` + State.productos.map(p => `<option value="${p.Id}">${p.Descripcion}</option>`).join("");
    $("#cmbProdModal").val(String(it.idProducto));
    if ($.fn.select2) { initSelect2Base("#cmbProdModal"); $("#cmbProdModal").trigger("change.select2").prop("disabled", true).trigger("change.select2"); }

    document.getElementById("txtProdCantModal").value = _toMiles(it.cantidad);

    (async () => {
        const vars = await obtenerVariantesProducto(it.idProducto);
        const cont = document.getElementById("variantesContainer"); const empty = document.getElementById("variantesEmpty");
        const wrap = document.getElementById("variantesWrap");
        wrap.innerHTML = ""; cont.style.display = "block"; empty.hidden = true;

        if (vars.length === 0) {
            empty.hidden = false;
            wrap.innerHTML = `<div class="alert alert-danger py-2">Este producto no tiene variantes. No se puede guardar sin variantes.</div>`;
            lockQtyByVariants(0);
            if (btnSave) btnSave.disabled = true;
            return;
        }

        const cantidades = new Map((it.variantes || []).map(v => [v.idProductoVariante, _toNumber(v.cantidad)]));
        const head = document.createElement("div"); head.className = "var-row";
        head.innerHTML = `<div class="text-muted fw-bold">Color / Talle</div><div class="text-muted fw-bold text-center">Cant.</div>`;
        wrap.appendChild(head);
        vars.forEach(v => {
            const row = document.createElement("div"); row.className = "var-row"; row.dataset.idVar = v.id;
            row.innerHTML = `<div class="var-name">${v.nombre || "-"}</div><div class="var-input"><input type="number" min="0" step="1" class="form-control form-control-sm var-qty" value="${cantidades.get(v.id) || 0}"></div>`;
            row.querySelector(".var-qty").addEventListener("input", onVariantInputsChanged);
            wrap.appendChild(row);
        });
        onVariantInputsChanged(); // habilita guardar si sum>0
    })();

    clearValidation("#cmbProdModal"); clearValidation("#txtProdCantModal");
    document.getElementById("errorCamposItem")?.classList.add("d-none");
    attachItemLiveValidation();
    new bootstrap.Modal(document.getElementById("modalProducto")).show();
}
async function eliminarProducto(idx) {
    const ok = await confirmarModal("¿Eliminar el producto de la orden?"); if (!ok) return;
    State.items.splice(idx, 1);
    refreshProductos();
    afterProductsChanged();
}
function renderChipsVariantes(variantes, rowIndex) {
    if (!Array.isArray(variantes) || variantes.length === 0) return '<span class="text-muted">—</span>';
    return variantes.map((v, i) => `
    <span class="var-chip" title="${v.nombre}">
      <span class="chip-label">${v.nombre} <span class="qty">×${_fmtNumber(v.cantidad)}</span></span>
      <button class="chip-x" onclick="quitarVar(${rowIndex},${i});return false;">×</button>
    </span>`).join("");
}
window.quitarVar = function (rowIndex, varIndex) {
    const it = State.items[rowIndex]; if (!it) return;
    it.variantes.splice(varIndex, 1);
    const sum = it.variantes.reduce((a, v) => a + (parseFloat(v.cantidad) || 0), 0);
    it.cantidad = sum;
    refreshProductos();
    afterProductsChanged();
};
function configTablaProductos() {
    if (gridProductos) return;
    gridProductos = $("#grd_Productos").DataTable({
        data: [],
        language: { url: "//cdn.datatables.net/plug-ins/2.0.7/i18n/es-MX.json" },
        columns: [
            {
                data: null, orderable: false, width: "60px", className: "text-center",
                render: (_, _2, _3, meta) => `
                <button class="btn btn-link p-0 me-2 text-success" title="Editar" onclick="editarProducto(${meta.row})"><i class="fa fa-pencil"></i></button>
                <button class="btn btn-link p-0 text-danger" title="Eliminar" onclick="eliminarProducto(${meta.row})"><i class="fa fa-trash"></i></button>`
            },
            { data: "productoNombre", title: "Producto" },
            { data: "variantes", title: "Variantes", className: "text-center", render: (v, _t, _r, meta) => renderChipsVariantes(v, meta.row) },
            { data: "cantidad", title: "Cantidad", className: "text-center", render: v => _fmtNumber(v) }
        ],
        order: [[1, "asc"]], dom: "t", pageLength: 1000,
        createdRow: (row) => { $("td", row).eq(2).css({ "white-space": "normal" }); }
    });
}
function refreshProductos() { if (!gridProductos) return; gridProductos.clear().rows.add(State.items).draw(); }

/* Disparador común tras cambios de productos */
function afterProductsChanged() {
    // Si ya no hay productos => limpiar etapas
    if ((State.items || []).length === 0 && (State.etapas || []).length > 0) {
        State.etapas = [];
        refreshEtapas();
    }
    // Recalcular totales de cabecera SIEMPRE
    recomputeAll();
}

/* ---------------- Insumos ---------------- */
function configTablaInsumos() {
    if (gridInsumos) return;
    gridInsumos = $("#grd_Insumos").DataTable({
        data: [], language: { url: "//cdn.datatables.net/plug-ins/2.0.7/i18n/es-MX.json" },
        columns: [
            {
                data: null, orderable: false, width: "60px", className: "text-center",
                render: (_, _2, _3, meta) => `
                <button class="btn btn-link p-0 me-2 text-success" title="Editar" onclick="editarInsumo(${meta.row})"><i class="fa fa-pencil"></i></button>
                <button class="btn btn-link p-0 text-danger" title="Eliminar" onclick="eliminarInsumo(${meta.row})"><i class="fa fa-trash"></i></button>`
            },
            { data: "nombre", title: "Insumo" },
            { data: "cantidad", title: "Cantidad", className: "text-center", render: v => _fmtNumber(v) }
        ],
        order: [[1, "asc"]], dom: "t", pageLength: 1000
    });
}
function refreshInsumos() { if (!gridInsumos) return; gridInsumos.clear().rows.add(State.insumos).draw(); }

function setModalFooterActionById(modalId, editing) {
    const btn = document.querySelector(`${modalId} .modal-footer .btn.btn-success`);
    if (!btn) return;
    btn.innerHTML = editing ? `<i class="fa fa-check me-1"></i> Guardar` : `<i class="fa fa-check me-1"></i> Registrar`;
}

function abrirModalInsumo() {
    State.editInsumoIndex = -1; wasSubmitInsumo = false;
    setModalFooterActionById("#modalInsumo", false);

    const cmb = document.getElementById("cmbInsumo");
    cmb.innerHTML = `<option value="">Seleccione</option>` + (State.insumosCat || []).map(i => `<option value="${i.Id}">${i.Descripcion || i.Nombre || ("Insumo " + i.Id)}</option>`).join("");
    if ($.fn.select2) { initSelect2Base("#cmbInsumo"); $("#cmbInsumo").val("").trigger("change.select2"); }
    document.getElementById("txtInsumoCant").value = "";
    clearValidation("#cmbInsumo"); clearValidation("#txtInsumoCant"); document.getElementById("errorCamposInsumo")?.classList.add("d-none");
    attachInsumoLiveValidation();
    new bootstrap.Modal(document.getElementById("modalInsumo")).show();
}
function attachInsumoLiveValidation() {
    const apply = () => { if (!wasSubmitInsumo) return; validarInsumo(); };
    ["cmbInsumo", "txtInsumoCant"].forEach(id => {
        const el = document.getElementById(id); if (!el) return;
        ["input", "change"].forEach(evt => el.addEventListener(evt, apply));
    });
    if ($.fn.select2) $("#cmbInsumo").on("select2:select select2:clear", apply);
}
function validarInsumo() {
    const id = parseInt(document.getElementById("cmbInsumo").value || 0, 10);
    const c = _toNumber(document.getElementById("txtInsumoCant").value);
    let ok = true;
    ok = (id ? setValid("#cmbInsumo") : setInvalid("#cmbInsumo")) && ok;
    ok = (c > 0 ? setValid("#txtInsumoCant") : setInvalid("#txtInsumoCant")) && ok;
    document.getElementById("errorCamposInsumo")?.classList.toggle("d-none", ok);
    return ok;
}
function guardarInsumo() {
    wasSubmitInsumo = true; if (!validarInsumo()) return;
    const id = parseInt(document.getElementById("cmbInsumo").value, 10);
    const nombre = document.getElementById("cmbInsumo").selectedOptions[0]?.textContent || "";
    const cantidad = _toNumber(document.getElementById("txtInsumoCant").value);
    const row = { idInsumo: id, nombre, cantidad };
    if (State.editInsumoIndex >= 0) State.insumos[State.editInsumoIndex] = { ...State.insumos[State.editInsumoIndex], ...row };
    else State.insumos.push(row);
    refreshInsumos(); bootstrap.Modal.getInstance(document.getElementById("modalInsumo"))?.hide();
}
function editarInsumo(i) {
    const it = State.insumos[i]; if (!it) return;
    State.editInsumoIndex = i; wasSubmitInsumo = false;
    setModalFooterActionById("#modalInsumo", true);
    const cmb = document.getElementById("cmbInsumo");
    cmb.innerHTML = `<option value="">Seleccione</option>` + (State.insumosCat || []).map(x => `<option value="${x.Id}">${x.Descripcion || x.Nombre || ("Insumo " + x.Id)}</option>`).join("");
    $("#cmbInsumo").val(String(it.idInsumo)); if ($.fn.select2) { initSelect2Base("#cmbInsumo"); $("#cmbInsumo").trigger("change.select2"); }
    document.getElementById("txtInsumoCant").value = _toMiles(it.cantidad);
    clearValidation("#cmbInsumo"); clearValidation("#txtInsumoCant"); document.getElementById("errorCamposInsumo")?.classList.add("d-none");
    attachInsumoLiveValidation();
    new bootstrap.Modal(document.getElementById("modalInsumo")).show();
}
async function eliminarInsumo(i) { const ok = await confirmarModal("¿Eliminar insumo?"); if (!ok) return; State.insumos.splice(i, 1); refreshInsumos(); }

/* ---------------- Etapas ---------------- */
function getTallerInfo(idTaller) {
    const id = parseInt(idTaller || 0, 10);
    return (State.talleres || []).find(t => parseInt(t.Id, 10) === id) || { Id: id, Nombre: "", DiasEntrega: 0 };
}
function calcSalidaAprox(fechaEntradaISO, diasEntrega) {
    if (!fechaEntradaISO) return "";
    const d = parseInt(diasEntrega || 0, 10);
    return d > 0 ? moment(fechaEntradaISO).add(d, "days").format("YYYY-MM-DD") : "";
}
function calcDiasReales(entradaISO, salidaRealISO) {
    const m1 = moment(entradaISO, ["YYYY-MM-DD", moment.ISO_8601, "YYYY-MM-DD HH:mm:ss"], true);
    const m2 = moment(salidaRealISO, ["YYYY-MM-DD", moment.ISO_8601, "YYYY-MM-DD HH:mm:ss"], true);
    if (!m1.isValid() || !m2.isValid()) return null;
    return m2.startOf("day").diff(m1.startOf("day"), "days");
}
function updateSalidaAproxByUI() {
    const idTaller = parseInt(document.getElementById("cmbTaller")?.value || "0", 10) || 0;
    const entradaRaw = document.getElementById("dtpEtEntrada")?.value || "";
    const mEntrada = moment(entradaRaw, ["YYYY-MM-DD", moment.ISO_8601], true);
    const base = mEntrada.isValid() ? mEntrada : moment();
    const tInfo = getTallerInfo(idTaller);
    const dias = Number(tInfo.DiasEntrega ?? tInfo.diasEntrega ?? 0);
    const aprox = base.clone().add(dias, "days").format("YYYY-MM-DD");
    const out = document.getElementById("dtpEtSalidaAprox");
    if (out) {
        out.value = aprox;
        out.dispatchEvent(new Event("input", { bubbles: true }));
        out.dispatchEvent(new Event("change", { bubbles: true }));
    }
    if (typeof validarEtapa === "function" && wasSubmitEtapa) validarEtapa();
}

function configTablaEtapas() {
    if (gridEtapas) return;
    gridEtapas = $("#grd_Etapas").DataTable({
        data: [],
        language: { url: "//cdn.datatables.net/plug-ins/2.0.7/i18n/es-MX.json" },
        scrollX: true,
        columns: [
            {
                data: null, orderable: false, width: "60px", className: "text-center",
                render: (_, _2, _3, meta) => `
                <button class="btn btn-link p-0 me-2 text-success" title="Editar" onclick="editarEtapa(${meta.row})"><i class="fa fa-pencil"></i></button>
                <button class="btn btn-link p-0 text-danger" title="Eliminar" onclick="eliminarEtapa(${meta.row})"><i class="fa fa-trash"></i></button>`
            },
            { data: "tallerNombre", title: "Taller" },
            { data: "fechaEntrada", title: "Entrada", render: f => fView(f) },
            { data: "fechaSalidaAprox", title: "Salida aprox.", render: f => fView(f) },
            {
                data: null, title: "Salida real",
                render: (row) => {
                    const fecha = fView(row.fechaSalidaReal);
                    const dias = (row.diasReales ?? row.dias ?? null);
                    return dias === null || dias === undefined
                        ? fecha
                        : `${fecha}<div class="text-muted small">(${dias} días)</div>`;
                }
            },
            { data: "aProducir", title: "A prod.", className: "text-center", render: v => _fmtNumber(v) },
            { data: "producidas", title: "Prod.", className: "text-center", render: v => _fmtNumber(v) },
            { data: "diferencias", title: "Δ", className: "text-center", render: v => _fmtNumber(v) },
            { data: "estadoNombre", title: "Estado" },
            { data: "nota", title: "Nota", className: "text-wrap", render: v => (v || "—") }
        ],
        order: [[2, "desc"]], dom: "t", pageLength: 1000,
        createdRow: (row) => { $("td", row).eq(9).css({ "white-space": "normal" }); }
    });
}
function refreshEtapas() { if (!gridEtapas) return; gridEtapas.clear().rows.add(State.etapas).draw(); }

function attachEtapaLiveValidation() {
    const apply = () => { if (!wasSubmitEtapa) return; validarEtapa(); };
    const recalc = () => { recalcEtapaAutos(); apply(); };

    // Entradas que afectan Δ y/o Días reales
    ["txtEtAP", "txtEtP", "dtpEtEntrada", "dtpEtSalidaReal"].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        ["input", "change", "keyup", "blur"].forEach(evt => el.addEventListener(evt, recalc));
    });

    // Salida aprox depende de taller/entrada (readonly)
    const tallerEl = document.getElementById("cmbTaller");
    if (tallerEl) {
        ["change", "input"].forEach(ev => tallerEl.addEventListener(ev, () => { updateSalidaAproxByUI(); recalc(); }));
        if ($.fn.select2) $("#cmbTaller").on("select2:select select2:clear", () => { updateSalidaAproxByUI(); recalc(); });
    }
    const entradaEl = document.getElementById("dtpEtEntrada");
    if (entradaEl) ["change", "input"].forEach(ev => entradaEl.addEventListener(ev, () => { updateSalidaAproxByUI(); recalc(); }));

    if ($.fn.select2) {
        $("#cmbEtEstado").on("select2:select select2:clear", apply);
    }

    // Δ siempre auto
    const etDif = document.getElementById("txtEtDif");
    if (etDif) { etDif.readOnly = true; etDif.classList.add("auto-field"); etDif.setAttribute("tabindex", "-1"); }

    // Salida aprox: asegurar readonly y sin tipeo
    const aproxEl = document.getElementById("dtpEtSalidaAprox");
    if (aproxEl) {
        aproxEl.readOnly = true;
        aproxEl.classList.add("auto-field");
        aproxEl.setAttribute("tabindex", "-1");
        aproxEl.addEventListener("keydown", e => e.preventDefault());
        aproxEl.addEventListener("keypress", e => e.preventDefault());
        aproxEl.addEventListener("paste", e => e.preventDefault());
        aproxEl.addEventListener("focus", function () { this.blur(); });
    }
}

/* Recalculo autos de la etapa abierta (Δ y Días reales) */
function recalcEtapaAutos() {
    const ap = _toNumber(document.getElementById("txtEtAP")?.value);
    const pr = _toNumber(document.getElementById("txtEtP")?.value);
    const dif = ap - pr;
    const txtDif = document.getElementById("txtEtDif");
    if (txtDif) { txtDif.value = _toMiles(dif); }

    const entrada = document.getElementById("dtpEtEntrada")?.value || null;
    const salidaReal = document.getElementById("dtpEtSalidaReal")?.value || null;
    const dias = calcDiasReales(entrada, salidaReal);

    const diasEl = document.getElementById("txtEtDiasReales");
    if (diasEl) {
        diasEl.value = (dias === null || isNaN(dias)) ? "" : String(dias);
        diasEl.readOnly = true; diasEl.classList.add("auto-field"); diasEl.setAttribute("tabindex", "-1");
    }
}

function abrirModalEtapa() {
    // 🔒 No permitir agregar etapa sin productos
    if ((State.items || []).length === 0) {
        errorModal?.("Agregá al menos un producto antes de crear etapas.");
        return;
    }

    State.editEtapaIndex = -1; wasSubmitEtapa = false;
    setModalFooterActionById("#modalEtapa", false);

    const cmbT = document.getElementById("cmbTaller");
    cmbT.innerHTML = `<option value="">Seleccione</option>` + (State.talleres || []).map(t => `<option value="${t.Id}">${t.Nombre}</option>`).join("");
    const cmbE = document.getElementById("cmbEtEstado");
    cmbE.innerHTML = `<option value="">Seleccione</option>` + (State.etapasEstados || []).map(e => `<option value="${e.Id}">${e.Nombre}</option>`).join("");

    if ($.fn.select2) { initSelect2Base("#cmbTaller"); initSelect2Base("#cmbEtEstado"); $("#cmbTaller, #cmbEtEstado").val("").trigger("change.select2"); }

    document.getElementById("dtpEtEntrada").value = hoyISO();
    document.getElementById("dtpEtSalidaAprox").value = ""; // readonly, se autocalcula
    document.getElementById("dtpEtSalidaReal").value = "";

    // 1ra etapa: usar Producidas del corte como "A prod."
    const esPrimera = (State.etapas || []).length === 0;
    const aProdDefault = esPrimera ? _toNumber(document.getElementById("txtCantProducidas").value) : 0;
    document.getElementById("txtEtAP").value = _toMiles(aProdDefault);
    document.getElementById("txtEtP").value = _toMiles(0);
    document.getElementById("txtEtDif").value = _toMiles(aProdDefault - 0);
    document.getElementById("txtEtNota").value = "";

    const diasEl = document.getElementById("txtEtDiasReales");
    if (diasEl) { diasEl.value = ""; diasEl.readOnly = true; diasEl.classList.add("auto-field"); diasEl.setAttribute("tabindex", "-1"); }

    ["#cmbTaller", "#cmbEtEstado", "#dtpEtEntrada", "#dtpEtSalidaAprox"].forEach(clearValidation);
    document.getElementById("errorCamposEtapa")?.classList.add("d-none");

    attachEtapaLiveValidation();
    recalcEtapaAutos();
    new bootstrap.Modal(document.getElementById("modalEtapa")).show();
}
function validarEtapa() {
    const t = parseInt(document.getElementById("cmbTaller").value || 0, 10);
    const e = parseInt(document.getElementById("cmbEtEstado").value || 0, 10);
    const f1 = document.getElementById("dtpEtEntrada").value;
    const f2 = document.getElementById("dtpEtSalidaAprox").value; // readonly, autocalculada
    let ok = true;
    ok = (t ? setValid("#cmbTaller") : setInvalid("#cmbTaller")) && ok;
    ok = (e ? setValid("#cmbEtEstado") : setInvalid("#cmbEtEstado")) && ok;
    ok = (f1 ? setValid("#dtpEtEntrada") : setInvalid("#dtpEtEntrada")) && ok;
    ok = (f2 ? setValid("#dtpEtSalidaAprox") : setInvalid("#dtpEtSalidaAprox", "Se completa al elegir Taller")) && ok;
    document.getElementById("errorCamposEtapa")?.classList.toggle("d-none", ok);
    return ok;
}
function guardarEtapa() {
    wasSubmitEtapa = true; if (!validarEtapa()) return;

    const entrada = document.getElementById("dtpEtEntrada").value || null;
    const salidaAprox = document.getElementById("dtpEtSalidaAprox").value || null;
    const salidaReal = document.getElementById("dtpEtSalidaReal").value || null;
    const aProd = _toNumber(document.getElementById("txtEtAP").value);
    const prod = _toNumber(document.getElementById("txtEtP").value);
    const dif = aProd - prod;

    const row = {
        id: 0,
        idTaller: parseInt(document.getElementById("cmbTaller").value, 10),
        tallerNombre: document.getElementById("cmbTaller").selectedOptions[0]?.textContent || "",
        fechaEntrada: entrada,
        fechaSalidaAprox: salidaAprox,
        fechaSalidaReal: salidaReal,
        aProducir: aProd,
        producidas: prod,
        diferencias: dif,
        diasReales: calcDiasReales(entrada, salidaReal),
        idEstado: parseInt(document.getElementById("cmbEtEstado").value || 0, 10),
        estadoNombre: document.getElementById("cmbEtEstado").selectedOptions[0]?.textContent || "",
        nota: (document.getElementById("txtEtNota").value || "").trim(),
        ImporteTotal: formatearSinMiles(document.getElementById("txtImporteTotal").value) || 0
    };
    if (State.editEtapaIndex >= 0) State.etapas[State.editEtapaIndex] = { ...State.etapas[State.editEtapaIndex], ...row };
    else State.etapas.push(row);

    refreshEtapas();
    recomputeAll(); // Final real / Δ final
    bootstrap.Modal.getInstance(document.getElementById("modalEtapa"))?.hide();
}
function editarEtapa(i) {
    const it = State.etapas[i]; if (!it) return; State.editEtapaIndex = i; wasSubmitEtapa = false;
    setModalFooterActionById("#modalEtapa", true);

    const cmbT = document.getElementById("cmbTaller");
    cmbT.innerHTML = `<option value="">Seleccione</option>` + (State.talleres || []).map(t => `<option value="${t.Id}">${t.Nombre}</option>`).join("");
    const cmbE = document.getElementById("cmbEtEstado");
    cmbE.innerHTML = `<option value="">Seleccione</option>` + (State.etapasEstados || []).map(e => `<option value="${e.Id}">${e.Nombre}</option>`).join("");
    $("#cmbTaller").val(String(it.idTaller)); $("#cmbEtEstado").val(String(it.idEstado));
    if ($.fn.select2) { initSelect2Base("#cmbTaller"); initSelect2Base("#cmbEtEstado"); $("#cmbTaller").trigger("change.select2"); $("#cmbEtEstado").trigger("change.select2"); }

    document.getElementById("dtpEtEntrada").value = fInput(it.fechaEntrada) || hoyISO();

    const tInfo = getTallerInfo(it.idTaller) || {};
    const diasEntrega = Number(tInfo.DiasEntrega ?? tInfo.diasEntrega ?? 0);
    const salidaAproxISO = it.fechaSalidaAprox
        ? fInput(it.fechaSalidaAprox)
        : moment(fInput(it.fechaEntrada) || hoyISO(), "YYYY-MM-DD").add(diasEntrega, "days").format("YYYY-MM-DD");
    document.getElementById("dtpEtSalidaAprox").value = salidaAproxISO;

    document.getElementById("dtpEtSalidaReal").value = it.fechaSalidaReal ? fInput(it.fechaSalidaReal) : "";

    document.getElementById("txtEtAP").value = _toMiles(it.aProducir);
    document.getElementById("txtEtP").value = _toMiles(it.producidas);
    document.getElementById("txtEtDif").value = _toMiles((it.aProducir || 0) - (it.producidas || 0));
    document.getElementById("txtEtNota").value = it.nota || "";
    document.getElementById("txtImporteTotal").value = formatearMiles(it.ImporteTotal) || 0;

    const diasEd = document.getElementById("txtEtDiasReales");
    if (diasEd) {
        const dias = calcDiasReales(document.getElementById("dtpEtEntrada").value, document.getElementById("dtpEtSalidaReal").value);
        diasEd.value = (dias === null || isNaN(dias)) ? "" : String(dias);
        diasEd.readOnly = true; diasEd.classList.add("auto-field"); diasEd.setAttribute("tabindex", "-1");
    }

    ["#cmbTaller", "#cmbEtEstado", "#dtpEtEntrada", "#dtpEtSalidaAprox"].forEach(clearValidation);
    document.getElementById("errorCamposEtapa")?.classList.add("d-none");

    attachEtapaLiveValidation();
    recalcEtapaAutos();
    new bootstrap.Modal(document.getElementById("modalEtapa")).show();
}
async function eliminarEtapa(i) { const ok = await confirmarModal("¿Eliminar etapa?"); if (!ok) return; State.etapas.splice(i, 1); refreshEtapas(); recomputeAll(); }

/* ---------------- Re-cálculos de cabecera ---------------- */
function computeTotals() {
    // A producir
    const aProd = (State.items || []).reduce((acc, it) => acc + (parseFloat(it.cantidad) || 0), 0);
    State.aProducir = aProd;

    // Producidas (editable)
    const prodUI = _toNumber(document.getElementById("txtCantProducidas")?.value);
    State.producidas = prodUI;

    // Corte Δ
    State.difCorte = aProd - prodUI;

    // Final real = producidas de última etapa
    const last = (State.etapas || []).length ? State.etapas[State.etapas.length - 1] : null;
    const finalReal = last ? (parseFloat(last.producidas) || 0) : 0;
    State.finalReal = finalReal;

    // Final Δ
    State.difFinal = aProd - finalReal;
}
function updateHeaderUI() {
    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = _toMiles(val); };
    setVal("txtCantAProducir", State.aProducir);
    setVal("txtDifCorte", State.difCorte);
    setVal("txtCantFinalReal", State.finalReal);
    setVal("txtDifFinalReal", State.difFinal);

    const put = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = _fmtNumber(val); };
    put("statAProd", State.aProducir);
    put("statProd", State.producidas);
    put("statDifCorte", State.difCorte);
    put("statDifFinal", State.difFinal);
}
function recomputeAll() { computeTotals(); updateHeaderUI(); }

/* ---------------- Cargar OC existente ---------------- */
async function cargarOC(id) {
    const r = await fetch(`/OrdenesCorte/EditarInfo?id=${id}`, { headers: { Authorization: "Bearer " + (token || ""), "Content-Type": "application/json" } });
    if (!r.ok) { errorModal?.("No se pudo cargar la orden."); return; }
    const o = await r.json();

    // Fecha/hora
    setDateInput("dtpFechaInicio", o.FechaInicio);
    setTimeInput("txtHoraIni", o.HoraInicioCorte);
    setTimeInput("txtHoraFin", o.HoraFinCorte);

    $("#cmbEstado").val(String(o.IdEstado || "")); if ($.fn.select2) $("#cmbEstado").trigger("change.select2");
    $("#cmbPersonal").val(String(o.IdPersonal || "")); if ($.fn.select2) $("#cmbPersonal").trigger("change.select2");

    // Editables
    document.getElementById("txtCantProducidas").value = _toMiles(o.CantidadProducidas || 0);
    document.getElementById("txtLargo").value = _toMiles(o.LargoTizada || 0);
    document.getElementById("txtAncho").value = _toMiles(o.AnchoTizada || 0);
    document.getElementById("txtCapas").value = _toMiles(o.CantidadCapas || 0);

    // Productos
    State.items = (o.Productos || []).map(p => ({
        id: p.Id || 0,
        idProducto: p.IdProducto,
        productoNombre: p.Producto || ("Producto " + p.IdProducto) || "",
        cantidad: parseFloat(p.Cantidad || 0),
        variantes: (p.Variantes || []).map(v => ({ id: v.Id || 0, idProductoVariante: v.IdProductoVariante, nombre: (v.Color && v.Talle) ? `${v.Color} / ${v.Talle}` : (v.Color || v.Talle || ""), cantidad: parseFloat(v.Cantidad || 0) }))
    }));
    refreshProductos();

    // Insumos
    State.insumos = (o.Insumos || []).map(i => ({ id: i.Id || 0, idInsumo: i.IdInsumo, nombre: i.Insumo || "", cantidad: parseFloat(i.Cantidad || 0) }));
    refreshInsumos();

    // Etapas (con días reales)
    State.etapas = (o.Etapas || []).map(e => {
        const entrada = e.FechaEntrada;
        const real = e.FechaSalidaReal;
        return {
            id: e.Id || 0, idTaller: e.IdTaller, tallerNombre: e.Taller || "",
            fechaEntrada: entrada, fechaSalidaAprox: e.FechaSalidaAproximada, fechaSalidaReal: real,
            aProducir: parseFloat(e.CantidadProducir || 0), producidas: parseFloat(e.CantidadProducidas || 0), diferencias: parseFloat(e.Diferencias || 0),
            diasReales: calcDiasReales(entrada, real),
            idEstado: e.IdEstado, estadoNombre: e.Estado || "", nota: e.NotaInterna || "",
            ImporteTotal: e.ImporteTotal || 0
        };
    });
    refreshEtapas();

    syncSaveButton();
    recomputeAll(); // setea A producir, Δ y finales
}

/* ---------------- Guardar / Eliminar OC ---------------- */
function camposValidos() {
    let ok = true;
    ok = (document.getElementById("dtpFechaInicio").value ? setValid("#dtpFechaInicio") : setInvalid("#dtpFechaInicio")) && ok;
    ok = (parseInt(document.getElementById("cmbEstado").value || 0, 10) ? setValid("#cmbEstado") : setInvalid("#cmbEstado")) && ok;
    ok = (parseInt(document.getElementById("cmbPersonal").value || 0, 10) ? setValid("#cmbPersonal") : setInvalid("#cmbPersonal")) && ok;
    return ok;
}
function updateBanner() { const ok = camposValidos(); document.getElementById("errorCamposOC")?.classList.toggle("d-none", ok); return ok; }

async function guardarOC() {
    if (isSaving) return;
    wasSubmitOC = true; if (!updateBanner()) return;
    if ((State.items || []).length === 0) { return errorModal?.("Agregá al menos un producto."); }

    // Recalcular antes de enviar
    recomputeAll();

    const fechaISO = getFechaInicioISO();
    const horaIniTxt = document.getElementById("txtHoraIni").value;
    const horaFinTxt = document.getElementById("txtHoraFin").value;

    const payload = {
        Id: State.idOC || 0,
        FechaInicio: fechaISO,
        IdEstado: parseInt(document.getElementById("cmbEstado").value || 0, 10),
        IdPersonal: parseInt(document.getElementById("cmbPersonal").value || 0, 10),

        CantidadProducir: State.aProducir,
        CantidadProducidas: State.producidas,
        DiferenciaCorte: State.difCorte,
        CantidadFinalReal: State.finalReal,
        DiferenciaFinalReal: State.difFinal,

        LargoTizada: _toNumber(document.getElementById("txtLargo").value),
        AnchoTizada: _toNumber(document.getElementById("txtAncho").value),
        CantidadCapas: _toNumber(document.getElementById("txtCapas").value),

        HoraInicioCorte: horaIniTxt ? `${fechaISO}T${horaIniTxt}:00` : null,
        HoraFinCorte: horaFinTxt ? `${fechaISO}T${horaFinTxt}:00` : null,

        Productos: (State.items || []).map(i => ({
            Id: i.id || 0,
            IdProducto: i.idProducto,
            Cantidad: i.cantidad,
            Variantes: (i.variantes || []).map(v => ({ Id: v.id || 0, IdProducto: i.idProducto, IdProductoVariante: v.idProductoVariante, Cantidad: v.cantidad }))
        })),
        Insumos: (State.insumos || []).map(x => ({ Id: x.id || 0, IdInsumo: x.idInsumo, Cantidad: x.cantidad })),
        Etapas: (State.etapas || []).map(e => ({
            Id: e.id || 0, IdTaller: e.idTaller,
            FechaEntrada: e.fechaEntrada, FechaSalidaAproximada: e.fechaSalidaAprox, FechaSalidaReal: e.fechaSalidaReal,
            CantidadProducir: e.aProducir, CantidadProducidas: e.producidas,
            Diferencias: (e.aProducir || 0) - (e.producidas || 0),
            DiasReales: e.diasReales ?? calcDiasReales(e.fechaEntrada, e.fechaSalidaReal),
            IdEstado: e.idEstado, NotaInterna: e.nota,
            ImporteTotal: e.ImporteTotal || 0
        }))
    };

    const url = State.idOC ? "/OrdenesCorte/Actualizar" : "/OrdenesCorte/Insertar";
    const method = State.idOC ? "PUT" : "POST";

    try {
        isSaving = true;
        const res = await fetch(url, { method, headers: { Authorization: "Bearer " + (token || ""), "Content-Type": "application/json;charset=utf-8" }, body: JSON.stringify(payload) });
        if (!res.ok) throw new Error(res.statusText);
        const j = await res.json();
        if (j === true || j?.valor === true || j?.valor === "OK") { exitoModal?.(State.idOC ? "Orden actualizada" : "Orden registrada"); volverIndexOC(); }
        else { errorModal?.("No se pudo guardar la orden."); }
    } catch (e) { console.error(e); errorModal?.("Error al guardar la orden."); }
    finally { isSaving = false; }
}

async function eliminarOC() {
    if (!State.idOC) return;
    const ok = await confirmarModal("¿Eliminar esta orden de corte?"); if (!ok) return;
    try {
        const r = await fetch(`/OrdenesCorte/Eliminar?id=${State.idOC}`, { method: "DELETE", headers: { Authorization: "Bearer " + (token || "") } });
        const j = await r.json();
        if (!r.ok || !j?.valor) throw new Error("No se pudo eliminar");
        exitoModal("Eliminada correctamente"); volverIndexOC();
    } catch (e) { console.error(e); errorModal?.("Error al eliminar"); }
}
window.volverIndexOC = function () { window.location.href = "/OrdenesCorte/Index"; };

/* ---------------- Exportación PDF ---------------- */
async function exportarOCPdf() {
    if (!(State.items || []).length) return errorModal?.("Agregá al menos un producto para exportar.");
    const { jsPDF } = window.jspdf || {}; if (!jsPDF || !window.jspdf?.jsPDF?.API?.autoTable) { return errorModal?.("Falta jsPDF/autoTable."); }

    recomputeAll();

    const doc = new jsPDF({ unit: "pt", format: "a4" }); const pad = 40;

    doc.setFont("helvetica", "bold"); doc.setFontSize(18);
    doc.text("Orden de Corte", pad, 50);
    doc.setFontSize(11); doc.setFont("helvetica", "normal");
    doc.text(`Fecha inicio: ${fView(document.getElementById("dtpFechaInicio").value)}`, pad, 70);
    doc.text(`Estado: ${document.getElementById("cmbEstado").selectedOptions[0]?.text || "—"}`, pad, 86);
    doc.text(`Responsable: ${document.getElementById("cmbPersonal").selectedOptions[0]?.text || "—"}`, pad, 102);

    doc.text(`A producir: ${_fmtNumber(State.aProducir)}`, pad, 120);
    doc.text(`Producidas (corte): ${_fmtNumber(State.producidas)} — Δ Corte: ${_fmtNumber(State.difCorte)}`, pad, 136);
    doc.text(`Final real (última etapa): ${_fmtNumber(State.finalReal)} — Δ Final: ${_fmtNumber(State.difFinal)}`, pad, 152);

    doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.text("Productos", pad, 180);
    const body = (State.items || []).map(it => {
        const vars = (it.variantes || []).map(v => `- ${v.nombre} × ${_fmtNumber(v.cantidad)}`).join("\n");
        const prod = it.productoNombre || `Producto ${it.idProducto}`;
        return [vars ? `${prod}\n${vars}` : prod, _fmtNumber(it.cantidad)];
    });
    doc.autoTable({ startY: 188, head: [["Producto / Variantes", "Cantidad"]], body, margin: { left: pad, right: pad }, styles: { fontSize: 10, cellPadding: 6, overflow: "linebreak" }, headStyles: { fillColor: [28, 39, 54], textColor: [255, 255, 255] }, columnStyles: { 1: { halign: "right", cellWidth: 100 } } });

    let y = doc.lastAutoTable.finalY + 18;
    doc.setFont("helvetica", "bold"); doc.text("Insumos", pad, y); y += 8;
    const bodyIns = (State.insumos || []).map(i => [i.nombre, _fmtNumber(i.cantidad)]);
    doc.autoTable({ startY: y, head: [["Insumo", "Cantidad"]], body: bodyIns, margin: { left: pad, right: pad }, styles: { fontSize: 10, cellPadding: 6 }, headStyles: { fillColor: [46, 125, 50], textColor: [255, 255, 255] }, columnStyles: { 1: { halign: "right", cellWidth: 100 } } });

    y = doc.lastAutoTable.finalY + 18;
    doc.setFont("helvetica", "bold"); doc.text("Etapas", pad, y); y += 8;
    const bodyEt = (State.etapas || []).map(e => {
        const dias = (e.diasReales ?? null);
        const salidaRealTxt = `${fView(e.fechaSalidaReal)}${dias == null ? "" : ` (${dias} días)`}`;
        return [e.tallerNombre || "—", fView(e.fechaEntrada), fView(e.fechaSalidaAprox), salidaRealTxt, _fmtNumber(e.aProducir), _fmtNumber(e.producidas), _fmtNumber(e.diferencias), e.estadoNombre || "—", e.nota || ""];
    });
    doc.autoTable({ startY: y, head: [["Taller", "Entrada", "Salida aprox.", "Salida real", "A prod.", "Prod.", "Δ", "Estado", "Nota"]], body: bodyEt, margin: { left: pad, right: pad }, styles: { fontSize: 9, cellPadding: 5 }, headStyles: { fillColor: [255, 179, 0], textColor: [0, 0, 0] }, columnStyles: { 4: { halign: "right" }, 5: { halign: "right" }, 6: { halign: "right" } } });

    doc.save(`OrdenCorte_${document.getElementById("dtpFechaInicio").value}.pdf`);
}
