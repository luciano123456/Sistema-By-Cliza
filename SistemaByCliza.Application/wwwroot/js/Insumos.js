/* =========================
   Insumos.js
   ========================= */

let gridInsumos;

/* ---------- Catálogos ---------- */
const Catalogos = {
    categorias: [],
    categoriasMap: new Map(),
    proveedores: [],
    proveedoresMap: new Map()
};

/* ---------- Filtros DataTable ---------- */
const columnConfig = [
    { index: 1, filterType: 'text' },                                   // Código
    { index: 2, filterType: 'text' },                                   // Descripción
    { index: 3, filterType: 'select', fetchDataFunc: listaCategoriasFilter }, // Categoría (nombre)
    { index: 4, filterType: 'select', fetchDataFunc: listaProveedoresFilter }, // Proveedor (nombre)
    { index: 5, filterType: 'text' }                                    // Costo
];

/* ========== Init ========== */
$(document).ready(async () => {
    await Promise.all([
        cargarCategorias(),
        cargarProveedores()
    ]);

    await listaInsumos();

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
    const codigo = ($("#txtCodigo").val() || '').trim();
    const descripcion = ($("#txtDescripcion").val() || '').trim();
    const idCat = $("#cmbCategoria").val();
    const idProv = $("#cmbProveedor").val();
    const costo = $("#txtCosto").val();

    const okCodigo = codigo !== '';
    const okDesc = descripcion !== '';
    const okCat = !!idCat;
    const okProv = !!idProv;
    const okCosto = costo !== '' && !isNaN(parseFloat(costo));

    $("#txtCodigo").toggleClass("is-invalid", !okCodigo);
    $("#txtDescripcion").toggleClass("is-invalid", !okDesc);
    $("#cmbCategoria").toggleClass("is-invalid", !okCat);
    $("#cmbProveedor").toggleClass("is-invalid", !okProv);
    $("#txtCosto").toggleClass("is-invalid", !okCosto);

    $("#errorCampos")
        .toggleClass('d-none', (okCodigo && okDesc && okCat && okProv && okCosto))
        .text('Debes completar los campos obligatorios.');

    return okCodigo && okDesc && okCat && okProv && okCosto;
}

async function guardarCambios() {
    if (!validarCampos()) return;

    const id = $("#txtId").val();
    const modelo = {
        Id: id !== "" ? parseInt(id) : 0,
        Codigo: $("#txtCodigo").val().trim(),
        Descripcion: $("#txtDescripcion").val().trim(),
        IdCategoria: parseInt($("#cmbCategoria").val()),
        IdProveedor: parseInt($("#cmbProveedor").val()),
        CostoUnitario: parseFloat($("#txtCosto").val())
    };

    const url = id === "" ? "/Insumos/Insertar" : "/Insumos/Actualizar";
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
            exitoModal(id === "" ? "Insumo registrado" : "Insumo modificado");
            listaInsumos();
        })
        .catch(err => {
            console.error('Error:', err);
            errorModal("No se pudo guardar el insumo.");
        });
}

function nuevoInsumo() {
    limpiarModal('#modalEdicion', '#errorCampos');

    if (document.getElementById('cmbCategoria')) llenarSelect('cmbCategoria', Catalogos.categorias);
    if (document.getElementById('cmbProveedor')) llenarSelect('cmbProveedor', Catalogos.proveedores);

    $("#btnGuardar").text("Registrar");
    $("#modalEdicionLabel").text("Nuevo Insumo");
    $('#modalEdicion').modal('show');
}

async function mostrarModal(modelo) {
    limpiarModal('#modalEdicion', '#errorCampos');

    if (document.getElementById('cmbCategoria')) llenarSelect('cmbCategoria', Catalogos.categorias);
    if (document.getElementById('cmbProveedor')) llenarSelect('cmbProveedor', Catalogos.proveedores);

    $("#txtId").val(modelo.Id ?? 0);
    $("#txtCodigo").val(modelo.Codigo ?? '');
    $("#txtDescripcion").val(modelo.Descripcion ?? '');
    $("#cmbCategoria").val(modelo.IdCategoria ?? '').trigger('change');
    $("#cmbProveedor").val(modelo.IdProveedor ?? '').trigger('change');
    $("#txtCosto").val(modelo.CostoUnitario ?? '');

    $("#btnGuardar").text("Guardar");
    $("#modalEdicionLabel").text("Editar Insumo");
    $('#modalEdicion').modal('show');
}

/* =========================
   Listado / Editar / Eliminar
   ========================= */

async function listaInsumos() {
    const paginaActual = gridInsumos ? gridInsumos.page() : 0;

    const response = await fetch("/Insumos/Lista", {
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        errorModal("Error obteniendo insumos.");
        return;
    }

    const insumos = await response.json();
    const data = insumos.map(i => ({
        Id: i.Id,
        Codigo: i.Codigo,
        Descripcion: i.Descripcion,
        CategoriaNombre: Catalogos.categoriasMap.get(Number(i.IdCategoria)) || i.IdCategoria,
        ProveedorNombre: Catalogos.proveedoresMap.get(Number(i.IdProveedor)) || i.IdProveedor,
        CostoUnitario: i.CostoUnitario
    }));

    await configurarDataTableInsumos(data);

    if (paginaActual > 0) {
        gridInsumos.page(paginaActual).draw('page');
    }

    actualizarKpisInsumos();
}

const editarInsumo = id => {
    $('.acciones-dropdown').hide();

    fetch("/Insumos/EditarInfo?id=" + id, {
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

async function eliminarInsumo(id) {
    $('.acciones-dropdown').hide();
    const confirmado = await confirmarModal("¿Desea eliminar este Insumo?");
    if (!confirmado) return;

    try {
        const response = await fetch("/Insumos/Eliminar?id=" + id, {
            method: "DELETE",
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error("Error al eliminar el Insumo.");

        const dataJson = await response.json();
        if (dataJson.valor) {
            listaInsumos();
            exitoModal("Insumo eliminado.");
        }
    } catch (error) {
        console.error("Ha ocurrido un error:", error);
        errorModal("No se pudo eliminar.");
    }
}

/* =========================
   DataTable
   ========================= */

async function configurarDataTableInsumos(data) {
    const fmt = (n) => (typeof formatNumber === "function")
        ? formatNumber(n)
        : Number(n).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    if (!gridInsumos) {
        $('#grd_Insumos thead tr').clone(true).addClass('filters').appendTo('#grd_Insumos thead');

        gridInsumos = $('#grd_Insumos').DataTable({
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
                        <button class='btn btn-sm btneditar' type='button' onclick='editarInsumo(${data})' title='Editar'>
                            <i class='fa fa-pencil-square-o fa-lg text-success' aria-hidden='true'></i> Editar
                        </button>
                        <button class='btn btn-sm btneliminar' type='button' onclick='eliminarInsumo(${data})' title='Eliminar'>
                            <i class='fa fa-trash-o fa-lg text-danger' aria-hidden='true'></i> Eliminar
                        </button>
                    </div>
                </div>`;
                    },
                    orderable: false,
                    searchable: false,
                },
                { data: 'Codigo', title: 'Código' },                     // 1
                { data: 'Descripcion', title: 'Descripción' },           // 2
                { data: 'CategoriaNombre', title: 'Categoría' },         // 3
                { data: 'ProveedorNombre', title: 'Proveedor' },         // 4
                {
                    data: 'CostoUnitario', title: 'Costo', className: 'text-end',
                    render: n => (n != null ? fmt(n) : '')
                }                                                       // 5
            ],
            dom: 'Bfrtip',
            buttons: [
                {
                    extend: 'excelHtml5',
                    text: 'Exportar Excel',
                    filename: 'Insumos',
                    title: '',
                    exportOptions: { columns: [1, 2, 3, 4, 5] },
                    className: 'btn-exportar-excel',
                },
                {
                    extend: 'pdfHtml5',
                    text: 'Exportar PDF',
                    filename: 'Insumos',
                    title: '',
                    exportOptions: { columns: [1, 2, 3, 4, 5] },
                    className: 'btn-exportar-pdf',
                },
                {
                    extend: 'print',
                    text: 'Imprimir',
                    title: '',
                    exportOptions: { columns: [1, 2, 3, 4, 5] },
                    className: 'btn-exportar-print'
                },
                'pageLength'
            ],
            orderCellsTop: true,
            fixedHeader: true,

            initComplete: async function () {
                const api = this.api();

                // Filtros por columna en header
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
                                const cursorPosition = this.selectionStart || 0;
                                api.column(config.index)
                                    .search(this.value !== '' ? regexr.replace('{search}', '(((' + escapeRegex(this.value) + ')))') : '', this.value !== '', this.value === '')
                                    .draw();
                                $(this).focus()[0].setSelectionRange(cursorPosition, cursorPosition);
                            });
                    }
                }

                // sin filtro en la columna de acciones
                $('.filters th').eq(0).html('');

                if (typeof configurarOpcionesColumnas === 'function') {
                    configurarOpcionesColumnas('#grd_Insumos', '#configColumnasMenu', 'Insumos_Columnas');
                }

                setTimeout(() => gridInsumos.columns.adjust(), 10);

                $('#grd_Insumos').on('draw.dt', actualizarKpisInsumos);
            },
        });
    } else {
        gridInsumos.clear().rows.add(data).draw();
    }
}

/* ========== KPI ========== */
function actualizarKpisInsumos() {
    if (!gridInsumos) return;
    const cant = gridInsumos.rows({ search: 'applied' }).count();
    const $kpi = $("#kpiCantInsumos");
    if ($kpi.length) $kpi.text(cant.toLocaleString('es-AR'));
}

/* =========================
   Carga de catálogos
   ========================= */

function cargarCategorias() {
    return fetch("/InsumosCategoria/Lista", {
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        }
    })
        .then(r => r.json())
        .then(data => {
            Catalogos.categorias = data;
            Catalogos.categoriasMap = new Map(data.map(x => [Number(x.Id), x.Nombre]));
            if (document.getElementById('cmbCategoria')) llenarSelect('cmbCategoria', data);
        });
}

function cargarProveedores() {
    return fetch("/Proveedores/Lista", {
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        }
    })
        .then(r => r.json())
        .then(data => {
            // Esperado: [{Id, Nombre}] (ajusta si tu API usa otro naming)
            Catalogos.proveedores = data;
            Catalogos.proveedoresMap = new Map(data.map(x => [Number(x.Id), x.Nombre]));
            if (document.getElementById('cmbProveedor')) llenarSelect('cmbProveedor', data);
        });
}

/* =========================
   Filtros (select header)
   ========================= */
async function listaCategoriasFilter() {
    return Catalogos.categorias.map(item => ({ Id: item.Id, Nombre: item.Nombre }));
}

async function listaProveedoresFilter() {
    return Catalogos.proveedores.map(item => ({ Id: item.Id, Nombre: item.Nombre }));
}

/* =========================
   Utils
   ========================= */
function escapeRegex(text) {
    return (text + '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
