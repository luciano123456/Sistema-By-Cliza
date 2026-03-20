let gridSueldos;

const columnConfig = [
    { index: 1, filterType: 'text' },                 // Fecha
    { index: 2, filterType: 'select', fetchDataFunc: listaPersonalFilter }, // Personal
    { index: 3, filterType: 'text' },                 // Concepto
    { index: 4, filterType: 'text' },                 // Importe
    { index: 5, filterType: 'text' },                 // Abonado
    { index: 6, filterType: 'text' },                 // Saldo
];

$(document).ready(() => {
    initFiltros();
});

function nuevoSueldo() {
    window.location.href = "/PersonalSueldos/NuevoModif";
}

const editarSueldo = id => {
    $('.acciones-dropdown').hide();
    window.location.href = "/PersonalSueldos/NuevoModif?id=" + id;
};

async function eliminarSueldo(id) {
    $('.acciones-dropdown').hide();
    const confirmado = await confirmarModal("¿Desea eliminar este sueldo?");
    if (!confirmado) return;

    try {
        const response = await fetch("/PersonalSueldos/Eliminar?id=" + id, {
            method: "DELETE",
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error("Error al eliminar el sueldo.");

        const dataJson = await response.json();
        if (dataJson.valor) {
            listaSueldos(window._fmSueldo?.currentParams || {});
            exitoModal("Sueldo eliminado correctamente");
        }
    } catch (error) {
        console.error("Ha ocurrido un error:", error);
    }
}

async function listaSueldos(params = {}) {
    let paginaActual = gridSueldos != null ? gridSueldos.page() : 0;
    const qs = new URLSearchParams(params).toString();

    const response = await fetch("/PersonalSueldos/Lista" + (qs ? "?" + qs : ""), {
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) throw new Error(`Error en la solicitud: ${response.statusText}`);

    const data = await response.json();
    await configurarDataTableSueldos(data);

    if (paginaActual > 0) gridSueldos.page(paginaActual).draw('page');

    calcularTotalesSueldos();
}

async function configurarDataTableSueldos(data) {
    if (!gridSueldos) {
        $('#grd_Sueldos thead tr').clone(true).addClass('filters').appendTo('#grd_Sueldos thead');

        gridSueldos = $('#grd_Sueldos').DataTable({
            data,
            language: {
                sLengthMenu: "Mostrar MENU registros",
                lengthMenu: "Anzeigen von _MENU_ Einträgen",
                url: "//cdn.datatables.net/plug-ins/2.0.7/i18n/es-MX.json"
            },
            scrollX: "100px",
            scrollCollapse: true,
            columns: [
                {   // acciones
                    data: "Id",
                    title: '',
                    width: "1%",
                    render: data => `
                        <div class="acciones-menu" data-id="${data}">
                            <button class='btn btn-sm btnacciones' type='button' onclick='toggleAcciones(${data})' title='Acciones'>
                                <i class='fa fa-ellipsis-v fa-lg text-white' aria-hidden='true'></i>
                            </button>
                            <div class="acciones-dropdown" style="display: none;">
                                <button class='btn btn-sm btneditar' type='button' onclick='editarSueldo(${data})' title='Editar'>
                                    <i class='fa fa-pencil-square-o fa-lg text-success' aria-hidden='true'></i> Abrir
                                </button>
                                <button class='btn btn-sm btneliminar' type='button' onclick='eliminarSueldo(${data})' title='Eliminar'>
                                    <i class='fa fa-trash-o fa-lg text-danger' aria-hidden='true'></i> Eliminar
                                </button>
                            </div>
                        </div>`,
                    orderable: false,
                    searchable: false,
                },
                { data: "Fecha", render: f => formatearFechaParaVista(f) },
                { data: "Personal" },
                { data: "Concepto" },
                { data: "Importe", render: n => formatNumber(n) },
                { data: "ImporteAbonado", render: n => formatNumber(n) },
                { data: "Saldo", render: n => formatNumber(n) },
            ],
            dom: 'Bfrtip',
            buttons: [
                { extend: 'excelHtml5', text: 'Exportar Excel', filename: 'Reporte Sueldos', title: '', exportOptions: { columns: [1, 2, 3, 4, 5, 6] }, className: 'btn-exportar-excel' },
                { extend: 'pdfHtml5', text: 'Exportar PDF', filename: 'Reporte Sueldos', title: '', exportOptions: { columns: [1, 2, 3, 4, 5, 6] }, className: 'btn-exportar-pdf' },
                { extend: 'print', text: 'Imprimir', title: '', exportOptions: { columns: [1, 2, 3, 4, 5, 6] }, className: 'btn-exportar-print' },
                'pageLength'
            ],
            orderCellsTop: true,
            fixedHeader: true,
            initComplete: async function () {
                const api = this.api();

                // Filtros por columna
                for (const config of columnConfig) {
                    const cell = $('.filters th').eq(config.index);

                    if (config.filterType === "select") {
                        const select = $(`<select id="filter${config.index}"><option value="">Seleccionar</option></select>`)
                            .appendTo(cell.empty())
                            .on("change", async function () {
                                const val = this.value;
                                if (val === "") {
                                    await api.column(config.index).search("").draw();
                                    return;
                                }
                                const selectedText = $(this).find("option:selected").text();
                                await api
                                    .column(config.index)
                                    .search("^" + escapeRegex(selectedText) + "$", true, false)
                                    .draw();
                            });

                        const items = await config.fetchDataFunc();
                        items.forEach(item => {
                            select.append('<option value="' + item.Id + '">' + (item.Nombre ?? '') + '</option>');
                        });

                    } else if (config.filterType === 'text') {
                        const input = $('<input type="text" placeholder="Buscar..." />')
                            .appendTo(cell.empty())
                            .off('keyup change')
                            .on('keyup change', function (e) {
                                e.stopPropagation();
                                const regexr = '({search})';
                                const cursorPosition = this.selectionStart;
                                api.column(config.index)
                                    .search(this.value !== '' ? regexr.replace('{search}', '(((' + escapeRegex(this.value) + ')))') : '', this.value !== '', this.value === '')
                                    .draw();
                                $(this).focus()[0].setSelectionRange(cursorPosition, cursorPosition);
                            });
                    }
                }

                $('.filters th').eq(0).html('');

                configurarOpcionesColumnas('#grd_Sueldos', '#configColumnasMenu', 'Sueldos_Columnas');
                setTimeout(() => gridSueldos.columns.adjust(), 10);
            },
        });
    } else {
        gridSueldos.clear().rows.add(data).draw();
    }
}
function calcularTotalesSueldos() {
    if (!gridSueldos) return;

    const rows = gridSueldos.rows({ search: "applied" }).data().toArray();

    let tImp = 0, tAbo = 0, tSal = 0;
    for (const r of rows) {
        const importe = parseFloat(r.Importe) || 0;
        const abonado = parseFloat((r.Abonado ?? r.ImporteAbonado)) || 0;
        const saldo = (r.Saldo != null) ? (parseFloat(r.Saldo) || 0) : (importe - abonado);

        tImp += importe;
        tAbo += abonado;
        tSal += saldo;
    }

    // KPIs (header)
    $("#kpiCantSueldos").text(rows.length.toLocaleString("es-AR"));
    $("#kpiImporte").text(formatNumber(tImp));
    $("#kpiAbonado").text(formatNumber(tAbo));
    $("#kpiSaldo").text(formatNumber(tSal));

    // Compat: si aún tenés inputs de totales en el pie, los sigo actualizando
    $("#txtTotalImporte").val?.(formatNumber(tImp));
    $("#txtTotalAbonado").val?.(formatNumber(tAbo));
    $("#txtTotalSaldo").val?.(formatNumber(tSal));
}

/* ------ Filtros superiores ------ */

// --- Sueldos: initFiltros con misma estructura que Gastos ---
async function initFiltros() {
    // 1) Cargar combos del panel superior (si existen en el DOM)
    try {
        const [personal] = await Promise.all([
            fetch('/Personal/Lista', { headers: { 'Authorization': 'Bearer ' + token } }).then(r => r.json())
        ]);

        if ($('#fltPersonal').length) {
            const $p = $('#fltPersonal').empty().append('<option value="">Todos</option>');
            personal.forEach(x => $p.append(`<option value="${x.Id}">${x.Nombre}</option>`));
        }
    } catch { /* ignora fallos de combos */ }

    // 2) Crear FilterManager (misma estructura que Gastos)
    window._fmSueldo = new Filters.FilterManager({
        form: '#formFiltros',
        debounce: 300,
        buttons: {
            search: '#btnBuscar',
            clear: '#btnLimpiar',
            keepDefaultsOnClear: true,
        },
        fields: {
            // alias             // selector     // nombre de parámetro en back
            desde: { el: '#fltDesde', param: 'fechaDesde', parse: v => v || null, default: Filters.FilterManager.firstOfMonthISO },
            hasta: { el: '#fltHasta', param: 'fechaHasta', parse: v => v || null, default: Filters.FilterManager.todayISO },
            personal: { el: '#fltPersonal', param: 'idPersonal', parse: v => v ? Number(v) : null },
            estado: { el: '#fltEstado', param: 'estado', parse: v => (v || null) },
            concepto: { el: '#fltConcepto', param: 'concepto', parse: v => (v || '').trim() || null },
        },
        onSearch: async (params) => {
            window._fmSueldo.currentParams = params; // por si lo usás al recargar
            await listaSueldos(params);
        },
        // autoSearch: true, // si querés búsqueda automática al cambiar filtros
    });

    // 3) Defaults + bind
    window._fmSueldo.applyDefaults();
    window._fmSueldo.bind();

    // 4) Primera carga respetando defaults
    await window._fmSueldo.search();

    // 5) Toggle de panel de filtros (sin tocar la fila del header)
    FiltersUI.init({
        storageKey: 'Sueldos_FiltrosVisibles',
        panelSelector: '#formFiltros',
        buttonSelector: '#btnToggleFiltros',
        iconSelector: '#iconFiltros',
        defaultVisible: true
    });

    // (Opcional) Por si alguna vez quedó oculto por CSS/estado previo:
    const $row = $('#grd_Sueldos thead tr.filters');
    $row.show().css('display', 'table-row').removeAttr('hidden');
}


/* ------ Helpers / Selects ------ */
async function listaPersonalFilter() {
    const r = await fetch("/Personal/Lista", { headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' } });
    const data = await r.json();
    return data.map(x => ({ Id: x.Id, Nombre: x.Nombre }));
}

/* ------ Dropdown acciones ------ */
function toggleAcciones(id) {
    const $dd = $(`.acciones-menu[data-id="${id}"] .acciones-dropdown`);
    if ($dd.is(":visible")) $dd.hide(); else { $('.acciones-dropdown').hide(); $dd.show(); }
}
$(document).on('click', function (e) {
    if (!$(e.target).closest('.acciones-menu').length) $('.acciones-dropdown').hide();
});
