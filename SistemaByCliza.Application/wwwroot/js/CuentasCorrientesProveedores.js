/* ================== ENDPOINTS (PROVEEDORES) ================== */
const API_P = {
    proveedores: "/CuentasCorrientesProveedores/ListaProveedores", // GET ?texto=
    lista: "/CuentasCorrientesProveedores/Lista",                   // GET ?idProveedor=&desde=&hasta=&texto=
    obtener: "/CuentasCorrientesProveedores/Obtener",               // GET ?id=
    insertar: "/CuentasCorrientesProveedores/InsertarPagoManual",   // POST
    actualizar: "/CuentasCorrientesProveedores/ActualizarPagoManual",// PUT
    eliminar: "/CuentasCorrientesProveedores/EliminarPagoManual"    // DELETE ?id=
};

/* ================== Estado ================== */
let gridProveedores = null;
let gridMovsProv = null;
let proveedorSeleccionado = null;
let filtrosP = { desde: null, hasta: null, texto: null };
let editContextProv = { isEdit: false, idProveedor: null };
let wasSubmitPagoProv = false;
let saldoAnteriorActualProv = 0;

/* ================== Storage keys ================== */
const LS_FILTROS_PROV_KEY = "CCP_Filtros";
const LS_FILTROS_VISIBLE_PROV_KEY = "CCP_FiltrosVisibles";

/* ================== Helpers ================== */
const hoyISO = () => moment().format("YYYY-MM-DD");
function fmtMoney(n) {
    const v = parseFloat(n || 0);
    return new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
}
function toNumber(s) {
    return parseFloat(String(s ?? "0").replace(/\./g, "").replace(",", ".")) || 0;
}
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
const REQUIRED_SELECTORS_PAGO = ['#pagoFechaProv', '#pagoCuentaCajaProv', '#pagoImporteProv', '#pagoConceptoProv'];
function isFieldValidPago(sel) {
    const el = document.querySelector(sel);
    if (!el) return true;
    const val = (el.value ?? '').trim();
    if (sel === '#pagoImporteProv') return toNumber(val) > 0;
    return val !== '';
}
function allRequiredValidPago() { return REQUIRED_SELECTORS_PAGO.every(isFieldValidPago); }
function showErrorBannerPago(show) {
    const el = document.getElementById('errorPagoProv');
    if (el) el.classList.toggle('d-none', !show);
}
function clearValidationScopePago() {
    const $m = $('#modalPagoProv');
    $m.find('.is-invalid, .is-valid').removeClass('is-invalid is-valid');
    wasSubmitPagoProv = false;
    showErrorBannerPago(false);
}

/* ================== Filtros por columna (cabecera) ================== */
const columnConfigMovsProv = [
    { index: 1, filterType: "text" },                                  // Fecha
    { index: 2, filterType: "select", fetchDataFunc: tiposMovFilterProv }, // Tipo
    { index: 3, filterType: "text" },                                  // Concepto
    { index: 4, filterType: "text" },                                  // Debe
    { index: 5, filterType: "text" },                                  // Haber
    { index: 6, filterType: "text" }                                   // Saldo
];
async function tiposMovFilterProv() {
    return [
        { Id: "COMPRA", Nombre: "COMPRA" },
        { Id: "PAGO", Nombre: "PAGO" }
    ];
}

/* ================== Boot ================== */
$(document).ready(async () => {
    bindUIProv();
    initFiltrosPanelProv();
    await cargarProveedores();  // carga inicial
});

/* ================== Visibilidad filtros ================== */
function setFiltrosVisibilityProv(visible) {
    const $panel = $("#formFiltrosProv");
    const $icon = $("#iconFiltrosProv");
    $panel.toggleClass("d-none", !visible);
    $icon.removeClass("fa-arrow-up fa-arrow-down").addClass(visible ? "fa-arrow-up" : "fa-arrow-down");
    localStorage.setItem(LS_FILTROS_VISIBLE_PROV_KEY, JSON.stringify(visible));
}
function restoreFiltrosVisibilityProv() {
    const raw = localStorage.getItem(LS_FILTROS_VISIBLE_PROV_KEY);
    const visible = raw === null ? true : JSON.parse(raw);
    setFiltrosVisibilityProv(visible);
}

/* ================== UI principal ================== */
function bindUIProv() {
    restoreFiltrosVisibilityProv();

    $("#btnToggleFiltrosProv").on("click", () => {
        const willShow = $("#formFiltrosProv").hasClass("d-none");
        setFiltrosVisibilityProv(willShow);
    });

    $("#btnBuscarProv").on("click", async () => {
        filtrosP = readFiltrosProv();
        saveFiltrosProv();
        await listarMovimientosProv();
        await cargarProveedores(); // para refrescar saldos con movimientos filtrados
    });

    $("#btnLimpiarProv").on("click", async () => {
        $("#fltDesdeProv").val(moment().startOf("month").format("YYYY-MM-DD"));
        $("#fltHastaProv").val(hoyISO());
        $("#fltTextoProv").val("");
        filtrosP = readFiltrosProv();
        saveFiltrosProv();
        await listarMovimientosProv();
        await cargarProveedores();
    });

    $("#btnNuevoPago").on("click", abrirModalPagoProv);
    $("#btnGuardarPagoProv").on("click", guardarPagoManualProv);
    $("#btnExportarPdfProv").on("click", exportarPDFProv);

    // live validation modal pago
    $("#pagoFechaProv,#pagoCuentaCajaProv,#pagoConceptoProv,#pagoImporteProv").on("change input", function () {
        if (!wasSubmitPagoProv) return;
        const sel = '#' + this.id;
        const okThis = isFieldValidPago(sel);
        this.classList.toggle('is-invalid', !okThis);
        this.classList.toggle('is-valid', okThis);
        showErrorBannerPago(!allRequiredValidPago());
    });

    // “Saldo Activo” + búsqueda afectan lista de proveedores
    $("#chkSaldoActivoProv").on("change", cargarProveedores);
    $("#buscarProveedores").on("keyup", function () {
        if (gridProveedores) gridProveedores.search(this.value).draw();
    });
}

/* ================== Filtros superiores ================== */
function readFiltrosProv() {
    return {
        desde: $("#fltDesdeProv").val() || null,
        hasta: $("#fltHastaProv").val() || null,
        texto: ($("#fltTextoProv").val() || "").trim() || null
    };
}
function applyFiltrosToUIProv(obj) {
    if (!obj) return;
    $("#fltDesdeProv").val(obj.desde || "");
    $("#fltHastaProv").val(obj.hasta || "");
    $("#fltTextoProv").val(obj.texto || "");
}
function saveFiltrosProv() { try { localStorage.setItem(LS_FILTROS_PROV_KEY, JSON.stringify(filtrosP)); } catch { } }
function restoreFiltrosProv() {
    try {
        const raw = localStorage.getItem(LS_FILTROS_PROV_KEY);
        if (!raw) return false;
        const obj = JSON.parse(raw);
        applyFiltrosToUIProv(obj);
        filtrosP = readFiltrosProv();
        return true;
    } catch { return false; }
}
function initFiltrosPanelProv() {
    const hadStored = restoreFiltrosProv();
    if (!hadStored) {
        if (!$("#fltDesdeProv").val()) $("#fltDesdeProv").val(moment().startOf("month").format("YYYY-MM-DD"));
        if (!$("#fltHastaProv").val()) $("#fltHastaProv").val(hoyISO());
    }

    $("#formFiltrosProv").on("change input", "input,select", () => {
        filtrosP = readFiltrosProv();
        saveFiltrosProv();
    });
}

/* ================== PROVEEDORES (panel izquierdo) ================== */
async function cargarProveedores() {
    try {
        const texto = $("#buscarProveedores").val() || "";
        const url = `${API_P.proveedores}?${new URLSearchParams({ texto })}`;
        const res = await fetch(url, {
            headers: { "Authorization": "Bearer " + (token || ""), "Content-Type": "application/json" }
        });
        if (!res.ok) throw new Error(res.statusText);
        let data = await res.json(); // {Id, Nombre, Saldo}

        // “Saldo Activo”: filtra saldos distintos de 0 en el cliente
        if (document.getElementById("chkSaldoActivoProv")?.checked) {
            data = (data || []).filter(x => (parseFloat(x.Saldo) || 0) !== 0);
        }

        if (!gridProveedores) {
            gridProveedores = $("#grd_Proveedores").DataTable({
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
                            else if (v < 0) cls = "text-danger fw-bold"; // negativo en rojo
                            return `<span class="${cls}">$ ${fmtMoney(v)}</span>`;
                        }
                    }
                ],
                dom: "t"
            });

            $("#grd_Proveedores tbody").on("click", "tr", async function () {
                const d = gridProveedores.row(this).data();
                if (!d) return;
                $("#grd_Proveedores tbody tr").removeClass("selected");
                $(this).addClass("selected");
                proveedorSeleccionado = d;
                filtrosP = readFiltrosProv();
                await listarMovimientosProv();
            });

        } else {
            gridProveedores.clear().rows.add(data).draw();
        }

        // Sin selección por defecto → muestra todos y recalcula totales
        $("#grd_Proveedores tbody tr").removeClass("selected");
        proveedorSeleccionado = null;

        filtrosP = readFiltrosProv();
        await listarMovimientosProv();
    } catch {
        errorModal("No se pudo cargar proveedores");
    }
}

/* ================== MOVIMIENTOS (panel derecho) ================== */
async function listarMovimientosProv() {
    const idParam = proveedorSeleccionado ? proveedorSeleccionado.Id : -1;

    const qs = new URLSearchParams({ idProveedor: idParam });
    if (filtrosP.desde) qs.set("desde", filtrosP.desde);
    if (filtrosP.hasta) qs.set("hasta", filtrosP.hasta);
    if (filtrosP.texto) qs.set("texto", filtrosP.texto);

    const res = await fetch(`${API_P.lista}?${qs.toString()}`, {
        headers: { "Authorization": "Bearer " + (token || ""), "Content-Type": "application/json" }
    });
    if (!res.ok) { errorModal("No se pudo listar movimientos"); return; }
    const json = await res.json();

    // {SaldoAnterior, Movimientos:[...]}
    let rows = Array.isArray(json) ? json : (json.Movimientos ?? json.movimientos ?? []);
    saldoAnteriorActualProv = Number(json.SaldoAnterior ?? json.saldoAnterior ?? 0);

    // ordenar asc por fecha+id
    rows = rows
        .sort((a, b) => new Date(a.Fecha) - new Date(b.Fecha) || a.Id - b.Id)
        .map(r => ({ ...r }));

    // acumula saldo respetando saldo anterior
    let saldo = saldoAnteriorActualProv;
    rows.forEach(r => {
        saldo += (parseFloat(r.Haber) || 0) - (parseFloat(r.Debe) || 0);
        r.SaldoAcumulado = saldo;
    });

    // fila sintética “Saldo anterior” (mismos colores que clientes)
    const fDesde = filtrosP.desde || '';
    const v = saldoAnteriorActualProv || 0;
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

    await configurarDataTableMovsProv([saldoRow, ...rows]);
    calcularTotalesProv();
}

function calcularTotalesProv() {
    if (!gridMovsProv) return;

    const rows = gridMovsProv
        .rows({ search: "applied" })
        .data()
        .toArray()
        .filter(r => !r.__isSaldo);

    let debe = 0, haber = 0;
    for (const r of rows) {
        debe += parseFloat(r.Debe) || 0;
        haber += parseFloat(r.Haber) || 0;
    }

    const saldo = (window.saldoAnteriorActualProv || 0) + (haber - debe);

    $("#totDebeProv").text(fmtMoney(debe));
    $("#totHaberProv").text(fmtMoney(haber));

    const $totSaldo = $("#totSaldoProv");
    $totSaldo.text(fmtMoney(saldo));
    $totSaldo.removeClass("text-success text-danger fw-bold");
    if (saldo > 0) $totSaldo.addClass("text-success fw-bold");
    else if (saldo < 0) $totSaldo.addClass("text-danger fw-bold");
    else $totSaldo.addClass("fw-bold");
}

async function configurarDataTableMovsProv(data) {
    if (!gridMovsProv) {
        $('#grd_MovimientosProv thead tr').clone(true).addClass('filters').appendTo('#grd_MovimientosProv thead');

        gridMovsProv = $('#grd_MovimientosProv').DataTable({
            data,
            language: { url: "//cdn.datatables.net/plug-ins/2.0.7/i18n/es-MX.json" },
            scrollX: "100px",
            scrollCollapse: true,
            columns: [
                {   // 0: Acciones (ver/editar)
                    data: "Id",
                    title: '',
                    width: "1%",
                    orderable: false,
                    searchable: false,
                    render: (id, _t, row) => {
                        if (row.__isSaldo) return "";
                        return `
              <div class="acciones-menu" data-id="${id}">
                <button class='btn btn-sm btnacciones' type='button' onclick='verOModificarProv(${id})' title='Ver / Editar'>
                  <i class='fa fa-eye fa-lg text-info'></i>
                </button>
              </div>`;
                    }
                },
                {   // 1: Fecha
                    data: "Fecha",
                    title: "Fecha",
                    render: (val, type, row) => {
                        if (row.__isSaldo) return (type === "display" || type === "filter") ? "" : "";
                        return (type === "display" || type === "filter") ? fmtFechaVista(val) || "-" : val;
                    }
                },
                { data: "TipoMov", title: "Tipo" }, // 2
                {   // 3: Concepto (pinta saldo anterior)
                    data: "Concepto",
                    title: "Concepto",
                    render: (text, type, row) => {
                        if (row.__isSaldo) {
                            if (type === "display" || type === "filter") {
                                const v = Number(row.SaldoAcumulado || 0);
                                const cls = v > 0 ? "text-success fw-bold"
                                    : v < 0 ? "text-danger fw-bold"
                                        : "text-success fw-bold";
                                return `<span class="${cls}">${text || ""}</span>`;
                            }
                            return text || "";
                        }
                        return text ?? "";
                    }
                },
                { data: "Debe", title: "Debe", className: "text-center", render: n => fmtMoney(n) }, // 4
                { data: "Haber", title: "Haber", className: "text-center", render: n => fmtMoney(n) }, // 5
                {   // 6: Saldo acumulado con color
                    data: "SaldoAcumulado",
                    title: "Saldo",
                    className: "text-center",
                    render: n => {
                        const v = parseFloat(n || 0);
                        let cls = "";
                        if (v > 0) cls = "text-success fw-bold";
                        else if (v < 0) cls = "text-danger fw-bold"; // negativo rojo
                        return `<span class="${cls}">${fmtMoney(v)}</span>`;
                    }
                }
            ],
            dom: 'Bfrtip',
            buttons: [
                {
                    extend: 'excelHtml5',
                    text: 'Exportar Excel',
                    filename: 'Reporte Cuentas Corrientes Proveedores',
                    title: '',
                    exportOptions: { columns: [...Array(7).keys()].map(i => i) },
                    className: 'btn-exportar-excel',
                },
                {
                    extend: 'pdfHtml5',
                    text: 'Exportar PDF',
                    filename: 'Reporte Cuentas Corrientes Proveedores',
                    title: '',
                    exportOptions: { columns: [...Array(7).keys()].map(i => i) },
                    className: 'btn-exportar-pdf',
                },
                {
                    extend: 'print',
                    text: 'Imprimir',
                    title: '',
                    exportOptions: { columns: [...Array(7).keys()].map(i => i) },
                    className: 'btn-exportar-print'
                },
                'pageLength'
            ],
            orderCellsTop: true,
            fixedHeader: true,

            initComplete: async function () {
                const api = this.api();

                // filtros por columna
                for (const config of columnConfigMovsProv) {
                    const cell = $(".filters th").eq(config.index);

                    if (config.filterType === "select") {
                        const select = $(`<select class="form-select form-select-sm"><option value="">Seleccionar</option></select>`)
                            .appendTo(cell.empty())
                            .on("change", async function () {
                                const selectedText = $(this).find("option:selected").text();
                                if (!this.value) {
                                    await api.column(config.index).search("").draw();
                                } else {
                                    await api.column(config.index).search("^" + escapeRegex(selectedText) + "$", true, false).draw();
                                }
                                calcularTotalesProv();
                            });

                        const items = await config.fetchDataFunc();
                        (items || []).forEach(it => select.append(`<option value="${it.Id}">${it.Nombre ?? ""}</option>`));

                    } else { // text
                        const input = $(`<input type="text" placeholder="Buscar..." class="form-control form-control-sm" />`)
                            .appendTo(cell.empty())
                            .off("keyup change")
                            .on("keyup change", function (e) {
                                e.stopPropagation();
                                const regexr = "({search})";
                                const cursorPosition = this.selectionStart;
                                api.column(config.index)
                                    .search(this.value !== "" ? regexr.replace("{search}", "(((" + escapeRegex(this.value) + ")))") : "", this.value !== "", this.value === "")
                                    .draw();
                                $(this).focus()[0].setSelectionRange(cursorPosition, cursorPosition);
                                calcularTotalesProv();
                            });
                    }
                }

                // celda acciones sin filtro
                $('.filters th').eq(0).html('');

                calcularTotalesProv();

                // Config columnas (usa tu helper de site.js)
                configurarOpcionesColumnas('#grd_MovimientosProv', '#configColumnasMenuProv', 'CCP_Columnas');

                setTimeout(() => gridMovsProv.columns.adjust(), 10);
            },
        });
    } else {
        gridMovsProv.clear().rows.add(data).draw();
    }
}

/* ================== Ver / Editar ================== */
async function verOModificarProv(id) {
    try {
        await closeAnyOpenModal(120);

        const r = await fetch(`${API_P.obtener}?id=${encodeURIComponent(id)}`, {
            headers: { "Authorization": "Bearer " + (token || ""), "Content-Type": "application/json" }
        });
        if (!r.ok) throw new Error("No se pudo obtener el movimiento");
        const m = await r.json();

        // Regla: movimientos de COMPRA o PAGO de compra (IdMov>0) NO son editables
        const esCompraOPagoCompra =
            (m.TipoMov === "COMPRA") ||
            ((m.Concepto ?? "").toUpperCase().includes("PAGO COMPRA"));
        const tieneIdMov = m.IdMov != null && Number(m.IdMov) !== 0;

        if (esCompraOPagoCompra && tieneIdMov) {
            await verDetalleProv(id);
            return;
        }

        // Caso editable: pago manual (sin IdMov)
        await editarPagoManualProv(m.Id);

        $("#btnEliminarPagoProv")
            .removeClass("d-none")
            .off("click")
            .on("click", async () => {
                await eliminarPagoManualProv(m.Id);
            });

    } catch (e) {
        console.error(e);
        errorModal("No se pudo abrir el movimiento");
    }
}

/* ================== Detalle ================== */
async function verDetalleProv(id) {
    try {
        const url = `${API_P.obtener}?id=${encodeURIComponent(id)}`;
        const r = await fetch(url, {
            headers: { "Authorization": "Bearer " + (token || localStorage.getItem("JwtToken") || ""), "Content-Type": "application/json" }
        });

        if (r.status === 401) { errorModal("Sesión expirada. Iniciá sesión nuevamente."); return; }
        if (!r.ok) { const msg = await r.text().catch(() => r.statusText); throw new Error(msg || "Error HTTP"); }

        const m = await r.json();

        $("#detProvFecha").text(fmtFechaVista(m.Fecha));
        $("#detProvTipo").text(m.TipoMov ?? "");
        $("#detProvConcepto").text(m.Concepto ?? "");
        $("#detProvDebe").text(fmtMoney(m.Debe));
        $("#detProvHaber").text(fmtMoney(m.Haber));

        // “Ir a compra” sólo si es COMPRA o “PAGO COMPRA …” y hay IdMov
        const esCompraOPagoCompra =
            (m.TipoMov === "COMPRA") ||
            ((m.Concepto ?? "").toUpperCase().includes("PAGO COMPRA"));

        if (esCompraOPagoCompra && m.IdMov != null && Number(m.IdMov) !== 0) {
            $("#btnIrCompra").removeClass("d-none").attr("href", `/Compras/NuevoModif?id=${encodeURIComponent(m.IdMov)}`);
        } else {
            $("#btnIrCompra").addClass("d-none").attr("href", "#");
        }

        new bootstrap.Modal(document.getElementById("modalDetalleProv")).show();
    } catch (e) {
        console.error(e);
        errorModal("No se pudo obtener el detalle");
    }
}

/* ================== PAGO Manual (Modal) ================== */
async function abrirModalPagoProv() {
    if (!proveedorSeleccionado) { errorModal("Elegí un proveedor."); return; }

    clearValidationScopePago();

    // defaults
    $("#pagoIdProv").val("");
    $("#pagoFechaProv").val(hoyISO());
    $("#pagoImporteProv").val("");
    $("#pagoConceptoProv").val("");
    $("#pagoCuentaCajaProv").val("").trigger?.("change");

    $("#modalPagoProv .modal-title").html(`<i class="fa fa-plus-circle text-success"></i> Nuevo pago`);
    $("#btnGuardarPagoProv").text("Registrar");
    $("#btnEliminarPagoProv").addClass("d-none").off("click");

    editContextProv = { isEdit: false, idProveedor: null };

    // cargar cuentas de caja
    await fetch("/Cuentas/Lista", { headers: { "Authorization": "Bearer " + (token || "") } })
        .then(r => r.json())
        .then(arr => {
            const $c = $("#pagoCuentaCajaProv");
            if ($c.length) {
                $c.empty().append('<option value="">Seleccione</option>');
                (arr || []).forEach(x => $c.append(`<option value="${x.Id}">${x.Nombre ?? x.Descripcion ?? ""}</option>`));
            }
        });

    new bootstrap.Modal(document.getElementById("modalPagoProv")).show();
}

async function editarPagoManualProv(id) {
    try {
        const r = await fetch(`${API_P.obtener}?id=${encodeURIComponent(id)}`, {
            headers: { "Authorization": "Bearer " + (token || ""), "Content-Type": "application/json" }
        });
        if (!r.ok) throw new Error("No se pudo obtener el movimiento");
        const m = await r.json();

        // Si es compra/pago-compra con IdMov, sólo detalle
        const esCompraOPagoCompra =
            (m.TipoMov === "COMPRA") ||
            ((m.Concepto ?? "").toUpperCase().includes("PAGO COMPRA"));
        const tieneIdMov = m.IdMov != null && Number(m.IdMov) !== 0;
        if (esCompraOPagoCompra && tieneIdMov) {
            await verDetalleProv(id);
            return;
        }

        clearValidationScopePago();

        const cuentas = await fetch("/Cuentas/Lista", { headers: { "Authorization": "Bearer " + (token || "") } })
            .then(r => r.json()).catch(() => []);

        const $c = $("#pagoCuentaCajaProv");
        if ($c.length) {
            $c.empty().append('<option value="">Seleccione</option>');
            (cuentas || []).forEach(x => $c.append(`<option value="${x.Id}">${x.Nombre ?? x.Descripcion ?? ""}</option>`));
        }

        $("#pagoIdProv").val(m.Id || 0);
        $("#pagoFechaProv").val(fmtFechaInput(m.Fecha));

        // importe desde Debe/Haber (para pago manual es Haber)
        const esDebe = (parseFloat(m.Debe) || 0) > 0;
        const importe = esDebe ? (parseFloat(m.Debe) || 0) : (parseFloat(m.Haber) || 0);
        $("#pagoImporteProv").val(importe.toString().replace(".", ","));

        if (exists('#pagoConceptoProv')) $("#pagoConceptoProv").val(m.Concepto ?? '');

        if (exists('#pagoCuentaCajaProv') && m.IdCuentaCaja) {
            $("#pagoCuentaCajaProv").val(m.IdCuentaCaja).trigger?.("change");
        }

        $("#modalPagoProv .modal-title").html(`<i class="fa fa-pencil-square-o text-warning"></i> Editar pago`);
        $("#btnGuardarPagoProv").text("Guardar");
        $("#btnEliminarPagoProv").removeClass("d-none").off("click").on("click", async () => {
            await eliminarPagoManualProv($("#pagoIdProv").val());
        });

        editContextProv = { isEdit: true, idProveedor: m.IdCliente || m.IdProveedor || null };

        new bootstrap.Modal(document.getElementById("modalPagoProv")).show();
    } catch (e) {
        console.error(e);
        errorModal("No se pudo abrir el pago para editar");
    }
}

function validarPagoProv() {
    wasSubmitPagoProv = true;
    REQUIRED_SELECTORS_PAGO.forEach(sel => {
        if (!exists(sel)) return;
        const el = document.querySelector(sel);
        const ok = isFieldValidPago(sel);
        el.classList.toggle('is-invalid', !ok);
        el.classList.toggle('is-valid', ok);
    });
    const okAll = allRequiredValidPago();
    showErrorBannerPago(!okAll);
    return okAll;
}

async function guardarPagoManualProv() {
    if (!validarPagoProv()) return;

    const idProveedor = editContextProv.isEdit ? (editContextProv.idProveedor || null) : (proveedorSeleccionado?.Id || null);
    if (!idProveedor) { errorModal("Elegí un proveedor para registrar el pago."); return; }

    const payload = {
        Id: parseInt($("#pagoIdProv").val() || 0),
        IdProveedor: idProveedor,
        Fecha: $("#pagoFechaProv").val(),
        Concepto: $("#pagoConceptoProv").val(),
        Importe: toNumber($("#pagoImporteProv").val()),
        IdCuentaCaja: $("#pagoCuentaCajaProv").val() ? parseInt($("#pagoCuentaCajaProv").val()) : null
    };

    const esUpdate = payload.Id > 0;
    const url = esUpdate ? API_P.actualizar : API_P.insertar;
    const method = esUpdate ? "PUT" : "POST";

    try {
        const res = await fetch(url, {
            method,
            headers: { "Authorization": "Bearer " + (token || ""), "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
        const r = await res.json();
        if (r?.valor === true || r?.valor === "OK") {
            bootstrap.Modal.getInstance(document.getElementById("modalPagoProv"))?.hide();
            exitoModal(esUpdate ? "Pago guardado" : "Pago registrado");
            await listarMovimientosProv();
            await cargarProveedores();
        } else {
            errorModal("No se pudo guardar");
        }
    } catch (e) {
        console.error(e);
        errorModal("Error al guardar");
    } finally {
        editContextProv = { isEdit: false, idProveedor: null };
        wasSubmitPagoProv = false;
    }
}

async function eliminarPagoManualProv(id) {
    const ok = await confirmarModal("¿Eliminar este pago manual?");
    if (!ok) return;

    try {
        const res = await fetch(`${API_P.eliminar}?id=${id}`, {
            method: "DELETE",
            headers: { "Authorization": "Bearer " + (token || ""), "Content-Type": "application/json" }
        });
        if (!res.ok) throw new Error(res.statusText);
        const r = await res.json();
        if (r?.valor) {
            bootstrap.Modal.getInstance(document.getElementById("modalPagoProv"))?.hide();
            exitoModal("Eliminado correctamente");
            await listarMovimientosProv();
            await cargarProveedores();
        } else {
            errorModal("No se pudo eliminar");
        }
    } catch (e) {
        console.error(e);
        errorModal("Error al eliminar");
    }
}

/* ================== Exportar PDF ================== */
function exportarPDFProv() {
    const rows = gridMovsProv?.rows({ search: "applied" }).data().toArray() || [];
    if (rows.length === 0) { errorModal("No hay movimientos para exportar."); return; }

    const reales = rows.filter(r => !r.__isSaldo);
    const debe = reales.reduce((a, r) => a + (parseFloat(r.Debe) || 0), 0);
    const haber = reales.reduce((a, r) => a + (parseFloat(r.Haber) || 0), 0);
    const saldo = (saldoAnteriorActualProv || 0) + (haber - debe);

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 36;

    // Header
    doc.setFillColor(20, 28, 38);
    doc.rect(0, 0, pageW, 86, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold"); doc.setFontSize(18);
    doc.text("CUENTAS CORRIENTES PROVEEDORES", margin, 48);
    doc.setFontSize(11); doc.setFont("helvetica", "normal");
    const nombre = proveedorSeleccionado?.Nombre ? `Proveedor: ${proveedorSeleccionado.Nombre}` : "Proveedor: (todos)";
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

    const fname = `CuentasCorrientes_Proveedores_${(proveedorSeleccionado?.Nombre || "todos").replace(/\s+/g, "_")}_${moment().format("YYYYMMDD_HHmm")}.pdf`;
    doc.save(fname);
}

/* ================== Cierre de dropdowns acciones ================== */
$(document).on('click', function (e) {
    if (!$(e.target).closest('.acciones-menu').length) {
        $('.acciones-dropdown').hide();
    }
});
