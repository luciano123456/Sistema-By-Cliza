/* ================== ENDPOINTS ================== */
const API = {
    clientes: "/CuentasCorrientes/ListaClientes",            // GET ?texto=&saldoActivo=&idSucursal=
    lista: "/CuentasCorrientes/Lista",                       // GET ?idCliente=&desde=&hasta=&idSucursal=&texto=
    obtener: "/CuentasCorrientes/Obtener",                   // GET ?id=
    insertarManual: "/CuentasCorrientes/InsertarManual",     // POST
    actualizarManual: "/CuentasCorrientes/ActualizarManual", // PUT
    eliminarManual: "/CuentasCorrientes/EliminarManual"      // DELETE ?id=
};

/* ================== Estado ================== */
let gridClientes = null;
let gridMovs = null;
let clienteSeleccionado = null;
let filtros = { desde: null, hasta: null, idSucursal: null, texto: null };
let editContext = { isEdit: false, idCliente: null };
let wasSubmitMov = false;
let saldoAnteriorActual = 0; // para el acumulado

/* ================== Storage keys ================== */
const LS_FILTROS_KEY = "CC_Filtros";
const LS_FILTROS_VISIBLE_KEY = "CC_FiltrosVisibles";

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

/* ================== Validación – banner solo se oculta si TODO está OK ================== */
const REQUIRED_SELECTORS_CC = ['#movFecha', '#movSucursal', '#movCuentaCaja', '#movImporte', '#movConcepto'];
function exists(sel) { return !!document.querySelector(sel); }
function isFieldValid(sel) {
    const el = document.querySelector(sel);
    if (!el) return true; // si no existe en el DOM, no lo forzamos
    const val = (el.value ?? '').trim();
    if (sel === '#movImporte') return toNumber(val) > 0;
    return val !== '';
}
function allRequiredValid() { return REQUIRED_SELECTORS_CC.every(isFieldValid); }
function showErrorBanner(show) {
    const el = document.getElementById('errorMov');
    if (el) el.classList.toggle('d-none', !show);
}
function clearValidationScope(scopeSel) {
    const $m = $(scopeSel);
    $m.find('.is-invalid, .is-valid').removeClass('is-invalid is-valid');
    wasSubmitMov = false;
    showErrorBanner(false);
}

/* ================== Filtros por columna (cabecera de la grilla) ================== */
const columnConfigMovs = [
    { index: 1, filterType: "text" },                                  // Fecha
    { index: 2, filterType: "select", fetchDataFunc: tiposMovFilter }, // Tipo
    { index: 3, filterType: "text" },                                  // Concepto
    { index: 4, filterType: "text" },                                  // Debe
    { index: 5, filterType: "text" },                                  // Haber
    { index: 6, filterType: "text" },                                  // Saldo
    { index: 7, filterType: "select", fetchDataFunc: SucursalesFilter } // Sucursal
];
async function tiposMovFilter() {
    return [
        { Id: "VENTA", Nombre: "VENTA" },
        { Id: "COBRO", Nombre: "COBRO" }
    ];
}
async function SucursalesFilter() {
    try {
        const r = await fetch("/Sucursales/Lista", { headers: { "Authorization": "Bearer " + (token || "") } });
        const d = await r.json();
        return d.map(x => ({ Id: x.Id, Nombre: x.Nombre }));
    } catch {
        const uniques = new Set((gridMovs?.rows().data().toArray() || []).map(r => r.Sucursal).filter(Boolean));
        return [...uniques].map(s => ({ Id: s, Nombre: s }));
    }
}

/* ================== Boot ================== */
$(document).ready(async () => {
    bindUI();
    initFiltrosPanel();
    await cargarClientes(); // carga inicial
});

/* ================== Visibilidad filtros (flecha + persistencia) ================== */
function setFiltrosVisibility(visible) {
    const $panel = $("#formFiltros");
    const $icon = $("#iconFiltros");
    $panel.toggleClass("d-none", !visible);
    $icon.removeClass("fa-arrow-up fa-arrow-down").addClass(visible ? "fa-arrow-up" : "fa-arrow-down");
    localStorage.setItem(LS_FILTROS_VISIBLE_KEY, JSON.stringify(visible));
}
function restoreFiltrosVisibility() {
    const raw = localStorage.getItem(LS_FILTROS_VISIBLE_KEY);
    const visible = raw === null ? true : JSON.parse(raw);
    setFiltrosVisibility(visible);
}

/* ================== UI principal ================== */
function bindUI() {
    restoreFiltrosVisibility();

    $("#btnToggleFiltros").on("click", () => {
        const willShow = $("#formFiltros").hasClass("d-none");
        setFiltrosVisibility(willShow);
    });

    $("#btnBuscar").on("click", async () => {
        filtros = readFiltros();
        saveFiltros();
        await listarMovimientos();
        await cargarClientes(); // refresca saldos por sucursal
    });

    $("#btnLimpiar").on("click", async () => {
        $("#fltDesde").val(moment().startOf("month").format("YYYY-MM-DD"));
        $("#fltHasta").val(hoyISO());
        $("#fltTexto").val("");
        $("#fltSucursal").val("");
        filtros = readFiltros();
        saveFiltros();
        await listarMovimientos();
        await cargarClientes();
    });

    $("#btnNuevo").on("click", abrirModalCobro); // ← Nuevo COBRO (impacta caja)
    $("#btnGuardarMov").on("click", guardarMovimientoManual);
    $("#btnExportarPdf").on("click", exportarPDF);

    // live-validation: NO ocultar el banner hasta que todo esté válido
    $("#movFecha,#movSucursal,#movCuentaCaja,#movConcepto,#movImporte").on("change input", function () {
        if (!wasSubmitMov) return;
        const sel = '#' + this.id;
        const okThis = isFieldValid(sel);
        this.classList.toggle('is-invalid', !okThis);
        this.classList.toggle('is-valid', okThis);
        showErrorBanner(!allRequiredValid());
    });

    // “Saldo Activo” y sucursal afectan lista de clientes (saldos)
    $("#chkSaldoActivo").on("change", cargarClientes);
    $("#fltSucursal").on("change", cargarClientes);
}

/* ================== Filtros superiores (storage + defaults) ================== */
function readFiltros() {
    return {
        desde: $("#fltDesde").val() || null,
        hasta: $("#fltHasta").val() || null,
        idSucursal: $("#fltSucursal").val() ? parseInt($("#fltSucursal").val()) : null,
        texto: ($("#fltTexto").val() || "").trim() || null
    };
}
function applyFiltrosToUI(obj) {
    if (!obj) return;
    $("#fltDesde").val(obj.desde || "");
    $("#fltHasta").val(obj.hasta || "");
    $("#fltSucursal").val(obj.idSucursal || "");
    $("#fltTexto").val(obj.texto || "");
}
function saveFiltros() { try { localStorage.setItem(LS_FILTROS_KEY, JSON.stringify(filtros)); } catch { } }
function restoreFiltros() {
    try {
        const raw = localStorage.getItem(LS_FILTROS_KEY);
        if (!raw) return false;
        const obj = JSON.parse(raw);
        applyFiltrosToUI(obj);
        filtros = readFiltros();
        return true;
    } catch { return false; }
}
function initFiltrosPanel() {
    const hadStored = restoreFiltros();
    if (!hadStored) {
        if (!$("#fltDesde").val()) $("#fltDesde").val(moment().startOf("month").format("YYYY-MM-DD"));
        if (!$("#fltHasta").val()) $("#fltHasta").val(hoyISO());
    }

    fetch('/Sucursales/Lista', { headers: { 'Authorization': 'Bearer ' + (token || "") } })
        .then(r => r.ok ? r.json() : [])
        .then(sucs => {
            const current = $("#fltSucursal").val();
            const $s = $("#fltSucursal").empty().append('<option value="">Todas</option>');
            (sucs || []).forEach(x => $s.append(`<option value="${x.Id}">${x.Nombre}</option>`));
            if (current) $("#fltSucursal").val(current);
        });

    $("#formFiltros").on("change input", "input,select", () => {
        filtros = readFiltros();
        saveFiltros();
    });
}

/* ================== CLIENTES (panel izquierdo) ================== */
async function cargarClientes() {
    try {
        const saldoActivo = document.getElementById("chkSaldoActivo")?.checked ? "true" : "false";
        const idSuc = $("#fltSucursal").val() || "";
        const texto = $("#buscarClientes").val() || "";
        const url = `${API.clientes}?${new URLSearchParams({ texto, saldoActivo, idSucursal: idSuc })}`;

        const res = await fetch(url, {
            headers: { "Authorization": "Bearer " + (token || ""), "Content-Type": "application/json" }
        });
        if (!res.ok) throw new Error(res.statusText);
        const data = await res.json(); // {Id, Nombre, Saldo}

        if (!gridClientes) {
            gridClientes = $("#grd_Clientes").DataTable({
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

            $("#buscarClientes").on("keyup", function () {
                gridClientes.search(this.value).draw();
            });

            $("#grd_Clientes tbody").on("click", "tr", async function () {
                const d = gridClientes.row(this).data();
                if (!d) return;
                $("#grd_Clientes tbody tr").removeClass("selected");
                $(this).addClass("selected");
                clienteSeleccionado = d;
                filtros = readFiltros();
                await listarMovimientos();
            });

        } else {
            gridClientes.clear().rows.add(data).draw();
        }

        // sin selección por defecto (lista “todos”)
        $("#grd_Clientes tbody tr").removeClass("selected");
        clienteSeleccionado = null;

        filtros = readFiltros();
        await listarMovimientos();
    } catch {
        errorModal("No se pudo cargar clientes");
    }
}

/* ================== MOVIMIENTOS (panel derecho) ================== */
async function listarMovimientos() {
    const idParam = clienteSeleccionado ? clienteSeleccionado.Id : -1;

    const qs = new URLSearchParams({ idCliente: idParam });
    if (filtros.desde) qs.set("desde", filtros.desde);
    if (filtros.hasta) qs.set("hasta", filtros.hasta);
    if (filtros.idSucursal) qs.set("idSucursal", filtros.idSucursal);
    if (filtros.texto) qs.set("texto", filtros.texto);

    const res = await fetch(`${API.lista}?${qs.toString()}`, {
        headers: { "Authorization": "Bearer " + (token || ""), "Content-Type": "application/json" }
    });
    if (!res.ok) { errorModal("No se pudo listar movimientos"); return; }
    const json = await res.json();

    // Soportar tanto [{...}] como {SaldoAnterior, Movimientos:[...]}
    let rows = Array.isArray(json) ? json : (json.Movimientos ?? json.movimientos ?? []);
    saldoAnteriorActual = Number(json.SaldoAnterior ?? json.saldoAnterior ?? 0);

    // Ordenar (por si el back ya no lo hace)
    rows = rows
        .sort((a, b) => new Date(a.Fecha) - new Date(b.Fecha) || a.Id - b.Id)
        .map(r => ({ ...r }));

    // Cálculo de saldo acumulado respetando el “saldo anterior”
    let saldo = saldoAnteriorActual;
    rows.forEach(r => {
        saldo += (parseFloat(r.Haber) || 0) - (parseFloat(r.Debe) || 0);
        r.SaldoAcumulado = saldo;
    });

    // Insertar fila sintética (saldo anterior) al inicio del listado visual
    const fDesde = filtros.desde || '';

    const v = saldoAnteriorActual || 0;
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
        Sucursal: '',
        SaldoAcumulado: v,
        __isSaldo: true
    };

    await configurarDataTableMovs([saldoRow, ...rows]);
    calcularTotales();
}


/* ================== Totales ================== */
function calcularTotales() {
    if (!gridMovs) return;

    const rows = gridMovs
        .rows({ search: "applied" })
        .data()
        .toArray()
        .filter(r => !r.__isSaldo);

    let debe = 0, haber = 0;
    for (const r of rows) {
        debe += parseFloat(r.Debe) || 0;
        haber += parseFloat(r.Haber) || 0;
    }

    const saldo = (window.saldoAnteriorActual || 0) + (haber - debe);

    $("#totDebe").text(fmtMoney(debe));
    $("#totHaber").text(fmtMoney(haber));

    const $totSaldo = $("#totSaldo");
    $totSaldo.text(fmtMoney(saldo));

    // Colorear según signo (y en negrita)
    $totSaldo.removeClass("text-success text-danger fw-bold");
    if (saldo > 0) $totSaldo.addClass("text-success fw-bold");
    else if (saldo < 0) $totSaldo.addClass("text-danger fw-bold");
    else $totSaldo.addClass("fw-bold");
}

async function configurarDataTableMovs(data) {
    if (!gridMovs) {
        $('#grd_Movimientos thead tr').clone(true).addClass('filters').appendTo('#grd_Movimientos thead');

        gridMovs = $('#grd_Movimientos').DataTable({
            data,
            language: { url: "//cdn.datatables.net/plug-ins/2.0.7/i18n/es-MX.json" },
            scrollX: "100px",
            scrollCollapse: true,
            columns: [
                {   // 0: Acciones (ojo)
                    data: "Id",
                    title: '',
                    width: "1%",
                    orderable: false,
                    searchable: false,
                    render: (id, _t, row) => {
                        if (row.__isSaldo) return ""; // sin acciones para la fila de saldo
                        return `
              <div class="acciones-menu" data-id="${id}">
                <button class='btn btn-sm btnacciones' type='button' onclick='verOModificar(${id})' title='Ver / Editar'>
                  <i class='fa fa-eye fa-lg text-info'></i>
                </button>
              </div>`;
                    }
                },
                {   // 1: Fecha
                    data: "Fecha",
                    title: "Fecha",
                    render: (val, type, row) => {
                        if (row.__isSaldo) {
                            return (type === "display" || type === "filter") ? "" : "";
                        }
                        return (type === "display" || type === "filter") ? fmtFechaVista(val) || "-" : val;
                    }
                },
                { data: "TipoMov", title: "Tipo" },         // 2
                {   // 3: Concepto (con estilo especial para saldo anterior)
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
                { data: "Debe", title: "Debe", className: "text-center", render: (n) => fmtMoney(n) },   // 4
                { data: "Haber", title: "Haber", className: "text-center", render: (n) => fmtMoney(n) },   // 5
                {   // 6: Saldo acumulado con color
                    data: "SaldoAcumulado",
                    title: "Saldo",
                    className: "text-center",
                    render: (n) => {
                        const v = parseFloat(n || 0);
                        let cls = "";
                        if (v > 0) cls = "text-success fw-bold";
                        else if (v < 0) cls = "text-danger fw-bold";
                        return `<span class="${cls}">${fmtMoney(v)}</span>`;
                    }
                },
                { data: "Sucursal", title: "Sucursal" }     // 7
            ],
            dom: 'Bfrtip',
            buttons: [
                {
                    extend: 'excelHtml5',
                    text: 'Exportar Excel',
                    filename: 'Reporte Cuentas Corrientes',
                    title: '',
                    exportOptions: { columns: [...Array(8).keys()].map(i => i) },
                    className: 'btn-exportar-excel',
                },
                {
                    extend: 'pdfHtml5',
                    text: 'Exportar PDF',
                    filename: 'Reporte Cuentas Corrientes',
                    title: '',
                    exportOptions: { columns: [...Array(8).keys()].map(i => i) },
                    className: 'btn-exportar-pdf',
                },
                {
                    extend: 'print',
                    text: 'Imprimir',
                    title: '',
                    exportOptions: { columns: [...Array(8).keys()].map(i => i) },
                    className: 'btn-exportar-print'
                },
                'pageLength'
            ],
            orderCellsTop: true,
            fixedHeader: true,

            initComplete: async function () {
                const api = this.api();

                // Filtros por columna
                for (const config of columnConfigMovs) {
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
                                calcularTotales();
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
                                calcularTotales();
                            });
                    }
                }

                // La celda de acciones (índice 0) no lleva filtro
                $('.filters th').eq(0).html('');

                calcularTotales();

                configurarOpcionesColumnas('#grd_Movimientos', '#configColumnasMenu', 'CC_Columnas');

                setTimeout(() => gridMovs.columns.adjust(), 10);
            },
        });
    } else {
        gridMovs.clear().rows.add(data).draw();
    }
}

/* ================== Ver / Editar ================== */
async function verOModificar(id) {
    try {
        // Cierra cualquier modal de detalle que ya esté abierto
        await closeAnyOpenModal(120);

        const r = await fetch(`${API.obtener}?id=${encodeURIComponent(id)}`, {
            headers: { "Authorization": "Bearer " + (token || ""), "Content-Type": "application/json" }
        });
        if (!r.ok) throw new Error("No se pudo obtener el movimiento");
        const m = await r.json();

        // ---- Lógica pedida ----
        const esVentaOCobroVenta =
            (m.TipoMov === "VENTA") ||
            ((m.Concepto ?? "").toUpperCase().includes("COBRO VENTA"));
        const tieneIdMov = m.IdMov != null && Number(m.IdMov) !== 0;

        if (esVentaOCobroVenta && tieneIdMov) {
            // Mostrar solo detalle (no editable)
            await verDetalle(id);
            return;
        }

        // Si no es VENTA/COBRO VENTA con IdMov, se puede EDITAR (manual)
        await editarMovimientoManual(m.Id);

        // Habilitar botón Eliminar en el modal de edición
        $("#btnEliminarMov")
            .removeClass("d-none")
            .off("click")
            .on("click", async () => {
                await eliminarMovimientoManual(m.Id);
            });

    } catch (e) {
        console.error(e);
        errorModal("No se pudo abrir el movimiento");
    }
}

/* ================== Detalle (para movimientos con IdMov) ================== */
async function verDetalle(id) {
    try {
        const url = `${API.obtener}?id=${encodeURIComponent(id)}`;
        const r = await fetch(url, {
            headers: {
                "Authorization": "Bearer " + (token || localStorage.getItem("JwtToken") || ""),
                "Content-Type": "application/json"
            }
        });

        if (r.status === 401) { errorModal("Sesión expirada. Iniciá sesión nuevamente."); return; }
        if (!r.ok) { const msg = await r.text().catch(() => r.statusText); throw new Error(msg || "Error HTTP"); }

        const m = await r.json();

        $("#detFecha").text(fmtFechaVista(m.Fecha));
        $("#detTipo").text(m.TipoMov ?? "");
        $("#detConcepto").text(m.Concepto ?? "");
        $("#detSucursal").text(m.Sucursal ?? "");
        $("#detDebe").text(fmtMoney(m.Debe));
        $("#detHaber").text(fmtMoney(m.Haber));

        // Mostrar "Ir a venta" sólo si es VENTA o Concepto contiene "COBRO VENTA", y además hay IdMov
        const esVentaOCobroVenta =
            (m.TipoMov === "VENTA") ||
            ((m.Concepto ?? "").toUpperCase().includes("COBRO VENTA"));

        if (esVentaOCobroVenta && m.IdMov != null && Number(m.IdMov) !== 0) {
            $("#btnIrVenta").removeClass("d-none").attr("href", `/Ventas/NuevoModif?id=${encodeURIComponent(m.IdMov)}`);
        } else {
            $("#btnIrVenta").addClass("d-none").attr("href", "#");
        }

        new bootstrap.Modal(document.getElementById("modalDetalle")).show();
    } catch (e) {
        console.error(e);
        errorModal("No se pudo obtener el detalle");
    }
}

/* ================== COBRO Manual (Modal) ================== */
async function abrirModalCobro() {
    if (!clienteSeleccionado) { errorModal("Elegí un cliente."); return; }

    clearValidationScope('#modalMovimiento');

    // valores por defecto (COBRO)
    $("#movId").val("");
    $("#movFecha").val(hoyISO());
    $("#movImporte").val("");
    $("#movConcepto").val("");             // campo manual (si existe en el DOM)
    $("#movSucursal").val("").trigger?.("change");
    $("#movCuentaCaja").val("").trigger?.("change");

    // Título y botones
    $("#modalMovimiento .modal-title").html(`<i class="fa fa-plus-circle text-success"></i> Nuevo cobro`);
    $("#btnGuardarMov").text("Registrar");
    $("#btnEliminarMov").addClass("d-none").off("click");

    editContext = { isEdit: false, idCliente: null };

    // cargar Sucursales + cuentas de caja
    await Promise.all([
        fetch("/Sucursales/Lista", { headers: { "Authorization": "Bearer " + (token || "") } })
            .then(r => r.json())
            .then(arr => {
                const $s = $("#movSucursal");
                if ($s.length) {
                    $s.empty().append('<option value="">Seleccione</option>');
                    (arr || []).forEach(x => $s.append(`<option value="${x.Id}">${x.Nombre}</option>`));
                }
            }),
        fetch("/Cuentas/Lista", { headers: { "Authorization": "Bearer " + (token || "") } })
            .then(r => r.json())
            .then(arr => {
                const $c = $("#movCuentaCaja");
                if ($c.length) {
                    $c.empty().append('<option value="">Seleccione</option>');
                    (arr || []).forEach(x => $c.append(`<option value="${x.Id}">${x.Nombre ?? x.Descripcion ?? ""}</option>`));
                }
            })
    ]);

    new bootstrap.Modal(document.getElementById("modalMovimiento")).show();
}

async function editarMovimientoManual(id) {
    try {
        const r = await fetch(`${API.obtener}?id=${encodeURIComponent(id)}`, {
            headers: { "Authorization": "Bearer " + (token || ""), "Content-Type": "application/json" }
        });
        if (!r.ok) throw new Error("No se pudo obtener el movimiento");
        const m = await r.json();

        // --- MISMA LÓGICA QUE EN verDetalle ---
        const esVentaOCobroVenta =
            (m.TipoMov === "VENTA") ||
            ((m.Concepto ?? "").toUpperCase().includes("COBRO VENTA"));
        const tieneIdMov = m.IdMov != null && Number(m.IdMov) !== 0;

        // Si es VENTA/COBRO VENTA y tiene IdMov => ver detalle (no editar)
        if (esVentaOCobroVenta && tieneIdMov) {
            await verDetalle(id);
            return;
        }

        // Si llega acá, es editable (manual / sin vínculo de venta)
        clearValidationScope('#modalMovimiento');

        const [sucs, ctas] = await Promise.all([
            fetch("/Sucursales/Lista", { headers: { "Authorization": "Bearer " + (token || "") } }).then(r => r.json()).catch(() => []),
            fetch("/Cuentas/Lista", { headers: { "Authorization": "Bearer " + (token || "") } }).then(r => r.json()).catch(() => []),
        ]);

        const $s = $("#movSucursal");
        if ($s.length) {
            $s.empty().append('<option value="">Seleccione</option>');
            (sucs || []).forEach(x => $s.append(`<option value="${x.Id}">${x.Nombre}</option>`));
        }
        const $c = $("#movCuentaCaja");
        if ($c.length) {
            $c.empty().append('<option value="">Seleccione</option>');
            (ctas || []).forEach(x => $c.append(`<option value="${x.Id}">${x.Nombre ?? x.Descripcion ?? ""}</option>`));
        }

        $("#movId").val(m.Id || 0);
        $("#movFecha").val(fmtFechaInput(m.Fecha));
        $("#movSucursal").val(m.IdSucursal || "");

        // Deducir importe desde Debe/Haber
        const esDebe = (parseFloat(m.Debe) || 0) > 0;
        const importe = esDebe ? (parseFloat(m.Debe) || 0) : (parseFloat(m.Haber) || 0);
        $("#movImporte").val(importe.toString().replace(".", ","));

        if (exists('#movConcepto')) $("#movConcepto").val(m.Concepto ?? '');

        // Preseleccionar cuenta de caja si viene del back
        if (exists('#movCuentaCaja') && m.IdCuentaCaja) {
            $("#movCuentaCaja").val(m.IdCuentaCaja).trigger?.("change");
        }

        $("#modalMovimiento .modal-title").html(`<i class="fa fa-pencil-square-o text-warning"></i> Editar movimiento`);
        $("#btnGuardarMov").text("Guardar");
        $("#btnEliminarMov").removeClass("d-none").off("click").on("click", async () => {
            await eliminarMovimientoManual($("#movId").val());
        });

        editContext = { isEdit: true, idCliente: m.IdCliente || null };

        new bootstrap.Modal(document.getElementById("modalMovimiento")).show();
    } catch (e) {
        console.error(e);
        errorModal("No se pudo abrir el movimiento para editar");
    }
}

/* ================== Validación & Guardar (COBRO manual, impacta caja) ================== */
function validarNuevoMov() {
    wasSubmitMov = true;

    // marca/borra invalid en todos los requeridos (sólo si existen)
    REQUIRED_SELECTORS_CC.forEach(sel => {
        if (!exists(sel)) return;
        const el = document.querySelector(sel);
        const ok = isFieldValid(sel);
        el.classList.toggle('is-invalid', !ok);
        el.classList.toggle('is-valid', ok);
    });

    const okAll = allRequiredValid();
    showErrorBanner(!okAll);
    return okAll;
}

async function guardarMovimientoManual() {
    if (!validarNuevoMov()) return;

    const idCliente = editContext.isEdit ? (editContext.idCliente || null) : (clienteSeleccionado?.Id || null);
    if (!idCliente) { errorModal("Elegí un cliente para registrar el movimiento."); return; }

    // Siempre “COBRO” => HABER que impacta CAJA
    const payload = {
        Id: parseInt($("#movId").val() || 0),
        IdCliente: idCliente,
        IdSucursal: $("#movSucursal").val() ? parseInt($("#movSucursal").val()) : null,
        Fecha: $("#movFecha").val(),
        Concepto: $("#movConcepto").val(),
        TipoMov: "HABER", // ← Cobro
        Importe: toNumber($("#movImporte").val()),
        ImpactaCaja: true,
        IdCuentaCaja: $("#movCuentaCaja").val() ? parseInt($("#movCuentaCaja").val()) : null
    };

    const esUpdate = payload.Id > 0;
    const url = esUpdate ? API.actualizarManual : API.insertarManual;
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
            bootstrap.Modal.getInstance(document.getElementById("modalMovimiento"))?.hide();
            exitoModal(esUpdate ? "Movimiento guardado" : "Cobro registrado");
            await listarMovimientos();
            await cargarClientes(); // refresca saldos de la izquierda
        } else {
            errorModal("No se pudo guardar");
        }
    } catch (e) {
        console.error(e);
        errorModal("Error al guardar");
    } finally {
        editContext = { isEdit: false, idCliente: null };
        wasSubmitMov = false;
    }
}

async function eliminarMovimientoManual(id) {
    const ok = await confirmarModal("¿Eliminar este movimiento manual?");
    if (!ok) return;

    try {
        const res = await fetch(`${API.eliminarManual}?id=${id}`, {
            method: "DELETE",
            headers: { "Authorization": "Bearer " + (token || ""), "Content-Type": "application/json" }
        });
        if (!res.ok) throw new Error(res.statusText);
        const r = await res.json();
        if (r?.valor) {
            bootstrap.Modal.getInstance(document.getElementById("modalMovimiento"))?.hide();
            exitoModal("Eliminado correctamente");
            await listarMovimientos();
            await cargarClientes();
        } else {
            errorModal("No se pudo eliminar");
        }
    } catch (e) {
        console.error(e);
        errorModal("Error al eliminar");
    }
}

/* ================== Exportar PDF ================== */
function exportarPDF() {
    const rows = gridMovs?.rows({ search: "applied" }).data().toArray() || [];
    if (rows.length === 0) { errorModal("No hay movimientos para exportar."); return; }

    const reales = rows.filter(r => !r.__isSaldo);
    const debe = reales.reduce((a, r) => a + (parseFloat(r.Debe) || 0), 0);
    const haber = reales.reduce((a, r) => a + (parseFloat(r.Haber) || 0), 0);
    const saldo = (saldoAnteriorActual || 0) + (haber - debe);

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 36;

    // Header
    doc.setFillColor(20, 28, 38);
    doc.rect(0, 0, pageW, 86, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold"); doc.setFontSize(18);
    doc.text("CUENTAS CORRIENTES", margin, 48);
    doc.setFontSize(11); doc.setFont("helvetica", "normal");
    const nombre = clienteSeleccionado?.Nombre ? `Cliente: ${clienteSeleccionado.Nombre}` : "Cliente: (todos)";
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

    // Tabla (incluye fila de saldo anterior al inicio)
    const body = rows.map(r => [
        r.__isSaldo ? "" : fmtFechaVista(r.Fecha),
        r.__isSaldo ? "" : (r.TipoMov || ""),
        r.__isSaldo ? (r.Concepto || "") + `: ${fmtMoney(r.SaldoAcumulado || 0)}` : (r.Concepto || ""),
        r.__isSaldo ? "" : fmtMoney(r.Debe),
        r.__isSaldo ? "" : fmtMoney(r.Haber),
        fmtMoney(r.SaldoAcumulado),
        r.__isSaldo ? "" : (r.Sucursal || "")
    ]);

    doc.autoTable({
        startY: y0 + boxH + 24,
        margin: { left: margin, right: margin },
        head: [["Fecha", "Tipo", "Concepto", "Debe", "Haber", "Saldo", "Sucursal"]],
        body,
        theme: "grid",
        styles: { fontSize: 10, cellPadding: 6, overflow: 'linebreak' },
        headStyles: { fillColor: [27, 37, 64], textColor: [255, 255, 255] },
        columnStyles: { 3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right" } },
        tableWidth: 'auto'
    });

    const fname = `CuentasCorrientes_${(clienteSeleccionado?.Nombre || "todos").replace(/\s+/g, "_")}_${moment().format("YYYYMMDD_HHmm")}.pdf`;
    doc.save(fname);
}

/* ================== Cierre de dropdowns de acciones ================== */
$(document).on('click', function (e) {
    if (!$(e.target).closest('.acciones-menu').length) {
        $('.acciones-dropdown').hide();
    }
});
