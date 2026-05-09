/* =========================
   Talleres.js
   ========================= */

let gridTalleres;

/* ---------- Filtros DataTable ---------- */
const columnConfig = [
    { index: 1, filterType: 'text' }, // Nombre
    { index: 2, filterType: 'text' } // Dias Entrega
];

/* ========== Init ========== */
$(document).ready(async () => {
    Permisos.init();
    Permisos.aplicarUI("Talleres");
    await listaTalleres();

    if (typeof attachLiveValidation === 'function') {
        attachLiveValidation('#modalEdicion');
    }
});

/* =========================
   Crear / Editar
   ========================= */

function validarCampos() {
    const nombre = ($("#txtNombre").val() || '').trim();
    const diasEntrega = ($("#txtDiasEntrega").val() || '').trim();
    const ok = nombre !== '' && diasEntrega !== '';
    $("#txtNombre").toggleClass("is-invalid", !ok);
    $("#txtDiasEntrega").toggleClass("is-invalid", !ok);
    $("#errorCampos").toggleClass('d-none', ok);
    return ok;
}

async function guardarCambios() {
    if (!validarCampos()) return;

    const id = $("#txtId").val();
    const modelo = {
        Id: id !== "" ? parseInt(id) : 0,
        Nombre: $("#txtNombre").val().trim(),
        DiasEntrega: $("#txtDiasEntrega").val().trim()
    };

    const url = id === "" ? "/Talleres/Insertar" : "/Talleres/Actualizar";
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
            exitoModal(id === "" ? "Taller registrado" : "Taller modificado");
            listaTalleres();
        })
        .catch(err => {
            console.error('Error:', err);
            errorModal("No se pudo guardar el Taller.");
        });
}

function nuevoTaller() {
    limpiarModal('#modalEdicion', '#errorCampos');
    $("#btnGuardar").removeClass("d-none").text("Registrar");
    $("#modalEdicion input, #modalEdicion select, #modalEdicion textarea").prop("disabled", false);
    $("#modalEdicionLabel").text("Nuevo Taller");
    $('#modalEdicion').modal('show');
}

async function mostrarModal(modelo, opts = {}) {
    const readOnly = !!opts.readOnly;
    limpiarModal('#modalEdicion', '#errorCampos');
    $("#txtId").val(modelo.Id ?? 0);
    $("#txtNombre").val(modelo.Nombre ?? '');
    $("#txtDiasEntrega").val(modelo.DiasEntrega ?? '');
    if (readOnly) {
        $("#modalEdicionLabel").text("Ver Taller");
        $("#btnGuardar").addClass("d-none");
        $("#modalEdicion input, #modalEdicion select, #modalEdicion textarea").prop("disabled", true);
    } else {
        $("#btnGuardar").removeClass("d-none").text("Guardar");
        $("#modalEdicionLabel").text("Editar Taller");
        $("#modalEdicion input, #modalEdicion select, #modalEdicion textarea").prop("disabled", false);
    }
    $('#modalEdicion').modal('show');
}

/* =========================
   Listado / Editar / Eliminar
   ========================= */

async function listaTalleres() {
    const paginaActual = gridTalleres ? gridTalleres.page() : 0;

    const response = await fetch("/Talleres/Lista", {
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        errorModal("Error obteniendo Talleres.");
        return;
    }

    const Talleres = await response.json();
    const data = Talleres.map(p => ({
        Id: p.Id,
        Nombre: p.Nombre,
        DiasEntrega: p.DiasEntrega

    }));

    await configurarDataTableTalleres(data);

    if (paginaActual > 0) {
        gridTalleres.page(paginaActual).draw('page');
    }

    actualizarKpisTalleres();
}

async function verTaller(id) {
    Permisos.init();
    if (!Permisos.tiene("Talleres", "Ver")) {
        errorModal("No tenés permisos.");
        return;
    }
    try {
        const r = await fetch("/Talleres/EditarInfo?id=" + id, {
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

const editarTaller = id => {
    Permisos.init();
    if (!Permisos.tiene("Talleres", "Editar")) {
        errorModal("No tenés permisos.");
        return;
    }

    fetch("/Talleres/EditarInfo?id=" + id, {
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

async function eliminarTaller(id) {
    Permisos.init();
    if (!Permisos.tiene("Talleres", "Eliminar")) {
        errorModal("No tenés permisos.");
        return;
    }
    const confirmado = await confirmarModal("¿Desea eliminar este Taller?");
    if (!confirmado) return;

    try {
        const response = await fetch("/Talleres/Eliminar?id=" + id, {
            method: "DELETE",
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error("Error al eliminar el Taller.");

        const dataJson = await response.json();
        if (dataJson.valor) {
            listaTalleres();
            exitoModal("Taller eliminado.");
        }
    } catch (error) {
        console.error("Ha ocurrido un error:", error);
        errorModal("No se pudo eliminar.");
    }
}

/* =========================
   DataTable
   ========================= */

async function configurarDataTableTalleres(data) {
    if (!gridTalleres) {
        $('#grd_Talleres thead tr').clone(true).addClass('filters').appendTo('#grd_Talleres thead');

        gridTalleres = $('#grd_Talleres').DataTable({
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
                        return renderAccionesGrid(data, {
                            ver: "verTaller",
                            editar: "editarTaller",
                            eliminar: "eliminarTaller"
                        }, "Talleres");
                    },
                    orderable: false,
                    searchable: false,
                },
                { data: 'Nombre', title: 'Nombre' }, // 1
                { data: 'DiasEntrega', title: 'Dias Entrega' }, // 1
            ],
            dom: 'Bfrtip',
            buttons: dataTableButtonsExportCondicional("Talleres", [
                {
                    extend: 'excelHtml5',
                    text: 'Exportar Excel',
                    filename: 'Talleres',
                    title: '',
                    exportOptions: { columns: [1] },
                    className: 'btn-exportar-excel',
                },
                {
                    extend: 'pdfHtml5',
                    text: 'Exportar PDF',
                    filename: 'Talleres',
                    title: '',
                    exportOptions: { columns: [1] },
                    className: 'btn-exportar-pdf',
                },
                {
                    extend: 'print',
                    text: 'Imprimir',
                    title: '',
                    exportOptions: { columns: [1] },
                    className: 'btn-exportar-print'
                },
            ]),
            orderCellsTop: true,
            fixedHeader: true,

            initComplete: async function () {
                const api = this.api();

                // Filtros en header
                for (const config of columnConfig) {
                    const cell = $('.filters th').eq(config.index);
                    if (config.filterType === 'text') {
                        const input = $('<input type="text" placeholder="Buscar..." />')
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

                // sin filtro en acciones
                $('.filters th').eq(0).html('');

                if (typeof configurarOpcionesColumnas === 'function') {
                    configurarOpcionesColumnas('#grd_Talleres', '#configColumnasMenu', 'Talleres_Columnas');
                }

                if (typeof bindDataTableSeleccionFila === "function") {
                    bindDataTableSeleccionFila("#grd_Talleres", "talleres");
                }

                setTimeout(() => gridTalleres.columns.adjust(), 10);

                $('#grd_Talleres').on('draw.dt', actualizarKpisTalleres);
            },
        });
    } else {
        gridTalleres.clear().rows.add(data).draw();
    }
}

/* ========== KPI ========== */
function actualizarKpisTalleres() {
    if (!gridTalleres) return;
    const cant = gridTalleres.rows({ search: 'applied' }).count();
    const $kpi = $("#kpiCantTalleres");
    if ($kpi.length) $kpi.text(cant.toLocaleString('es-AR'));
}

/* =========================
   Utils
   ========================= */
function escapeRegex(text) {
    return (text + '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
