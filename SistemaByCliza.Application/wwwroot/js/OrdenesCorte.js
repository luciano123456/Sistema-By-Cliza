// ============================== OrdenesCorte.Index.js ==============================
function _ocJwt() {
    if (typeof token !== "undefined" && token) return token;
    return localStorage.getItem("JwtToken") || "";
}
let gridOC;

const columnConfigOC = [
    { index: 1, filterType: 'text' },                                  // Fecha
    { index: 2, filterType: 'select', fetchDataFunc: listaEstadosFilter }, // Estado
    { index: 3, filterType: 'text' },                                  // A producir
    { index: 4, filterType: 'text' },                                  // Producidas
    { index: 5, filterType: 'text' },                                  // Diferencia
    { index: 6, filterType: 'text' },                                  // Capas
    { index: 7, filterType: 'text' },                                  // Largo
    { index: 8, filterType: 'text' },                                  // Ancho
    { index: 9, filterType: 'text' },                                  // Inicio Corte
    { index: 10, filterType: 'text' },                                 // Fin Corte
];

$(document).ready(() => {
    Permisos.init();
    Permisos.aplicarUI("OrdenesCorte");
    initFiltrosOC();
});

/* ---------------- Navegación / Acciones ---------------- */
function nuevaOC() {
    if (!Permisos.tiene("OrdenesCorte", "Crear")) {
        errorModal("No tenés permisos.");
        return;
    }
    window.location.href = "/OrdenesCorte/NuevoModif";
}

const verOrdenCorte = (id) => {
    if (!Permisos.tiene("OrdenesCorte", "Ver")) {
        errorModal("No tenés permisos.");
        return;
    }
    /* Misma pantalla que edición; el servidor puede restringir si solo tiene Ver */
    window.location.href = "/OrdenesCorte/NuevoModif?id=" + id;
};

const editarOC = (id) => {
    if (!Permisos.tiene("OrdenesCorte", "Editar")) {
        errorModal("No tenés permisos.");
        return;
    }
    window.location.href = "/OrdenesCorte/NuevoModif?id=" + id;
};

async function eliminarOC(id) {
    if (!Permisos.tiene("OrdenesCorte", "Eliminar")) {
        errorModal("No tenés permisos.");
        return;
    }
    const ok = await confirmarModal("¿Desea eliminar esta orden de corte?");
    if (!ok) return;

    try {
        const r = await fetch("/OrdenesCorte/Eliminar?id=" + id, {
            method: "DELETE",
            headers: { 'Authorization': 'Bearer ' + _ocJwt(), 'Content-Type': 'application/json' }
        });
        if (!r.ok) throw new Error("Error al eliminar");

        const json = await r.json();
        if (json?.valor) {
            await listarOC(window._fmOC?.currentParams || {});
            exitoModal?.("Orden eliminada");
        } else {
            errorModal?.("No se pudo eliminar");
        }
    } catch (e) {
        console.error(e);
        errorModal?.("Error al eliminar");
    }
}

/* ---------------- Listado ---------------- */
async function listarOC(params = {}) {
    const qs = new URLSearchParams(params).toString();
    const paginaActual = gridOC ? gridOC.page() : 0;

    const r = await fetch("/OrdenesCorte/Lista" + (qs ? ("?" + qs) : ""), {
        headers: { 'Authorization': 'Bearer ' + _ocJwt(), 'Content-Type': 'application/json' }
    });
    if (!r.ok) throw new Error("Error cargando órdenes de corte");
    const data = await r.json();

    await configurarDataTableOC(data);

    if (paginaActual > 0) gridOC.page(paginaActual).draw('page');
    calcularTotalesOC();
}

async function configurarDataTableOC(data) {
    if (!gridOC) {
        // Clonar fila de filtros (igual que Ventas)
        $('#grd_OC thead tr').clone(true).addClass('filters').appendTo('#grd_OC thead');

        gridOC = $('#grd_OC').DataTable({
            data,
            language: { url: "//cdn.datatables.net/plug-ins/2.0.7/i18n/es-MX.json" },
            scrollX: true,
            scrollCollapse: true,
            columns: [
                {
                    data: "Id",
                    title: "Acciones",
                    width: "1%",
                    orderable: false,
                    searchable: false,
                    className: "text-center dt-col-acciones",
                    render: (id) => renderAccionesGrid(id, {
                        ver: "verOrdenCorte",
                        editar: "editarOC",
                        eliminar: "eliminarOC"
                    }, "OrdenesCorte")
                },
                { data: "FechaInicio", title: "Fecha", render: f => formatearFechaParaVista(f) },
                { data: "Estado", title: "Estado" }, // <- string que arma el Controller (Estado = OrdenesCorteEstado.Nombre)
                { data: "CantidadProducir", title: "A producir", className: "text-center", render: n => formatNumber(n) },
                { data: "CantidadProducidas", title: "Producidas", className: "text-center", render: n => formatNumber(n) },
                { data: "DiferenciaCorte", title: "Diferencia", className: "text-center", render: n => formatNumber(n) },
                { data: "CantidadCapas", title: "Capas", className: "text-center", render: n => formatNumber(n) },
                { data: "LargoTizada", title: "Largo", className: "text-center", render: n => formatNumber(n) },
                { data: "AnchoTizada", title: "Ancho", className: "text-center", render: n => formatNumber(n) },
                { data: "HoraInicioCorte", title: "Inicio Corte", render: f => f ? hView(f) : "" },
                { data: "HoraFinCorte", title: "Fin Corte", render: f => f ? hView(f) : "" },
            ],
            dom: 'Bfrtip',
            buttons: dataTableButtonsExportCondicional("OrdenesCorte", [
                { extend: 'excelHtml5', text: 'Exportar Excel', filename: 'Ordenes de Corte', title: '', exportOptions: { columns: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] }, className: 'btn-exportar-excel' },
                { extend: 'pdfHtml5', text: 'Exportar PDF', filename: 'Ordenes de Corte', title: '', exportOptions: { columns: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] }, className: 'btn-exportar-pdf' },
                { extend: 'print', text: 'Imprimir', title: '', exportOptions: { columns: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] }, className: 'btn-exportar-print' },
            ]),
            order: [[1, "desc"], [0, "desc"]],
            orderCellsTop: true,
            fixedHeader: true,
            initComplete: async function () {
                const api = this.api();

                // Filtros por columna (igual Ventas)
                for (const cfg of columnConfigOC) {
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

                // Configuración del menú de columnas (misma función utilitaria que en Ventas)
                if (typeof configurarOpcionesColumnas === "function") {
                    configurarOpcionesColumnas('#grd_OC', '#configColumnasMenuOC', 'OC_Columnas');
                }

                if (typeof bindDataTableSeleccionFila === "function") {
                    bindDataTableSeleccionFila("#grd_OC", "ordenesCorte");
                }

                setTimeout(() => gridOC?.columns.adjust(), 10);
                $('#grd_OC').on('draw.dt', calcularTotalesOC);
            }
        });
    } else {
        gridOC.clear().rows.add(data).draw();
    }
}

/* ---------------- Totales KPIs ---------------- */
function calcularTotalesOC() {
    if (!gridOC) return;

    const rows = gridOC.rows({ search: 'applied' }).data().toArray();

    let cant = rows.length;
    let plan = 0, prod = 0, dif = 0;

    for (const r of rows) {
        plan += parseFloat(r.CantidadProducir) || 0;
        prod += parseFloat(r.CantidadProducidas) || 0;
        dif += parseFloat(r.DiferenciaCorte) || 0;
    }

    $("#kpiCantOC").text(cant.toLocaleString("es-AR"));
    $("#kpiPlan").text(formatNumber(plan));
    $("#kpiProd").text(formatNumber(prod));
    $("#kpiDif").text(formatNumber(dif));
}

/* ---------------- Panel de filtros superior ---------------- */
async function initFiltrosOC() {
    // cargar Estados para el combo del panel
    try {
        const estados = await fetch('/OrdenesCorteEstados/Lista', {
            headers: { 'Authorization': 'Bearer ' + _ocJwt() }
        }).then(r => r.json());

        if ($('#fltEstado').length) {
            const $e = $('#fltEstado').empty().append('<option value="">Todos</option>');
            (estados || []).forEach(x => $e.append(`<option value="${x.Id}">${x.Nombre}</option>`));
        }
    } catch (e) { console.warn("No se pudieron cargar estados", e); }

    // FilterManager (como Ventas)
    window._fmOC = new Filters.FilterManager({
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
            estado: { el: '#fltEstado', param: 'idEstado', parse: v => v ? Number(v) : null },
            texto: { el: '#fltTexto', param: 'texto', parse: v => (v || '').trim() || null }
        },
        onSearch: async (params) => {
            window._fmOC.currentParams = params;
            await listarOC(params);
        }
    });

    window._fmOC.applyDefaults();
    window._fmOC.bind();
    await window._fmOC.search();

    // Toggle panel (igual que Ventas)
    if (typeof FiltersUI !== "undefined") {
        FiltersUI.init({
            storageKey: 'OC_FiltrosVisibles',
            panelSelector: '#formFiltros',
            buttonSelector: '#btnToggleFiltros',
            iconSelector: '#iconFiltros',
            defaultVisible: true
        });
    }
}

/* ---------------- Helpers para filtros por columna ---------------- */
async function listaEstadosFilter() {
    const r = await fetch('/OrdenesCorteEstados/Lista', {
        headers: { 'Authorization': 'Bearer ' + _ocJwt(), 'Content-Type': 'application/json' }
    });
    const d = await r.json();
    return (d || []).map(x => ({ Id: x.Id, Nombre: x.Nombre }));
}

/* ---------------- Util: escapeRegex (fallback) ---------------- */
function escapeRegex(text) {
    if ($.fn?.dataTable?.util?.escapeRegex) return $.fn.dataTable.util.escapeRegex(text);
    return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
// =================================================================


// --- Solo hora para vista (HH:mm) ---
function hView(valor) {
    const m = moment(valor, [
        moment.ISO_8601,
        'YYYY-MM-DD HH:mm:ss',
        'YYYY-MM-DDTHH:mm:ss',
        'HH:mm:ss',
        'HH:mm'
    ], true);
    return m.isValid() ? m.format('HH:mm') : '';
}

// --- Valor numérico para ordenar por hora (minutos desde 00:00) ---
function hSort(valor) {
    const m = moment(valor, [
        moment.ISO_8601,
        'YYYY-MM-DD HH:mm:ss',
        'YYYY-MM-DDTHH:mm:ss',
        'HH:mm:ss',
        'HH:mm'
    ], true);
    return m.isValid() ? (m.hours() * 60 + m.minutes()) : -1;
}
