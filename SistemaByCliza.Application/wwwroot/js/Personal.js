// ===================== Personal.js — Grilla /Personal (modal en Entities/M_Personal.js) =====================
let gridPersonal;

// Índices de columnas (coinciden con el thead)
const columnConfig = [
    { index: 1, filterType: 'text' },
    { index: 2, filterType: 'text' },
    { index: 3, filterType: 'text' },
    { index: 4, filterType: 'text' },
    { index: 5, filterType: 'text' },
    { index: 6, filterType: 'select', fetchDataFunc: listaCondicionIvaFilter },
    { index: 7, filterType: 'text' },
    { index: 8, filterType: 'select', fetchDataFunc: listaProvinciasFilter },
    { index: 9, filterType: 'text' },
    { index: 10, filterType: 'text' },
    { index: 11, filterType: 'select', fetchDataFunc: listaBancosFilter },
    { index: 12, filterType: 'text' },
    { index: 13, filterType: 'text' },
    { index: 14, filterType: 'select', fetchDataFunc: listaPuestosFilter },
    { index: 15, filterType: 'text' },
    { index: 16, filterType: 'text' },
    { index: 17, filterType: 'text' },
    { index: 18, filterType: 'text' },
    { index: 19, filterType: 'text' },
    { index: 20, filterType: 'text' },
    { index: 21, filterType: 'text' },
    { index: 22, filterType: 'select', fetchDataFunc: listaSucursalesFilter }
];

$(document).ready(() => {
    Permisos.init();
    if (document.getElementById("grd_Personal")) {
        Permisos.aplicarUI("Personal");
        listaPersonal();
    }
});

async function listaPersonal() {
    if (!document.getElementById("grd_Personal")) return;
    const response = await fetch("/Personal/Lista", {
        method: 'GET',
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
    });
    if (!response.ok) throw new Error(`Error en la solicitud: ${response.statusText}`);
    const data = await response.json();
    await configurarDataTablePersonal(data);
}

window.listaPersonal = listaPersonal;

async function verPersonal(id) {
    Permisos.init();
    if (!Permisos.tiene("Personal", "Ver")) {
        errorModal("No tenés permisos.");
        return;
    }
    try {
        const r = await fetch("/Personal/EditarInfo?id=" + id, {
            method: "GET",
            headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" }
        });
        if (!r.ok) throw new Error();
        const json = await r.json();
        if (json && typeof window.mostrarModalPersonal === "function") {
            await window.mostrarModalPersonal(json, { readOnly: true });
        } else throw new Error();
    } catch {
        errorModal("Ha ocurrido un error.");
    }
}

const editarPersonal = id => {
    Permisos.init();
    if (!Permisos.tiene("Personal", "Editar")) {
        errorModal("No tenés permisos.");
        return;
    }
    fetch("/Personal/EditarInfo?id=" + id, {
        method: 'GET',
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
    })
        .then(r => { if (!r.ok) throw new Error("Ha ocurrido un error."); return r.json(); })
        .then(json => {
            if (json && typeof window.mostrarModalPersonal === "function") {
                return window.mostrarModalPersonal(json, { readOnly: false });
            }
            throw new Error("Ha ocurrido un error.");
        })
        .catch(() => errorModal("Ha ocurrido un error."));
};

async function eliminarPersonal(id) {
    Permisos.init();
    if (!Permisos.tiene("Personal", "Eliminar")) {
        errorModal("No tenés permisos.");
        return;
    }
    const confirmado = await confirmarModal("¿Desea eliminar este registro?");
    if (!confirmado) return;

    try {
        const response = await fetch("/Personal/Eliminar?id=" + id, {
            method: "DELETE",
            headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
        });
        if (!response.ok) throw new Error("Error al eliminar el Personal.");
        const dataJson = await response.json();
        if (dataJson.valor) {
            listaPersonal();
            exitoModal("Personal eliminado correctamente");
        }
    } catch (e) { console.error(e); }
}

async function configurarDataTablePersonal(data) {
    if (!document.getElementById("grd_Personal")) return;
    if (!gridPersonal) {
        $('#grd_Personal thead tr').clone(true).addClass('filters').appendTo('#grd_Personal thead');

        gridPersonal = $('#grd_Personal').DataTable({
            data,
            language: { url: "//cdn.datatables.net/plug-ins/2.0.7/i18n/es-MX.json" },
            scrollX: true,
            scrollCollapse: true,
            columns: [
                {
                    data: "Id", title: '', width: "1%",
                    render: function (data) {
                        return renderAccionesGrid(data, {
                            ver: "verPersonal",
                            editar: "editarPersonal",
                            eliminar: "eliminarPersonal"
                        }, "Personal");
                    },
                    orderable: false, searchable: false
                },
                { data: 'Nombre' },
                { data: 'Telefono' },
                { data: 'TelefonoAlternativo' },
                { data: 'Dni' },
                { data: 'Cuit' },
                { data: 'CondicionIva' },
                { data: 'Domicilio' },
                { data: 'Provincia' },
                { data: 'Localidad' },
                { data: 'Email' },
                { data: 'Banco' },
                { data: 'BancoAlias' },
                { data: 'BancoCbu' },
                { data: 'Puesto' },
                { data: 'FechaIngreso', title: 'Fecha Ingreso', render: f => f ? formatearFechaParaVista(f) : "-" },
                { data: 'FechaRetiro', title: 'Fecha Retiro', render: f => f ? formatearFechaParaVista(f) : "-" },
                { data: 'SueldoMensual' },
                { data: 'DiasLaborales' },
                { data: 'ValorDia' },
                { data: 'HsLaborales' },
                { data: 'ValorHora' },
                { data: 'Sucursal' }
            ],
            dom: 'Bfrtip',
            buttons: dataTableButtonsExportCondicional("Personal", [
                {
                    extend: 'excelHtml5',
                    text: 'Exportar Excel',
                    filename: 'Reporte_Personal',
                    title: '',
                    exportOptions: { columns: [...Array(22).keys()].map(i => i + 1) },
                    className: 'btn-exportar-excel'
                },
                {
                    extend: 'pdfHtml5',
                    text: 'Exportar PDF',
                    filename: 'Reporte_Personal',
                    title: null,
                    orientation: 'landscape',
                    pageSize: 'A4',
                    exportOptions: { columns: [...Array(22).keys()].map(i => i + 1) },
                    className: 'buttons-pdf btn-exportar-pdf',
                    customize: function (doc) {
                        const now = moment().format('DD/MM/YYYY HH:mm');
                        doc.pageMargins = [20, 40, 20, 30];
                        doc.defaultStyle.fontSize = 9;
                        doc.header = {
                            columns: [
                                { text: 'Reporte de Personal', margin: [20, 12, 0, 0], bold: true, fontSize: 12 },
                                { text: now, alignment: 'right', margin: [0, 12, 20, 0], color: '#99a7bf' }
                            ]
                        };
                        doc.footer = function (currentPage, pageCount) {
                            return {
                                columns: [
                                    { text: 'Confidencial', margin: [20, 0, 0, 0], color: '#99a7bf' },
                                    { text: currentPage + ' / ' + pageCount, alignment: 'right', margin: [0, 0, 20, 0] }
                                ]
                            };
                        };
                        doc.styles.tableHeader = {
                            fillColor: '#1c2636',
                            color: '#ffffff',
                            bold: true,
                            fontSize: 9,
                            alignment: 'center'
                        };
                        const tableNode = doc.content.find(n => n.table);
                        if (tableNode) {
                            const colCount = tableNode.table.body[0].length;
                            tableNode.table.widths = Array(colCount).fill('*');
                            tableNode.layout = {
                                hLineWidth: () => 0.4,
                                vLineWidth: () => 0.4,
                                hLineColor: () => '#2b3647',
                                vLineColor: () => '#2b3647',
                                paddingLeft: () => 4,
                                paddingRight: () => 4,
                                paddingTop: () => 3,
                                paddingBottom: () => 3
                            };
                            tableNode.alignment = 'center';
                        }
                    }
                },
                {
                    extend: 'print',
                    text: 'Imprimir',
                    title: '',
                    exportOptions: { columns: [...Array(22).keys()].map(i => i + 1) },
                    className: 'btn-exportar-print'
                },
            ]),
            orderCellsTop: true,
            fixedHeader: true,
            initComplete: async function () {
                const api = this.api();
                api.on("draw", actualizarKpiTotalPersonal);
                actualizarKpiTotalPersonal();

                for (const config of columnConfig) {
                    const $cell = $('.filters th').eq(config.index);

                    if (config.filterType === 'select') {
                        const $select = $(`<select><option value="">Seleccionar</option></select>`)
                            .appendTo($cell.empty())
                            .on('change', async function () {
                                const val = this.value;
                                if (val === '') { await api.column(config.index).search('').draw(); return; }
                                const texto = $(this).find('option:selected').text();
                                await api.column(config.index).search('^' + escapeRegex(texto) + '$', true, false).draw();
                            });

                        const items = await config.fetchDataFunc();
                        items.forEach(it => $select.append(`<option value="${it.Id}">${it.Nombre ?? ''}</option>`));

                    } else if (config.filterType === 'text') {
                        const $input = $(`<input type="text" placeholder="Buscar..." />`)
                            .appendTo($cell.empty())
                            .on('keyup change', function (e) {
                                e.stopPropagation();
                                const val = this.value;
                                const regexr = '({search})';
                                const cursor = this.selectionStart;
                                api.column(config.index)
                                    .search(val !== '' ? regexr.replace('{search}', '(((' + escapeRegex(val) + '))))') : '', val !== '', val === '')
                                    .draw();
                                $(this).focus()[0].setSelectionRange(cursor, cursor);
                            });
                    }
                }
                $('.filters th').eq(0).html('');

                configurarOpcionesColumnas('#grd_Personal', '#configColumnasMenu', 'Personal_Columnas');

                if (typeof bindDataTableSeleccionFila === "function") {
                    bindDataTableSeleccionFila("#grd_Personal", "personal");
                }

                setTimeout(() => gridPersonal.columns.adjust(), 10);
            }
        });
    } else {
        gridPersonal.clear().rows.add(data).draw();
    }
}

function actualizarKpiTotalPersonal() {
    if (!gridPersonal) { $("#kpiTotalPersonal").text("0"); return; }
    const total = gridPersonal.rows({ search: 'applied' }).count();
    $("#kpiTotalPersonal").text(total.toLocaleString("es-AR"));
}

async function listaCondicionIvaFilter() {
    const r = await fetch('/CondicionesIva/Lista', { method: 'GET', headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" } });
    if (!r.ok) throw new Error('Error cargando Condición IVA');
    const data = await r.json();
    return data.map(x => ({ Id: x.Id, Nombre: x.Nombre ?? x.Descripcion ?? '' }));
}

async function listaProvinciasFilter() {
    const r = await fetch('/Provincias/Lista', { method: 'GET', headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" } });
    if (!r.ok) throw new Error('Error cargando Provincias');
    const data = await r.json();
    return data.map(x => ({ Id: x.Id, Nombre: x.Nombre }));
}

async function listaBancosFilter() {
    const r = await fetch('/Bancos/Lista', { method: 'GET', headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" } });
    if (!r.ok) throw new Error('Error cargando Bancos');
    const data = await r.json();
    return data.map(x => ({ Id: x.Id, Nombre: x.Nombre }));
}

async function listaPuestosFilter() {
    const r = await fetch('/PersonalPuestos/Lista', { method: 'GET', headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" } });
    if (!r.ok) throw new Error('Error cargando Puestos');
    const data = await r.json();
    return data.map(x => ({ Id: x.Id, Nombre: x.Nombre }));
}

async function listaSucursalesFilter() {
    const r = await fetch('/Sucursales/Lista', { method: 'GET', headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" } });
    if (!r.ok) throw new Error('Error cargando Sucursales');
    const data = await r.json();
    return data.map(x => ({ Id: x.Id, Nombre: x.Nombre }));
}
