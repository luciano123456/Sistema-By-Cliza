/* =========================
   Transportes.js
   ========================= */

let gridTransportes;

const columnConfig = [
    { index: 1, filterType: 'text' },
    { index: 2, filterType: 'text' },
    { index: 3, filterType: 'text' },
    { index: 4, filterType: 'text' }
];

$(document).ready(async () => {
    Permisos.init();
    Permisos.aplicarUI("Transportes");
    await listaTransportes();

    if (typeof attachLiveValidation === 'function') {
        attachLiveValidation('#modalEdicion');
    }
});

function validarCampos() {
    const nombre = ($("#txtNombre").val() || '').trim();
    const ok = nombre !== '';
    $("#txtNombre").toggleClass("is-invalid", !ok);
    $("#errorCampos").toggleClass('d-none', ok);
    return ok;
}

async function guardarCambios() {
    if (!validarCampos()) return;

    const id = $("#txtId").val();
    const modelo = {
        Id: id !== "" ? parseInt(id) : 0,
        Nombre: $("#txtNombre").val().trim(),
        Direccion: ($("#txtDireccion").val() || "").trim(),
        Telefono: ($("#txtTelefono").val() || "").trim(),
        Email: ($("#txtEmail").val() || "").trim(),
        Notas: ($("#txtNotas").val() || "").trim(),
        Activo: $("#chkActivo").is(":checked")
    };

    const url = id === "" ? "/Transportes/Insertar" : "/Transportes/Actualizar";
    const method = id === "" ? "POST" : "PUT";

    fetch(url, {
        method,
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json;charset=utf-8'
        },
        body: JSON.stringify(modelo)
    })
        .then(r => {
            if (!r.ok) throw new Error(r.statusText);
            return r.json();
        })
        .then(() => {
            $('#modalEdicion').modal('hide');
            exitoModal(id === "" ? "Transporte registrado" : "Transporte modificado");
            listaTransportes();
        })
        .catch(err => {
            console.error('Error:', err);
            errorModal("No se pudo guardar el transporte.");
        });
}

function nuevoTransporte() {
    limpiarModal('#modalEdicion', '#errorCampos');
    $("#chkActivo").prop("checked", true);
    $("#btnGuardar").removeClass("d-none").text("Registrar");
    $("#modalEdicion input, #modalEdicion select, #modalEdicion textarea").prop("disabled", false);
    $("#modalEdicionLabel").text("Nuevo Transporte");
    $('#modalEdicion').modal('show');
}

async function mostrarModal(modelo, opts = {}) {
    const readOnly = !!opts.readOnly;
    limpiarModal('#modalEdicion', '#errorCampos');
    $("#txtId").val(modelo.Id ?? 0);
    $("#txtNombre").val(modelo.Nombre ?? '');
    $("#txtDireccion").val(modelo.Direccion ?? '');
    $("#txtTelefono").val(modelo.Telefono ?? '');
    $("#txtEmail").val(modelo.Email ?? '');
    $("#txtNotas").val(modelo.Notas ?? '');
    $("#chkActivo").prop("checked", modelo.Activo !== false);
    if (readOnly) {
        $("#modalEdicionLabel").text("Ver Transporte");
        $("#btnGuardar").addClass("d-none");
        $("#modalEdicion input, #modalEdicion select, #modalEdicion textarea").prop("disabled", true);
    } else {
        $("#btnGuardar").removeClass("d-none").text("Guardar");
        $("#modalEdicionLabel").text("Editar Transporte");
        $("#modalEdicion input, #modalEdicion select, #modalEdicion textarea").prop("disabled", false);
    }
    $('#modalEdicion').modal('show');
}

async function listaTransportes() {
    const paginaActual = gridTransportes ? gridTransportes.page() : 0;

    const response = await fetch("/Transportes/Lista", {
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        errorModal("Error obteniendo transportes.");
        return;
    }

    const rows = await response.json();
    const data = (rows || []).map(p => ({
        Id: p.Id,
        Nombre: p.Nombre,
        Direccion: p.Direccion || "",
        Telefono: p.Telefono || "",
        Activo: p.Activo !== false ? "Sí" : "No"
    }));

    await configurarDataTableTransportes(data);

    if (paginaActual > 0) {
        gridTransportes.page(paginaActual).draw('page');
    }

    actualizarKpisTransportes();
}

async function verTransporte(id) {
    Permisos.init();
    if (!Permisos.tiene("Transportes", "Ver")) {
        errorModal("No tenés permisos.");
        return;
    }
    try {
        const r = await fetch("/Transportes/EditarInfo?id=" + id, {
            method: "GET",
            headers: {
                Authorization: "Bearer " + token,
                "Content-Type": "application/json"
            }
        });
        if (!r.ok) throw new Error();
        const dataJson = await r.json();
        if (dataJson) await mostrarModal(dataJson, { readOnly: true });
        else throw new Error();
    } catch {
        errorModal("Ha ocurrido un error.");
    }
}

const editarTransporte = id => {
    Permisos.init();
    if (!Permisos.tiene("Transportes", "Editar")) {
        errorModal("No tenés permisos.");
        return;
    }

    fetch("/Transportes/EditarInfo?id=" + id, {
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        }
    })
        .then(r => {
            if (!r.ok) throw new Error("Ha ocurrido un error.");
            return r.json();
        })
        .then(dataJson => dataJson ? mostrarModal(dataJson, { readOnly: false }) : (() => { throw new Error("Ha ocurrido un error."); })())
        .catch(() => errorModal("Ha ocurrido un error."));
};

async function eliminarTransporte(id) {
    Permisos.init();
    if (!Permisos.tiene("Transportes", "Eliminar")) {
        errorModal("No tenés permisos.");
        return;
    }
    const confirmado = await confirmarModal("¿Desea eliminar este Transporte?");
    if (!confirmado) return;

    try {
        const response = await fetch("/Transportes/Eliminar?id=" + id, {
            method: "DELETE",
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error("Error al eliminar el Transporte.");

        const dataJson = await response.json();
        if (dataJson.valor) {
            listaTransportes();
            exitoModal("Transporte eliminado.");
        }
    } catch (error) {
        console.error("Ha ocurrido un error:", error);
        errorModal("No se pudo eliminar (puede estar asociado a clientes o ventas).");
    }
}

async function configurarDataTableTransportes(data) {
    if (!gridTransportes) {
        $('#grd_Transportes thead tr').clone(true).addClass('filters').appendTo('#grd_Transportes thead');

        gridTransportes = $('#grd_Transportes').DataTable({
            data,
            language: { url: "//cdn.datatables.net/plug-ins/2.0.7/i18n/es-MX.json" },
            scrollX: true,
            scrollCollapse: true,
            columns: [
                {
                    data: "Id",
                    title: '',
                    width: "1%",
                    render: function (data) {
                        return renderAccionesGrid(data, {
                            ver: "verTransporte",
                            editar: "editarTransporte",
                            eliminar: "eliminarTransporte"
                        }, "Transportes");
                    },
                    orderable: false,
                    searchable: false,
                },
                { data: 'Nombre', title: 'Nombre' },
                { data: 'Direccion', title: 'Dirección' },
                { data: 'Telefono', title: 'Teléfono' },
                { data: 'Activo', title: 'Activo' }
            ],
            dom: 'Bfrtip',
            buttons: dataTableButtonsExportCondicional("Transportes", [
                {
                    extend: 'excelHtml5',
                    text: 'Exportar Excel',
                    filename: 'Transportes',
                    title: '',
                    exportOptions: { columns: [1, 2, 3, 4] },
                    className: 'btn-exportar-excel',
                },
                {
                    extend: 'pdfHtml5',
                    text: 'Exportar PDF',
                    filename: 'Transportes',
                    title: '',
                    exportOptions: { columns: [1, 2, 3, 4] },
                    className: 'btn-exportar-pdf',
                },
                {
                    extend: 'print',
                    text: 'Imprimir',
                    title: '',
                    exportOptions: { columns: [1, 2, 3, 4] },
                    className: 'btn-exportar-print'
                },
            ]),
            orderCellsTop: true,
            fixedHeader: true,

            initComplete: async function () {
                const api = this.api();

                for (const config of columnConfig) {
                    const cell = $('.filters th').eq(config.index);
                    if (config.filterType === 'text') {
                        $('<input type="text" placeholder="Buscar..." />')
                            .appendTo(cell.empty())
                            .off('keyup change')
                            .on('keyup change', function (e) {
                                e.stopPropagation();
                                const regexr = '({search})';
                                const cursorPosition = this.selectionStart || 0;
                                api.column(config.index)
                                    .search(this.value !== '' ? regexr.replace('{search}', '(((' + escapeRegex(this.value) + ')))') : '', this.value !== '', this.value === '')
                                    .draw();
                                $(this).focus()[0].setSelectionRange(cursorPosition, cursorPosition);
                            });
                    }
                }

                $('.filters th').eq(0).html('');

                if (typeof configurarOpcionesColumnas === 'function') {
                    configurarOpcionesColumnas('#grd_Transportes', '#configColumnasMenu', 'Transportes_Columnas');
                }

                if (typeof bindDataTableSeleccionFila === "function") {
                    bindDataTableSeleccionFila("#grd_Transportes", "transportes");
                }

                setTimeout(() => gridTransportes.columns.adjust(), 10);

                $('#grd_Transportes').on('draw.dt', actualizarKpisTransportes);
            },
        });
    } else {
        gridTransportes.clear().rows.add(data).draw();
    }
}

function actualizarKpisTransportes() {
    if (!gridTransportes) return;
    const cant = gridTransportes.rows({ search: 'applied' }).count();
    const $kpi = $("#kpiCantTransportes");
    if ($kpi.length) $kpi.text(cant.toLocaleString('es-AR'));
}

function escapeRegex(text) {
    return (text + '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
