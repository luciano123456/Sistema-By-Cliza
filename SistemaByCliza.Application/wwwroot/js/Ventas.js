// ============================== Ventas.js ==============================
let gridVentas;

const columnConfigVentas = [
    { index: 1, filterType: 'text' },                                  // Fecha
    { index: 2, filterType: 'select', fetchDataFunc: listaClientesFilter }, // Cliente
    { index: 3, filterType: 'select', fetchDataFunc: listaVendedoresFilter }, // Vendedor
    { index: 4, filterType: 'text' },                                  // Subtotal
    { index: 5, filterType: 'text' },                                  // Descuentos
    { index: 6, filterType: 'text' },                                  // IVA
    { index: 7, filterType: 'text' },                                  // Total
];

$(document).ready(() => {
    initFiltrosVentas();
});

/* ---------------- Navegación / Acciones ---------------- */
function nuevaVenta() {
    window.location.href = "/Ventas/NuevoModif";
}

const editarVenta = (id) => {
    $('.acciones-dropdown').hide();
    window.location.href = "/Ventas/NuevoModif?id=" + id;
};

async function eliminarVenta(id) {
    $('.acciones-dropdown').hide();
    const ok = await confirmarModal("¿Desea eliminar esta venta?");
    if (!ok) return;

    try {
        const r = await fetch("/Ventas/Eliminar?id=" + id, {
            method: "DELETE",
            headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
        });
        if (!r.ok) throw new Error("Error al eliminar");

        const json = await r.json();
        if (json?.valor) {
            await listarVentas(window._fmVentas?.currentParams || {});
            exitoModal?.("Venta eliminada");
        } else {
            errorModal?.("No se pudo eliminar");
        }
    } catch (e) {
        console.error(e);
        errorModal?.("Error al eliminar");
    }
}

/* ---------------- Listado ---------------- */
async function listarVentas(params = {}) {
    const qs = new URLSearchParams(params).toString();
    // conservar página actual (si ya existe la grilla)
    const paginaActual = gridVentas ? gridVentas.page() : 0;

    const r = await fetch("/Ventas/Lista" + (qs ? ("?" + qs) : ""), {
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
    });
    if (!r.ok) throw new Error("Error cargando ventas");
    const data = await r.json();

    await configurarDataTableVentas(data);

    if (paginaActual > 0) gridVentas.page(paginaActual).draw('page');
    calcularTotalesVentas();
}

async function configurarDataTableVentas(data) {
    if (!gridVentas) {
        // Clonar fila de filtros en el header (igual que sueldos)
        $('#grd_Ventas thead tr').clone(true).addClass('filters').appendTo('#grd_Ventas thead');

        gridVentas = $('#grd_Ventas').DataTable({
            data,
            language: { url: "//cdn.datatables.net/plug-ins/2.0.7/i18n/es-MX.json" },
            scrollX: true,
            scrollCollapse: true,
            columns: [
                {
                    data: "Id", title: "", width: "1%", orderable: false, searchable: false,
                    render: (id) => `
                        <div class="acciones-menu" data-id="${id}">
                            <button class='btn btn-sm btnacciones' type='button' onclick='toggleAcciones(${id})' title='Acciones'>
                                <i class='fa fa-ellipsis-v fa-lg text-white'></i>
                            </button>
                            <div class="acciones-dropdown" style="display:none;">
                                <button class='btn btn-sm btneditar' type='button' onclick='editarVenta(${id})'>
                                    <i class='fa fa-pencil-square-o fa-lg text-success'></i> Abrir
                                </button>
                                <button class='btn btn-sm btneliminar' type='button' onclick='eliminarVenta(${id})'>
                                    <i class='fa fa-trash-o fa-lg text-danger'></i> Eliminar
                                </button>
                            </div>
                        </div>`
                },
                { data: "Fecha", title: "Fecha", render: f => formatearFechaParaVista(f) },
                { data: "Cliente", title: "Cliente" },
                { data: "Vendedor", title: "Vendedor" },
                { data: "Subtotal", title: "Subtotal", className: "text-end", render: n => formatNumber(n) },
                { data: "Descuentos", title: "Descuentos", className: "text-end", render: n => formatNumber(n) },
                { data: "TotalIva", title: "IVA", className: "text-end", render: n => formatNumber(n) },
                { data: "ImporteTotal", title: "Total", className: "text-end", render: n => formatNumber(n) },
            ],
            dom: 'Bfrtip',
            buttons: [
                { extend: 'excelHtml5', text: 'Exportar Excel', filename: 'Reporte Ventas', title: '', exportOptions: { columns: [1, 2, 3, 4, 5, 6, 7] }, className: 'btn-exportar-excel' },
                'pageLength'
            ],
            order: [[1, "desc"], [0, "desc"]],
            orderCellsTop: true,
            fixedHeader: true,
            initComplete: async function () {
                const api = this.api();

                // Filtros por columna (igual estructura que sueldos)
                for (const cfg of columnConfigVentas) {
                    const $cell = $('.filters th').eq(cfg.index);

                    if (cfg.filterType === "select") {
                        const $sel = $(`<select id="filter${cfg.index}" class="form-select form-select-sm">
                                            <option value="">Seleccionar</option>
                                        </select>`)
                            .appendTo($cell.empty())
                            .on("change", async function () {
                                const val = this.value;
                                if (val === "") {
                                    await api.column(cfg.index).search("").draw();
                                    return;
                                }
                                const txt = $(this).find("option:selected").text();
                                await api
                                    .column(cfg.index)
                                    .search("^" + escapeRegex(txt) + "$", true, false)
                                    .draw();
                            });

                        const items = await cfg.fetchDataFunc();
                        items.forEach(i => $sel.append(`<option value="${i.Id}">${i.Nombre}</option>`));
                    } else {
                        const $input = $(`<input type="text" class="form-control form-control-sm" placeholder="Buscar..." />`)
                            .appendTo($cell.empty())
                            .on('keyup change', function (e) {
                                e.stopPropagation();
                                const regexr = '({search})';
                                const cur = this.selectionStart || 0;
                                api.column(cfg.index)
                                    .search(this.value !== '' ? regexr.replace('{search}', '(((' + escapeRegex(this.value) + ')))') : '', this.value !== '', this.value === '')
                                    .draw();
                                $(this).focus()[0].setSelectionRange(cur, cur);
                            });
                    }
                }
                // La primera celda (acciones) sin filtro
                $('.filters th').eq(0).html('');

                // Config menú de columnas (si lo usás en otros listados)
                if (typeof configurarOpcionesColumnas === "function") {
                    configurarOpcionesColumnas('#grd_Ventas', '#configColumnasMenu', 'Ventas_Columnas');
                }

                // Ajustar ancho y recalcular totales en cada draw
                setTimeout(() => gridVentas?.columns.adjust(), 10);
                $('#grd_Ventas').on('draw.dt', calcularTotalesVentas);
            }
        });
    } else {
        gridVentas.clear().rows.add(data).draw();
    }
}

/* ---------------- Totales (como sueldos) ---------------- */
function calcularTotalesVentas() {
    if (!gridVentas) return;

    const rows = gridVentas.rows({ search: 'applied' }).data().toArray();

    let cant = rows.length;
    let sub = 0, desc = 0, iva = 0, tot = 0;

    for (const r of rows) {
        sub += parseFloat(r.Subtotal) || 0;
        desc += parseFloat(r.Descuentos) || 0;
        iva += parseFloat(r.TotalIva) || 0;
        tot += parseFloat(r.ImporteTotal) || 0;
    }

    // KPIs (header)
    $("#kpiCantVentas").text(cant.toLocaleString("es-AR"));
    $("#kpiSubtotal").text(formatNumber(sub));
    $("#kpiDescuentos").text(formatNumber(desc));
    $("#kpiIva").text(formatNumber(iva));
    $("#kpiTotalVentas").text(formatNumber(tot));

    // (Opcional) campos del pie si existen
    $("#txtTotalSubtotal").length && $("#txtTotalSubtotal").val(formatNumber(sub));
    $("#txtTotalDescuentos").length && $("#txtTotalDescuentos").val(formatNumber(desc));
    $("#txtTotalIva").length && $("#txtTotalIva").val(formatNumber(iva));
    $("#txtTotalGeneral").length && $("#txtTotalGeneral").val(formatNumber(tot));
}


/* ---------------- Panel de filtros superior (FilterManager like sueldos) ---------------- */
async function initFiltrosVentas() {
    // 1) Cargar combos de Cliente y Vendedor
    try {
        const [clientes, vendedores] = await Promise.all([
            fetch('/Clientes/Lista', { headers: { 'Authorization': 'Bearer ' + token } }).then(r => r.json()),
            fetch('/Personal/Lista', { headers: { 'Authorization': 'Bearer ' + token } }).then(r => r.json())
        ]);

        if ($('#fltCliente').length) {
            const $c = $('#fltCliente').empty().append('<option value="">Todos</option>');
            (clientes || []).forEach(x => $c.append(`<option value="${x.Id}">${x.Nombre}</option>`));
        }
        if ($('#fltVendedor').length) {
            const $v = $('#fltVendedor').empty().append('<option value="">Todos</option>');
            (vendedores || []).forEach(x => $v.append(`<option value="${x.Id}">${x.Nombre}</option>`));
        }
    } catch (e) {
        console.warn("No se pudieron cargar combos de filtros", e);
    }

    // 2) Crear FilterManager con misma configuración que sueldos
    window._fmVentas = new Filters.FilterManager({
        form: '#formFiltros',
        debounce: 300,
        buttons: {
            search: '#btnBuscar',
            clear: '#btnLimpiar',
            keepDefaultsOnClear: true
        },
        fields: {
            desde: { el: '#fltDesde', param: 'fechaDesde', parse: v => v || null, default: Filters.FilterManager.firstOfMonthISO },
            hasta: { el: '#fltHasta', param: 'fechaHasta', parse: v => v || null, default: Filters.FilterManager.todayISO },
            cliente: { el: '#fltCliente', param: 'idCliente', parse: v => v ? Number(v) : null },
            vendedor: { el: '#fltVendedor', param: 'idVendedor', parse: v => v ? Number(v) : null },
            estado: { el: '#fltEstado', param: 'estado', parse: v => v || null },
            texto: { el: '#fltTexto', param: 'texto', parse: v => (v || '').trim() || null }
        },
        onSearch: async (params) => {
            window._fmVentas.currentParams = params;
            await listarVentas(params);
        },
        // autoSearch: true // si querés que busque automáticamente al cambiar un filtro
    });

    // 3) Defaults + bind + primera búsqueda
    window._fmVentas.applyDefaults();
    window._fmVentas.bind();
    await window._fmVentas.search();

    // 4) Toggle del panel (igual que sueldos)
    if (typeof FiltersUI !== "undefined") {
        FiltersUI.init({
            storageKey: 'Ventas_FiltrosVisibles',
            panelSelector: '#formFiltros',
            buttonSelector: '#btnToggleFiltros',
            iconSelector: '#iconFiltros',
            defaultVisible: true
        });
    }
}

/* ---------------- Helpers para selects de filtros por columna ---------------- */
async function listaClientesFilter() {
    const r = await fetch('/Clientes/Lista', { headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' } });
    const d = await r.json();
    return (d || []).map(x => ({ Id: x.Id, Nombre: x.Nombre }));
}
async function listaVendedoresFilter() {
    const r = await fetch('/Personal/Lista', { headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' } });
    const d = await r.json();
    return (d || []).map(x => ({ Id: x.Id, Nombre: x.Nombre }));
}

/* ---------------- Dropdown acciones ---------------- */
function toggleAcciones(id) {
    const $dd = $(`.acciones-menu[data-id="${id}"] .acciones-dropdown`);
    if ($dd.is(":visible")) $dd.hide();
    else { $('.acciones-dropdown').hide(); $dd.show(); }
}
$(document).on('click', function (e) {
    if (!$(e.target).closest('.acciones-menu').length) $('.acciones-dropdown').hide();
});

/* ---------------- Util: escapeRegex (fallback) ---------------- */
function escapeRegex(text) {
    if ($.fn?.dataTable?.util?.escapeRegex) return $.fn.dataTable.util.escapeRegex(text);
    return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
// =================================================================
