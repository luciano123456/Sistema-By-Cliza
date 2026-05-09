/* ================== ENDPOINTS (TALLERES) ================== */
const API_T = {
    talleres: "/CuentasCorrientesTalleres/ListaTalleres",   // GET ?texto=
    lista: "/CuentasCorrientesTalleres/Lista",              // GET ?idTaller=&desde=&hasta=&texto=
    obtener: "/CuentasCorrientesTalleres/Obtener",          // GET ?id=
    insertar: "/CuentasCorrientesTalleres/InsertarPagoManual", // POST
    actualizar: "/CuentasCorrientesTalleres/ActualizarPagoManual",// PUT
    eliminar: "/CuentasCorrientesTalleres/EliminarPagoManual" // DELETE ?id=
};

/* ================== Estado ================== */
let gridTalleres = null;
let movimientosRowsFullTall = [];
let movCardsFiltersBoundTall = false;
let tallerSeleccionado = null;
let filtrosT = { desde: null, hasta: null, texto: null };
let editContextTall = { isEdit: false, idTaller: null };
let wasSubmitPagoTall = false;
let saldoAnteriorActualTall = 0;

/* ================== Storage keys ================== */
const LS_FILTROS_TALL_KEY = "CCT_Filtros";
const LS_FILTROS_VISIBLE_TALL_KEY = "CCT_FiltrosVisibles";

/* ================== Helpers ================== */
const hoyISO = () => moment().format("YYYY-MM-DD");
function fmtMoney(n) {
    const v = parseFloat(n || 0);
    return new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
}
function toNumber(s) { return parseFloat(String(s ?? "0").replace(/\./g, "").replace(",", ".")) || 0; }
function fmtFechaVista(f) {
    const m = moment(f, [moment.ISO_8601, "YYYY-MM-DD HH:mm:ss", "YYYY-MM-DD", "DD/MM/YYYY"]);
    return m.isValid() ? m.format("DD/MM/YYYY") : "";
}
function fmtFechaInput(f) {
    const m = moment(f, [moment.ISO_8601, "YYYY-MM-DD HH:mm:ss", "YYYY-MM-DD", "DD/MM/YYYY"]);
    return m.isValid() ? m.format("YYYY-MM-DD") : "";
}
function escapeRegex(text) { return (text + '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function exists(sel) { return !!document.querySelector(sel); }
function closeAnyOpenModal(delay = 150) {
    return new Promise(resolve => {
        const $open = $('.modal.show');
        if ($open.length) {
            $open.each(function () {
                const inst = bootstrap.Modal.getInstance(this);
                if (inst) inst.hide();
            });
            setTimeout(resolve, delay);
        } else resolve();
    });
}

/* ================== Validación modal pago ================== */
const REQUIRED_SELECTORS_PAGO_T = ['#pagoFechaTall', '#pagoCuentaCajaTall', '#pagoImporteTall', '#pagoConceptoTall'];
function isFieldValidPagoTall(sel) {
    const el = document.querySelector(sel);
    if (!el) return true;
    const val = (el.value ?? '').trim();
    if (sel === '#pagoImporteTall') return toNumber(val) > 0;
    return val !== '';
}
function allRequiredValidPagoTall() { return REQUIRED_SELECTORS_PAGO_T.every(isFieldValidPagoTall); }
function showErrorBannerPagoTall(show) {
    const el = document.getElementById('errorPagoTall');
    if (el) el.classList.toggle('d-none', !show);
}
function clearValidationScopePagoTall() {
    const $m = $('#modalPagoTall');
    $m.find('.is-invalid, .is-valid').removeClass('is-invalid is-valid');
    wasSubmitPagoTall = false;
    showErrorBannerPagoTall(false);
}

/* ================== Movimientos como cards ================== */
function splitSaldoRowsTall(full) {
    return {
        saldoRows: (full || []).filter(r => r.__isSaldo),
        dataRows: (full || []).filter(r => !r.__isSaldo)
    };
}
function escapeHtmlMovTall(s) {
    if (s == null) return "";
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function getCctMovsFilterState() {
    return {
        q: ($("#cctMovsBuscar").val() || "").trim().toLowerCase(),
        tipo: ($("#cctMovsFiltroTipo").val() || "").trim()
    };
}
function matchesCctMovFilter(row, f) {
    if (f.tipo && (row.TipoMov || "") !== f.tipo) return false;
    if (f.q) {
        const blob = [row.TipoMov, row.Concepto, fmtFechaVista(row.Fecha), String(row.Debe ?? ""), String(row.Haber ?? "")]
            .join(" ").toLowerCase();
        if (!blob.includes(f.q)) return false;
    }
    return true;
}
function getDisplayedMovimientosRowsTall() {
    const { saldoRows, dataRows } = splitSaldoRowsTall(movimientosRowsFullTall);
    const f = getCctMovsFilterState();
    return [...saldoRows, ...dataRows.filter(r => matchesCctMovFilter(r, f))];
}
function pillClassTipoTall(tipo) {
    const t = (tipo || "").toUpperCase();
    if (t === "SERVICIO") return "cc-mov-pill cc-mov-pill--debe";
    if (t === "PAGO") return "cc-mov-pill cc-mov-pill--haber";
    return "cc-mov-pill cc-mov-pill--neutral";
}
function paintMovsCardsTall() {
    const $root = $("#cctMovimientosList");
    if (!$root.length) return;
    const rows = getDisplayedMovimientosRowsTall();
    const { saldoRows, dataRows } = splitSaldoRowsTall(rows);
    let html = '<div class="cc-movs-list-inner">';
    saldoRows.forEach(r => {
        const v = Number(r.SaldoAcumulado || 0);
        const tone = v > 0 ? "pos" : v < 0 ? "neg" : "neu";
        html += `<div class="cc-mov-saldo cc-mov-saldo--${tone}">
            <div class="cc-mov-saldo__icon"><i class="fa fa-history"></i></div>
            <div class="cc-mov-saldo__body"><div class="cc-mov-saldo__label">Arrastre</div><div class="cc-mov-saldo__text">${escapeHtmlMovTall(r.Concepto || "")}</div></div>
            <div class="cc-mov-saldo__amt">${escapeHtmlMovTall(fmtMoney(v))}</div></div>`;
    });
    if (!dataRows.length) {
        html += '<div class="cc-movs-empty"><i class="fa fa-inbox"></i><p>No hay movimientos con los filtros del listado.</p></div>';
    }
    dataRows.forEach(r => {
        const acc = renderAccionesGrid(r.Id, { ver: "verOModificarTall", verRequiereVerOEditar: true }, "CuentasCorrientesTalleres");
        const sv = parseFloat(r.SaldoAcumulado || 0);
        const salTone = sv > 0 ? "pos" : sv < 0 ? "neg" : "neu";
        html += `<article class="cc-mov-card" role="listitem"><div class="cc-mov-card__row">
            <div class="cc-mov-card__main">
                <div class="cc-mov-card__meta">
                    <time class="cc-mov-card__fecha">${escapeHtmlMovTall(fmtFechaVista(r.Fecha) || "—")}</time>
                    <span class="${pillClassTipoTall(r.TipoMov)}">${escapeHtmlMovTall(r.TipoMov || "—")}</span>
                </div>
                <h3 class="cc-mov-card__concepto">${escapeHtmlMovTall(r.Concepto || "")}</h3>
            </div>
            <div class="cc-mov-card__nums">
                <div class="cc-mov-num"><span>Debe</span><strong class="cc-mov-num--debe">${escapeHtmlMovTall(fmtMoney(r.Debe))}</strong></div>
                <div class="cc-mov-num"><span>Haber</span><strong class="cc-mov-num--haber">${escapeHtmlMovTall(fmtMoney(r.Haber))}</strong></div>
                <div class="cc-mov-num"><span>Saldo acum.</span><strong class="cc-mov-num--saldo cc-mov-num--${salTone}">${escapeHtmlMovTall(fmtMoney(sv))}</strong></div>
            </div>
            <div class="cc-mov-card__actions">${acc}</div>
        </div></article>`;
    });
    html += "</div>";
    $root.html(html);
}
async function applyMovimientosCardsViewTall(fullRows) {
    movimientosRowsFullTall = fullRows || [];
    window.saldoAnteriorActualTall = saldoAnteriorActualTall;
    paintMovsCardsTall();
    if (!movCardsFiltersBoundTall && $("#cctMovsBuscar").length) {
        movCardsFiltersBoundTall = true;
        $("#cctMovsBuscar, #cctMovsFiltroTipo").on("input change", () => {
            paintMovsCardsTall();
            calcularTotalesTall();
        });
    }
}

/* ================== Boot ================== */
$(document).ready(async () => {
    Permisos.init();
    Permisos.aplicarUI("CuentasCorrientesTalleres");
    bindUITall();
    initFiltrosPanelTall();
    await cargarTalleres();  // carga inicial
});

/* ================== Visibilidad filtros ================== */
function setFiltrosVisibilityTall(visible) {
    const $panel = $("#formFiltrosTall");
    const $icon = $("#iconFiltrosTall");
    $panel.toggleClass("d-none", !visible);
    $icon.removeClass("fa-arrow-up fa-arrow-down").addClass(visible ? "fa-arrow-up" : "fa-arrow-down");
    localStorage.setItem(LS_FILTROS_VISIBLE_TALL_KEY, JSON.stringify(visible));
}
function restoreFiltrosVisibilityTall() {
    const raw = localStorage.getItem(LS_FILTROS_VISIBLE_TALL_KEY);
    const visible = raw === null ? true : JSON.parse(raw);
    setFiltrosVisibilityTall(visible);
}

/* ================== UI principal ================== */
function bindUITall() {
    restoreFiltrosVisibilityTall();

    $("#btnToggleFiltrosTall").on("click", () => {
        const willShow = $("#formFiltrosTall").hasClass("d-none");
        setFiltrosVisibilityTall(willShow);
    });

    $("#btnBuscarTall").on("click", async () => {
        filtrosT = readFiltrosTall();
        saveFiltrosTall();
        await listarMovimientosTall();
        await cargarTalleres();
    });

    $("#btnLimpiarTall").on("click", async () => {
        $("#fltDesdeTall").val(moment().startOf("month").format("YYYY-MM-DD"));
        $("#fltHastaTall").val(hoyISO());
        $("#fltTextoTall").val("");
        filtrosT = readFiltrosTall();
        saveFiltrosTall();
        await listarMovimientosTall();
        await cargarTalleres();
    });

    $("#btnNuevoPagoTall").on("click", abrirModalPagoTall);
    $("#btnGuardarPagoTall").on("click", guardarPagoManualTall);
    $("#btnExportarPdfTall").on("click", exportarPDFTall);

    // live validation modal pago
    $("#pagoFechaTall,#pagoCuentaCajaTall,#pagoConceptoTall,#pagoImporteTall").on("change input", function () {
        if (!wasSubmitPagoTall) return;
        const sel = '#' + this.id;
        const okThis = isFieldValidPagoTall(sel);
        this.classList.toggle('is-invalid', !okThis);
        this.classList.toggle('is-valid', okThis);
        showErrorBannerPagoTall(!allRequiredValidPagoTall());
    });

    // “Saldo Activo” + búsqueda afectan lista de talleres
    $("#chkSaldoActivoTall").on("change", cargarTalleres);
    $("#buscarTalleres").on("keyup", function () {
        if (gridTalleres) gridTalleres.search(this.value).draw();
    });
}

/* ================== Filtros superiores ================== */
function readFiltrosTall() {
    return {
        desde: $("#fltDesdeTall").val() || null,
        hasta: $("#fltHastaTall").val() || null,
        texto: ($("#fltTextoTall").val() || "").trim() || null
    };
}
function applyFiltrosToUITall(obj) {
    if (!obj) return;
    $("#fltDesdeTall").val(obj.desde || "");
    $("#fltHastaTall").val(obj.hasta || "");
    $("#fltTextoTall").val(obj.texto || "");
}
function saveFiltrosTall() { try { localStorage.setItem(LS_FILTROS_TALL_KEY, JSON.stringify(filtrosT)); } catch { } }
function restoreFiltrosTall() {
    try {
        const raw = localStorage.getItem(LS_FILTROS_TALL_KEY);
        if (!raw) return false;
        const obj = JSON.parse(raw);
        applyFiltrosToUITall(obj);
        filtrosT = readFiltrosTall();
        return true;
    } catch { return false; }
}
function initFiltrosPanelTall() {
    const hadStored = restoreFiltrosTall();
    if (!hadStored) {
        if (!$("#fltDesdeTall").val()) $("#fltDesdeTall").val(moment().startOf("month").format("YYYY-MM-DD"));
        if (!$("#fltHastaTall").val()) $("#fltHastaTall").val(hoyISO());
    }
    $("#formFiltrosTall").on("change input", "input,select", () => {
        filtrosT = readFiltrosTall();
        saveFiltrosTall();
    });
}

/* ================== TALLERES (panel izquierdo) ================== */
async function cargarTalleres() {
    try {
        const texto = $("#buscarTalleres").val() || "";
        const url = `${API_T.talleres}?${new URLSearchParams({ texto })}`;
        const res = await fetch(url, {
            headers: { "Authorization": "Bearer " + (window.token || ""), "Content-Type": "application/json" }
        });
        if (!res.ok) throw new Error(res.statusText);
        let data = await res.json(); // {Id, Nombre, Saldo}

        if (document.getElementById("chkSaldoActivoTall")?.checked) {
            data = (data || []).filter(x => (parseFloat(x.Saldo) || 0) !== 0);
        }

        if (!gridTalleres) {
            gridTalleres = $("#grd_Talleres").DataTable({
                data,
                language: { url: "//cdn.datatables.net/plug-ins/2.0.7/i18n/es-MX.json" },
                paging: false,
                searching: true,
                info: false,
                scrollY: "62vh",
                scrollCollapse: true,
                order: [[0, "asc"]],
                columns: [
                    { data: "Nombre", title: "Nombre" },
                    {
                        data: "Saldo",
                        title: "Saldo",
                        className: "text-end",
                        render: n => {
                            const v = parseFloat(n || 0);
                            let cls = "";
                            if (v > 0) cls = "text-success fw-bold";
                            else if (v < 0) cls = "text-danger fw-bold";
                            return `<span class="${cls}">$ ${fmtMoney(v)}</span>`;
                        }
                    }
                ],
                dom: "t"
            });

            $("#grd_Talleres").addClass("dt-selectable");

            $("#grd_Talleres tbody").on("click", "tr", async function () {
                const d = gridTalleres.row(this).data();
                if (!d) return;
                $("#grd_Talleres tbody tr").removeClass("seleccionada");
                $(this).addClass("seleccionada");
                tallerSeleccionado = d;
                filtrosT = readFiltrosTall();
                await listarMovimientosTall();
            });

        } else {
            gridTalleres.clear().rows.add(data).draw();
        }

        $("#grd_Talleres tbody tr").removeClass("seleccionada");
        tallerSeleccionado = null;

        filtrosT = readFiltrosTall();
        await listarMovimientosTall();
    } catch {
        errorModal("No se pudo cargar talleres");
    }
}

/* ================== MOVIMIENTOS (panel derecho) ================== */
async function listarMovimientosTall() {
    const idParam = tallerSeleccionado ? tallerSeleccionado.Id : -1;

    const qs = new URLSearchParams({ idTaller: idParam });
    if (filtrosT.desde) qs.set("desde", filtrosT.desde);
    if (filtrosT.hasta) qs.set("hasta", filtrosT.hasta);
    if (filtrosT.texto) qs.set("texto", filtrosT.texto);

    const res = await fetch(`${API_T.lista}?${qs.toString()}`, {
        headers: { "Authorization": "Bearer " + (window.token || ""), "Content-Type": "application/json" }
    });
    if (!res.ok) { errorModal("No se pudo listar movimientos"); return; }
    const json = await res.json();

    let rows = Array.isArray(json) ? json : (json.Movimientos ?? json.movimientos ?? []);
    saldoAnteriorActualTall = Number(json.SaldoAnterior ?? json.saldoAnterior ?? 0);

    rows = rows
        .sort((a, b) => new Date(a.Fecha) - new Date(b.Fecha) || a.Id - b.Id)
        .map(r => ({ ...r }));

    let saldo = saldoAnteriorActualTall;
    rows.forEach(r => {
        saldo += (parseFloat(r.Haber) || 0) - (parseFloat(r.Debe) || 0);
        r.SaldoAcumulado = saldo;
    });

    const fDesde = filtrosT.desde || '';
    const v = saldoAnteriorActualTall || 0;
    const sign = v > 0 ? "+" : v < 0 ? "-" : "";
    const montoFmt = fmtMoney(Math.abs(v));
    const saldoRow = {
        Id: 0,
        Fecha: '',
        TipoMov: '',
        Concepto: fDesde
            ? `Saldo anterior al ${fmtFechaVista(fDesde)}: $ ${sign}${montoFmt}`
            : `Saldo anterior: ${sign}${montoFmt}`,
        Debe: 0, Haber: 0,
        SaldoAcumulado: v,
        __isSaldo: true
    };

    await applyMovimientosCardsViewTall([saldoRow, ...rows]);
    calcularTotalesTall();
}

function calcularTotalesTall() {
    const rows = getDisplayedMovimientosRowsTall().filter(r => !r.__isSaldo);

    let debe = 0, haber = 0;
    for (const r of rows) {
        debe += parseFloat(r.Debe) || 0;
        haber += parseFloat(r.Haber) || 0;
    }

    const saldo = (window.saldoAnteriorActualTall || 0) + (haber - debe);

    $("#totDebeTall").text(fmtMoney(debe));
    $("#totHaberTall").text(fmtMoney(haber));

    const $totSaldo = $("#totSaldoTall");
    $totSaldo.text(fmtMoney(saldo));
    $totSaldo.removeClass("text-success text-danger fw-bold");
    if (saldo > 0) $totSaldo.addClass("text-success fw-bold");
    else if (saldo < 0) $totSaldo.addClass("text-danger fw-bold");
    else $totSaldo.addClass("fw-bold");
}

/* ================== Ver / Editar ================== */
async function verOModificarTall(id) {
    try {
        await closeAnyOpenModal(120);

        const r = await fetch(`${API_T.obtener}?id=${encodeURIComponent(id)}`, {
            headers: { "Authorization": "Bearer " + (window.token || ""), "Content-Type": "application/json" }
        });
        if (!r.ok) throw new Error("No se pudo obtener el movimiento");
        const m = await r.json();

        // Regla: servicios generados (SERVICIO) con IdMov > 0 no son editables desde acá
        const esServicio = (m.TipoMov === "SERVICIO") || ((m.Concepto ?? "").toUpperCase().includes("SERVICIO"));
        const tieneIdMov = m.IdMov != null && Number(m.IdMov) !== 0;

        if (esServicio && tieneIdMov) {
            await verDetalleTall(id);
            return;
        }

        // Caso editable: pago manual (sin IdMov)
        await editarPagoManualTall(m.Id);

        $("#btnEliminarPagoTall")
            .removeClass("d-none")
            .off("click")
            .on("click", async () => {
                await eliminarPagoManualTall(m.Id);
            });

    } catch (e) {
        console.error(e);
        errorModal("No se pudo abrir el movimiento");
    }
}

/* ================== Detalle ================== */
async function verDetalleTall(id) {
    try {
        const url = `${API_T.obtener}?id=${encodeURIComponent(id)}`;
        const r = await fetch(url, {
            headers: { "Authorization": "Bearer " + (window.token || localStorage.getItem("JwtToken") || ""), "Content-Type": "application/json" }
        });

        if (r.status === 401) { errorModal("Sesión expirada. Iniciá sesión nuevamente."); return; }
        if (!r.ok) { const msg = await r.text().catch(() => r.statusText); throw new Error(msg || "Error HTTP"); }

        const m = await r.json();

        $("#detTallFecha").text(fmtFechaVista(m.Fecha));
        $("#detTallTipo").text(m.TipoMov ?? "");
        $("#detTallConcepto").text(m.Concepto ?? "");
        $("#detTallDebe").text(fmtMoney(m.Debe));
        $("#detTallHaber").text(fmtMoney(m.Haber));

        new bootstrap.Modal(document.getElementById("modalDetalleTall")).show();
    } catch (e) {
        console.error(e);
        errorModal("No se pudo obtener el detalle");
    }
}

/* ================== PAGO Manual (Modal) ================== */
async function abrirModalPagoTall() {
    if (!tallerSeleccionado) { errorModal("Elegí un taller."); return; }

    clearValidationScopePagoTall();

    $("#pagoIdTall").val("");
    $("#pagoFechaTall").val(hoyISO());
    $("#pagoImporteTall").val("");
    $("#pagoConceptoTall").val("");
    $("#pagoCuentaCajaTall").val("").trigger?.("change");

    $("#modalPagoTall .modal-title").html(`<i class="fa fa-plus-circle text-success"></i> Nuevo pago`);
    $("#btnGuardarPagoTall").text("Registrar");
    $("#btnEliminarPagoTall").addClass("d-none").off("click");

    editContextTall = { isEdit: false, idTaller: null };

    // cargar cuentas de caja
    await fetch("/Cuentas/Lista", { headers: { "Authorization": "Bearer " + (window.token || "") } })
        .then(r => r.json())
        .then(arr => {
            const $c = $("#pagoCuentaCajaTall");
            if ($c.length) {
                $c.empty().append('<option value="">Seleccione</option>');
                (arr || []).forEach(x => $c.append(`<option value="${x.Id}">${x.Nombre ?? x.Descripcion ?? ""}</option>`));
            }
        });

    new bootstrap.Modal(document.getElementById("modalPagoTall")).show();
}

async function editarPagoManualTall(id) {
    try {
        const r = await fetch(`${API_T.obtener}?id=${encodeURIComponent(id)}`, {
            headers: { "Authorization": "Bearer " + (window.token || ""), "Content-Type": "application/json" }
        });
        if (!r.ok) throw new Error("No se pudo obtener el movimiento");
        const m = await r.json();

        const esServicio = (m.TipoMov === "SERVICIO") || ((m.Concepto ?? "").toUpperCase().includes("SERVICIO"));
        const tieneIdMov = m.IdMov != null && Number(m.IdMov) !== 0;
        if (esServicio && tieneIdMov) {
            await verDetalleTall(id);
            return;
        }

        clearValidationScopePagoTall();

        const cuentas = await fetch("/Cuentas/Lista", { headers: { "Authorization": "Bearer " + (window.token || "") } })
            .then(r => r.json()).catch(() => []);

        const $c = $("#pagoCuentaCajaTall");
        if ($c.length) {
            $c.empty().append('<option value="">Seleccione</option>');
            (cuentas || []).forEach(x => $c.append(`<option value="${x.Id}">${x.Nombre ?? x.Descripcion ?? ""}</option>`));
        }

        $("#pagoIdTall").val(m.Id || 0);
        $("#pagoFechaTall").val(fmtFechaInput(m.Fecha));

        const esDebe = (parseFloat(m.Debe) || 0) > 0;
        const importe = esDebe ? (parseFloat(m.Debe) || 0) : (parseFloat(m.Haber) || 0);
        $("#pagoImporteTall").val(importe.toString().replace(".", ","));

        if (exists('#pagoConceptoTall')) $("#pagoConceptoTall").val(m.Concepto ?? '');

        if (exists('#pagoCuentaCajaTall') && m.IdCuentaCaja) {
            $("#pagoCuentaCajaTall").val(m.IdCuentaCaja).trigger?.("change");
        }

        $("#modalPagoTall .modal-title").html(`<i class="fa fa-pencil-square-o text-warning"></i> Editar pago`);
        $("#btnGuardarPagoTall").text("Guardar");
        $("#btnEliminarPagoTall").removeClass("d-none").off("click").on("click", async () => {
            await eliminarPagoManualTall($("#pagoIdTall").val());
        });

        editContextTall = { isEdit: true, idTaller: m.IdCliente || m.IdTaller || null };

        new bootstrap.Modal(document.getElementById("modalPagoTall")).show();
    } catch (e) {
        console.error(e);
        errorModal("No se pudo abrir el pago para editar");
    }
}

function validarPagoTall() {
    wasSubmitPagoTall = true;
    REQUIRED_SELECTORS_PAGO_T.forEach(sel => {
        if (!exists(sel)) return;
        const el = document.querySelector(sel);
        const ok = isFieldValidPagoTall(sel);
        el.classList.toggle('is-invalid', !ok);
        el.classList.toggle('is-valid', ok);
    });
    const okAll = allRequiredValidPagoTall();
    showErrorBannerPagoTall(!okAll);
    return okAll;
}

async function guardarPagoManualTall() {
    if (!validarPagoTall()) return;

    const idTaller = editContextTall.isEdit ? (editContextTall.idTaller || null) : (tallerSeleccionado?.Id || null);
    if (!idTaller) { errorModal("Elegí un taller para registrar el pago."); return; }

    const payload = {
        Id: parseInt($("#pagoIdTall").val() || 0),
        IdTaller: idTaller,
        Fecha: $("#pagoFechaTall").val(),
        Concepto: $("#pagoConceptoTall").val(),
        Importe: toNumber($("#pagoImporteTall").val()),
        IdCuentaCaja: $("#pagoCuentaCajaTall").val() ? parseInt($("#pagoCuentaCajaTall").val()) : null
    };

    const esUpdate = payload.Id > 0;
    const url = esUpdate ? API_T.actualizar : API_T.insertar;
    const method = esUpdate ? "PUT" : "POST";

    try {
        const res = await fetch(url, {
            method,
            headers: { "Authorization": "Bearer " + (window.token || ""), "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
        const r = await res.json();
        if (r?.valor === true || r?.valor === "OK") {
            bootstrap.Modal.getInstance(document.getElementById("modalPagoTall"))?.hide();
            exitoModal(esUpdate ? "Pago guardado" : "Pago registrado");
            await listarMovimientosTall();
            await cargarTalleres();
        } else {
            errorModal("No se pudo guardar");
        }
    } catch (e) {
        console.error(e);
        errorModal("Error al guardar");
    } finally {
        editContextTall = { isEdit: false, idTaller: null };
        wasSubmitPagoTall = false;
    }
}

async function eliminarPagoManualTall(id) {
    const ok = await confirmarModal("¿Eliminar este pago manual?");
    if (!ok) return;

    try {
        const res = await fetch(`${API_T.eliminar}?id=${id}`, {
            method: "DELETE",
            headers: { "Authorization": "Bearer " + (window.token || ""), "Content-Type": "application/json" }
        });
        if (!res.ok) throw new Error(res.statusText);
        const r = await res.json();
        if (r?.valor) {
            bootstrap.Modal.getInstance(document.getElementById("modalPagoTall"))?.hide();
            exitoModal("Eliminado correctamente");
            await listarMovimientosTall();
            await cargarTalleres();
        } else {
            errorModal("No se pudo eliminar");
        }
    } catch (e) {
        console.error(e);
        errorModal("Error al eliminar");
    }
}

/* ================== Exportar PDF ================== */
function exportarPDFTall() {
    const rows = getDisplayedMovimientosRowsTall();
    if (rows.length === 0) { errorModal("No hay movimientos para exportar."); return; }

    const reales = rows.filter(r => !r.__isSaldo);
    const debe = reales.reduce((a, r) => a + (parseFloat(r.Debe) || 0), 0);
    const haber = reales.reduce((a, r) => a + (parseFloat(r.Haber) || 0), 0);
    const saldo = (saldoAnteriorActualTall || 0) + (haber - debe);

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 36;

    // Header
    doc.setFillColor(20, 28, 38);
    doc.rect(0, 0, pageW, 86, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold"); doc.setFontSize(18);
    doc.text("CUENTAS CORRIENTES TALLERES", margin, 48);
    doc.setFontSize(11); doc.setFont("helvetica", "normal");
    const nombre = tallerSeleccionado?.Nombre ? `Taller: ${tallerSeleccionado.Nombre}` : "Taller: (todos)";
    doc.text(nombre, margin, 68);
    const exp = moment().format("DD/MM/YYYY HH:mm");
    const mW = doc.getTextWidth(`Fecha exportación: ${exp}`);
    doc.text(`Fecha exportación: ${exp}`, pageW - margin - mW, 68);

    // Stats
    doc.setFont("helvetica", "bold"); doc.setTextColor(60);
    const y0 = 110, boxW = (pageW - margin * 2 - 24) / 3, boxH = 54, gap = 12;
    const xs = [margin, margin + boxW + gap, margin + (boxW + gap) * 2];
    const labels = ["DEBE", "HABER", "SALDO"];
    const vals = [fmtMoney(debe), fmtMoney(haber), fmtMoney(saldo)];
    const colors = [[255, 105, 135], [80, 220, 130], [124, 92, 255]];
    for (let i = 0; i < 3; i++) {
        doc.setDrawColor(...colors[i]); doc.setLineWidth(1);
        doc.roundedRect(xs[i], y0, boxW, boxH, 8, 8);
        doc.setFontSize(10); doc.text(labels[i], xs[i] + 10, y0 + 18);
        doc.setTextColor(...colors[i]); doc.setFontSize(15);
        doc.text(vals[i], xs[i] + 10, y0 + 40);
        doc.setTextColor(0);
    }

    // Tabla (incluye fila de saldo anterior)
    const body = rows.map(r => [
        r.__isSaldo ? "" : fmtFechaVista(r.Fecha),
        r.__isSaldo ? "" : (r.TipoMov || ""),
        r.__isSaldo ? (r.Concepto || "") + `: ${fmtMoney(r.SaldoAcumulado || 0)}` : (r.Concepto || ""),
        r.__isSaldo ? "" : fmtMoney(r.Debe),
        r.__isSaldo ? "" : fmtMoney(r.Haber),
        fmtMoney(r.SaldoAcumulado)
    ]);

    doc.autoTable({
        startY: y0 + boxH + 24,
        margin: { left: margin, right: margin },
        head: [["Fecha", "Tipo", "Concepto", "Debe", "Haber", "Saldo"]],
        body,
        theme: "grid",
        styles: { fontSize: 10, cellPadding: 6, overflow: 'linebreak' },
        headStyles: { fillColor: [27, 37, 64], textColor: [255, 255, 255] },
        columnStyles: { 3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right" } },
        tableWidth: 'auto'
    });

    const fname = `CuentasCorrientes_Talleres_${(tallerSeleccionado?.Nombre || "todos").replace(/\s+/g, "_")}_${moment().format("YYYYMMDD_HHmm")}.pdf`;
    doc.save(fname);
}

