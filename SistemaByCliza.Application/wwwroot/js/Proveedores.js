/* =========================
   Proveedores.js
   ========================= */

let gridProveedores;

/* ---------- Filtros DataTable ---------- */
const columnConfig = [
    { index: 1, filterType: 'text' } // Nombre
];

/* ========== Init ========== */
$(document).ready(async () => {
    await listaProveedores();

    if (typeof attachLiveValidation === 'function') {
        attachLiveValidation('#modalEdicion');
    }

    // Fallback toggleAcciones
    if (typeof window.toggleAcciones === 'undefined') {
        window.toggleAcciones = function (id) {
            const $dd = $(`.acciones-menu[data-id="${id}"] .acciones-dropdown`);
            if ($dd.is(":visible")) $dd.hide();
            else { $('.acciones-dropdown').hide(); $dd.show(); }
        };
        $(document).on('click', function (e) {
            if (!$(e.target).closest('.acciones-menu').length) $('.acciones-dropdown').hide();
        });
    }
});

/* =========================
   Crear / Editar
   ========================= */

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
        Nombre: $("#txtNombre").val().trim()
    };

    const url = id === "" ? "/Proveedores/Insertar" : "/Proveedores/Actualizar";
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
            exitoModal(id === "" ? "Proveedor registrado" : "Proveedor modificado");
            listaProveedores();
        })
        .catch(err => {
            console.error('Error:', err);
            errorModal("No se pudo guardar el proveedor.");
        });
}

function nuevoProveedor() {
    limpiarModal('#modalEdicion', '#errorCampos');
    $("#btnGuardar").text("Registrar");
    $("#modalEdicionLabel").text("Nuevo Proveedor");
    $('#modalEdicion').modal('show');
}

async function mostrarModal(modelo) {
    limpiarModal('#modalEdicion', '#errorCampos');
    $("#txtId").val(modelo.Id ?? 0);
    $("#txtNombre").val(modelo.Nombre ?? '');
    $("#btnGuardar").text("Guardar");
    $("#modalEdicionLabel").text("Editar Proveedor");
    $('#modalEdicion').modal('show');
}

/* =========================
   Listado / Editar / Eliminar
   ========================= */

async function listaProveedores() {
    const paginaActual = gridProveedores ? gridProveedores.page() : 0;

    const response = await fetch("/Proveedores/Lista", {
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        errorModal("Error obteniendo proveedores.");
        return;
    }

    const proveedores = await response.json();
    const data = proveedores.map(p => ({
        Id: p.Id,
        Nombre: p.Nombre
    }));

    await configurarDataTableProveedores(data);

    if (paginaActual > 0) {
        gridProveedores.page(paginaActual).draw('page');
    }

    actualizarKpisProveedores();
}

const editarProveedor = id => {
    $('.acciones-dropdown').hide();

    fetch("/Proveedores/EditarInfo?id=" + id, {
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
        .then(dataJson => dataJson ? mostrarModal(dataJson) : (() => { throw new Error("Ha ocurrido un error."); })())
        .catch(() => errorModal("Ha ocurrido un error."));
};

async function eliminarProveedor(id) {
    $('.acciones-dropdown').hide();
    const confirmado = await confirmarModal("¿Desea eliminar este Proveedor?");
    if (!confirmado) return;

    try {
        const response = await fetch("/Proveedores/Eliminar?id=" + id, {
            method: "DELETE",
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error("Error al eliminar el Proveedor.");

        const dataJson = await response.json();
        if (dataJson.valor) {
            listaProveedores();
            exitoModal("Proveedor eliminado.");
        }
    } catch (error) {
        console.error("Ha ocurrido un error:", error);
        errorModal("No se pudo eliminar.");
    }
}

/* =========================
   DataTable
   ========================= */

async function configurarDataTableProveedores(data) {
    if (!gridProveedores) {
        $('#grd_Proveedores thead tr').clone(true).addClass('filters').appendTo('#grd_Proveedores thead');

        gridProveedores = $('#grd_Proveedores').DataTable({
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
                        <button class='btn btn-sm btneditar' type='button' onclick='editarProveedor(${data})' title='Editar'>
                            <i class='fa fa-pencil-square-o fa-lg text-success' aria-hidden='true'></i> Editar
                        </button>
                        <button class='btn btn-sm btneliminar' type='button' onclick='eliminarProveedor(${data})' title='Eliminar'>
                            <i class='fa fa-trash-o fa-lg text-danger' aria-hidden='true'></i> Eliminar
                        </button>
                    </div>
                </div>`;
                    },
                    orderable: false,
                    searchable: false,
                },
                { data: 'Nombre', title: 'Nombre' } // 1
            ],
            dom: 'Bfrtip',
            buttons: [
                {
                    extend: 'excelHtml5',
                    text: 'Exportar Excel',
                    filename: 'Proveedores',
                    title: '',
                    exportOptions: { columns: [1] },
                    className: 'btn-exportar-excel',
                },
                {
                    extend: 'pdfHtml5',
                    text: 'Exportar PDF',
                    filename: 'Proveedores',
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
                'pageLength'
            ],
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
                    configurarOpcionesColumnas('#grd_Proveedores', '#configColumnasMenu', 'Proveedores_Columnas');
                }

                setTimeout(() => gridProveedores.columns.adjust(), 10);

                $('#grd_Proveedores').on('draw.dt', actualizarKpisProveedores);
            },
        });
    } else {
        gridProveedores.clear().rows.add(data).draw();
    }
}

/* ========== KPI ========== */
function actualizarKpisProveedores() {
    if (!gridProveedores) return;
    const cant = gridProveedores.rows({ search: 'applied' }).count();
    const $kpi = $("#kpiCantProveedores");
    if ($kpi.length) $kpi.text(cant.toLocaleString('es-AR'));
}

/* =========================
   Utils
   ========================= */
function escapeRegex(text) {
    return (text + '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
