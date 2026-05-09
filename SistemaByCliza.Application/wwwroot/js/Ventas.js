// ============================== Ventas.js ==============================
let gridVentas;

const columnConfigVentas = [
    { index: 1, filterType: 'text' },
    { index: 2, filterType: 'select', fetchDataFunc: listaSucursalesVentasFilter },
    { index: 3, filterType: 'select', fetchDataFunc: listaClientesFilter },
    { index: 4, filterType: 'text' },
    { index: 5, filterType: 'text' },
    { index: 6, filterType: 'text' },
    { index: 7, filterType: 'text' },
];

$(document).ready(() => {
    Permisos.init();
    Permisos.aplicarUI("Ventas");
    initFiltrosVentas();
});

/* ---------------- Navegación / Acciones ---------------- */
function nuevaVenta() {
    if (!Permisos.tiene("Ventas", "Crear")) {
        errorModal("No tenés permisos.");
        return;
    }
    window.location.href = "/Ventas/NuevoModif";
}

function verVenta(id) {
    Permisos.init();
    if (!Permisos.tiene("Ventas", "Ver")) {
        errorModal("No tenés permisos.");
        return;
    }
    window.location.href = "/Ventas/NuevoModif?id=" + id + "&ver=1";
}

const editarVenta = (id) => {
    if (!Permisos.tiene("Ventas", "Editar")) {
        errorModal("No tenés permisos.");
        return;
    }
    window.location.href = "/Ventas/NuevoModif?id=" + id;
};

async function eliminarVenta(id) {
    if (!Permisos.tiene("Ventas", "Eliminar")) {
        errorModal("No tenés permisos.");
        return;
    }
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
                    render: (id) => renderAccionesGrid(id, {
                        ver: "verVenta",
                        editar: "editarVenta",
                        eliminar: "eliminarVenta"
                    }, "Ventas")
                },
                { data: "Fecha", title: "Fecha", render: f => formatearFechaParaVista(f) },
                { data: "Sucursal", title: "Sucursal" },
                { data: "Cliente", title: "Cliente" },
                { data: "Subtotal", title: "Subtotal", className: "text-end", render: n => formatNumber(n) },
                { data: "Descuentos", title: "Descuentos", className: "text-end", render: n => formatNumber(n) },
                { data: "TotalIva", title: "IVA", className: "text-end", render: n => formatNumber(n) },
                { data: "ImporteTotal", title: "Total", className: "text-end", render: n => formatNumber(n) },
            ],
            dom: 'Bfrtip',
            buttons: dataTableButtonsExportCondicional("Ventas", [
                { extend: 'excelHtml5', text: 'Exportar Excel', filename: 'Reporte Ventas', title: '', exportOptions: { columns: [1, 2, 3, 4, 5, 6, 7, 8] }, className: 'btn-exportar-excel' },
                { extend: 'pdfHtml5', text: 'Exportar PDF', filename: 'Reporte Ventas', title: '', exportOptions: { columns: [1, 2, 3, 4, 5, 6, 7, 8] }, className: 'btn-exportar-pdf' },
                { extend: 'print', text: 'Imprimir', title: '', exportOptions: { columns: [1, 2, 3, 4, 5, 6, 7, 8] }, className: 'btn-exportar-print' },
            ]),
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

                if (typeof bindDataTableSeleccionFila === "function") {
                    bindDataTableSeleccionFila("#grd_Ventas", "ventas");
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
    // 1) Combos: cliente, sucursal (según rol), vendedor (solo administrador)
    try {
        const reqs = [
            fetch('/Clientes/Lista', { headers: { 'Authorization': 'Bearer ' + token } }).then(r => r.json()),
            fetch('/Ventas/SucursalesOpciones', { headers: { 'Authorization': 'Bearer ' + token } }).then(r => r.json())
        ];
        if (Permisos.esRolAdministrador()) {
            reqs.push(fetch('/Personal/Lista', { headers: { 'Authorization': 'Bearer ' + token } }).then(r => r.json()));
        }
        const results = await Promise.all(reqs);
        const clientes = results[0];
        const sucursales = results[1];
        const vendedores = results.length > 2 ? results[2] : [];

        if ($('#fltCliente').length) {
            const $c = $('#fltCliente').empty().append('<option value="">Todos</option>');
            (clientes || []).forEach(x => $c.append(`<option value="${x.Id}">${x.Nombre}</option>`));
        }
        if ($('#fltSucursal').length) {
            const $s = $('#fltSucursal').empty().append('<option value="">Todas</option>');
            (sucursales || []).forEach(x => $s.append(`<option value="${x.Id}">${x.Nombre}</option>`));
        }
        if (Permisos.esRolAdministrador()) {
            if ($('#fltVendedor').length) {
                const $v = $('#fltVendedor').empty().append('<option value="">Todos</option>');
                (vendedores || []).forEach(x => $v.append(`<option value="${x.Id}">${x.Nombre}</option>`));
            }
        } else {
            $('#wrapFiltroVendedor').addClass('d-none');
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
            sucursal: { el: '#fltSucursal', param: 'idSucursal', parse: v => v ? Number(v) : null },
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
async function listaSucursalesVentasFilter() {
    const r = await fetch('/Ventas/SucursalesOpciones', { headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' } });
    const d = await r.json();
    return (d || []).map(x => ({ Id: x.Id, Nombre: x.Nombre }));
}

/* ---------------- Util: escapeRegex (fallback) ---------------- */
function escapeRegex(text) {
    if ($.fn?.dataTable?.util?.escapeRegex) return $.fn.dataTable.util.escapeRegex(text);
    return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
// =================================================================
