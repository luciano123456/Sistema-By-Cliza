// ===================== Personal.js (alineado a Ventas) =====================
let gridPersonal;
let wasSubmitPersonal = false; // no mostrar rojo hasta que se intenta guardar

// Índices de columnas (coinciden con el thead)
const columnConfig = [
    { index: 1, filterType: 'text' },                               // Nombre
    { index: 2, filterType: 'text' },                               // Teléfono
    { index: 3, filterType: 'text' },                               // Teléfono Alternativo
    { index: 4, filterType: 'text' },                               // DNI
    { index: 5, filterType: 'text' },                               // CUIT
    { index: 6, filterType: 'select', fetchDataFunc: listaCondicionIvaFilter }, // Cond. IVA
    { index: 7, filterType: 'text' },                               // Domicilio
    { index: 8, filterType: 'select', fetchDataFunc: listaProvinciasFilter },   // Provincia
    { index: 9, filterType: 'text' },                               // Localidad
    { index: 10, filterType: 'text' },                              // Email
    { index: 11, filterType: 'select', fetchDataFunc: listaBancosFilter },      // Banco
    { index: 12, filterType: 'text' },                              // Alias
    { index: 13, filterType: 'text' },                              // CBU
    { index: 14, filterType: 'select', fetchDataFunc: listaPuestosFilter },     // Puesto
    { index: 15, filterType: 'text' },                              // Fecha Ingreso
    { index: 16, filterType: 'text' },                              // Fecha Retiro
    { index: 17, filterType: 'text' },                              // Sueldo Mensual
    { index: 18, filterType: 'text' },                              // Días Laborales
    { index: 19, filterType: 'text' },                              // Valor Día
    { index: 20, filterType: 'text' },                              // Hs Laborales
    { index: 21, filterType: 'text' },                              // Valor Hora
    { index: 22, filterType: 'select', fetchDataFunc: listaSucursalesFilter }   // Sucursal
];

$(document).ready(() => {
    listaPersonal();
    // (Los inputs .Inputmiles se formatean con site.js)
});

/* ======================= Helpers numéricos ======================= */
function valorNulo(v) { if (v === undefined || v === null || v === '') return null; const n = Number(v); return isNaN(n) ? null : n; }
function numeroNulo(v) { if (v === undefined || v === null || v === '') return null; const n = Number(v); return isNaN(n) ? null : n; }

/* ======================= Validación estilo Ventas ======================= */
// Oculta todo rastro de validación inicial
function clearAllValidationPersonal() {
    const root = document.querySelector('#modalEdicion');
    if (!root) return;
    root.querySelectorAll('input,select,textarea').forEach(el => clearValidation(el));
    const banner = document.querySelector('#errorCampos');
    if (banner) banner.classList.add('d-none');
    wasSubmitPersonal = false;
}
// Revalida todos los [required] dentro del modal, usando setInvalid/setValid
function validarPersonalCampos() {
    const root = document.querySelector('#modalEdicion');
    if (!root) return true;

    let ok = true;
    root.querySelectorAll('input[required], select[required], textarea[required]').forEach(el => {
        const valid = el.checkValidity() && !!(el.value && el.value.toString().trim() !== '');
        if (valid) ok = setValid(el) && ok; else ok = setInvalid(el) && ok;
    });

    const banner = document.querySelector('#errorCampos');
    if (banner) banner.classList.toggle('d-none', ok);
    return ok;
}
// Revalida en vivo solo si ya se intentó guardar
function attachPersonalLiveValidation() {
    const root = document.querySelector('#modalEdicion');
    if (!root) return;

    const onChange = (ev) => {
        if (!wasSubmitPersonal) { clearValidation(ev.target); return; }
        validarPersonalCampos();
    };

    root.querySelectorAll('input,select,textarea').forEach(el => {
        el.setAttribute('autocomplete', 'off');
        el.addEventListener('input', onChange);
        el.addEventListener('change', onChange);
        el.addEventListener('blur', onChange);
    });

    // Select2 (si existe)
    if (window.jQuery && $.fn.select2) {
        $(root).find('select.select2-hidden-accessible')
            .off('select2:select.select2live select2:clear.select2live')
            .on('select2:select.select2live select2:clear.select2live', function () {
                if (!wasSubmitPersonal) { clearValidation(this); return; }
                validarPersonalCampos();
            });
    }
}

/* ======================= Crear / Editar ======================= */
function guardarCambiosPersonal() {
    wasSubmitPersonal = true;
    if (!validarPersonalCampos()) return;

    const id = $("#txtId").val();
    const modelo = {
        Id: id !== "" ? parseInt(id) : 0,
        Nombre: $("#txtNombre").val(),
        Telefono: $("#txtTelefono").val(),
        TelefonoAlternativo: $("#txtTelefonoAlternativo").val(),
        Dni: $("#txtDni").val(),
        Cuit: $("#txtCuit").val(),
        IdCondicionIva: valorNulo($("#cmbCondicionIva").val()),
        Domicilio: $("#txtDomicilio").val(),
        IdProvincia: valorNulo($("#cmbProvincia").val()),
        Localidad: $("#txtLocalidad").val(),
        Email: $("#txtEmail").val(),
        IdBanco: valorNulo($("#cmbBanco").val()),
        BancoAlias: $("#txtBancoAlias").val(),
        BancoCbu: $("#txtBancoCbu").val(),
        IdPuesto: valorNulo($("#cmbPuesto").val()),
        FechaIngreso: $("#dtpFechaIngreso").val() || null,
        FechaRetiro: $("#dtpFechaRetiro").val() || null,
        SueldoMensual: formatearSinMiles($("#numSueldoMensual").val()),
        DiasLaborales: numeroNulo($("#numDiasLaborales").val()),
        ValorDia: formatearSinMiles($("#numValorDia").val()),
        HsLaborales: numeroNulo($("#numHsLaborales").val()),
        ValorHora: formatearSinMiles($("#numValorHora").val()),
        IdSucursal: valorNulo($("#cmbSucursal").val())
    };

    const url = id === "" ? "/Personal/Insertar" : "/Personal/Actualizar";
    const method = id === "" ? "POST" : "PUT";

    fetch(url, {
        method,
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json;charset=utf-8' },
        body: JSON.stringify(modelo)
    })
        .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json(); })
        .then(() => {
            $('#modalEdicion').modal('hide');
            exitoModal(id === "" ? "Personal registrado correctamente" : "Personal modificado correctamente");
            listaPersonal();
        })
        .catch(err => console.error('Error:', err));
}

function nuevoPersonal() {
    limpiarModal('#modalEdicion', '#errorCampos');
    $("#dtpFechaIngreso").val(moment().format('YYYY-MM-DD'));

    Promise.all([listaCondicionesIva(), listaProvincias(), listaBancos(), listaPuestos(), listaSucursales()])
        .then(() => {
            // Select2
            $('#cmbCondicionIva,#cmbProvincia,#cmbBanco,#cmbPuesto,#cmbSucursal').addClass('select2');
            initSelect2('#modalEdicion');
            ensureFeedbackBlocks('#modalEdicion');      // por si quieres feedback fijo

            // Validación live + estado inicial limpio
            attachPersonalLiveValidation();
            clearAllValidationPersonal();

            $('#modalEdicion').modal('show');
            $("#btnGuardarPersonal").text("Registrar");
            $("#modalEdicionLabel").text("Nuevo Personal");
        });
}

async function mostrarModalPersonal(modelo) {
    limpiarModal('#modalEdicion', '#errorCampos');

    await Promise.all([listaCondicionesIva(), listaProvincias(), listaBancos(), listaPuestos(), listaSucursales()]);

    // select2 en modal
    $('#cmbCondicionIva,#cmbProvincia,#cmbBanco,#cmbPuesto,#cmbSucursal').addClass('select2');
    initSelect2('#modalEdicion');
    ensureFeedbackBlocks('#modalEdicion');

    $("#cmbCondicionIva").val(modelo.IdCondicionIva ?? '').trigger('change');
    $("#cmbProvincia").val(modelo.IdProvincia ?? '').trigger('change');
    $("#cmbBanco").val(modelo.IdBanco ?? '').trigger('change');
    $("#cmbPuesto").val(modelo.IdPuesto ?? '').trigger('change');
    $("#cmbSucursal").val(modelo.IdSucursal ?? '').trigger('change');

    setValorInput("#txtId", modelo.Id ?? 0);
    setValorInput("#txtNombre", modelo.Nombre);
    setValorInput("#txtTelefono", modelo.Telefono);
    setValorInput("#txtTelefonoAlternativo", modelo.TelefonoAlternativo);
    setValorInput("#txtDni", modelo.Dni);
    setValorInput("#txtCuit", modelo.Cuit);
    setValorInput("#txtDomicilio", modelo.Domicilio);
    setValorInput("#txtLocalidad", modelo.Localidad);
    setValorInput("#txtEmail", modelo.Email);
    setValorInput("#txtBancoAlias", modelo.BancoAlias);
    setValorInput("#txtBancoCbu", modelo.BancoCbu);

    $("#dtpFechaIngreso").val(modelo.FechaIngreso ? String(modelo.FechaIngreso).substring(0, 10) : '');
    $("#dtpFechaRetiro").val(modelo.FechaRetiro ? String(modelo.FechaRetiro).substring(0, 10) : '');

    setValorInput("#numSueldoMensual", modelo.SueldoMensual);
    setValorInput("#numDiasLaborales", modelo.DiasLaborales);
    setValorInput("#numValorDia", modelo.ValorDia);
    setValorInput("#numHsLaborales", modelo.HsLaborales);
    setValorInput("#numValorHora", modelo.ValorHora);

    // Validación live + estado inicial limpio
    attachPersonalLiveValidation();
    clearAllValidationPersonal();

    $('#modalEdicion').modal('show');
    $("#btnGuardarPersonal").text("Guardar");
    $("#modalEdicionLabel").text("Editar Personal");
}

/* ======================= Lista / Acciones ======================= */
async function listaPersonal() {
    const response = await fetch("/Personal/Lista", {
        method: 'GET',
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
    });
    if (!response.ok) throw new Error(`Error en la solicitud: ${response.statusText}`);
    const data = await response.json();
    await configurarDataTablePersonal(data);
}

const editarPersonal = id => {
    $('.acciones-dropdown').hide();
    fetch("/Personal/EditarInfo?id=" + id, {
        method: 'GET',
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
    })
        .then(r => { if (!r.ok) throw new Error("Ha ocurrido un error."); return r.json(); })
        .then(json => json ? mostrarModalPersonal(json) : (() => { throw new Error("Ha ocurrido un error."); })())
        .catch(() => errorModal("Ha ocurrido un error."));
};

async function eliminarPersonal(id) {
    $('.acciones-dropdown').hide();
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

/* ======================= DataTable (filtros + export PDF) ======================= */
async function configurarDataTablePersonal(data) {
    if (!gridPersonal) {
        // fila de filtros (thead)
        $('#grd_Personal thead tr').clone(true).addClass('filters').appendTo('#grd_Personal thead');

        gridPersonal = $('#grd_Personal').DataTable({
            data,
            language: { url: "//cdn.datatables.net/plug-ins/2.0.7/i18n/es-MX.json" },
            scrollX: true,
            scrollCollapse: true,
            columns: [
                { // 0 Acciones
                    data: "Id", title: '', width: "1%",
                    render: function (data) {
                        return `
              <div class="acciones-menu" data-id="${data}">
                <button class='btn btn-sm btnacciones' type='button' onclick='toggleAcciones(${data})' title='Acciones'>
                  <i class='fa fa-ellipsis-v fa-lg text-white' aria-hidden='true'></i>
                </button>
                <div class="acciones-dropdown" style="display:none;">
                  <button class='btn btn-sm btneditar' type='button' onclick='editarPersonal(${data})' title='Editar'>
                    <i class='fa fa-pencil-square-o fa-lg text-success'></i> Editar
                  </button>
                  <button class='btn btn-sm btneliminar' type='button' onclick='eliminarPersonal(${data})' title='Eliminar'>
                    <i class='fa fa-trash-o fa-lg text-danger'></i> Eliminar
                  </button>
                </div>
              </div>`;
                    },
                    orderable: false, searchable: false
                },
                { data: 'Nombre' },                 // 1
                { data: 'Telefono' },               // 2
                { data: 'TelefonoAlternativo' },    // 3
                { data: 'Dni' },                    // 4
                { data: 'Cuit' },                   // 5
                { data: 'CondicionIva' },           // 6 (texto)
                { data: 'Domicilio' },              // 7
                { data: 'Provincia' },              // 8 (texto)
                { data: 'Localidad' },              // 9
                { data: 'Email' },                  // 10
                { data: 'Banco' },                  // 11
                { data: 'BancoAlias' },             // 12
                { data: 'BancoCbu' },               // 13
                { data: 'Puesto' },                 // 14
                { data: 'FechaIngreso', title: 'Fecha Ingreso', render: f => f ? formatearFechaParaVista(f) : "-" },
                { data: 'FechaRetiro', title: 'Fecha Retiro', render: f => f ? formatearFechaParaVista(f) : "-" },
                { data: 'SueldoMensual' },          // 17
                { data: 'DiasLaborales' },          // 18
                { data: 'ValorDia' },               // 19
                { data: 'HsLaborales' },            // 20
                { data: 'ValorHora' },              // 21
                { data: 'Sucursal' }                // 22
            ],
            dom: 'Bfrtip',
            buttons: [
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
                'pageLength'
            ],
            orderCellsTop: true,
            fixedHeader: true,
            initComplete: async function () {
                const api = this.api();

                api.on("draw", actualizarKpiTotalPersonal);
                actualizarKpiTotalPersonal();

                // Construir filtros de la fila clonada
                for (const config of columnConfig) {
                    const $cell = $('.filters th').eq(config.index);

                    if (config.filterType === 'select') {
                        const $select = $(`<select><option value="">Seleccionar</option></select>`)
                            .appendTo($cell.empty())
                            .on('change', async function () {
                                const val = this.value; // '' -> limpiar
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
                // La celda de acciones (0) sin filtro
                $('.filters th').eq(0).html('');

                configurarOpcionesColumnas('#grd_Personal', '#configColumnasMenu', 'Personal_Columnas');

                setTimeout(() => gridPersonal.columns.adjust(), 10);
            }
        });
    } else {
        gridPersonal.clear().rows.add(data).draw();
    }
}

/* ======================= KPI ======================= */
function actualizarKpiTotalPersonal() {
    if (!gridPersonal) { $("#kpiTotalPersonal").text("0"); return; }
    const total = gridPersonal.rows({ search: 'applied' }).count();
    $("#kpiTotalPersonal").text(total.toLocaleString("es-AR"));
}

/* ======================= Cargas para selects del modal (CON token) ======================= */
async function listaCondicionesIva() {
    const res = await fetch("/CondicionesIva/Lista", { headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" } });
    const data = await res.json();
    llenarSelect("cmbCondicionIva", data);
}
async function listaProvincias() {
    const res = await fetch("/Provincias/Lista", { headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" } });
    const data = await res.json();
    llenarSelect("cmbProvincia", data);
}
async function listaBancos() {
    const res = await fetch("/Bancos/Lista", { headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" } });
    const data = await res.json();
    llenarSelect("cmbBanco", data);
}
async function listaPuestos() {
    const res = await fetch("/PersonalPuestos/Lista", { headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" } });
    const data = await res.json();
    llenarSelect("cmbPuesto", data);
}
async function listaSucursales() {
    const res = await fetch("/Sucursales/Lista", { headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" } });
    const data = await res.json();
    llenarSelect("cmbSucursal", data);
}

/* ======================= Filtros (thead) ======================= */
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

/* ======================= Cálculos (sueldo / valores) ======================= */
const sm = document.getElementById("numSueldoMensual");
const dl = document.getElementById("numDiasLaborales");
const vd = document.getElementById("numValorDia");
const hl = document.getElementById("numHsLaborales");
const vh = document.getElementById("numValorHora");

function calcularDesdeSueldo() {
    let sueldo = formatearSinMiles(sm.value);
    let dias = formatearSinMiles(dl.value);
    let horas = formatearSinMiles(hl.value);
    if (sueldo > 0 && dias > 0) {
        let vDia = sueldo / dias;
        vd.value = formatearMiles(Math.round(vDia));
        if (horas > 0) vh.value = formatearMiles(Math.round(vDia / horas));
    }
}
function calcularDesdeDias() {
    let sueldo = formatearSinMiles(sm.value);
    let dias = formatearSinMiles(dl.value);
    let horas = formatearSinMiles(hl.value);
    if (sueldo > 0 && dias > 0) {
        let vDia = sueldo / dias;
        vd.value = formatearMiles(Math.round(vDia));
        if (horas > 0) vh.value = formatearMiles(Math.round(vDia / horas));
    }
}
function calcularDesdeValorDia() {
    let vDia = formatearSinMiles(vd.value);
    let dias = formatearSinMiles(dl.value);
    let horas = formatearSinMiles(hl.value);
    if (vDia > 0 && dias > 0) {
        sm.value = formatearMiles(Math.round(vDia * dias));
        if (horas > 0) vh.value = formatearMiles(Math.round(vDia / horas));
    }
}
function calcularDesdeHoras() {
    let vDia = formatearSinMiles(vd.value);
    let horas = formatearSinMiles(hl.value);
    if (vDia > 0 && horas > 0) {
        vh.value = formatearMiles(Math.round(vDia / horas));
    }
}
function calcularDesdeValorHora() {
    let vHora = formatearSinMiles(vh.value);
    let horas = formatearSinMiles(hl.value);
    let dias = formatearSinMiles(dl.value);
    if (vHora > 0 && horas > 0) {
        let vDia = vHora * horas;
        vd.value = formatearMiles(Math.round(vDia));
        if (dias > 0) sm.value = formatearMiles(Math.round(vDia * dias));
    }
}
if (sm) sm.addEventListener("input", calcularDesdeSueldo);
if (dl) dl.addEventListener("input", calcularDesdeDias);
if (vd) vd.addEventListener("input", calcularDesdeValorDia);
if (hl) hl.addEventListener("input", calcularDesdeHoras);
if (vh) vh.addEventListener("input", calcularDesdeValorHora);

// Cierre dropdown de acciones al click afuera
$(document).on('click', function (e) {
    if (!$(e.target).closest('.acciones-menu').length) $('.acciones-dropdown').hide();
});


