/** JWT: mismo origen que site.js (`token` en localStorage `JwtToken`). No usar `window.token` (no existe). */
function _ocJwt() {
    if (typeof token !== "undefined" && token) return token;
    return localStorage.getItem("JwtToken") || "";
}

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

/** Modo solo lectura: permiso Ver sin Editar (ver `Permisos.aplicarUINuevoModif` + `permitirConsultaSinEditar`). */
function ocEsSoloConsulta() {
    return document.documentElement.dataset.nmSoloConsulta === "1";
}

function aplicarModoSoloConsultaOC() {
    if (!ocEsSoloConsulta()) return;
    document.body.classList.add("oc-solo-consulta");
    const sub = document.querySelector(".page-header small.text-muted");
    if (sub && (State.idOC || 0) > 0) sub.textContent = "Solo lectura";
    ["btnGuardarOC", "btnEliminarOC", "btnCrearEstadoOC", "btnPlusPersonalOC", "btnPlusProductoOC", "btnNuevoInsumoABM", "btnPlusEtapaEstadoOC"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add("d-none");
    });
    document.querySelectorAll('button[onclick="abrirModalProducto()"], button[onclick="abrirModalInsumo()"], button[onclick="abrirModalEtapa()"]').forEach(b => b.classList.add("d-none"));
    const form = document.getElementById("formOC");
    if (form) {
        form.querySelectorAll("input, select, textarea").forEach(el => {
            el.disabled = true;
        });
    }
    if (window.jQuery && $.fn.select2) {
        $("#formOC select").prop("disabled", true).trigger("change.select2");
    }
    if (gridProductos) refreshProductos();
    if (gridInsumos) refreshInsumos();
    if (gridEtapas) refreshEtapas();
}

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
    const dpAttr = ($el.attr("data-s2-parent") || "").trim();
    let $dropdownParent = null;
    if (dpAttr === "body") {
        $dropdownParent = $(document.body);
    } else if (dpAttr) {
        $dropdownParent = $(dpAttr);
        if (!$dropdownParent.length) {
            $dropdownParent = null;
        } else if ($dropdownParent.hasClass("modal")) {
            // Anclar al .modal recorta el desplegable (overflow / stacking). Body + z-index en CSS.
            $dropdownParent = $(document.body);
        }
    }
    if (!$dropdownParent || !$dropdownParent.length) {
        $dropdownParent = $(document.body);
    }
    const def = {
        theme: "bootstrap-5", width: "100%", placeholder: "Seleccione",
        language: { noResults: () => "No hay resultados", searching: () => "Buscando..." },
        dropdownParent: $dropdownParent
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
/* Validación Select2 + mensajes: usar siempre los helpers globales de site.js (no redefinir setInvalid/setValid/clearValidation: pisan al resto del inyectable Personal / ABM). */

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
    Permisos.init();
    Permisos.aplicarUINuevoModif("OrdenesCorte", { permitirConsultaSinEditar: true });
    State.idOC = parseInt((document.getElementById("txtId")?.value || "0"), 10) || 0;

    window.__MInsumosByClizaRefill = async function (detail) {
        try {
            await _loadCatsAndProvsForABM();
            if (!detail || !window.jQuery) return;
            const nid = Number(detail.nuevoId ?? detail.NuevoId ?? 0);
            if (!Number.isFinite(nid) || nid <= 0) return;
            const t = (detail.tipo || "").trim();
            if (t === "InsumosCategoria") {
                window.jQuery("#insABM_Categoria").val(String(nid)).trigger("change.select2");
            } else if (t === "Proveedores") {
                window.jQuery("#insABM_Proveedor").val(String(nid)).trigger("change.select2");
            }
        } catch (e) {
            console.error(e);
        }
    };
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

    aplicarModoSoloConsultaOC();

    registrarEventosEstadoOC();
    registrarListenerConfiguracionesGlobales();
    wirePlusPersonalOrdenesCorte();
    wirePlusProductoOrdenesCorte();
    wirePlusEtapaEstadoOrdenesCorte();

    const modalAbmIns = document.getElementById("modalInsumoABM");
    if (modalAbmIns) {
        modalAbmIns.addEventListener("shown.bs.modal", () => {
            _initSelect2PreferProject("#insABM_Categoria");
            _initSelect2PreferProject("#insABM_Proveedor");
        });
    }

    document.getElementById("btnNuevoInsumoABM")?.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        abrirModalInsumoABM();
    });

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
const authHeaders = () => ({ headers: { Authorization: "Bearer " + _ocJwt() } });

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
        return (j?.variantes || []).map(v => ({
            id: v.Id,
            idProducto: v.IdProducto,
            color: v.Color || "",
            talle: v.Talle || "",
            nombre: v.Nombre || `${v.Color || ""} / ${v.Talle || ""}`.trim()
        }));
    } catch (e) { console.error("variantes:", e); return []; }
}

function _splitColorTalle(v) {
    if (!v) return { color: "", talle: "" };
    if (v.color || v.talle || v.Color || v.Talle) {
        return { color: (v.color || v.Color || "").trim(), talle: (v.talle || v.Talle || "").trim() };
    }
    const n = String(v.nombre || "").trim();
    const parts = n.split("/").map(s => s.trim());
    return { color: parts[0] || "", talle: parts.slice(1).join(" / ") || "" };
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
        const ct = _splitColorTalle({ nombre });
        if (idVar && cantidad > 0) res.push({ idProductoVariante: idVar, nombre, color: ct.color, talle: ct.talle, cantidad });
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
    if (ocEsSoloConsulta()) return;
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
    wrap.innerHTML = ""; cont.classList.add("d-none"); empty.hidden = true;

    clearValidation("#cmbProdModal"); clearValidation("#txtProdCantModal");
    document.getElementById("errorCamposItem")?.classList.add("d-none");

    cmb.onchange = async () => {
        const idProd = parseInt(cmb.value || 0, 10);
        wrap.innerHTML = ""; cont.classList.add("d-none"); empty.hidden = true;
        if (btnSave) btnSave.disabled = true;
        if (!idProd) return;

        const vars = await obtenerVariantesProducto(idProd);
        /* Quitar d-none: el inline display:block no gana a .d-none { display:none !important } */
        cont.classList.remove("d-none");
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
    if (ocEsSoloConsulta()) return;
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
    if (ocEsSoloConsulta()) return;
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
        wrap.innerHTML = ""; cont.classList.remove("d-none"); empty.hidden = true;

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
    if (ocEsSoloConsulta()) return;
    const ok = await confirmarModal("¿Eliminar el producto de la orden?"); if (!ok) return;
    State.items.splice(idx, 1);
    refreshProductos();
    afterProductsChanged();
}
function renderChipsVariantes(variantes, rowIndex) {
    if (!Array.isArray(variantes) || variantes.length === 0) return '<span class="text-muted">—</span>';
    const solo = ocEsSoloConsulta();
    return variantes.map((v, i) => `
    <span class="var-chip" title="${v.nombre}">
      <span class="chip-label">${v.nombre} <span class="qty">×${_fmtNumber(v.cantidad)}</span></span>
      ${solo ? "" : `<button class="chip-x" onclick="quitarVar(${rowIndex},${i});return false;">×</button>`}
    </span>`).join("");
}
window.quitarVar = function (rowIndex, varIndex) {
    if (ocEsSoloConsulta()) return;
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
                render: (_, _2, _3, meta) => ocEsSoloConsulta() ? "" : `
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
    if (typeof bindDataTableSeleccionFila === "function") {
        bindDataTableSeleccionFila("#grd_Productos", "ocProd");
    }
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
                render: (_, _2, _3, meta) => ocEsSoloConsulta() ? "" : `
                <button class="btn btn-link p-0 me-2 text-success" title="Editar" onclick="editarInsumo(${meta.row})"><i class="fa fa-pencil"></i></button>
                <button class="btn btn-link p-0 text-danger" title="Eliminar" onclick="eliminarInsumo(${meta.row})"><i class="fa fa-trash"></i></button>`
            },
            { data: "nombre", title: "Insumo" },
            { data: "cantidad", title: "Cantidad", className: "text-center", render: v => _fmtNumber(v) }
        ],
        order: [[1, "asc"]], dom: "t", pageLength: 1000
    });
    if (typeof bindDataTableSeleccionFila === "function") {
        bindDataTableSeleccionFila("#grd_Insumos", "ocIns");
    }
}
function refreshInsumos() { if (!gridInsumos) return; gridInsumos.clear().rows.add(State.insumos).draw(); }

function setModalFooterActionById(modalId, editing) {
    const btn = document.querySelector(`${modalId} .modal-footer .btn.btn-success`);
    if (!btn) return;
    btn.innerHTML = editing ? `<i class="fa fa-check me-1"></i> Guardar` : `<i class="fa fa-check me-1"></i> Registrar`;
}

function abrirModalInsumo() {
    if (ocEsSoloConsulta()) return;
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
    const $ = window.jQuery;
    if (!$) return;
    const apply = () => {
        if (!wasSubmitInsumo) return;
        validarInsumo();
    };
    $("#cmbInsumo").off(".ocInsLive").on("change.ocInsLive", apply);
    if ($.fn.select2) {
        $("#cmbInsumo").off("select2:select.ocInsLive select2:clear.ocInsLive")
            .on("select2:select.ocInsLive select2:clear.ocInsLive", apply);
    }
    $("#txtInsumoCant").off(".ocInsLive").on("input.ocInsLive change.ocInsLive", apply);
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
    if (ocEsSoloConsulta()) return;
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
    if (ocEsSoloConsulta()) return;
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
async function eliminarInsumo(i) { if (ocEsSoloConsulta()) return; const ok = await confirmarModal("¿Eliminar insumo?"); if (!ok) return; State.insumos.splice(i, 1); refreshInsumos(); }

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
                render: (_, _2, _3, meta) => ocEsSoloConsulta() ? "" : `
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
    if (typeof bindDataTableSeleccionFila === "function") {
        bindDataTableSeleccionFila("#grd_Etapas", "ocEtapas");
    }
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
    if (ocEsSoloConsulta()) return;
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
    if (ocEsSoloConsulta()) return;
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
    if (ocEsSoloConsulta()) return;
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
async function eliminarEtapa(i) { if (ocEsSoloConsulta()) return; const ok = await confirmarModal("¿Eliminar etapa?"); if (!ok) return; State.etapas.splice(i, 1); refreshEtapas(); recomputeAll(); }

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
        variantes: (p.Variantes || []).map(v => ({
            id: v.Id || 0,
            idProductoVariante: v.IdProductoVariante,
            color: v.Color || "",
            talle: v.Talle || "",
            nombre: (v.Color && v.Talle) ? `${v.Color} / ${v.Talle}` : (v.Color || v.Talle || ""),
            cantidad: parseFloat(v.Cantidad || 0)
        }))
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
    if (ocEsSoloConsulta()) return;
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

    const eraNuevo = !(State.idOC > 0);
    const url = eraNuevo ? "/OrdenesCorte/Insertar" : "/OrdenesCorte/Actualizar";
    const method = eraNuevo ? "POST" : "PUT";

    try {
        isSaving = true;
        const res = await fetch(url, { method, headers: { Authorization: "Bearer " + (token || ""), "Content-Type": "application/json;charset=utf-8" }, body: JSON.stringify(payload) });
        if (!res.ok) throw new Error(res.statusText);
        const j = await res.json();
        if (j === true || j?.valor === true || j?.valor === "OK") {
            const newId = parseInt(j?.id || State.idOC || 0, 10) || 0;
            if (newId > 0) State.idOC = newId;
            const accion = await despuesGuardarNuevoModif({
                mensaje: eraNuevo ? "Orden registrada" : "Orden actualizada",
                indexUrl: "/OrdenesCorte/Index",
                editUrl: "/OrdenesCorte/NuevoModif",
                id: State.idOC,
                eraNuevo
            });
            if (accion === "editar") {
                syncSaveButton();
                const btnElim = document.getElementById("btnEliminarOC");
                if (btnElim && State.idOC > 0) btnElim.classList.remove("d-none");
            }
        }
        else { errorModal?.("No se pudo guardar la orden."); }
    } catch (e) { console.error(e); errorModal?.("Error al guardar la orden."); }
    finally { isSaving = false; }
}

async function eliminarOC() {
    if (ocEsSoloConsulta()) return;
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

async function _loadLogoRemitoOC() {
    const tryUrl = async (url) => {
        try {
            const r = await fetch(url, { cache: "no-cache" });
            if (!r.ok) return null;
            const blob = await r.blob();
            return await new Promise((resolve) => {
                const fr = new FileReader();
                fr.onload = () => resolve(fr.result);
                fr.onerror = () => resolve(null);
                fr.readAsDataURL(blob);
            });
        } catch { return null; }
    };
    return (await tryUrl("/Imagenes/LogoRemito.png?v=4"))
        || (await tryUrl("/Imagenes/Logo.png?v=4"))
        || null;
}

function _loadImg(src) {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = src;
    });
}

/** Convierte el logo azul a blanco sólido (fondo transparente). */
function _whitenLogoCanvas(img, size) {
    const tc = document.createElement("canvas");
    tc.width = size;
    tc.height = size;
    const tctx = tc.getContext("2d");
    const pad = Math.round(size * 0.06);
    tctx.drawImage(img, pad, pad, size - pad * 2, size - pad * 2);
    const imageData = tctx.getImageData(0, 0, size, size);
    const d = imageData.data;
    for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i + 1], b = d[i + 2], a = d[i + 3];
        const brightness = (r + g + b) / 3;
        if (a < 20 || brightness > 205) {
            d[i] = 0; d[i + 1] = 0; d[i + 2] = 0; d[i + 3] = 0;
        } else {
            d[i] = 255; d[i + 1] = 255; d[i + 2] = 255; d[i + 3] = 255;
        }
    }
    tctx.putImageData(imageData, 0, 0);
    return tc;
}

/** Triángulo delta blanco (fallback si falla la imagen). */
function _drawDeltaLogo(ctx, cx, cy, s) {
    ctx.save();
    ctx.strokeStyle = "#ffffff";
    ctx.fillStyle = "#ffffff";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // anillo exterior
    ctx.lineWidth = Math.max(3, s * 0.13);
    ctx.beginPath();
    ctx.moveTo(cx, cy - s * 0.58);
    ctx.lineTo(cx + s * 0.58, cy + s * 0.48);
    ctx.lineTo(cx - s * 0.58, cy + s * 0.48);
    ctx.closePath();
    ctx.stroke();

    // anillo interior
    ctx.lineWidth = Math.max(2.5, s * 0.10);
    ctx.beginPath();
    ctx.moveTo(cx, cy - s * 0.28);
    ctx.lineTo(cx + s * 0.30, cy + s * 0.24);
    ctx.lineTo(cx - s * 0.30, cy + s * 0.24);
    ctx.closePath();
    ctx.stroke();

    ctx.restore();
}

/** Banner negro "JATUN" + logo triángulo blanco (como el papel). */
async function _buildJatunBannerDataURL() {
    const canvas = document.createElement("canvas");
    canvas.width = 700;
    canvas.height = 150;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 82px Arial, Helvetica, sans-serif";
    ctx.textBaseline = "middle";
    ctx.fillText("JATUN", 36, canvas.height / 2 + 4);

    const logoX = canvas.width - 95;
    const logoY = canvas.height / 2;
    let drewLogo = false;

    const logoSrc = await _loadLogoRemitoOC();
    if (logoSrc) {
        const img = await _loadImg(logoSrc);
        if (img) {
            const size = 100;
            const white = _whitenLogoCanvas(img, size);
            // ¿quedó algo visible?
            const check = white.getContext("2d").getImageData(0, 0, size, size).data;
            let opaque = 0;
            for (let i = 3; i < check.length; i += 4) if (check[i] > 40) opaque++;
            if (opaque > 80) {
                ctx.drawImage(white, logoX - size / 2, logoY - size / 2, size, size);
                drewLogo = true;
            }
        }
    }
    if (!drewLogo) _drawDeltaLogo(ctx, logoX, logoY, 52);

    return canvas.toDataURL("image/png");
}

/** Formato talles como el papel: "2 AL 5" / "38 AL 44" si hay secuencia. */
function _formatTallesRemito(vars) {
    const sorted = [...vars].sort((a, b) => {
        const na = parseInt(String(a.talle).replace(/\D/g, ""), 10);
        const nb = parseInt(String(b.talle).replace(/\D/g, ""), 10);
        if (!isNaN(na) && !isNaN(nb)) return na - nb;
        return String(a.talle).localeCompare(String(b.talle), "es");
    });
    const labels = sorted.map(x => String(x.talle || "").trim()).filter(Boolean);
    if (!labels.length) return "";
    if (labels.length === 1) return labels[0];

    const nums = labels.map(t => parseInt(String(t).replace(/\D/g, ""), 10));
    if (nums.every(n => !isNaN(n))) {
        const uniq = [...new Set(nums)].sort((a, b) => a - b);
        if (uniq.length >= 2) {
            const diffs = uniq.slice(1).map((n, i) => n - uniq[i]);
            const step = diffs[0];
            if (step > 0 && diffs.every(d => d === step)) {
                return `${uniq[0]} AL ${uniq[uniq.length - 1]}`;
            }
        }
    }
    return labels.join(" / ");
}

/** Q x talle: si todas iguales, un solo número (como el papel). */
function _formatQxTalleRemito(vars) {
    const sorted = [...vars].sort((a, b) => {
        const na = parseInt(String(a.talle).replace(/\D/g, ""), 10);
        const nb = parseInt(String(b.talle).replace(/\D/g, ""), 10);
        if (!isNaN(na) && !isNaN(nb)) return na - nb;
        return String(a.talle).localeCompare(String(b.talle), "es");
    });
    const qtys = sorted.map(x => Math.round(parseFloat(x.cantidad) || 0));
    if (!qtys.length) return "";
    const allSame = qtys.every(q => q === qtys[0]);
    if (allSame) return String(qtys[0]);
    return qtys.join("/");
}

/** Filas remito: 1 por producto+color (talles y qty agrupados). */
function _buildRemitoCorteRows(nroOC) {
    const rows = [];
    let line = 1;
    (State.items || []).forEach(it => {
        const articulo = (it.productoNombre || `Producto ${it.idProducto}`).toUpperCase();
        const byColor = new Map();
        (it.variantes || []).forEach(v => {
            const ct = _splitColorTalle(v);
            const colorKey = (ct.color || "").trim().toUpperCase() || "";
            if (!byColor.has(colorKey)) byColor.set(colorKey, []);
            byColor.get(colorKey).push({ talle: (ct.talle || "").trim(), cantidad: parseFloat(v.cantidad) || 0 });
        });
        if (!byColor.size) {
            rows.push({
                cod: `${nroOC}-${line++}`,
                articulo,
                color: "",
                talles: "",
                qxTalle: "",
                cant: parseFloat(it.cantidad) || 0
            });
            return;
        }
        byColor.forEach((vars, color) => {
            const cant = vars.reduce((a, x) => a + x.cantidad, 0);
            rows.push({
                cod: `${nroOC}-${line++}`,
                articulo,
                color,
                talles: _formatTallesRemito(vars),
                qxTalle: _formatQxTalleRemito(vars),
                cant
            });
        });
    });
    return rows;
}

function _pickEtapaRemito() {
    const etapas = State.etapas || [];
    if (!etapas.length) return null;
    return etapas.find(e => e.idTaller) || etapas[0];
}

/** Modal para elegir FASSON si la OC no tiene etapa/taller. */
function _elegirTallerRemitoUI() {
    const talleres = State.talleres || [];
    if (!talleres.length) return Promise.resolve(0);

    return new Promise((resolve) => {
        const id = "modalPickTallerRemito";
        document.getElementById(id)?.remove();
        const opts = talleres.map(t => `<option value="${t.Id}">${t.Nombre}</option>`).join("");
        document.body.insertAdjacentHTML("beforeend", `
<div class="modal fade" id="${id}" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">Fasson del remito</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
      </div>
      <div class="modal-body">
        <p class="mb-2 text-muted">La orden no tiene etapa. Elegí el taller (Fasson) que va en el remito.</p>
        <label class="form-label fw-bold">Fasson</label>
        <select class="form-select" id="cmbPickTallerRemito">${opts}</select>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
        <button type="button" class="btn btn-primary" id="btnPickTallerOk">Usar en remito</button>
      </div>
    </div>
  </div>
</div>`);
        const modalEl = document.getElementById(id);
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        let done = false;
        const finish = (val) => {
            if (done) return;
            done = true;
            try { modal.hide(); } catch { /* ignore */ }
            setTimeout(() => modalEl.remove(), 300);
            resolve(val);
        };
        document.getElementById("btnPickTallerOk").onclick = () => {
            finish(parseInt(document.getElementById("cmbPickTallerRemito").value, 10) || 0);
        };
        modalEl.addEventListener("hidden.bs.modal", () => finish(0), { once: true });
        modal.show();
    });
}

async function _resolverDatosTallerRemito() {
    if (!(State.talleres || []).length) {
        try { await loadTalleres(); } catch { /* ignore */ }
    }
    const etapa = _pickEtapaRemito();
    let idTaller = parseInt(etapa?.idTaller || 0, 10) || 0;
    let fechaSalida = "";
    if (etapa) {
        fechaSalida = fView(etapa.fechaSalidaReal || etapa.fechaSalidaAprox || etapa.fechaEntrada) || "";
    }
    if (!idTaller) {
        idTaller = await _elegirTallerRemitoUI();
    }
    const t = idTaller ? getTallerInfo(idTaller) : null;
    return {
        nombre: (t?.Nombre || etapa?.tallerNombre || "").trim(),
        direccion: (t?.Direccion || "").trim(),
        telefono: (t?.Telefono || "").trim(),
        fechaSalida
    };
}

function _drawLabelValue(doc, label, value, x, y, valueMaxW) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(label, x, y);
    const labelW = doc.getTextWidth(label) + 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    const txt = (value || "").toUpperCase();
    if (txt) {
        const lines = doc.splitTextToSize(txt, valueMaxW || 220);
        doc.text(lines[0], x + labelW, y);
    }
}

async function exportarOCPdf() {
    if (!(State.items || []).length) return errorModal?.("Agregá al menos un producto para exportar.");

    const { jsPDF } = window.jspdf || {};
    if (!jsPDF || !window.jspdf?.jsPDF?.API?.autoTable) {
        return errorModal?.("Falta jsPDF/autoTable.");
    }

    recomputeAll();

    const tallerData = await _resolverDatosTallerRemito();
    const nroOC = (State.idOC && State.idOC > 0) ? String(State.idOC) : "S/N";
    const fasson = tallerData.nombre;
    const direccion = tallerData.direccion;
    const telefono = tallerData.telefono;
    const fechaCorte = fView(document.getElementById("dtpFechaInicio")?.value) || "";
    const fechaSalida = tallerData.fechaSalida || "";

    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const pad = 26;
    const ink = [0, 0, 0];
    const contentW = pageW - pad * 2;
    let y = 26;

    // —— Cabecera: [JATUN+logo]  REMITO N°  FECHA DE CORTE ——
    const banner = await _buildJatunBannerDataURL();
    const brandW = 168, brandH = 38;
    try { doc.addImage(banner, "PNG", pad, y, brandW, brandH, undefined, "NONE"); } catch { /* ignore */ }

    // REMITO N° centrado entre brand y fecha
    const boxW = 82, boxH = 32;
    const boxX = pad + brandW + ((contentW - brandW - 130) / 2) - boxW / 2 + 8;
    const boxY = y + 12;
    doc.setTextColor(...ink);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("REMITO N°", boxX + boxW / 2, y + 9, { align: "center" });
    doc.setDrawColor(...ink);
    doc.setLineWidth(1.5);
    doc.rect(boxX, boxY, boxW, boxH);
    doc.setFontSize(18);
    doc.text(nroOC, boxX + boxW / 2, boxY + 22, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("FECHA DE CORTE", pageW - pad, y + 12, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(13);
    doc.text(fechaCorte, pageW - pad, y + 30, { align: "right" });

    y += brandH + 8;

    // Barra negra gruesa (como el papel)
    doc.setFillColor(0, 0, 0);
    doc.rect(pad, y, contentW, 6.5, "F");
    y += 20;

    // FASSON: NOMBRE          FECHA DE SALIDA
    // DIRECCION: ...          fecha
    // TELEFONO: ...
    const leftMax = contentW * 0.58;
    _drawLabelValue(doc, "FASSON:", fasson, pad, y, leftMax - 70);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("FECHA DE SALIDA", pageW - pad, y, { align: "right" });
    y += 15;

    _drawLabelValue(doc, "DIRECCION:", direccion || (fasson ? "#N/D" : ""), pad, y, leftMax - 80);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.text(fechaSalida, pageW - pad, y, { align: "right" });
    y += 14;

    if (telefono) {
        _drawLabelValue(doc, "TELEFONO:", telefono, pad, y, leftMax - 80);
        y += 13;
    }
    y += 8;

    // —— Tabla ——
    const remitoRows = _buildRemitoCorteRows(nroOC);
    const totalPrendas = remitoRows.reduce((a, r) => a + (parseFloat(r.cant) || 0), 0);
    const TOTAL_ROWS = 25;
    const bodyProd = [];
    for (let i = 0; i < TOTAL_ROWS; i++) {
        const r = remitoRows[i];
        const cod = `${nroOC}-${i + 1}`;
        if (r) {
            bodyProd.push([
                cod,
                r.articulo,
                r.color,
                r.talles,
                r.qxTalle,
                r.cant ? String(Math.round(r.cant)) : ""
            ]);
        } else {
            bodyProd.push([cod, "", "", "", "", ""]);
        }
    }

    const colCod = 46, colColor = 86, colTalles = 62, colQx = 58, colCant = 38;
    const colArt = contentW - colCod - colColor - colTalles - colQx - colCant;

    doc.autoTable({
        startY: y,
        head: [["COD", "ARTICULO", "COLOR", "TALLES", "Q X TALLE", "CANT"]],
        body: bodyProd,
        margin: { left: pad, right: pad },
        tableWidth: contentW,
        styles: {
            fontSize: 7.4,
            cellPadding: { top: 2.1, bottom: 2.1, left: 2, right: 2 },
            textColor: ink,
            lineColor: ink,
            lineWidth: 0.5,
            overflow: "linebreak",
            valign: "middle",
            minCellHeight: 11
        },
        headStyles: {
            fillColor: [0, 0, 0],
            textColor: [255, 255, 255],
            fontStyle: "bold",
            halign: "center",
            fontSize: 8,
            cellPadding: 3.2
        },
        bodyStyles: { fillColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [255, 255, 255] },
        columnStyles: {
            0: { cellWidth: colCod, halign: "center", fontStyle: "bold" },
            1: { cellWidth: colArt },
            2: { cellWidth: colColor },
            3: { cellWidth: colTalles, halign: "center" },
            4: { cellWidth: colQx, halign: "center" },
            5: { cellWidth: colCant, halign: "center", fontStyle: "bold" }
        }
    });

    y = doc.lastAutoTable.finalY;

    // TOTAL DE PRENDAS
    doc.setDrawColor(...ink);
    doc.setLineWidth(0.8);
    doc.setFillColor(255, 255, 255);
    doc.rect(pad, y, contentW, 17, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("TOTAL DE PRENDAS", pad + 6, y + 12);
    doc.text(String(Math.round(totalPrendas)), pageW - pad - 8, y + 12, { align: "right" });
    y += 28;

    // BOLSAS (izq) …………… FECHA DE ENTREGA (derecha, bien separadas)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setDrawColor(...ink);
    doc.setLineWidth(0.8);
    doc.text("BOLSAS:", pad, y);
    doc.line(pad + 54, y + 1, pad + 150, y + 1);

    const feX = pageW - pad - 175;
    doc.text("FECHA DE ENTREGA:", feX, y);
    doc.line(feX + doc.getTextWidth("FECHA DE ENTREGA:") + 6, y + 1, pageW - pad, y + 1);
    y += 18;

    // Insumos / avíos (solo si hay)
    if ((State.insumos || []).length) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.text("INSUMOS / AVIOS", pad, y);
        y += 4;
        doc.autoTable({
            startY: y,
            head: [["Insumo / Avio", "Cant."]],
            body: (State.insumos || []).map(i => [i.nombre || "", String(Math.round(parseFloat(i.cantidad) || 0))]),
            margin: { left: pad, right: pad },
            styles: { fontSize: 7.5, cellPadding: 2.5, textColor: ink, lineColor: ink, lineWidth: 0.4 },
            headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], fontStyle: "bold" },
            columnStyles: { 1: { halign: "right", cellWidth: 50 } }
        });
        y = doc.lastAutoTable.finalY + 12;
    } else {
        y += 6;
    }

    if (y > pageH - 95) {
        doc.addPage();
        y = 40;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("OBSERVACIONES", pad, y);
    y += 14;
    doc.setDrawColor(...ink);
    doc.setLineWidth(0.7);
    for (let i = 0; i < 2; i++) {
        doc.line(pad, y + i * 18, pageW - pad, y + i * 18);
    }
    y += 2 * 18 + 22;

    // FIRMA (izq) + DUPLICADO (centro) — como el papel
    doc.setLineWidth(0.9);
    doc.line(pad, y, pad + 130, y);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("FIRMA", pad + 65, y + 13, { align: "center" });
    doc.setFontSize(11);
    doc.text("DUPLICADO", pageW / 2, y + 4, { align: "center" });

    const fechaNombre = document.getElementById("dtpFechaInicio")?.value || moment().format("YYYY-MM-DD");
    doc.save(`RemitoCorte_${nroOC}_${fechaNombre}.pdf`);
}


// ----------------- FLAGS -----------------
let isSavingInsumoABM = false;
let wasSubmitInsumoABM = false;

// ----------------- ENDPOINTS FIJOS -----------------
const URL_INS_CATEGORIAS = "/InsumosCategoria/Lista";
const URL_PROVEEDORES = "/Proveedores/Lista";

// ----------------- DOM HELPERS -----------------
function _insABM_el(id) { return document.getElementById(id); }
function _insABM_val(id) { return (_insABM_el(id)?.value ?? ""); }
function _insABM_set(id, v) { const el = _insABM_el(id); if (el) el.value = (v ?? ""); }

// ----------------- AUTH HEADERS -----------------
function _authHeadersJson() {
    return {
        Authorization: "Bearer " + _ocJwt(),
        "Content-Type": "application/json;charset=utf-8"
    };
}

// ----------------- SELECT2 (dentro de modal) -----------------
function _insABM_initSelect2(sel) {
    if (!window.jQuery || !$.fn.select2) return;
    const $el = $(sel); if (!$el.length) return;

    const dropdownParent = $(document.body);

    if ($el.hasClass("select2-hidden-accessible")) $el.select2("destroy");

    $el.select2({
        theme: "bootstrap-5",
        width: "100%",
        placeholder: "Seleccione",
        dropdownParent,
        language: { noResults: () => "No hay resultados", searching: () => "Buscando..." }
    });
}

// Si tenés initSelect2Base del proyecto, lo usa; si no, usa el de arriba
function _initSelect2PreferProject(sel) {
    if (typeof initSelect2Base === "function") initSelect2Base(sel);
    else _insABM_initSelect2(sel);
}

// ----------------- VALIDACIÓN (usa tus helpers si existen) -----------------
function _setInvalid(selectorOrEl, msg = "Campo obligatorio") {
    if (typeof setInvalid === "function") return setInvalid(selectorOrEl, msg);

    const el = typeof selectorOrEl === "string" ? document.querySelector(selectorOrEl) : selectorOrEl;
    if (!el) return false;
    el.classList.add("is-invalid");
    el.classList.remove("is-valid");
    return false;
}
function _setValid(selectorOrEl) {
    if (typeof setValid === "function") return setValid(selectorOrEl);

    const el = typeof selectorOrEl === "string" ? document.querySelector(selectorOrEl) : selectorOrEl;
    if (!el) return true;
    el.classList.add("is-valid");
    el.classList.remove("is-invalid");
    return true;
}
function _clearValidation(selectorOrEl) {
    if (typeof clearValidation === "function") return clearValidation(selectorOrEl);

    const el = typeof selectorOrEl === "string" ? document.querySelector(selectorOrEl) : selectorOrEl;
    if (!el) return;
    el.classList.remove("is-invalid", "is-valid");
}

// ----------------- CARGA DE COMBOS (Categorías / Proveedores) -----------------
let INS_CATS_CACHE = [];
let INS_PROV_CACHE = [];

function _txtCat(x) { return (x.Nombre || x.Descripcion || x.Denominacion || `Categoría ${x.Id}`); }
function _txtProv(x) { return (x.Nombre || x.RazonSocial || x.Descripcion || `Proveedor ${x.Id}`); }

async function _loadCatsAndProvsForABM() {
    // ambos en paralelo
    const [cats, provs] = await Promise.all([
        fetch(URL_INS_CATEGORIAS, { headers: { Authorization: "Bearer " + _ocJwt() } })
            .then(r => (r.ok ? r.json() : []))
            .catch(() => []),
        fetch(URL_PROVEEDORES, { headers: { Authorization: "Bearer " + _ocJwt() } })
            .then(r => (r.ok ? r.json() : []))
            .catch(() => [])
    ]);

    INS_CATS_CACHE = Array.isArray(cats) ? cats : [];
    INS_PROV_CACHE = Array.isArray(provs) ? provs : [];

    // Render combos
    const cmbCat = _insABM_el("insABM_Categoria");
    const cmbProv = _insABM_el("insABM_Proveedor");

    if (cmbCat) {
        cmbCat.innerHTML =
            `<option value="">Seleccione</option>` +
            INS_CATS_CACHE.map(x => `<option value="${x.Id}">${_txtCat(x)}</option>`).join("");
        _initSelect2PreferProject("#insABM_Categoria");
        if (window.jQuery && $.fn.select2) $("#insABM_Categoria").val("").trigger("change.select2");
    }

    if (cmbProv) {
        cmbProv.innerHTML =
            `<option value="">Seleccione</option>` +
            INS_PROV_CACHE.map(x => `<option value="${x.Id}">${_txtProv(x)}</option>`).join("");
        _initSelect2PreferProject("#insABM_Proveedor");
        if (window.jQuery && $.fn.select2) $("#insABM_Proveedor").val("").trigger("change.select2");
    }
}

// ----------------- ABRIR MODAL ABM (SIEMPRE NUEVO) -----------------
function abrirModalInsumoABM() {
    if (ocEsSoloConsulta()) return;
    wasSubmitInsumoABM = false;

    // Título y botón
    const ttl = _insABM_el("modalInsumoABMLabel");
    if (ttl) ttl.innerHTML = `<i class="fa fa-wrench me-2 text-success"></i> Nuevo Insumo`;

    const btn = _insABM_el("btnGuardarInsumoABM");
    if (btn) btn.innerHTML = `<i class="fa fa-check me-1"></i> Registrar`;

    // Limpiar campos (SIEMPRE INSERTA)
    _insABM_set("insABM_Id", "0");
    _insABM_set("insABM_Codigo", "");
    _insABM_set("insABM_Descripcion", "");
    _insABM_set("insABM_Costo", "");

    // Limpiar validaciones + banner
    ["#insABM_Codigo", "#insABM_Descripcion", "#insABM_Categoria", "#insABM_Proveedor", "#insABM_Costo"]
        .forEach(_clearValidation);
    _insABM_el("insABM_Error")?.classList.add("d-none");

    // Mostrar modal
    const modalEl = document.getElementById("modalInsumoABM");
    const modal = new bootstrap.Modal(modalEl);
    modal.show();

    // Cargar combos al abrir (y reinit select2 dentro del modal)
    _loadCatsAndProvsForABM().then(() => {
        // deja selects en blanco
        if (window.jQuery && $.fn.select2) {
            $("#insABM_Categoria").val("").trigger("change.select2");
            $("#insABM_Proveedor").val("").trigger("change.select2");
        } else {
            _insABM_set("insABM_Categoria", "");
            _insABM_set("insABM_Proveedor", "");
        }
    });

    // Live validation
    _attachInsumoABMLiveValidation();
}

// ----------------- VALIDAR ABM -----------------
function validarInsumoABM() {
    const codigo = (_insABM_val("insABM_Codigo") || "").trim();
    const desc = (_insABM_val("insABM_Descripcion") || "").trim();
    const idCat = parseInt(_insABM_val("insABM_Categoria") || "0", 10) || 0;
    const idProv = parseInt(_insABM_val("insABM_Proveedor") || "0", 10) || 0;
    const costo = parseFloat(_insABM_val("insABM_Costo") || "0") || 0;

    let ok = true;
    ok = (codigo ? _setValid("#insABM_Codigo") : _setInvalid("#insABM_Codigo")) && ok;
    ok = (desc ? _setValid("#insABM_Descripcion") : _setInvalid("#insABM_Descripcion")) && ok;
    ok = (idCat ? _setValid("#insABM_Categoria") : _setInvalid("#insABM_Categoria")) && ok;
    ok = (idProv ? _setValid("#insABM_Proveedor") : _setInvalid("#insABM_Proveedor")) && ok;
    ok = (costo >= 0 ? _setValid("#insABM_Costo") : _setInvalid("#insABM_Costo")) && ok; // costo puede ser 0 si querés

    _insABM_el("insABM_Error")?.classList.toggle("d-none", ok);
    return ok;
}

let __insAbmLiveBound = false;
function _attachInsumoABMLiveValidation() {
    if (__insAbmLiveBound) return;
    __insAbmLiveBound = true;

    const ids = ["insABM_Codigo", "insABM_Descripcion", "insABM_Costo"];
    ids.forEach(id => {
        const el = _insABM_el(id);
        if (!el) return;
        ["input", "change", "blur"].forEach(ev => el.addEventListener(ev, () => {
            if (!wasSubmitInsumoABM) return;
            validarInsumoABM();
        }));
    });

    ["insABM_Categoria", "insABM_Proveedor"].forEach(id => {
        const el = _insABM_el(id);
        if (!el) return;
        ["change", "input"].forEach(ev => el.addEventListener(ev, () => {
            if (!wasSubmitInsumoABM) return;
            validarInsumoABM();
        }));
        if (window.jQuery && $.fn.select2) {
            $("#" + id).on("select2:select select2:clear", () => {
                if (!wasSubmitInsumoABM) return;
                validarInsumoABM();
            });
        }
    });
}

// ----------------- REFRESCAR COMBO INSUMOS OC (modal normal) -----------------
function _refreshComboInsumosOC() {
    const cmb = document.getElementById("cmbInsumo");
    if (!cmb) return;

    cmb.innerHTML =
        `<option value="">Seleccione</option>` +
        (State.insumosCat || []).map(i => {
            const txt = (i.Descripcion || i.Nombre || `Insumo ${i.Id}`);
            return `<option value="${i.Id}">${txt}</option>`;
        }).join("");

    if (window.jQuery && $.fn.select2) {
        // reinit preferentemente con tu helper
        if (typeof initSelect2Base === "function") initSelect2Base("#cmbInsumo");
        else _insABM_initSelect2("#cmbInsumo");
        $("#cmbInsumo").trigger("change.select2");
    }
}

function _selectInsumoEnModal(idInsumo) {
    // Selecciona en el modal normal de insumo (#modalInsumo)
    const sel = document.getElementById("cmbInsumo");
    if (!sel) return;
    const sid = String(idInsumo ?? "");
    if (window.jQuery && $.fn.select2) {
        // "change" actualiza Select2 y dispara listeners; change.select2 solo no alcanza para revalidar con .on("change", …)
        $("#cmbInsumo").val(sid).trigger("change");
    } else {
        sel.value = sid;
        sel.dispatchEvent(new Event("change", { bubbles: true }));
    }
    // Tras alta ABM el usuario pudo haber intentado Registrar antes: reevaluar y limpiar "Campo obligatorio" del combo
    if (wasSubmitInsumo) validarInsumo();
}

// ----------------- GUARDAR ABM (SIEMPRE INSERTA + selecciona nuevo) -----------------
// IMPORTANTE: Para que esto seleccione el nuevo insumo, tu backend debe devolver el Id.
// Te dejo la lógica lista para ambos casos:
//  - Si devuelve { valor:true, id:123 } => usa id.
//  - Si devuelve solo { valor:true } => fallback buscando por Codigo+Descripcion.
async function guardarInsumoABM() {
    if (isSavingInsumoABM) return;

    wasSubmitInsumoABM = true;
    if (!validarInsumoABM()) return;

    // SIEMPRE INSERTAR
    const payload = {
        Id: 0,
        Codigo: (_insABM_val("insABM_Codigo") || "").trim(),
        Descripcion: (_insABM_val("insABM_Descripcion") || "").trim(),
        IdCategoria: parseInt(_insABM_val("insABM_Categoria") || "0", 10) || 0,
        IdProveedor: parseInt(_insABM_val("insABM_Proveedor") || "0", 10) || 0,
        CostoUnitario: parseFloat(_insABM_val("insABM_Costo") || "0") || 0
    };

    try {
        isSavingInsumoABM = true;

        const r = await fetch("/Insumos/Insertar", {
            method: "POST",
            headers: _authHeadersJson(),
            body: JSON.stringify(payload)
        });

        if (!r.ok) throw new Error(r.statusText);
        const j = await r.json();

        const ok = (j === true || j?.valor === true);
        if (!ok) return (window.errorModal ? errorModal("No se pudo guardar el insumo.") : alert("No se pudo guardar el insumo."));

        // ✅ refrescar catálogo OC
        if (typeof loadInsumos === "function") {
            await loadInsumos(); // actualiza State.insumosCat
        }

        // ✅ refrescar combo modal normal
        _refreshComboInsumosOC();

        // ✅ determinar ID creado
        let newId = parseInt(j?.id || j?.Id || j?.nuevoId || "0", 10) || 0;

        if (!newId) {
            // fallback: buscar por Codigo+Descripcion (por si aún no devolvés Id)
            const cod = payload.Codigo.toUpperCase();
            const desc = payload.Descripcion.toUpperCase();
            const found = (State.insumosCat || []).slice().reverse().find(x =>
                String(x.Codigo || "").toUpperCase() === cod &&
                String(x.Descripcion || x.Nombre || "").toUpperCase() === desc
            );
            newId = found?.Id || 0;
        }

        if (newId) {
            _selectInsumoEnModal(newId);
            if (typeof showToast === "function") showToast("Insumo creado y seleccionado.", "success");
        } else {
            if (typeof showToast === "function") showToast("Insumo creado. Seleccionalo en la lista.", "info");
        }

        const elAbm = document.getElementById("modalInsumoABM");
        if (elAbm && window.bootstrap?.Modal) {
            window.bootstrap.Modal.getInstance(elAbm)?.hide();
        }

    } catch (e) {
        console.error(e);
        if (window.errorModal) errorModal("Error guardando el insumo.");
        else alert("Error guardando el insumo.");
    } finally {
        isSavingInsumoABM = false;
    }
}

function wirePlusPersonalOrdenesCorte() {
    if (!window.jQuery) return;
    const $ = window.jQuery;
    $(document).off("click.ocNmPersonal", "#btnPlusPersonalOC").on("click.ocNmPersonal", "#btnPlusPersonalOC", async function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (typeof nuevoPersonal !== "function") {
            if (typeof errorModal === "function") await errorModal("No se pudo abrir el alta de personal.");
            return;
        }
        window.__personalByClizaAltaCallback = async function (nuevoId) {
            try {
                await loadPersonal();
                const nid = Number(nuevoId);
                if (Number.isFinite(nid) && nid > 0) {
                    $("#cmbPersonal").val(String(nid)).trigger("change.select2");
                }
            } catch (err) {
                console.error(err);
            }
        };
        nuevoPersonal();
    });
}

function wirePlusProductoOrdenesCorte() {
    if (!window.jQuery) return;
    const $ = window.jQuery;
    $(document).off("click.ocNmProd", "#btnPlusProductoOC").on("click.ocNmProd", "#btnPlusProductoOC", async function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (!window.MProductoByCliza || typeof window.MProductoByCliza.abrir !== "function") {
            if (typeof errorModal === "function") await errorModal("No se pudo abrir el alta de producto.");
            return;
        }
        await window.MProductoByCliza.abrir({
            onSuccess: async (newId) => {
                try {
                    await loadProductos();
                    const modal = document.getElementById("modalProducto");
                    const cmb = document.getElementById("cmbProdModal");
                    if (!cmb) return;
                    if (modal && modal.classList.contains("show")) {
                        cmb.innerHTML = `<option value="">Seleccione</option>` + (State.productos || []).map(p =>
                            `<option value="${p.Id}">${p.Descripcion || ""}</option>`).join("");
                        initSelect2Base("#cmbProdModal");
                        const nid = Number(newId) || 0;
                        if (nid > 0) {
                            $(cmb).val(String(nid)).trigger("change");
                            if (typeof cmb.onchange === "function") await cmb.onchange();
                        }
                    }
                } catch (err) {
                    console.error(err);
                }
            }
        });
    });
}

function wirePlusEtapaEstadoOrdenesCorte() {
    if (!window.jQuery) return;
    window.jQuery(document).off("click.ocNmEtEst", "#btnPlusEtapaEstadoOC").on("click.ocNmEtEst", "#btnPlusEtapaEstadoOC", async function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (typeof abrirConfiguracion !== "function") return;
        try {
            await abrirConfiguracion(
                "Etapas Estados Ordenes de Corte",
                "OrdenesCorteEtapasEstados",
                null,
                null,
                null,
                true
            );
        } catch (err) {
            console.error(err);
        }
    });
}

function registrarEventosEstadoOC() {
    const btnCrearEstado = document.getElementById("btnCrearEstadoOC");

    if (!btnCrearEstado) return;

    btnCrearEstado.addEventListener("click", async function () {
        try {
            await abrirConfiguracion(
                "Estados Ordenes de Corte",   // nombre visible
                "OrdenesCorteEstados",      // controller configuracion
                null,                 // comboNombre
                null,                 // comboController
                null,                  // lblComboNombre
                true
            );
        } catch (e) {
            console.error("Error al abrir configuraciones de estados", e);
            errorModal("No se pudo abrir la configuración de estados.");
        }
    });
}


function registrarListenerConfiguracionesGlobales() {
    if (document.documentElement.dataset.ocNmConfigListener) return;
    document.documentElement.dataset.ocNmConfigListener = "1";
    document.addEventListener("configuracionActualizada", async function (e) {
        try {
            const detail = e.detail || {};
            const tipo = detail.tipo || "";
            const nuevoId = detail.nuevoId ?? detail.NuevoId ?? null;

            if (tipo === "OrdenesCorteEstados") {
                await recargarEstadosOC(true, nuevoId);
            }
            if (tipo === "OrdenesCorteEtapasEstados") {
                await recargarEtapasEstadosOC(true, nuevoId);
            }
        } catch (err) {
            console.error("Error procesando configuracionActualizada", err);
        }
    });
}

async function recargarEstadosOC(mantenerSeleccion = true, idSeleccionar = null) {
    try {
        const select = document.getElementById("cmbEstado"); // 👈 IMPORTANTE (no IdEstado)
        if (!select) return;

        const valorActual = mantenerSeleccion ? select.value : "";

        // 🔥 traemos estados igual que tu sistema
        const estados = await fetchFirstOk(
            ["/OrdenesCorte/Estados", "/OrdenesCorteEstados/Lista"],
            authHeaders()
        );

        State.estadosOC = Array.isArray(estados) ? estados : [];

        // 🔥 llenar select
        select.innerHTML =
            `<option value="">Seleccione</option>` +
            State.estadosOC.map(x =>
                `<option value="${x.Id}">${x.Nombre}</option>`
            ).join("");

        // 🔥 restaurar selección
        if (idSeleccionar) {
            select.value = String(idSeleccionar);
        } else if (valorActual) {
            const existe = State.estadosOC.some(x => String(x.Id) === String(valorActual));
            if (existe) {
                select.value = String(valorActual);
            }
        }

        // 🔥 refrescar UI (select2 o normal)
        if (window.jQuery && $(select)?.hasClass("select2-hidden-accessible")) {
            $(select).trigger("change.select2");
        } else if (window.jQuery) {
            $(select).trigger("change");
        } else {
            select.dispatchEvent(new Event("change", { bubbles: true }));
        }

    } catch (e) {
        console.error("Error recargando estados OC", e);
    }
}

async function recargarEtapasEstadosOC(mantenerSeleccion = true, idSeleccionar = null) {
    try {
        const select = document.getElementById("cmbEtEstado");
        if (!select) return;

        const valorActual = mantenerSeleccion ? select.value : "";

        await loadEtapasEstados();

        select.innerHTML =
            `<option value="">Seleccione</option>` +
            (State.etapasEstados || []).map(x =>
                `<option value="${x.Id}">${x.Nombre}</option>`
            ).join("");

        if (idSeleccionar) {
            select.value = String(idSeleccionar);
        } else if (valorActual) {
            const existe = (State.etapasEstados || []).some(x => String(x.Id) === String(valorActual));
            if (existe) select.value = String(valorActual);
        }

        if (window.jQuery && $(select)?.hasClass("select2-hidden-accessible")) {
            $(select).trigger("change.select2");
        } else if (window.jQuery) {
            $(select).trigger("change");
        } else {
            select.dispatchEvent(new Event("change", { bubbles: true }));
        }
    } catch (e) {
        console.error("Error recargando estados de etapa OC", e);
    }
}