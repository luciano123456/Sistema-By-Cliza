// --------------------------- Estado ---------------------------
let gridPagos = null;
let isSaving = false; // lock anti-doble click

const State = {
    pagos: [],         // { id, fecha(YYYY-MM-DD), idCuenta, cuenta, importe(number), nota }
    editIndex: -1,
    cuentas: [],
    personales: [],
    /** true si ?ver=1 (consulta; solo permiso Ver, sin Editar). */
    soloVer: false,
};

// --------------------------- Auth (token viene de site.js, no window.token) ---------------------------
function getAuthToken() {
    try {
        if (typeof token !== "undefined" && token) return token;
    } catch (_) { /* noop */ }
    return localStorage.getItem("JwtToken") || "";
}

function destruirSelect2SiHay($sel) {
    if (!$sel || !$sel.length || !window.jQuery || !$.fn.select2) return;
    if ($sel.hasClass("select2-hidden-accessible")) {
        $sel.select2("destroy");
    }
}

/** Inicializa Select2 tras repoblar opciones (evita romper el DOM como initSelect2 global + innerHTML). */
function initSelect2ComboSueldo($sel) {
    if (!$sel || !$sel.length || !window.jQuery || !$.fn.select2) return;
    destruirSelect2SiHay($sel);
    const parentSel = $sel.attr("data-s2-parent");
    const $parent = !parentSel || parentSel === "body" ? $(document.body) : $(parentSel);
    $sel.removeClass("no-select2");
    $sel.select2({
        width: "100%",
        dropdownParent: $parent.length ? $parent : $(document.body)
    });
}

/** Igual que Productos/Insumos: delegado en document para que el click llegue aunque el DOM o Select2 cambien. */
function wireCatalogPlusButtonsPersonalSueldosNuevoModif() {
    if (!window.jQuery) return;
    const $ = window.jQuery;
    $(document)
        .off("click.psSueldoNm", "#btnPlusPersonalSueldo")
        .on("click.psSueldoNm", "#btnPlusPersonalSueldo", async function (e) {
            e.preventDefault();
            e.stopPropagation();
            if (typeof nuevoPersonal !== "function") {
                if (typeof errorModal === "function") await errorModal("No se pudo abrir el alta de personal.");
                return;
            }
            window.__personalByClizaAltaCallback = async function (nuevoId) {
                try {
                    await cargarPersonales();
                    const nid = Number(nuevoId);
                    if (Number.isFinite(nid) && nid > 0) {
                        $("#cmbPersonal").val(String(nid)).trigger("change");
                    }
                } catch (err) {
                    console.error(err);
                }
            };
            nuevoPersonal();
        });
    $(document)
        .off("click.psSueldoNm", "#btnPlusCuentaSueldo")
        .on("click.psSueldoNm", "#btnPlusCuentaSueldo", async function (e) {
            e.preventDefault();
            e.stopPropagation();
            if (typeof window.abrirConfiguracion !== "function") return;
            try {
                await window.abrirConfiguracion("Cuenta", "Cuentas", null, null, null, true);
            } catch (err) {
                console.error(err);
            }
        });
}

function wireConfiguracionActualizadaPersonalSueldosNuevoModif() {
    if (document.documentElement.dataset.psNuevoModifConfigListener) return;
    document.documentElement.dataset.psNuevoModifConfigListener = "1";
    document.addEventListener("configuracionActualizada", async (e) => {
        if (!/\/PersonalSueldos\/NuevoModif/i.test(location.pathname || "")) return;
        const d = e.detail || {};
        if (d.accion !== "insertar") return;
        const raw = d.nuevoId ?? d.NuevoId ?? d.nuevoID;
        const nid = raw != null && raw !== "" ? Number(raw) : NaN;
        try {
            if (d.tipo === "Personal" && Number.isFinite(nid) && nid > 0) {
                await cargarPersonales();
                $("#cmbPersonal").val(String(nid)).trigger("change");
            }
            if (d.tipo === "Cuentas") {
                await cargarCuentas();
                if (Number.isFinite(nid) && nid > 0) {
                    $("#cmbCuenta").val(String(nid)).trigger("change");
                }
            }
        } catch (err) {
            console.error(err);
        }
    });
}

/** Una sola instancia de Bootstrap Modal (evita backdrops duplicados y pantalla “pegada”). */
function getBsModalPago() {
    const el = document.getElementById("modalPago");
    if (!el || typeof bootstrap === "undefined" || !bootstrap.Modal) return null;
    return bootstrap.Modal.getOrCreateInstance(el, { backdrop: true, keyboard: true });
}

/* ---------- Importes con $ (misma UX que Productos: pr-precio-input) ---------- */
function psNm_formatPrecioFinal(n) {
    if (typeof n !== "number" || isNaN(n)) return "";
    if (typeof formatNumber === "function") return formatNumber(n);
    return n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function psNm_addThousandsFromRight(digitsOnly) {
    const d = String(digitsOnly || "").replace(/\D/g, "");
    if (!d) return "";
    const rev = d.split("").reverse().join("");
    const chunks = rev.match(/\d{1,3}/g) || [];
    return chunks.map((chunk) => chunk.split("").reverse().join("")).reverse().join(".");
}

function psNm_extractPrecioTypingParts(str) {
    const t = String(str ?? "").replace(/\$/g, "").replace(/\s/g, "");
    if (!t) return { intDigits: "", decDigits: "", hasComma: false };
    const commaIdx = t.lastIndexOf(",");
    if (commaIdx === -1) {
        return { intDigits: t.replace(/\./g, "").replace(/\D/g, ""), decDigits: "", hasComma: false };
    }
    const intP = t.slice(0, commaIdx).replace(/\./g, "").replace(/\D/g, "");
    const decP = t.slice(commaIdx + 1).replace(/\D/g, "").slice(0, 2);
    return { intDigits: intP, decDigits: decP, hasComma: true };
}

function psNm_buildPrecioLiveDisplay(intDigitsRaw, decDigitsRaw, hasComma) {
    let intd = String(intDigitsRaw || "").replace(/\D/g, "");
    intd = intd.replace(/^0+(?=\d)/, "");
    const dec = String(decDigitsRaw || "").replace(/\D/g, "").slice(0, 2);
    if (!intd && !hasComma && !dec) return "";
    if (!intd && (hasComma || dec)) intd = "0";
    const intFmt = intd ? psNm_addThousandsFromRight(intd) : "0";
    const pref = "$ ";
    if (!hasComma && !dec) return `${pref}${intFmt}`;
    if (hasComma && !dec) return `${pref}${intFmt},`;
    return `${pref}${intFmt},${dec}`;
}

function psNm_digitOffsetBeforeCaret(s, caret) {
    const end = Math.min(caret ?? 0, String(s).length);
    let n = 0;
    for (let i = 0; i < end; i++) {
        if (/\d/.test(s[i])) n++;
    }
    return n;
}

function psNm_posAfterNthDigit(display, n) {
    if (!display) return 0;
    if (n <= 0) {
        for (let i = 0; i < display.length; i++) {
            if (/\d/.test(display[i])) return i + 1;
        }
        return display.length;
    }
    let seen = 0;
    for (let i = 0; i < display.length; i++) {
        if (/\d/.test(display[i])) {
            seen++;
            if (seen === n) return i + 1;
        }
    }
    return display.length;
}

function psNm_applyPrecioMientrasEscribe(el) {
    if (!el || el.disabled || el.readOnly) return;
    if (el.dataset.prPrecioComposing === "1") return;
    const oldVal = el.value;
    const caret = el.selectionStart ?? oldVal.length;
    const commaOld = oldVal.lastIndexOf(",");
    const hadCaretAfterComma = commaOld !== -1 && caret > commaOld;
    const parts = psNm_extractPrecioTypingParts(oldVal);
    const newVal = psNm_buildPrecioLiveDisplay(parts.intDigits, parts.decDigits, parts.hasComma);
    if (newVal === oldVal) return;
    el.dataset.prPrecioApplying = "1";
    el.value = newVal;
    const digitsBefore = psNm_digitOffsetBeforeCaret(oldVal, caret);
    let newPos = psNm_posAfterNthDigit(newVal, digitsBefore);
    if (hadCaretAfterComma) {
        const nc = newVal.indexOf(",");
        if (nc !== -1 && newPos <= nc) newPos = nc + 1;
    }
    if (caret >= oldVal.length) newPos = newVal.length;
    newPos = Math.max(0, Math.min(newPos, newVal.length));
    try {
        el.setSelectionRange(newPos, newPos);
    } catch (_) { /* noop */ }
    window.requestAnimationFrame(() => {
        delete el.dataset.prPrecioApplying;
    });
}

function psNm_finalizarPrecioCampo(el) {
    if (!el || el.disabled || el.readOnly) return;
    const raw = el.value;
    if (!String(raw).trim()) {
        el.value = "";
        return;
    }
    const n = psNm_parsePrecioInput(raw);
    if (!isNaN(n) && n >= 0) {
        el.value = psNm_formatPrecioFinal(n);
    }
}

function psNm_parsePrecioInput(raw) {
    if (raw == null) return NaN;
    let s = String(raw).trim();
    if (!s) return NaN;
    s = s.replace(/\$/g, "").replace(/\s/g, "");
    const lastComma = s.lastIndexOf(",");
    if (lastComma !== -1) {
        const intPart = s.slice(0, lastComma).replace(/\./g, "").replace(/[^\d]/g, "");
        const decPart = s.slice(lastComma + 1).replace(/[^\d]/g, "");
        return parseFloat(`${intPart || "0"}.${decPart || "0"}`);
    }
    const only = s.replace(/[^\d.]/g, "");
    const parts = only.split(".");
    if (parts.length > 2) {
        return parseFloat(parts.join(""));
    }
    if (parts.length === 2) {
        const decLen = parts[1].length;
        if (decLen <= 2 && parts[0] !== "") {
            return parseFloat(`${parts[0]}.${parts[1]}`);
        }
        return parseFloat(parts.join(""));
    }
    return parseFloat(parts[0] || "NaN");
}

function bindPrecioSueldoNuevoModif() {
    if (!window.jQuery) return;
    const $ = window.jQuery;
    const sel = "#txtImporte.pr-precio-input, #txtPagoImporte.pr-precio-input";
    $(document)
        .off("input.psPrecioNM compositionstart.psPrecioNM compositionend.psPrecioNM paste.psPrecioNM focusout.psPrecioNM", sel)
        .on("input.psPrecioNM", sel, function () {
            psNm_applyPrecioMientrasEscribe(this);
            if (this.id === "txtImporte") recalcularTotales();
        })
        .on("compositionstart.psPrecioNM", sel, function () {
            this.dataset.prPrecioComposing = "1";
        })
        .on("compositionend.psPrecioNM", sel, function () {
            delete this.dataset.prPrecioComposing;
            psNm_applyPrecioMientrasEscribe(this);
            if (this.id === "txtImporte") recalcularTotales();
        })
        .on("paste.psPrecioNM", sel, function (e) {
            const el = this;
            const ev = e.originalEvent || e;
            const text = (ev.clipboardData || window.clipboardData).getData("text") || "";
            e.preventDefault();
            const n = psNm_parsePrecioInput(text.trim());
            if (!isNaN(n) && n >= 0) {
                el.value = psNm_formatPrecioFinal(n);
                try {
                    el.setSelectionRange(el.value.length, el.value.length);
                } catch (_) { /* noop */ }
            }
            if (el.id === "txtImporte") recalcularTotales();
        })
        .on("focusout.psPrecioNM", sel, function () {
            psNm_finalizarPrecioCampo(this);
            if (this.id === "txtImporte") recalcularTotales();
        });
}

// --------------------------- Helpers ---------------------------
function _fmtNumber(n) {
    if (typeof formatNumber === "function") return formatNumber(n);
    const v = parseFloat(n || 0);
    return new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
}
function _toNumber(s) {
    const n = psNm_parsePrecioInput(s || "");
    return isNaN(n) ? 0 : n;
}
function _toMiles(n) {
    return psNm_formatPrecioFinal(parseFloat(n || 0));
}
function hoyISO() { return moment().format('YYYY-MM-DD'); }

// --- Fechas ---
function formatearFechaParaInput(fecha) {
    const m = moment(fecha, [moment.ISO_8601, 'YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DD']);
    return m.isValid() ? m.format('YYYY-MM-DD') : '';
}
function formatearFechaParaVista(fecha) {
    const m = moment(fecha, [moment.ISO_8601, 'YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DD']);
    return m.isValid() ? m.format('DD/MM/YYYY') : '';
}

function aplicarModoSoloLecturaSueldoNuevoModif() {
    document.querySelectorAll("#formSueldo input:not([type=hidden]), #formSueldo select, #formSueldo textarea").forEach((el) => {
        el.disabled = true;
    });
    try {
        if (window.jQuery && $("#cmbPersonal").length) $("#cmbPersonal").prop("disabled", true).trigger("change.select2");
        if (window.jQuery && $("#cmbCuenta").length) $("#cmbCuenta").prop("disabled", true).trigger("change.select2");
    } catch (_) { /* noop */ }
    document.getElementById("btnGuardarGlobal")?.classList.add("d-none");
    document.getElementById("btnEliminar")?.classList.add("d-none");
    document.getElementById("btnAgregarPago")?.classList.add("d-none");
    document.getElementById("btnExportarPdf")?.classList.add("d-none");
    document.getElementById("btnPlusPersonalSueldo")?.classList.add("d-none");
    document.getElementById("btnPlusCuentaSueldo")?.classList.add("d-none");
    if (gridPagos) {
        gridPagos.destroy();
        gridPagos = null;
    }
    configurarTablaPagos();
    refrescarTablaPagos();
}

// --------------------------- Init ---------------------------
document.addEventListener("DOMContentLoaded", async () => {
    Permisos.init();
    const qs = new URLSearchParams(window.location.search || "");
    State.soloVer = qs.get("ver") === "1";
    const idHidden = (document.getElementById("txtId")?.value || "").trim();
    const idNum = parseInt(idHidden || qs.get("id") || "0", 10) || 0;

    if (State.soloVer) {
        if (idNum <= 0) {
            if (typeof errorModal === "function") await errorModal("Consulta no válida.");
            window.location.href = "/PersonalSueldos/Index";
            return;
        }
        if (!Permisos.tiene("PersonalSueldos", "Ver")) {
            if (typeof errorModal === "function") await errorModal("No tenés permisos.");
            window.location.href = "/PersonalSueldos/Index";
            return;
        }
    } else {
        Permisos.aplicarUINuevoModif("PersonalSueldos");
    }

    wireConfiguracionActualizadaPersonalSueldosNuevoModif();

    const modalPagoEl = document.getElementById("modalPago");
    if (modalPagoEl) {
        modalPagoEl.addEventListener("hidden.bs.modal", () => {
            requestAnimationFrame(() => {
                if (!document.querySelector(".modal.show")) {
                    document.body.classList.remove("modal-open");
                    document.body.style.removeProperty("padding-right");
                    document.body.style.removeProperty("overflow");
                    document.querySelectorAll(".modal-backdrop").forEach((b) => b.remove());
                }
            });
        });
    }

    try {
        // evitar submit nativo del form
        const form = document.getElementById('formSueldo');
        if (form) form.addEventListener('submit', (e) => e.preventDefault(), { once: true });

        const id = document.getElementById("txtId")?.value;
        const btnTxt = document.querySelector("#btnGuardarGlobal .txt");
        if (btnTxt) btnTxt.textContent = id ? "Guardar" : "Registrar";
        if (id) document.getElementById("btnEliminar")?.classList.remove("d-none");

        // defaults
        const dtp = document.getElementById("dtpFecha");
        if (dtp && !dtp.value) dtp.value = hoyISO();

        await Promise.all([cargarPersonales(), cargarCuentas()]);
        configurarTablaPagos();

        if (id) await cargarSueldoExistente(parseInt(id));

        if (State.soloVer) aplicarModoSoloLecturaSueldoNuevoModif();

        bindPrecioSueldoNuevoModif();

        attachLiveValidation?.("#formSueldo", "#errorCampos");
        attachLiveValidation?.("#formPago", "#errorCamposPago");
        if (typeof wireSelect2Validation === "function") {
            wireSelect2Validation("#formSueldo", "#errorCampos");
            wireSelect2Validation("#formPago", "#errorCamposPago");
        }
        $("#cmbPersonal").off("select2:close.psSueldo").on("select2:close.psSueldo", function () {
            if (typeof validarCampoIndividual === "function") validarCampoIndividual(this, "change");
            if (typeof updateErrorBanner === "function") updateErrorBanner("#formSueldo", "#errorCampos");
        });
        $("#cmbCuenta").off("select2:close.psSueldo").on("select2:close.psSueldo", function () {
            if (typeof validarCampoIndividual === "function") validarCampoIndividual(this, "change");
            if (typeof updateErrorBanner === "function") updateErrorBanner("#formPago", "#errorCamposPago");
        });

        // txtImporte: recalcularTotales vía bindPrecioSueldoNuevoModif (input.psPrecioNM)

        // toolbar
        document.getElementById("btnExportarPdf")?.addEventListener("click", exportarReciboPdf);
        document.getElementById("btnAgregarPago")?.addEventListener("click", abrirModalPago);
        document.getElementById("btnGuardarPago")?.addEventListener("click", guardarPago);

        // global
        document.getElementById("btnGuardarGlobal")?.addEventListener("click", guardarTodo);
    } catch (e) { console.error(e); }
    finally {
        wireCatalogPlusButtonsPersonalSueldosNuevoModif();
    }
});

// --------------------------- Cargas Combos ---------------------------
async function cargarPersonales() {
    const cmb = document.getElementById("cmbPersonal");
    if (!cmb) return;
    const $c = $(cmb);
    try {
        const res = await fetch("/Personal/Lista", {
            headers: { Authorization: "Bearer " + getAuthToken(), "Content-Type": "application/json" }
        });
        if (!res.ok) {
            console.error("Personal/Lista HTTP", res.status);
            State.personales = [];
        } else {
            const data = await res.json();
            State.personales = Array.isArray(data) ? data : [];
        }
    } catch (e) {
        console.error(e);
        State.personales = [];
    }
    destruirSelect2SiHay($c);
    cmb.innerHTML = `<option value="">Seleccione</option>`;
    State.personales.forEach((p) => {
        const op = document.createElement("option");
        op.value = p.Id;
        op.textContent = p.Nombre ?? "";
        cmb.appendChild(op);
    });
    initSelect2ComboSueldo($c);
}

async function cargarCuentas() {
    const cmb = document.getElementById("cmbCuenta");
    if (!cmb) return;
    const $c = $(cmb);
    try {
        const res = await fetch("/Cuentas/Lista", {
            headers: { Authorization: "Bearer " + getAuthToken(), "Content-Type": "application/json" }
        });
        if (!res.ok) {
            console.error("Cuentas/Lista HTTP", res.status);
            State.cuentas = [];
        } else {
            const data = await res.json();
            State.cuentas = Array.isArray(data) ? data : [];
        }
    } catch (e) {
        console.error(e);
        State.cuentas = [];
    }
    destruirSelect2SiHay($c);
    cmb.innerHTML = `<option value="">Seleccione</option>`;
    State.cuentas.forEach((c) => {
        const op = document.createElement("option");
        op.value = c.Id;
        op.textContent = c.Nombre ?? c.Descripcion ?? "";
        cmb.appendChild(op);
    });
    initSelect2ComboSueldo($c);
}

// --------------------------- Carga de sueldo (edición) ---------------------------
async function cargarSueldoExistente(id) {
    const res = await fetch(`/PersonalSueldos/EditarInfo?id=${id}`, {
        headers: { Authorization: "Bearer " + getAuthToken(), "Content-Type": "application/json" }
    });
    if (!res.ok) { errorModal("No se pudo cargar el pago de sueldo."); return; }
    const s = await res.json();

    // Pagos
    let pagos = [];
    try {
        const rp = await fetch(`/PersonalSueldos/PagosLista?idSueldo=${id}`, {
            headers: { Authorization: "Bearer " + getAuthToken(), "Content-Type": "application/json" }
        });
        pagos = rp.ok ? await rp.json() : [];
    } catch { pagos = []; }

    // Cabecera
    document.getElementById("dtpFecha").value = formatearFechaParaInput(s.Fecha) || hoyISO();
    const idP = s.IdPersonal != null && s.IdPersonal !== "" ? String(s.IdPersonal) : "";
    $("#cmbPersonal").val(idP).trigger("change");
    document.getElementById("txtConcepto").value = s.Concepto ?? "";
    document.getElementById("txtImporte").value = _toMiles(s.Importe ?? 0);
    document.getElementById("txtNota").value = s.NotaInterna ?? "";

    // Pagos → estado
    State.pagos = (pagos || []).map(p => ({
        id: p.Id || 0,
        fecha: formatearFechaParaInput(p.Fecha) || hoyISO(),
        idCuenta: p.IdCuenta,
        cuenta: p.Cuenta ?? (State.cuentas.find(c => c.Id === p.IdCuenta)?.Nombre ?? ""),
        importe: parseFloat(p.Importe || 0),
        nota: p.NotaInterna ?? ""
    }));

    refrescarTablaPagos();
    recalcularTotales();
}

// --------------------------- Tabla Pagos (acciones inline) ---------------------------
function configurarTablaPagos() {
    if (gridPagos) return;

    gridPagos = $('#grd_Pagos').DataTable({
        data: [],
        language: { url: "//cdn.datatables.net/plug-ins/2.0.7/i18n/es-MX.json" },
        scrollX: true,
        columns: [
            { // Acciones directas (sin menú)
                data: null,
                width: "60px",
                orderable: false,
                className: "text-center",
                render: (_, __, ___, meta) => {
                    if (State.soloVer) return '<span class="text-muted">—</span>';
                    const idx = meta.row;
                    return `
            <button class="btn btn-link p-0 me-2 text-success" title="Editar" onclick="editarPago(${idx})">
              <i class="fa fa-pen"></i>
            </button>
            <button class="btn btn-link p-0 text-danger" title="Eliminar" onclick="eliminarPago(${idx})">
              <i class="fa fa-trash"></i>
            </button>`;
                }
            },
            { data: "fecha", render: (f) => formatearFechaParaVista(f) },
            { data: "cuenta" },
            { data: "importe", className: "text-center", render: (v) => _fmtNumber(v) },
            { data: "nota" }
        ],
        order: [[1, "desc"]],
        pageLength: 8,
        dom: 't<"row mt-2"<"col-sm-12"p>>'
    });
    if (typeof bindDataTableSeleccionFila === "function") {
        bindDataTableSeleccionFila("#grd_Pagos", "psPagos");
    }
}
function refrescarTablaPagos() {
    if (!gridPagos) return;
    gridPagos.clear().rows.add(State.pagos).draw();
}

// --------------------------- Validación del modal de pago ---------------------------
function resetPagoValidation() {
    document.getElementById("formPago")?.setAttribute("data-validacion-ui", "0");
    ["dtpPagoFecha", "cmbCuenta", "txtPagoImporte"].forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        if (typeof clearValidation === "function") clearValidation(el);
        else el.classList.remove("is-invalid", "is-valid");
    });
    document.getElementById("errorCamposPago")?.classList.add("d-none");
}

function validarCamposPago() {
    const fechaEl = document.getElementById("dtpPagoFecha");
    const cuentaEl = document.getElementById("cmbCuenta");
    const importeEl = document.getElementById("txtPagoImporte");

    const fechaOK = !!fechaEl?.value;
    const cuentaOK = !!parseInt(cuentaEl?.value || 0, 10);
    const importeOK = _toNumber(importeEl?.value) > 0;

    if (typeof setInvalid === "function" && typeof setValid === "function") {
        if (!fechaOK) setInvalid("#dtpPagoFecha", "Campo obligatorio"); else setValid("#dtpPagoFecha");
        if (!cuentaOK) setInvalid("#cmbCuenta", "Campo obligatorio"); else setValid("#cmbCuenta");
        if (!importeOK) setInvalid("#txtPagoImporte", "Campo obligatorio"); else setValid("#txtPagoImporte");
    } else {
        fechaEl.classList.toggle("is-invalid", !fechaOK);
        cuentaEl.classList.toggle("is-invalid", !cuentaOK);
        importeEl.classList.toggle("is-invalid", !importeOK);
        fechaEl.classList.toggle("is-valid", fechaOK);
        cuentaEl.classList.toggle("is-valid", cuentaOK);
        importeEl.classList.toggle("is-valid", importeOK);
    }

    const ok = fechaOK && cuentaOK && importeOK;
    const formPago = document.getElementById("formPago");
    const modoSuave = formPago && formPago.getAttribute("data-validacion-ui") === "0";
    if (!modoSuave) {
        document.getElementById("errorCamposPago")?.classList.toggle("d-none", ok);
    }
    return ok;
}

function attachPagoLiveValidation() {
    const f = () => validarCamposPago();
    ["dtpPagoFecha", "cmbCuenta", "txtPagoImporte", "txtPagoNota"].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.removeEventListener("input", f);
        el.removeEventListener("change", f);
        el.addEventListener("input", f);
        el.addEventListener("change", f);
    });
}

// --------------------------- Modal Pago ---------------------------
function setPagoModalMode(mode /* 'nuevo' | 'editar' */) {
    const titleEl = document.getElementById("modalPagoTitulo") || document.querySelector("#modalPago .modal-title");
    const btnEl = document.getElementById("btnGuardarPago")
        || document.querySelector("#modalPago .modal-footer .btn.btn-success");

    if (mode === "editar") {
        if (titleEl) titleEl.innerHTML = `<i class="fa fa-pen-to-square me-2"></i>Editar Pago`;
        if (btnEl) btnEl.innerHTML = `<i class="fa fa-check me-1"></i> Guardar`;
    } else {
        if (titleEl) titleEl.innerHTML = `<i class="fa fa-plus-circle me-2"></i>Registrar Pago`;
        if (btnEl) btnEl.innerHTML = `<i class="fa fa-check me-1"></i> Registrar`;
    }
}

function abrirModalPago() {
    State.editIndex = -1;

    // limpiar/defaults
    document.getElementById("dtpPagoFecha").value = hoyISO();
    $("#cmbCuenta").val("").trigger("change");
    document.getElementById("txtPagoImporte").value = "";
    document.getElementById("txtPagoNota").value = "";

    resetPagoValidation();
    attachPagoLiveValidation();
    setPagoModalMode("nuevo");
    bindPrecioSueldoNuevoModif();

    getBsModalPago()?.show();
}

function editarPago(idx) {
    const p = State.pagos[idx]; if (!p) return;
    State.editIndex = idx;

    document.getElementById("dtpPagoFecha").value = formatearFechaParaInput(p.fecha) || hoyISO();
    $("#cmbCuenta").val(p.idCuenta ? String(p.idCuenta) : "").trigger("change");
    document.getElementById("txtPagoImporte").value = _toMiles(p.importe || 0);
    document.getElementById("txtPagoNota").value = p.nota || "";

    resetPagoValidation();
    attachPagoLiveValidation();
    setPagoModalMode("editar");
    bindPrecioSueldoNuevoModif();

    getBsModalPago()?.show();
}

let _guardarPagoBusy = false;

function guardarPago() {
    if (_guardarPagoBusy) return;
    _guardarPagoBusy = true;
    try {
        const fecha = document.getElementById("dtpPagoFecha")?.value;
        const idCuenta = parseInt(document.getElementById("cmbCuenta")?.value || 0, 10);
        const importePago = _toNumber(document.getElementById("txtPagoImporte")?.value);
        const okNegocio = !!fecha && !!idCuenta && importePago > 0;
        if (!okNegocio) {
            if (typeof forzarValidacionModal === "function") {
                forzarValidacionModal("#formPago", "#errorCamposPago");
            } else {
                validarCamposPago();
            }
            if (!(importePago > 0) && typeof setInvalid === "function") {
                setInvalid("#txtPagoImporte", "Campo obligatorio");
                if (typeof updateErrorBanner === "function") {
                    updateErrorBanner("#formPago", "#errorCamposPago");
                }
            }
            const err = document.getElementById("errorCamposPago");
            if (err) {
                err.textContent = "Debes completar los campos obligatorios.";
                err.classList.remove("d-none");
            }
            return;
        }

        document.getElementById("formPago")?.setAttribute("data-validacion-ui", "0");
        document.getElementById("errorCamposPago")?.classList.add("d-none");

        const cuenta = document.getElementById("cmbCuenta").selectedOptions[0]?.textContent || "";
        const nota = (document.getElementById("txtPagoNota").value || "").trim();

        const item = { id: 0, fecha, idCuenta, cuenta, importe: importePago, nota };

        if (State.editIndex >= 0) {
            State.pagos[State.editIndex] = { ...State.pagos[State.editIndex], ...item };
        } else {
            State.pagos.push(item);
        }

        State.editIndex = -1;
        setPagoModalMode("nuevo");

        refrescarTablaPagos();
        recalcularTotales();
        getBsModalPago()?.hide();
    } finally {
        const q = typeof queueMicrotask === "function" ? queueMicrotask : (fn) => Promise.resolve().then(fn);
        q(() => {
            _guardarPagoBusy = false;
        });
    }
}

async function eliminarPago(idx) {
    const ok = await confirmarModal("¿Eliminar este pago?");
    if (!ok) return;
    State.pagos.splice(idx, 1);
    refrescarTablaPagos();
    recalcularTotales();
}

// --------------------------- Totales ---------------------------
/** Si el banner era por “pagos superan importe” y ya no aplica, lo oculta (no afecta validación de obligatorios). */
function syncSueldoErrorBannerAfterTotalesOk() {
    const err = document.getElementById("errorCampos");
    if (!err || err.classList.contains("d-none")) return;
    const importe = _toNumber(document.getElementById("txtImporte")?.value);
    const abonado = State.pagos.reduce((a, p) => a + (parseFloat(p.importe) || 0), 0);
    const EPS = 0.000001;
    if (abonado - importe > EPS) return;
    if ((err.textContent || "").includes("supera")) clearErrorCampos();
}

function recalcularTotales() {
    const importe = _toNumber(document.getElementById("txtImporte")?.value);
    const abonado = State.pagos.reduce((a, p) => a + (parseFloat(p.importe) || 0), 0);
    const saldo = (importe || 0) - (abonado || 0);

    document.getElementById("statImporte").textContent = _fmtNumber(importe);
    document.getElementById("statAbonado").textContent = _fmtNumber(abonado);
    document.getElementById("statSaldo").textContent = _fmtNumber(saldo);
    syncSueldoErrorBannerAfterTotalesOk();
}

// --------------------------- Guardar todo (sueldo + pagos) ---------------------------
async function guardarTodo() {
    if (isSaving) return;
    isSaving = true;

    const id = parseInt(document.getElementById("txtId")?.value || 0);
    const fecha = document.getElementById("dtpFecha").value;
    const idPersonal = parseInt(document.getElementById("cmbPersonal").value || 0);
    const concepto = (document.getElementById("txtConcepto").value || "").trim();
    const importe = _toNumber(document.getElementById("txtImporte").value);
    const notaInterna = (document.getElementById("txtNota").value || "").trim();

    const formSueldo = document.getElementById("formSueldo");
    if (!(fecha && idPersonal && concepto && importe > 0)) {
        if (typeof forzarValidacionModal === "function") {
            forzarValidacionModal("#formSueldo", "#errorCampos");
        } else {
            const mark = (sel, bad) => document.querySelector(sel)?.classList.toggle("is-invalid", bad);
            if (typeof setInvalid === "function" && typeof setValid === "function") {
                if (!fecha) setInvalid("#dtpFecha", "Campo obligatorio"); else setValid("#dtpFecha");
                if (!idPersonal) setInvalid("#cmbPersonal", "Campo obligatorio"); else setValid("#cmbPersonal");
                if (!concepto) setInvalid("#txtConcepto", "Campo obligatorio"); else setValid("#txtConcepto");
                if (!(importe > 0)) setInvalid("#txtImporte", "Campo obligatorio"); else setValid("#txtImporte");
            } else {
                mark("#dtpFecha", !fecha);
                mark("#cmbPersonal", !idPersonal);
                mark("#txtConcepto", !concepto);
                mark("#txtImporte", !(importe > 0));
            }
        }
        if (!(importe > 0) && typeof setInvalid === "function") {
            setInvalid("#txtImporte", "Campo obligatorio");
            if (typeof updateErrorBanner === "function") {
                updateErrorBanner("#formSueldo", "#errorCampos");
            }
        }
        setErrorCampos("Debes completar los campos obligatorios.");
        isSaving = false;
        return;
    }
    formSueldo?.setAttribute("data-validacion-ui", "0");
    clearErrorCampos();

    // Suma de pagos vs Importe
    const abonado = State.pagos.reduce((a, p) => a + (parseFloat(p.importe) || 0), 0);
    const EPS = 0.000001; // tolerancia
    if (abonado - importe > EPS) {
        // marcar el importe como inválido (opcional) y mostrar error en #errorCampos
        setErrorCampos(`La suma de pagos (${_fmtNumber(abonado)}) supera el importe del sueldo (${_fmtNumber(importe)}).`);
        isSaving = false;
        return;
    }

    const saldo = (importe || 0) - abonado;

    const payload = {
        Id: id || 0,
        Fecha: fecha,
        IdPersonal: idPersonal,
        Concepto: concepto,
        Importe: importe,
        ImporteAbonado: abonado,
        Saldo: saldo,
        NotaInterna: notaInterna,
        Pagos: State.pagos.map(p => ({
            Id: p.id || 0,
            Fecha: p.fecha,
            IdCuenta: p.idCuenta,
            Importe: p.importe,
            NotaInterna: p.nota
        }))
    };

    const eraNuevo = !(id > 0);
    const url = eraNuevo ? "/PersonalSueldos/Insertar" : "/PersonalSueldos/Actualizar";
    const method = eraNuevo ? "POST" : "PUT";

    try {
        const res = await fetch(url, {
            method,
            headers: {
                "Authorization": "Bearer " + getAuthToken(),
                "Content-Type": "application/json;charset=utf-8"
            },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error(res.statusText);
        const r = await res.json();
        if ((typeof r.valor === "boolean" && r.valor) || r.valor === "OK" || r === true) {
            const newId = parseInt(r?.id || id || 0, 10) || 0;
            if (newId > 0) {
                const txtId = document.getElementById("txtId");
                if (txtId) txtId.value = String(newId);
            }
            const accion = await despuesGuardarNuevoModif({
                mensaje: eraNuevo ? "Pago de sueldo registrado" : "Pago de sueldo actualizado",
                indexUrl: "/PersonalSueldos/Index",
                editUrl: "/PersonalSueldos/NuevoModif",
                id: newId,
                eraNuevo
            });
            if (accion === "editar") {
                const btnElim = document.getElementById("btnEliminar");
                if (btnElim && newId > 0) btnElim.classList.remove("d-none");
            }
        } else {
            errorModal("No se pudo guardar el pago");
        }
    } catch (e) {
        console.error(e);
        errorModal("Error al guardar el pago");
    } finally {
        isSaving = false;
    }
}

// --------------------------- Eliminar ---------------------------
async function eliminarActual() {
    const id = parseInt(document.getElementById("txtId")?.value || 0);
    if (!id) return;

    const ok = await confirmarModal("¿Desea eliminar este pago de sueldo?");
    if (!ok) return;

    try {
        const res = await fetch(`/PersonalSueldos/Eliminar?id=${id}`, {
            method: "DELETE",
            headers: { Authorization: "Bearer " + getAuthToken(), "Content-Type": "application/json" }
        });
        if (!res.ok) throw new Error(res.statusText);
        const r = await res.json();
        if (r?.valor) { exitoModal("Eliminado correctamente"); volverIndex(); }
        else { errorModal("No se pudo eliminar"); }
    } catch (e) { console.error(e); errorModal("Error al eliminar"); }
}

// --------------------------- Exportar PDF ---------------------------
function exportarReciboPdf() {
    const idPersonal = parseInt(document.getElementById("cmbPersonal").value || 0);
    const fecha = document.getElementById("dtpFecha").value;
    const concepto = (document.getElementById("txtConcepto").value || "").trim();
    const personalName = ($("#cmbPersonal option:selected").text() || "").trim()
        || document.getElementById("cmbPersonal")?.selectedOptions?.[0]?.textContent
        || "";
    const importe = _toNumber(document.getElementById("txtImporte").value);

    if (!idPersonal) { errorModal("Seleccioná un personal para exportar."); return; }
    if (!State.pagos || State.pagos.length === 0) { errorModal("Agregá al menos un pago para exportar el recibo."); return; }

    const abonado = State.pagos.reduce((a, p) => a + (parseFloat(p.importe) || 0), 0);
    const saldo = (importe || 0) - abonado;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "pt", format: "a4" });

    // Header
    doc.setFillColor(20, 28, 38);
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), 90, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("RECIBO DE SUELDO", 40, 55);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Fecha emisión: ${formatearFechaParaVista(hoyISO())}`, 40, 75);

    // Datos
    let y = 115;
    doc.setTextColor(33, 33, 33);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Detalle del Sueldo", 40, y);
    y += 12;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`Empleado: ${personalName}`, 40, y); y += 16;
    doc.text(`Fecha del Sueldo: ${formatearFechaParaVista(fecha)}`, 40, y); y += 16;
    doc.text(`Concepto: ${concepto}`, 40, y); y += 24;

    // Totales
    const boxW = 160, boxH = 60, gap = 20;
    const boxesX = [40, 40 + boxW + gap, 40 + (boxW + gap) * 2];
    const labels = ["Importe", "Abonado", "Saldo"];
    const values = [`${_fmtNumber(importe)}`, `${_fmtNumber(abonado)}`, `${_fmtNumber(saldo)}`];
    const colors = [[52, 152, 219], [46, 204, 113], [243, 156, 18]];

    boxesX.forEach((x, i) => {
        doc.setDrawColor(colors[i][0], colors[i][1], colors[i][2]);
        doc.setLineWidth(1.2);
        doc.roundedRect(x, y, boxW, boxH, 6, 6);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text(labels[i], x + 12, y + 20);

        doc.setFontSize(15);
        doc.setTextColor(colors[i][0], colors[i][1], colors[i][2]);
        doc.text(values[i], x + 12, y + 42);

        doc.setTextColor(33, 33, 33);
    });
    y += boxH + 30;

    // Tabla pagos
    const rows = State.pagos.map(p => ([
        formatearFechaParaVista(p.fecha),
        p.cuenta,
        `${_fmtNumber(p.importe)}`,
        p.nota || ""
    ]));

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Pagos Registrados", 40, y);
    y += 8;

    doc.autoTable({
        startY: y + 8,
        head: [["Fecha", "Cuenta", "Importe", "Nota"]],
        body: rows,
        theme: "grid",
        styles: { fontSize: 10, cellPadding: 6 },
        headStyles: { fillColor: [20, 28, 38], textColor: [255, 255, 255] },
        columnStyles: { 2: { halign: "right" } }
    });

    // Firma
    const finalY = doc.lastAutoTable?.finalY || (y + 50);
    doc.setFontSize(10);
    doc.text("______________________________", 40, finalY + 60);
    doc.text("Firma del Empleado", 40, finalY + 75);

    const nombreFile = `Recibo sueldo ${personalName} ${formatearFechaParaVista(hoyISO())}.pdf`;
    doc.save(nombreFile);
}

// --------------------------- Navegación ---------------------------
function volverIndex() { window.location.href = "/PersonalSueldos/Index"; }


// --- helpers para el bloque de errores (campos obligatorios / otras reglas) ---
function setErrorCampos(msg) {
    const el = document.getElementById("errorCampos");
    if (!el) return;
    const text = msg || "Debes completar los campos obligatorios.";
    el.textContent = text;
    el.classList.remove("d-none");
    el.setAttribute("data-banner-reason", String(text).includes("supera") ? "negocio" : "validacion");
    el.scrollIntoView({ behavior: "smooth", block: "center" });
}
function clearErrorCampos() {
    const el = document.getElementById("errorCampos");
    if (!el) return;
    el.textContent = "Debes completar los campos obligatorios.";
    el.classList.add("d-none");
    el.removeAttribute("data-banner-reason");
}
