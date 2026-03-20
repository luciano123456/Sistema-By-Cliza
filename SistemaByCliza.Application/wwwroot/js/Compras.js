// ============================== Compras.js ==============================
let gridCompras;

const columnConfigCompras = [
    { index: 1, filterType: 'text' },                                   // Fecha
    { index: 2, filterType: 'select', fetchDataFunc: listaProveedoresFilter }, // Proveedor
    { index: 3, filterType: 'text' },                                   // Subtotal
    { index: 4, filterType: 'text' },                                   // Descuentos
    { index: 5, filterType: 'text' },                                   // IVA
    { index: 6, filterType: 'text' },                                   // Total
];

$(document).ready(() => {
    initFiltrosCompras();
});

/* ---------------- Navegación / Acciones ---------------- */
function nuevaCompra() {
    window.location.href = "/Compras/NuevoModif";
}

const editarCompra = (id) => {
    $('.acciones-dropdown').hide();
    window.location.href = "/Compras/NuevoModif?id=" + id;
};

async function eliminarCompra(id) {
    $('.acciones-dropdown').hide();
    const ok = await confirmarModal("¿Desea eliminar esta compra?");
    if (!ok) return;

    try {
        const r = await fetch("/Compras/Eliminar?id=" + id, {
            method: "DELETE",
            headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
        });
        if (!r.ok) throw new Error("Error al eliminar");

        const json = await r.json();
        if (json?.valor) {
            await listarCompras(window._fmCompras?.currentParams || {});
            exitoModal?.("Compra eliminada");
        } else {
            errorModal?.("No se pudo eliminar");
        }
    } catch (e) {
        console.error(e);
        errorModal?.("Error al eliminar");
    }
}

/* ---------------- Listado ---------------- */
async function listarCompras(params = {}) {
    const qs = new URLSearchParams(params).toString();
    const paginaActual = gridCompras ? gridCompras.page() : 0;

    const r = await fetch("/Compras/Lista" + (qs ? ("?" + qs) : ""), {
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
    });
    if (!r.ok) throw new Error("Error cargando compras");
    const data = await r.json();

    await configurarDataTableCompras(data);

    if (paginaActual > 0) gridCompras.page(paginaActual).draw('page');
    calcularTotalesCompras();
}

async function configurarDataTableCompras(data) {
    if (!gridCompras) {
        $('#grd_Compras thead tr').clone(true).addClass('filters').appendTo('#grd_Compras thead');

        gridCompras = $('#grd_Compras').DataTable({
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
                                <button class='btn btn-sm btneditar' type='button' onclick='editarCompra(${id})'>
                                    <i class='fa fa-pencil-square-o fa-lg text-success'></i> Abrir
                                </button>
                                <button class='btn btn-sm btneliminar' type='button' onclick='eliminarCompra(${id})'>
                                    <i class='fa fa-trash-o fa-lg text-danger'></i> Eliminar
                                </button>
                            </div>
                        </div>`
                },
                { data: "Fecha", title: "Fecha", render: f => formatearFechaParaVista(f) },
                { data: "Proveedor", title: "Proveedor" },
                { data: "Subtotal", title: "Subtotal", className: "text-end", render: n => formatNumber(n) },
                { data: "Descuentos", title: "Descuentos", className: "text-end", render: n => formatNumber(n) },
                { data: "TotalIva", title: "IVA", className: "text-end", render: n => formatNumber(n) },
                { data: "ImporteTotal", title: "Total", className: "text-end", render: n => formatNumber(n) },
            ],
            dom: 'Bfrtip',
            buttons: [
                { extend: 'excelHtml5', text: 'Exportar Excel', filename: 'Reporte Compras', title: '', exportOptions: { columns: [1, 2, 3, 4, 5, 6] }, className: 'btn-exportar-excel' },
                'pageLength'
            ],
            order: [[1, "desc"], [0, "desc"]],
            orderCellsTop: true,
            fixedHeader: true,
            initComplete: async function () {
                const api = this.api();

                // Filtros por columna
                for (const cfg of columnConfigCompras) {
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
                $('.filters th').eq(0).html('');

                if (typeof configurarOpcionesColumnas === "function") {
                    configurarOpcionesColumnas('#grd_Compras', '#configColumnasMenu', 'Compras_Columnas');
                }

                setTimeout(() => gridCompras?.columns.adjust(), 10);
                $('#grd_Compras').on('draw.dt', calcularTotalesCompras);
            }
        });
    } else {
        gridCompras.clear().rows.add(data).draw();
    }
}

/* ---------------- Totales (KPIs) ---------------- */
function calcularTotalesCompras() {
    if (!gridCompras) return;

    const rows = gridCompras.rows({ search: 'applied' }).data().toArray();
    let cant = rows.length;
    let sub = 0, desc = 0, iva = 0, tot = 0;

    for (const r of rows) {
        sub += parseFloat(r.Subtotal) || 0;
        desc += parseFloat(r.Descuentos) || 0;
        iva += parseFloat(r.TotalIva) || 0;
        tot += parseFloat(r.ImporteTotal) || 0;
    }

    $("#kpiCantCompras").text(cant.toLocaleString("es-AR"));
    $("#kpiSubtotal").text(formatNumber(sub));
    $("#kpiDescuentos").text(formatNumber(desc));
    $("#kpiIva").text(formatNumber(iva));
    $("#kpiTotalCompras").text(formatNumber(tot));

    $("#txtTotalSubtotal").length && $("#txtTotalSubtotal").val(formatNumber(sub));
    $("#txtTotalDescuentos").length && $("#txtTotalDescuentos").val(formatNumber(desc));
    $("#txtTotalIva").length && $("#txtTotalIva").val(formatNumber(iva));
    $("#txtTotalGeneral").length && $("#txtTotalGeneral").val(formatNumber(tot));
}

/* ---------------- Panel de filtros superior ---------------- */
async function initFiltrosCompras() {
    // 1) Cargar combos de Proveedor
    try {
        const proveedores = await fetch('/Proveedores/Lista', { headers: { 'Authorization': 'Bearer ' + token } }).then(r => r.json());
        if ($('#fltProveedor').length) {
            const $p = $('#fltProveedor').empty().append('<option value="">Todos</option>');
            (proveedores || []).forEach(x => $p.append(`<option value="${x.Id}">${x.Nombre}</option>`));
        }
    } catch (e) {
        console.warn("No se pudieron cargar proveedores", e);
    }

    // 2) Crear FilterManager
    window._fmCompras = new Filters.FilterManager({
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
            proveedor: { el: '#fltProveedor', param: 'idProveedor', parse: v => v ? Number(v) : null },
            estado: { el: '#fltEstado', param: 'estado', parse: v => v || null },
            texto: { el: '#fltTexto', param: 'texto', parse: v => (v || '').trim() || null }
        },
        onSearch: async (params) => {
            window._fmCompras.currentParams = params;
            await listarCompras(params);
        },
    });

    window._fmCompras.applyDefaults();
    window._fmCompras.bind();
    await window._fmCompras.search();

    if (typeof FiltersUI !== "undefined") {
        FiltersUI.init({
            storageKey: 'Compras_FiltrosVisibles',
            panelSelector: '#formFiltros',
            buttonSelector: '#btnToggleFiltros',
            iconSelector: '#iconFiltros',
            defaultVisible: true
        });
    }
}

/* ---------------- Helpers selects de filtros por columna ---------------- */
async function listaProveedoresFilter() {
    const r = await fetch('/Proveedores/Lista', { headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' } });
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

/* ---------------- Util: escapeRegex ---------------- */
function escapeRegex(text) {
    if ($.fn?.dataTable?.util?.escapeRegex) return $.fn.dataTable.util.escapeRegex(text);
    return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
// =================================================================
