// ========================= Clientes.js (completo) =========================
let gridClientes;

// --- Modelo base ---
const Modelo_base = {
    Id: 0,
    Nombre: "",
    Telefono: "",
    TelefonoAlternativo: "",
    Dni: "",
    Cuit: "",
    IdCondicionIva: null,
    Domicilio: "",
    IdProvincia: null,
    Localidad: "",
    Email: "",
    CodigoPostal: "",
    IdListaPrecio: null
};

// --- Config de filtros por columna (thead) ---
const columnConfig = [
    { index: 1, filterType: 'text' },                         // Nombre
    { index: 2, filterType: 'text' },                         // Teléfono
    { index: 3, filterType: 'text' },                         // Teléfono Alternativo
    { index: 4, filterType: 'text' },                         // DNI
    { index: 5, filterType: 'text' },                         // CUIT
    { index: 6, filterType: 'select', fetchDataFunc: listaCondicionIvaFilter }, // Cond. IVA
    { index: 7, filterType: 'text' },                         // Domicilio
    { index: 8, filterType: 'select', fetchDataFunc: listaProvinciasFilter },   // Provincia
    { index: 9, filterType: 'text' },                         // Localidad
    { index: 10, filterType: 'text' },                        // Email
    { index: 11, filterType: 'text' }                         // Código Postal
];

$(document).ready(() => {
    listaClientes();
    attachLiveValidation('#modalEdicion');  // helper global
    // Mejoramos validación en selects select2
    wireSelect2Validation();
});

/* ======================= Crear / Editar ======================= */

function guardarCambios() {
    // Validación genérica (HTML5 + helpers)
    if (!validarCampos()) {
        // fuerza feedback de selects2 si están vacíos
        forceSelect2Invalid('#modalEdicion');
        return;
    }

    const idCliente = $("#txtId").val();
    const nuevoModelo = {
        Id: idCliente !== "" ? parseInt(idCliente) : 0,
        Nombre: $("#txtNombre").val(),
        Telefono: $("#txtTelefono").val(),
        TelefonoAlternativo: $("#txtTelefonoAlternativo").val(),
        Dni: $("#txtDni").val(),
        Cuit: $("#txtCuit").val(),
        IdCondicionIva: $("#cmbCondicionIva").val(),
        IdListaPrecio: $("#cmbListaPrecios").val(),
        Domicilio: $("#txtDomicilio").val(),
        IdProvincia: $("#cmbProvincia").val(),
        Localidad: $("#txtLocalidad").val(),
        Email: $("#txtEmail").val(),
        CodigoPostal: $("#txtCodigoPostal").val()
    };

    const url = idCliente === "" ? "/Clientes/Insertar" : "/Clientes/Actualizar";
    const method = idCliente === "" ? "POST" : "PUT";

    fetch(url, {
        method,
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json;charset=utf-8' },
        body: JSON.stringify(nuevoModelo)
    })
        .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json(); })
        .then(() => {
            $('#modalEdicion').modal('hide');
            exitoModal(idCliente === "" ? "Cliente registrado correctamente" : "Cliente modificado correctamente");
            listaClientes();
        })
        .catch(err => console.error('Error:', err));
}

function nuevoCliente() {
    limpiarModal('#modalEdicion', '#errorCampos');

    Promise.all([listaCondicionesIva(), listaListaPrecios(), listaProvincias()])
        .then(() => {
            $('#modalEdicion').one('shown.bs.modal', function () {
                initSelect2('#modalEdicion');      // genérico
                ensureFeedbackBlocks('#modalEdicion'); // asegura feedback en selects/inputs
                wireSelect2Validation('#modalEdicion');
            });
            $('#modalEdicion').modal('show');
            $("#btnGuardar").text("Registrar");
            $("#modalEdicionLabel").text("Nuevo Cliente");
        });
}

async function mostrarModal(modelo) {
    limpiarModal('#modalEdicion', '#errorCampos');

    await Promise.all([listaCondicionesIva(), listaListaPrecios(), listaProvincias()]);

    $("#cmbCondicionIva").val(modelo.IdCondicionIva ?? '').trigger('change');
    $("#cmbListaPrecios").val(modelo.IdListaPrecio ?? '').trigger('change');
    $("#cmbProvincia").val(modelo.IdProvincia ?? '').trigger('change');

    $("#txtId").val(modelo.Id ?? 0);
    $("#txtNombre").val(modelo.Nombre ?? '');
    $("#txtTelefono").val(modelo.Telefono ?? '');
    $("#txtTelefonoAlternativo").val(modelo.TelefonoAlternativo ?? '');
    $("#txtDni").val(modelo.Dni ?? '');
    $("#txtCuit").val(modelo.Cuit ?? '');
    $("#txtDomicilio").val(modelo.Domicilio ?? '');
    $("#txtLocalidad").val(modelo.Localidad ?? '');
    $("#txtEmail").val(modelo.Email ?? '');
    $("#txtCodigoPostal").val(modelo.CodigoPostal ?? '');

    $('#modalEdicion').one('shown.bs.modal', function () {
        initSelect2('#modalEdicion');
        ensureFeedbackBlocks('#modalEdicion');
        wireSelect2Validation('#modalEdicion');
    });
    $('#modalEdicion').modal('show');
    $("#btnGuardar").text("Guardar");
    $("#modalEdicionLabel").text("Editar Cliente");
}

/* ======================= Lista / Acciones ======================= */

async function listaClientes() {
    const url = "/Clientes/Lista";
    const response = await fetch(url, {
        method: 'GET',
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
    });
    if (!response.ok) throw new Error(`Error en la solicitud: ${response.statusText}`);
    const data = await response.json();
    await configurarDataTableClientes(data);
    actualizarKpiTotalClientes(); // inicial
}

const editarCliente = id => {
    $('.acciones-dropdown').hide();
    fetch("/Clientes/EditarInfo?id=" + id, {
        method: 'GET',
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
    })
        .then(r => { if (!r.ok) throw new Error("Ha ocurrido un error."); return r.json(); })
        .then(json => json ? mostrarModal(json) : (() => { throw new Error("Ha ocurrido un error."); })())
        .catch(() => errorModal("Ha ocurrido un error."));
};

async function eliminarCliente(id) {
    $('.acciones-dropdown').hide();
    const confirmado = await confirmarModal("¿Desea eliminar este cliente?");
    if (!confirmado) return;

    try {
        const response = await fetch("/Clientes/Eliminar?id=" + id, {
            method: "DELETE",
            headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
        });
        if (!response.ok) throw new Error("Error al eliminar el Cliente.");

        const dataJson = await response.json();
        if (dataJson.valor) {
            listaClientes();
            exitoModal("Cliente eliminado correctamente");
        }
    } catch (error) {
        console.error("Ha ocurrido un error:", error);
    }
}

/* ======================= DataTable (con filtros en thead) ======================= */

async function configurarDataTableClientes(data) {
    if (!gridClientes) {
        // Clonar fila de filtros
        $('#grd_Clientes thead tr').clone(true).addClass('filters').appendTo('#grd_Clientes thead');

        gridClientes = $('#grd_Clientes').DataTable({
            data,
            language: { url: "//cdn.datatables.net/plug-ins/2.0.7/i18n/es-MX.json" },
            scrollX: true,
            scrollCollapse: true,
            columns: [
                {   // 0: Acciones
                    data: "Id",
                    title: '',
                    width: "1%",
                    render: function (data) {
                        return `
                <div class="acciones-menu" data-id="${data}">
                    <button class='btn btn-sm btnacciones' type='button' onclick='toggleAcciones(${data})' title='Acciones'>
                        <i class='fa fa-ellipsis-v fa-lg text-white' aria-hidden='true'></i>
                    </button>
                    <div class="acciones-dropdown" style="display: none;">
                        <button class='btn btn-sm btneditar' type='button' onclick='editarCliente(${data})' title='Editar'>
                            <i class='fa fa-pencil-square-o fa-lg text-success' aria-hidden='true'></i> Editar
                        </button>
                        <button class='btn btn-sm btneliminar' type='button' onclick='eliminarCliente(${data})' title='Eliminar'>
                            <i class='fa fa-trash-o fa-lg text-danger' aria-hidden='true'></i> Eliminar
                        </button>
                    </div>
                </div>`;
                    },
                    orderable: false,
                    searchable: false,
                },
                { data: 'Nombre', title: 'Nombre' },
                { data: 'Telefono', title: 'Teléfono' },
                { data: 'TelefonoAlternativo', title: 'Teléfono Alternativo' },
                { data: 'Dni', title: 'DNI' },
                { data: 'Cuit', title: 'CUIT' },
                { data: 'CondicionIva', title: 'Condición IVA' }, // string del back
                { data: 'Domicilio', title: 'Domicilio' },
                { data: 'Provincia', title: 'Provincia' },     // string del back
                { data: 'Localidad', title: 'Localidad' },
                { data: 'Email', title: 'Email' },
                { data: 'CodigoPostal', title: 'Código Postal' }
            ],
            dom: 'Bfrtip',
            buttons: [
                {
                    extend: 'excelHtml5',
                    text: 'Exportar Excel',
                    filename: 'Clientes',
                    title: '',
                    exportOptions: { columns: Array.from({ length: 11 }, (_, i) => i + 1) },
                    className: 'btn-exportar-excel',
                },
                {
                    text: 'Exportar PDF',
                    action: function () { exportarClientesPdf(); },
                    className: 'btn-exportar-pdf'
                },
                {
                    extend: 'print',
                    text: 'Imprimir',
                    title: '',
                    exportOptions: { columns: Array.from({ length: 11 }, (_, i) => i + 1) },
                    className: 'btn-exportar-print'
                },
                'pageLength'
            ],
            orderCellsTop: true,
            fixedHeader: true,
            initComplete: async function () {
                const api = this.api();

                // Filtros por columna
                for (const config of columnConfig) {
                    const $cell = $('.filters th').eq(config.index);

                    if (config.filterType === "select") {
                        const $select = $(`<select class="form-select form-select-sm"><option value="">Seleccionar</option></select>`)
                            .appendTo($cell.empty())
                            .on("change", async function () {
                                const txt = $(this).find("option:selected").text();
                                const val = this.value;
                                if (val === "") {
                                    api.column(config.index).search("").draw();
                                } else {
                                    api.column(config.index).search("^" + escapeRegex(txt) + "$", true, false).draw();
                                }
                            });

                        const items = await config.fetchDataFunc();
                        items.forEach(item => $select.append(`<option value="${item.Id}">${item.Nombre ?? ''}</option>`));
                    } else {
                        $('<input type="text" class="form-control form-control-sm" placeholder="Buscar..." />')
                            .appendTo($cell.empty())
                            .on('keyup change', function (e) {
                                e.stopPropagation();
                                const val = this.value;
                                api.column(config.index).search(val ? '(((' + escapeRegex(val) + ')))' : '', !!val, !val).draw();
                            });
                    }
                }

                // La celda de acciones (0) no lleva filtro
                $('.filters th').eq(0).html('');

                // Dropdown de columnas (genérico)
                configurarOpcionesColumnas('#grd_Clientes', '#configColumnasMenu', 'Clientes_Columnas');

                // KPI al paginar/filtrar
                api.on("draw", actualizarKpiTotalClientes);

                setTimeout(() => gridClientes.columns.adjust(), 10);
            }
        });
    } else {
        gridClientes.clear().rows.add(data).draw();
    }
}

/* ======================= KPI ======================= */
function actualizarKpiTotalClientes() {
    if (!gridClientes) { $("#kpiTotalClientes").text("0"); return; }
    const total = gridClientes.rows({ search: 'applied' }).count();
    $("#kpiTotalClientes").text(total.toLocaleString("es-AR"));
}

/* ======================= Export PDF “lindo” ======================= */
function exportarClientesPdf() {
    if (!gridClientes) return;
    const rows = gridClientes.rows({ search: 'applied' }).data().toArray();
    if (!rows.length) { errorModal("No hay datos para exportar."); return; }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('landscape');
    const now = moment().format('DD/MM/YYYY HH:mm');

    // Header oscuro tipo Inventario
    doc.setFillColor(29, 38, 51); // #1d2633
    doc.rect(0, 0, doc.internal.pageSize.width, 20, 'F');
    doc.setTextColor(230);
    doc.setFontSize(14);
    doc.text("Clientes", 12, 13);
    doc.setFontSize(10);
    doc.setTextColor(180);
    const totalStr = `Total: ${rows.length}`;
    doc.text(totalStr, doc.internal.pageSize.width - 20 - doc.getTextWidth(totalStr), 13);

    // Tabla
    const head = [["Nombre", "Teléfono", "Teléfono Alt.", "DNI", "CUIT", "IVA", "Domicilio", "Provincia", "Localidad", "Email", "CP"]];
    const body = rows.map(r => [
        r.Nombre || "", r.Telefono || "", r.TelefonoAlternativo || "",
        r.Dni || "", r.Cuit || "", r.CondicionIva || "",
        r.Domicilio || "", r.Provincia || "", r.Localidad || "",
        r.Email || "", r.CodigoPostal || ""
    ]);

    doc.autoTable({
        startY: 24,
        head,
        body,
        styles: { fontSize: 8, cellPadding: 2, textColor: 230, lineColor: [36, 50, 68], lineWidth: 0.1, fillColor: [15, 23, 34] },
        headStyles: { fillColor: [29, 38, 51], textColor: 230, halign: 'center' },
        alternateRowStyles: { fillColor: [20, 27, 40] },
        theme: 'grid',
        didDrawPage: function (data) {
            // Footer
            const footerLeft = `Generado: ${now}`;
            const page = doc.internal.getNumberOfPages();
            const str = `Página ${data.pageNumber} de ${page}`;
            const pageWidth = doc.internal.pageSize.width;

            doc.setFontSize(8);
            doc.setTextColor(200);
            doc.text(footerLeft, data.settings.margin.left, doc.internal.pageSize.height - 6);
            doc.text(str, pageWidth - data.settings.margin.right - doc.getTextWidth(str), doc.internal.pageSize.height - 6);
        }
    });

    doc.save("Clientes.pdf");
}

/* ======================= Combos (modal) ======================= */
async function listaCondicionesIva() {
    const res = await fetch("/CondicionesIva/Lista", {
        headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" }
    });
    const data = await res.json();
    llenarSelect("cmbCondicionIva", data);
}

async function listaProvincias() {
    const res = await fetch("/Provincias/Lista", {
        headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" }
    });
    const data = await res.json();
    llenarSelect("cmbProvincia", data);
}

async function listaListaPrecios() {
    const res = await fetch("/ListasPrecios/Lista", {
        headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" }
    });
    const data = await res.json();
    llenarSelect("cmbListaPrecios", data);
}

/* ======================= Datos para filtros (thead) ======================= */
async function listaCondicionIvaFilter() {
    const response = await fetch("/CondicionesIva/Lista", {
        method: "GET",
        headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" }
    });
    if (!response.ok) throw new Error("Error cargando Condición IVA");
    const data = await response.json();
    return data.map(item => ({ Id: item.Id, Nombre: item.Nombre ?? item.Descripcion ?? "" }));
}

async function listaProvinciasFilter() {
    const response = await fetch("/Provincias/Lista", {
        method: "GET",
        headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" }
    });
    if (!response.ok) throw new Error("Error cargando Provincias");
    const data = await response.json();
    return data.map(item => ({ Id: item.Id, Nombre: item.Nombre }));
}

/* ======================= Validación Select2 (genérico) ======================= */
/**
 * Inserta bloques .invalid-feedback si faltan (inputs y selects).
 */
function ensureFeedbackBlocks(scope) {
    const root = scope ? document.querySelector(scope) : document;
    if (!root) return;

    root.querySelectorAll('input[required], select[required], textarea[required]').forEach(el => {
        // si ya existe un feedback inmediato, no duplicar
        let fb = el.nextElementSibling;
        const isSelect2 = el.classList.contains('select2-hidden-accessible');

        if (!(fb && fb.classList.contains('invalid-feedback'))) {
            // para select2, el feedback debe ir DESPUÉS del container renderizado
            if (isSelect2) {
                const $container = $(el).next('.select2');
                if ($container.length && !$container.next('.invalid-feedback').length) {
                    $('<div class="invalid-feedback">Campo obligatorio</div>').insertAfter($container);
                }
            } else {
                const div = document.createElement('div');
                div.className = 'invalid-feedback';
                div.textContent = 'Campo obligatorio';
                el.parentNode.insertBefore(div, el.nextSibling);
            }
        }
    });
}

/**
 * Marca inválidos los select2 vacíos dentro del scope cuando el form falla.
 */
function forceSelect2Invalid(scope) {
    const root = scope ? document.querySelector(scope) : document;
    if (!root) return;

    root.querySelectorAll('select.select2-hidden-accessible[required]').forEach(sel => {
        const $sel = $(sel);
        const $c = $sel.next('.select2');
        const hasValue = !!$sel.val();

        $sel.toggleClass('is-invalid', !hasValue).toggleClass('is-valid', hasValue);
        $c.toggleClass('is-invalid', !hasValue).toggleClass('is-valid', hasValue);
        // asegurar feedback
        ensureFeedbackBlocks(scope);
    });
}

/**
 * Enlaza validación live a Select2 (al cambiar/abrir/cerrar).
 */
function wireSelect2Validation(scope) {
    const $scope = $(scope || document);
    // al cambiar valor -> validar
    $scope.off('change.select2val', 'select.select2-hidden-accessible')
        .on('change.select2val', 'select.select2-hidden-accessible', function () {
            const $sel = $(this);
            const $c = $sel.next('.select2');
            const ok = this.checkValidity();

            $sel.toggleClass('is-invalid', !ok).toggleClass('is-valid', ok);
            $c.toggleClass('is-invalid', !ok).toggleClass('is-valid', ok);

            // feedback
            ensureFeedbackBlocks(scope);
            const $fb = $c.next('.invalid-feedback');
            if ($fb.length) $fb.text(ok ? 'Campo obligatorio' : 'Campo obligatorio');
        });
}

/* ======================= Utils acciones dropdown ======================= */
$(document).on('click', function (e) {
    if (!$(e.target).closest('.acciones-menu').length) {
        $('.acciones-dropdown').hide();
        $('.acciones-dropdown-clone').remove();
    }
});

/* ======================= Helpers de filtro por columna ======================= */
function escapeRegex(text) {
    return (text + '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
