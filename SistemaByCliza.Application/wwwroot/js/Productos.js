/* =========================
   Productos.js (adaptado)
   ========================= */

let gridProductos;

/* ---------- Catálogos (cache en memoria) ---------- */
const Catalogos = {
    categorias: [],
    categoriasMap: new Map(),
    talles: [],
    tallesMap: new Map(),
    colores: [],
    coloresMap: new Map(),
    listasPrecios: []
};

/* ---------- Configuración de filtros para DataTable ---------- */
const columnConfig = [
    { index: 1, filterType: 'text' },                                  // Descripción
    { index: 2, filterType: 'select', fetchDataFunc: listaCategoriasFilter }, // Categoría (nombre)
    { index: 3, filterType: 'text' }                                   // Precio
];

/* ---------- Estado selección para checklists ---------- */
const MultiState = {
    talles: new Set(),   // IDs
    colores: new Set()
};

/** Tras insertar desde atajo de configuración (modal producto abierto): se aplica al refrescar catálogos. */
let pendingSeleccionCatalogoProducto = null;

/** Si true, el próximo `change` de #cmbCategoria no vacía talles (misma categoría al repoblar el select). */
let suprimirLimpiezaTallesAlCambiarCategoria = false;

function actualizarMensajesChecklist(okTalles, okColores, mostrarErrores = false) {
    const $hintTalles = $("#hintTalles");
    const $hintColores = $("#hintColores");
    if (!$hintTalles.length || !$hintColores.length) return;

    if (!mostrarErrores) {
        $hintTalles.removeClass("text-danger").addClass("text-muted").text("Podés seleccionar múltiples talles");
        $hintColores.removeClass("text-danger").addClass("text-muted").text("Podés seleccionar múltiples colores");
        return;
    }

    $hintTalles
        .toggleClass("text-danger", !okTalles)
        .toggleClass("text-muted", okTalles)
        .text(okTalles ? "Podés seleccionar múltiples talles" : "Debes seleccionar al menos 1 talle.");

    $hintColores
        .toggleClass("text-danger", !okColores)
        .toggleClass("text-muted", okColores)
        .text(okColores ? "Podés seleccionar múltiples colores" : "Debes seleccionar al menos 1 color.");
}

function limpiarEstilosValidacionProducto() {
    $("#errorCampos").addClass("d-none").text("Debes completar los campos obligatorios.");
    $("#txtNombre, #txtPrecio, #cmbCategoria").removeClass("is-invalid is-valid");
    $("#btnTalles, #btnColores").removeClass("is-invalid");
    actualizarMensajesChecklist(true, true, false);
    const $s2 = $("#cmbCategoria").next(".select2");
    if ($s2.length) {
        $s2.find(".select2-selection").removeClass("is-invalid is-valid");
    }
}

function destruirSelect2CategoriaProducto() {
    const $el = $("#cmbCategoria");
    if (!$el.length || !$.fn.select2) return;
    if ($el.hasClass("select2-hidden-accessible")) {
        $el.select2("destroy");
    }
}

/** Repuebla categorías; Select2 lo inicializa `bindDeferredValidationModal` / `initSelect2` con el modal visible. */
function repoblarSelectCategoriaProducto(valorPreferido) {
    const el = document.getElementById("cmbCategoria");
    if (!el || !Catalogos.categorias) return;
    const valorAntes = ($(el).val() ?? "").toString();
    let prev = "";
    if (valorPreferido !== undefined && valorPreferido !== null) {
        prev = String(valorPreferido);
    } else {
        prev = ($(el).val() ?? "").toString();
    }
    destruirSelect2CategoriaProducto();
    llenarSelect("cmbCategoria", Catalogos.categorias);
    const $el = $(el);
    const opcionExiste = prev !== "" && $el.find(`option[value="${CSS.escape(prev)}"]`).length;
    if (opcionExiste) {
        const mismaCategoria = valorAntes !== "" && valorAntes === prev;
        suprimirLimpiezaTallesAlCambiarCategoria = mismaCategoria;
        $el.val(prev).trigger("change");
    } else {
        suprimirLimpiezaTallesAlCambiarCategoria = false;
        $el.val("").trigger("change");
    }
    const modal = document.getElementById("modalEdicion");
    if (modal && modal.classList.contains("show") && typeof initSelect2 === "function") {
        initSelect2(modal);
    }
}

/** Tras `initSelect2` en el modal, alinea feedback nativo + Select2 (evita “Campo obligatorio” con valor cargado). */
function sincronizarValidacionCategoriaProductoTrasSelect2() {
    const sel = document.getElementById("cmbCategoria");
    if (!sel) return;
    const v = String(sel.value || "").trim();
    if (!v) return;
    if (typeof clearValidation === "function") {
        clearValidation(sel);
    }
    if (sel.disabled) {
        return;
    }
    if (typeof setValid === "function") {
        setValid(sel);
    }
    validarCampoIndividualProducto("#cmbCategoria");
}

/* ========== Init ========== */
$(document).ready(async () => {
    Permisos.init();
    Permisos.aplicarUI("Productos");
    // Cargar catálogos base en paralelo
    await Promise.all([
        cargarCategorias(),
        cargarColores(),
        cargarTalles() // lista completa por defecto
    ]);

    await listaProductos();

    // Validación live como en otras pantallas (si tu helper existe)
    if (typeof attachLiveValidation === 'function') {
        attachLiveValidation('#modalEdicion');
    }
    if (typeof wireSelect2Validation === "function") {
        wireSelect2Validation("#modalEdicion");
    }

    $("#cmbCategoria")
        .off("select2:close.productoBlur")
        .on("select2:close.productoBlur", function () {
            validarCampoIndividualProducto("#cmbCategoria");
        });

    $("#txtNombre")
        .off("blur.productoVal")
        .on("blur.productoVal", function () {
            validarCampoIndividualProducto("#txtNombre");
        });

    bindAtajosCatalogosProducto();
    bindPrecioInputsProductos();
});

/* =========================
   Crear / Editar
   ========================= */
function getMultiSelectValues(selectId) {
    const el = document.getElementById(selectId);
    if (!el) return [];
    if (el.tagName?.toLowerCase() === 'select') {
        const opts = Array.from(el.selectedOptions ?? []);
        return opts.map(o => Number(o.value)).filter(Number.isFinite);
    }
    const checks = el.querySelectorAll?.('input[type="checkbox"]:checked') ?? [];
    return Array.from(checks)
        .map(cb => Number(cb.value ?? cb.dataset.id))
        .filter(Number.isFinite);
}

function setMultiSelectValues(selectId, values) {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    const set = new Set((values || []).map(Number));
    Array.from(sel.options).forEach(opt => { opt.selected = set.has(Number(opt.value)); });
}

/* Validación modal de producto */
function camposProductoOk() {
    const nombre = ($("#txtNombre").val() || "").trim();
    const categoria = $("#cmbCategoria").val();
    const precio = ($("#txtPrecio").val() ?? "").toString().trim();
    const precioNum = parsePrecioInputProducto(precio);

    const tallesSel = getTallesSeleccionados();
    const coloresSel = getColoresSeleccionados();

    const okNombre = nombre !== "";
    const okCategoria = !!categoria;
    const okPrecio = precio !== "" && !isNaN(precioNum) && precioNum >= 0;
    const okTalles = Array.isArray(tallesSel) && tallesSel.length > 0;
    const okColores = Array.isArray(coloresSel) && coloresSel.length > 0;

    return okNombre && okCategoria && okPrecio && okTalles && okColores;
}

function validarCampos(forzarUI = false) {
    const ok = camposProductoOk();
    const modal = document.getElementById("modalEdicion");
    if (!forzarUI && modal && modal.getAttribute("data-validacion-ui") === "0") {
        return ok;
    }

    const nombre = ($("#txtNombre").val() || "").trim();
    const categoria = $("#cmbCategoria").val();
    const precio = ($("#txtPrecio").val() ?? "").toString().trim();
    const precioNum = parsePrecioInputProducto(precio);
    const tallesSel = getTallesSeleccionados();
    const coloresSel = getColoresSeleccionados();
    const okNombre = nombre !== "";
    const okCategoria = !!categoria;
    const okPrecio = precio !== "" && !isNaN(precioNum) && precioNum >= 0;
    const okTalles = Array.isArray(tallesSel) && tallesSel.length > 0;
    const okColores = Array.isArray(coloresSel) && coloresSel.length > 0;

    actualizarMensajesChecklist(okTalles, okColores, true);

    $("#errorCampos")
        .toggleClass("d-none", ok)
        .text((!okTalles || !okColores)
            ? "Debes seleccionar al menos un talle y un color."
            : "Debes completar los campos obligatorios.");

    $("#btnTalles").toggleClass("is-invalid", !okTalles);
    $("#btnColores").toggleClass("is-invalid", !okColores);

    $("#txtNombre").toggleClass("is-invalid", !okNombre);
    $("#cmbCategoria").toggleClass("is-invalid", !okCategoria);
    $("#txtPrecio").toggleClass("is-invalid", !okPrecio);
    const $s2cat = $("#cmbCategoria").next(".select2");
    if ($s2cat.length) {
        $s2cat.find(".select2-selection")
            .toggleClass("is-invalid", !okCategoria)
            .toggleClass("is-valid", okCategoria && !!categoria);
    }

    return ok;
}

async function guardarCambios() {
    if (!camposProductoOk()) {
        if (typeof forzarValidacionModal === "function") {
            forzarValidacionModal("#modalEdicion", "#errorCampos");
        } else {
            document.getElementById("modalEdicion")?.setAttribute("data-validacion-ui", "1");
        }
        validarCampos(true);
        return;
    }

    const idProducto = $("#txtId").val();
    const nuevoModelo = {
        Id: idProducto !== "" ? parseInt(idProducto) : 0,
        Descripcion: $("#txtNombre").val().trim(),
        IdCategoria: parseInt($("#cmbCategoria").val()),
        PrecioUnitario: parsePrecioInputProducto($("#txtPrecio").val()),
        IdTalles: getTallesSeleccionados(),
        IdColores: getColoresSeleccionados(),
        GenerarVariantes: $("#chkVariantes").is(":checked"),
        PreciosPorLista: getPreciosPorListaFromUI()
    };

    const url = idProducto === "" ? "/Productos/Insertar" : "/Productos/Actualizar";
    const method = idProducto === "" ? "POST" : "PUT";

    fetch(url, {
        method,
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json;charset=utf-8'
        },
        body: JSON.stringify(nuevoModelo)
    })
        .then(r => {
            if (!r.ok) throw new Error(r.statusText);
            return r.json();
        })
        .then(() => {
            $('#modalEdicion').modal('hide');
            exitoModal(idProducto === "" ? "Producto registrado correctamente" : "Producto modificado correctamente");
            listaProductos();
        })
        .catch(err => {
            console.error('Error:', err);
            errorModal("No se pudo guardar el producto.");
        });
}

function nuevoProducto() {
    $("#modalEdicion").attr("data-validacion-ui", "0");
    destruirSelect2CategoriaProducto();
    limpiarModal('#modalEdicion', '#errorCampos');
    limpiarEstilosValidacionProducto();
    $("#cmbCategoria").off("change");

    MultiState.talles.clear();
    MultiState.colores.clear();
    renderPreciosListas([]);

    if (document.getElementById('cmbCategoria')) repoblarSelectCategoriaProducto("");

    renderChecklist('listaTalles', Catalogos.talles, 'talles', 'btnTalles');
    renderChecklist('listaColores', Catalogos.colores, 'colores', 'btnColores');

    $("#cmbCategoria").on('change', async function () {
        const limpiarTalles = !suprimirLimpiezaTallesAlCambiarCategoria;
        suprimirLimpiezaTallesAlCambiarCategoria = false;
        const idCat = parseInt(this.value || 0);
        if (limpiarTalles) MultiState.talles.clear();
        await recargarTallesPorCategoria(idCat);
        renderChecklist('listaTalles', Catalogos.talles, 'talles', 'btnTalles');
        syncChecklistUI();
        const modal = document.getElementById("modalEdicion");
        if (modal?.getAttribute("data-validacion-ui") === "1") {
            validarCampos(true);
        }
    });

    $("#chkVariantes").prop("checked", true);
    $("#btnGuardar").text("Registrar");
    $("#modalEdicionLabel").text("Nuevo Producto");
    $("#modalEdicion .modal-body").find("button").prop("disabled", false);
    limpiarEstilosValidacionProducto();
    syncChecklistUI();
    $('#modalEdicion').modal('show');
}

async function mostrarModal(modelo, opts = {}) {
    const readOnly = !!opts.readOnly;
    $("#modalEdicion").attr("data-validacion-ui", "0");
    destruirSelect2CategoriaProducto();
    limpiarModal('#modalEdicion', '#errorCampos');
    limpiarEstilosValidacionProducto();
    $("#cmbCategoria").off("change");

    // Un solo repoblado con el id evita un `change` intermedio vacío que marca “obligatorio” antes de asignar el valor.
    const idCategoriaModelo = modelo.IdCategoria ?? modelo.idCategoria;
    if (document.getElementById("cmbCategoria")) {
        repoblarSelectCategoriaProducto(idCategoriaModelo != null && idCategoriaModelo !== "" ? idCategoriaModelo : "");
    }

    $("#txtId").val(modelo.Id ?? 0);
    $("#txtNombre").val(modelo.Descripcion ?? '');
    {
        const p = modelo.PrecioUnitario;
        const n = typeof p === "number" ? p : parseFloat(p);
        $("#txtPrecio").val(p != null && p !== "" && !isNaN(n) ? formatPrecioCampoProducto(n) : "");
    }
    $("#chkVariantes").prop("checked", true);

    const idCat = Number(idCategoriaModelo || 0);
    await recargarTallesPorCategoria(idCat);

    renderPreciosListas(modelo.PreciosPorLista || []);

    MultiState.talles = new Set(modelo.IdTalles || []);
    MultiState.colores = new Set(modelo.IdColores || []);

    // Render con selección aplicada
    renderChecklist('listaTalles', Catalogos.talles, 'talles', 'btnTalles');
    renderChecklist('listaColores', Catalogos.colores, 'colores', 'btnColores');

    // 🔧 forzar UI/validación inicial para que NO queden en rojo
    syncChecklistUI();

    $("#cmbCategoria").on('change', async function () {
        const limpiarTalles = !suprimirLimpiezaTallesAlCambiarCategoria;
        suprimirLimpiezaTallesAlCambiarCategoria = false;
        if (readOnly) return;
        const idCatChange = parseInt(this.value || 0);
        if (limpiarTalles) MultiState.talles.clear();              // solo si cambió la categoría (no al repoblar el mismo id)
        await recargarTallesPorCategoria(idCatChange);
        renderChecklist('listaTalles', Catalogos.talles, 'talles', 'btnTalles');
        syncChecklistUI();
        const modal = document.getElementById("modalEdicion");
        if (modal?.getAttribute("data-validacion-ui") === "1") {
            validarCampos(true);
        }
    });

    if (readOnly) {
        $("#modalEdicionLabel").text("Ver Producto");
        $("#btnGuardar").addClass("d-none");
        $("#modalEdicion .modal-body").find("input, select, textarea, button").prop("disabled", true);
        $("#listaTalles input[type='checkbox'], #listaColores input[type='checkbox']").prop("disabled", true);
        $("#btnTalles, #btnColores").prop("disabled", true);
        $("#cmbCategoria").prop("disabled", true);
        if ($.fn.select2 && $("#cmbCategoria").hasClass("select2-hidden-accessible")) {
            $("#cmbCategoria").trigger("change.select2");
        }
    } else {
        $("#modalEdicionLabel").text("Editar Producto");
        $("#btnGuardar").removeClass("d-none").text("Guardar");
        $("#modalEdicion .modal-body").find("input, select, textarea, button").prop("disabled", false);
        $("#listaTalles input[type='checkbox'], #listaColores input[type='checkbox']").prop("disabled", false);
        $("#btnTalles, #btnColores").prop("disabled", false);
        $("#cmbCategoria").prop("disabled", false);
    }

    $("#modalEdicion").off("shown.bs.modal.productoCatVal").one("shown.bs.modal.productoCatVal", function () {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => sincronizarValidacionCategoriaProductoTrasSelect2());
        });
    });
    $("#modalEdicion").modal("show");
}

/* =========================
   Listado / EditarInfo / Eliminar
   ========================= */

async function listaProductos() {
    const paginaActual = gridProductos ? gridProductos.page() : 0;

    const response = await fetch("/Productos/Lista", {
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        errorModal("Error obteniendo productos.");
        return;
    }

    const productos = await response.json();
    const data = productos.map(p => ({
        Id: p.Id,
        Descripcion: p.Descripcion,
        CategoriaNombre: Catalogos.categoriasMap.get(Number(p.IdCategoria)) || p.IdCategoria,
        PrecioUnitario: p.PrecioUnitario
    }));

    await configurarDataTableProductos(data);

    if (paginaActual > 0) {
        gridProductos.page(paginaActual).draw('page');
    }

    // actualizar KPI al cargar por primera vez
    actualizarKpisProductos();
}

async function verProducto(id) {
    Permisos.init();
    if (!Permisos.tiene("Productos", "Ver")) {
        errorModal("No tenés permisos.");
        return;
    }
    try {
        const r = await fetch("/Productos/EditarInfo?id=" + id, {
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

const editarProducto = id => {
    Permisos.init();
    if (!Permisos.tiene("Productos", "Editar")) {
        errorModal("No tenés permisos.");
        return;
    }

    fetch("/Productos/EditarInfo?id=" + id, {
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

async function eliminarProducto(id) {
    Permisos.init();
    if (!Permisos.tiene("Productos", "Eliminar")) {
        errorModal("No tenés permisos.");
        return;
    }
    const confirmado = await confirmarModal("¿Desea eliminar este Producto?");
    if (!confirmado) return;

    try {
        const response = await fetch("/Productos/Eliminar?id=" + id, {
            method: "DELETE",
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error("Error al eliminar el Producto.");

        const dataJson = await response.json();
        if (dataJson.valor) {
            listaProductos();
            exitoModal("Producto eliminado correctamente");
        }
    } catch (error) {
        console.error("Ha ocurrido un error:", error);
        errorModal("No se pudo eliminar.");
    }
}

/* =========================
   DataTable
   ========================= */

async function configurarDataTableProductos(data) {
    const fmt = (n) => (typeof formatNumber === "function")
        ? formatNumber(n)
        : Number(n).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    if (!gridProductos) {
        $('#grd_Productos thead tr').clone(true).addClass('filters').appendTo('#grd_Productos thead');

        gridProductos = $('#grd_Productos').DataTable({
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
                            ver: "verProducto",
                            editar: "editarProducto",
                            eliminar: "eliminarProducto"
                        }, "Productos");
                    },
                    orderable: false,
                    searchable: false,
                },
                { data: 'Descripcion', title: 'Descripción' },                 // 1
                { data: 'CategoriaNombre', title: 'Categoría' },               // 2
                {
                    data: 'PrecioUnitario', title: 'Precio', className: 'text-end',
                    render: n => (n != null ? fmt(n) : '')
                }                     // 3
            ],
            dom: 'Bfrtip',
            buttons: dataTableButtonsExportCondicional("Productos", [
                {
                    extend: 'excelHtml5',
                    text: 'Exportar Excel',
                    filename: 'Productos',
                    title: '',
                    exportOptions: { columns: [1, 2, 3] },
                    className: 'btn-exportar-excel',
                },
                {
                    extend: 'pdfHtml5',
                    text: 'Exportar PDF',
                    filename: 'Productos',
                    title: '',
                    exportOptions: { columns: [1, 2, 3] },
                    className: 'btn-exportar-pdf',
                },
                {
                    extend: 'print',
                    text: 'Imprimir',
                    title: '',
                    exportOptions: { columns: [1, 2, 3] },
                    className: 'btn-exportar-print'
                },
            ]),
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

                // Dropdown de columnas (si tu helper existe)
                if (typeof configurarOpcionesColumnas === 'function') {
                    configurarOpcionesColumnas('#grd_Productos', '#configColumnasMenu', 'Productos_Columnas');
                }

                setTimeout(() => gridProductos.columns.adjust(), 10);

                // KPI: actualizar en cada draw (filtrado/paginado/ordenado)
                $('#grd_Productos').on('draw.dt', actualizarKpisProductos);

                if (typeof bindDataTableSeleccionFila === "function") {
                    bindDataTableSeleccionFila("#grd_Productos", "productos");
                }
            },
        });
    } else {
        gridProductos.clear().rows.add(data).draw();
    }
}

/* ========== KPI (sumar productos = contar filtrados) ========== */
function actualizarKpisProductos() {
    if (!gridProductos) return;
    const cant = gridProductos.rows({ search: 'applied' }).count();
    const $kpi = $("#kpiCantProductos");
    if ($kpi.length) $kpi.text(cant.toLocaleString('es-AR'));
}

/* =========================
   Carga de catálogos
   ========================= */

function cargarCategorias(valorCategoriaPreservar) {
    return fetch("/ProductosCategoria/Lista", {
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        }
    })
        .then(r => r.json())
        .then(data => {
            Catalogos.categorias = data;
            Catalogos.categoriasMap = new Map(data.map(x => [Number(x.Id), x.Nombre]));
            if (document.getElementById('cmbCategoria')) {
                repoblarSelectCategoriaProducto(valorCategoriaPreservar);
            }
        });
}

function cargarColores() {
    return fetch("/Colores/Lista", {
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        }
    })
        .then(r => r.json())
        .then(data => {
            Catalogos.colores = data;
            Catalogos.coloresMap = new Map(data.map(x => [Number(x.Id), x.Nombre]));
            // si mantenés <select multiple> como fallback:
            if (document.getElementById('cmbColores')) {
                llenarSelect('cmbColores', data);
                const sel = document.getElementById('cmbColores');
                if (sel && sel.multiple && sel.options[0]?.value === "") sel.remove(0);
            }
        });
}

function cargarTalles() {
    return fetch("/ProductosCategoriasTalle/Lista", {
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        }
    })
        .then(r => r.ok ? r.json() : [])
        .then(data => {
            const norm = data.map(x => ({ Id: x.Id ?? x.IdTalle ?? 0, Nombre: x.Nombre ?? x.TalleNombre ?? '' }));
            Catalogos.talles = norm;
            Catalogos.tallesMap = new Map(norm.map(x => [Number(x.Id), x.Nombre]));
            // si mantenés <select multiple> como fallback:
            if (document.getElementById('cmbTalles')) {
                llenarSelect('cmbTalles', norm);
                const sel = document.getElementById('cmbTalles');
                if (sel && sel.multiple && sel.options[0]?.value === "") sel.remove(0);
                if (typeof $ !== 'undefined' && $.fn.selectpicker) $('#cmbTalles').selectpicker('refresh');
            }
        });
}

async function recargarTallesPorCategoria(idCategoria) {
    let data = [];
    try {
        if (idCategoria && idCategoria > 0) {
            const r = await fetch(`/ProductosCategoriasTalle/ListaPorCategoria?idCategoria=${idCategoria}`, {
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                }
            });
            const rel = await r.json();
            data = rel.map(r => ({ Id: r.IdTalle ?? r.Id ?? 0, Nombre: r.TalleNombre ?? r.Nombre ?? '' }));
        } else {
            data = Catalogos.talles;
        }
    } catch {
        data = Catalogos.talles;
    }

    Catalogos.talles = data;
    Catalogos.tallesMap = new Map(data.map(x => [Number(x.Id), x.Nombre]));
    renderChecklist('listaTalles', Catalogos.talles, 'talles', 'btnTalles');
}

/* =========================
   Filtros (header select)
   ========================= */
async function listaCategoriasFilter() {
    return Catalogos.categorias.map(item => ({ Id: item.Id, Nombre: item.Nombre }));
}

/* =========================
   Endpoints auxiliares (editar)
   ========================= */
async function listaTallesPorProducto(idProducto) {
    try {
        const r = await fetch(`/ProductosTalles/ListaPorProducto?id=${idProducto}`, {
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            }
        });
        if (!r.ok) return [];
        const data = await r.json();
        return data.map(x => Number(x.IdTalle ?? x.Id));
    } catch { return []; }
}

async function listaColoresPorProducto(idProducto) {
    try {
        const r = await fetch(`/ProductosColores/ListaPorProducto?id=${idProducto}`, {
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            }
        });
        if (!r.ok) return [];
        const data = await r.json();
        return data.map(x => Number(x.IdColor ?? x.Id));
    } catch { return []; }
}

/* =========================
   Checklists Talles / Colores (toggleChecklist + cierre al click afuera: site.js)
   ========================= */

function escHtmlTextProducto(s) {
    return String(s ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

function renderChecklist(panelId, items, stateKey, btnId, labelTodos = 'Seleccionar todos') {

    const panel = document.getElementById(panelId);

    if (!panel) return;

    const selected = MultiState[stateKey];

    const html = [];

    const allChecked = items.length > 0 && items.every(it => selected.has(Number(it.Id)));

    html.push(`
    <div class="form-check">
      <input class="form-check-input" type="checkbox" id="${panelId}-all" ${allChecked ? 'checked' : ''}>
      <label class="form-check-label" for="${panelId}-all">${labelTodos}</label>
    </div>
    <hr class="my-2" />
    `);

    for (const it of items) {

        const checked = selected.has(Number(it.Id)) ? 'checked' : '';

        html.push(`
        <div class="form-check">
            <input class="form-check-input"
                   type="checkbox"
                   id="${panelId}-opt-${it.Id}"
                   data-id="${it.Id}"
                   ${checked}>

            <label class="form-check-label"
                   for="${panelId}-opt-${it.Id}">
                ${escHtmlTextProducto(it.Nombre)}
            </label>
        </div>
        `);
    }

    panel.innerHTML = html.join('');

    document.getElementById(`${panelId}-all`)
        .addEventListener('change', (ev) => {

            selected.clear();

            if (ev.target.checked) {

                items.forEach(it => selected.add(Number(it.Id)));
            }

            items.forEach(it => {

                const cb = document.getElementById(`${panelId}-opt-${it.Id}`);

                if (cb) {

                    cb.checked = ev.target.checked;
                }
            });

            updateChecklistButtonLabel(btnId, stateKey);

            syncChecklistUI();
            if (document.getElementById("modalEdicion")?.getAttribute("data-validacion-ui") === "1") {
                validarChecklistIndividual(btnId, selected.size > 0);
            }
        });

    items.forEach(it => {

        const cb = document.getElementById(`${panelId}-opt-${it.Id}`);

        if (!cb) return;

        cb.addEventListener('change', (ev) => {

            const id = Number(ev.target.getAttribute('data-id'));

            if (ev.target.checked) {

                selected.add(id);

            } else {

                selected.delete(id);
            }

            updateChecklistButtonLabel(btnId, stateKey);

            syncChecklistUI();
            if (document.getElementById("modalEdicion")?.getAttribute("data-validacion-ui") === "1") {
                validarChecklistIndividual(btnId, selected.size > 0);
            }

            const allC = items.length > 0 &&
                items.every(x => selected.has(Number(x.Id)));

            const allBox = document.getElementById(`${panelId}-all`);

            if (allBox) {

                allBox.checked = allC;
            }
        });
    });

    updateChecklistButtonLabel(btnId, stateKey);
}
function updateChecklistButtonLabel(btnId, stateKey) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    const set = MultiState[stateKey];
    const ids = [...set];
    const map = stateKey === 'talles' ? Catalogos.tallesMap : Catalogos.coloresMap;
    const textos = ids.map(id => map.get(Number(id))).filter(Boolean);
    btn.textContent = textos.length ? textos.join(', ') : (stateKey === 'talles' ? 'Seleccionar talles' : 'Seleccionar colores');
    btn.title = textos.join(', ');
}

function getTallesSeleccionados() {
    return MultiState.talles.size ? [...MultiState.talles] : getMultiSelectValues('cmbTalles');
}
function getColoresSeleccionados() {
    return MultiState.colores.size ? [...MultiState.colores] : getMultiSelectValues('cmbColores');
}

/* =========================
   Precios por lista
   ========================= */

async function renderPreciosListas(valores = []) {
    if (!Catalogos.listasPrecios.length) {
        const r = await fetch('/ListasPrecios/Lista', {
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            }
        });
        Catalogos.listasPrecios = await r.json(); // [{Id, Nombre}]
    }
    const mapValores = new Map(valores.map(x => {
        const idL = x.IdListaPrecio ?? x.idListaPrecio;
        const prec = x.PrecioUnitario ?? x.precioUnitario;
        return [Number(idL), Number(prec)];
    }));

    const wrap = document.getElementById('wrapPreciosListas');
    if (!wrap) return;
    wrap.innerHTML = '';
    Catalogos.listasPrecios.forEach(lp => {
        const numVal = mapValores.get(Number(lp.Id));
        const valueAttr = numVal != null && numVal !== "" && !isNaN(Number(numVal))
            ? formatPrecioCampoProducto(Number(numVal))
            : "";
        const nombreSeg = String(lp.Nombre ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/"/g, "&quot;");
        wrap.insertAdjacentHTML('beforeend', `
      <div class="col-md-6 col-lg-4">
        <div class="pr-precio-fila">
          <span class="pr-precio-fila__label">${nombreSeg}</span>
          <input type="text" inputmode="decimal" class="form-control pr-precio-input" id="lp_${lp.Id}" value="${valueAttr}" autocomplete="off">
        </div>
      </div>
    `);
    });
}

function getPreciosPorListaFromUI() {
    return (Catalogos.listasPrecios || []).map(lp => {
        const raw = document.getElementById('lp_' + lp.Id)?.value;
        const v = parsePrecioInputProducto(raw ?? '');
        return raw != null && String(raw).trim() !== '' && !isNaN(v) && v >= 0
            ? { idListaPrecio: Number(lp.Id), precioUnitario: v }
            : null;
    }).filter(Boolean);
}

/* =========================
   Precios en UI (miles / decimales) vs guardado (número)
   Reutiliza formatNumber de site.js: "$ 1.234,56"
   ========================= */

function formatPrecioCampoProducto(n) {
    if (typeof n !== "number" || isNaN(n)) return "";
    if (typeof formatNumber === "function") return formatNumber(n);
    return n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Miles con punto (es-AR), sin forzar decimales hasta blur */
function addThousandsFromRight(digitsOnly) {
    const d = String(digitsOnly || "").replace(/\D/g, "");
    if (!d) return "";
    const rev = d.split("").reverse().join("");
    const chunks = rev.match(/\d{1,3}/g) || [];
    return chunks.map((chunk) => chunk.split("").reverse().join("")).reverse().join(".");
}

function extractPrecioTypingParts(str) {
    const t = String(str ?? "").replace(/\$/g, "").replace(/\s/g, "");
    if (!t) return { intDigits: "", decDigits: "", hasComma: false };
    const commaIdx = t.lastIndexOf(",");
    if (commaIdx === -1) {
        return { intDigits: t.replace(/\./g, "").replace(/\D/g, ""), decDigits: "", hasComma: false };
    }
    const intP = t.slice(0, commaIdx).replace(/\./g, "").replace(/\D/g, "");
    const decP = t.slice(commaIdx + 1).replace(/\D/g, "").slice(0, 2);
    return { intDigits: intP, decDigits: decP, hasComma: true };
}

function buildPrecioLiveDisplay(intDigitsRaw, decDigitsRaw, hasComma) {
    let intd = String(intDigitsRaw || "").replace(/\D/g, "");
    intd = intd.replace(/^0+(?=\d)/, "");
    const dec = String(decDigitsRaw || "").replace(/\D/g, "").slice(0, 2);

    if (!intd && !hasComma && !dec) return "";

    if (!intd && (hasComma || dec)) intd = "0";

    const intFmt = intd ? addThousandsFromRight(intd) : "0";
    const pref = "$ ";

    if (!hasComma && !dec) return `${pref}${intFmt}`;
    if (hasComma && !dec) return `${pref}${intFmt},`;
    return `${pref}${intFmt},${dec}`;
}

function digitOffsetBeforeCaret(s, caret) {
    const end = Math.min(caret ?? 0, String(s).length);
    let n = 0;
    for (let i = 0; i < end; i++) {
        if (/\d/.test(s[i])) n++;
    }
    return n;
}

function posAfterNthDigit(display, n) {
    if (!display) return 0;
    if (n <= 0) {
        for (let i = 0; i < display.length; i++) {
            if (/\d/.test(display[i])) return i + 1;
        }
        return display.length;
    }
    let seen = 0;
    for (let i = 0; i < display.length; i++) {
        if (/\d/.test(display[i])) {
            seen++;
            if (seen === n) return i + 1;
        }
    }
    return display.length;
}

function applyPrecioMientrasEscribe(el) {
    if (!el || el.disabled || el.readOnly) return;
    if (el.dataset.prPrecioComposing === "1") return;

    const oldVal = el.value;
    const caret = el.selectionStart ?? oldVal.length;
    const commaOld = oldVal.lastIndexOf(",");
    const hadCaretAfterComma = commaOld !== -1 && caret > commaOld;

    const parts = extractPrecioTypingParts(oldVal);
    const newVal = buildPrecioLiveDisplay(parts.intDigits, parts.decDigits, parts.hasComma);

    if (newVal === oldVal) return;

    el.dataset.prPrecioApplying = "1";
    el.value = newVal;

    const digitsBefore = digitOffsetBeforeCaret(oldVal, caret);
    let newPos = posAfterNthDigit(newVal, digitsBefore);
    if (hadCaretAfterComma) {
        const nc = newVal.indexOf(",");
        if (nc !== -1 && newPos <= nc) newPos = nc + 1;
    }
    if (caret >= oldVal.length) newPos = newVal.length;
    newPos = Math.max(0, Math.min(newPos, newVal.length));
    try {
        el.setSelectionRange(newPos, newPos);
    } catch (_) { /* noop */ }

    window.requestAnimationFrame(() => {
        delete el.dataset.prPrecioApplying;
    });
}

function finalizarPrecioCampoProducto(el) {
    if (!el || el.disabled || el.readOnly) return;
    const raw = el.value;
    if (!String(raw).trim()) {
        el.value = "";
        return;
    }
    const n = parsePrecioInputProducto(raw);
    if (!isNaN(n) && n >= 0) {
        el.value = formatPrecioCampoProducto(n);
    }
}

function parsePrecioInputProducto(raw) {
    if (raw == null) return NaN;
    let s = String(raw).trim();
    if (!s) return NaN;
    s = s.replace(/\$/g, "").replace(/\s/g, "");
    const lastComma = s.lastIndexOf(",");
    if (lastComma !== -1) {
        const intPart = s.slice(0, lastComma).replace(/\./g, "").replace(/[^\d]/g, "");
        const decPart = s.slice(lastComma + 1).replace(/[^\d]/g, "");
        return parseFloat(`${intPart || "0"}.${decPart || "0"}`);
    }
    const only = s.replace(/[^\d.]/g, "");
    const parts = only.split(".");
    if (parts.length > 2) {
        return parseFloat(parts.join(""));
    }
    if (parts.length === 2) {
        const decLen = parts[1].length;
        if (decLen <= 2 && parts[0] !== "") {
            return parseFloat(`${parts[0]}.${parts[1]}`);
        }
        return parseFloat(parts.join(""));
    }
    return parseFloat(parts[0] || "NaN");
}

function bindPrecioInputsProductos() {

    const $modal = $("#modalEdicion");

    $modal.off("input.prPrecio", ".pr-precio-input")
        .on("input.prPrecio", ".pr-precio-input", function () {

            const el = this;

            if (el.dataset.prPrecioApplying === "1") return;

            applyPrecioMientrasEscribe(el);
        });

    $modal.off("compositionstart.prPrecio", ".pr-precio-input")
        .on("compositionstart.prPrecio", ".pr-precio-input", function () {

            this.dataset.prPrecioComposing = "1";
        });

    $modal.off("compositionend.prPrecio", ".pr-precio-input")
        .on("compositionend.prPrecio", ".pr-precio-input", function () {

            delete this.dataset.prPrecioComposing;

            applyPrecioMientrasEscribe(this);
        });

    $modal.off("paste.prPrecio", ".pr-precio-input")
        .on("paste.prPrecio", ".pr-precio-input", function (e) {

            const el = this;

            const ev = e.originalEvent || e;

            const text = (ev.clipboardData || window.clipboardData).getData("text") || "";

            e.preventDefault();

            const n = parsePrecioInputProducto(text.trim());

            if (!isNaN(n) && n >= 0) {

                const fixed = n.toFixed(2);

                const [ip, dp] = fixed.split(".");

                el.value = buildPrecioLiveDisplay(ip, dp, true);

                try {

                    el.setSelectionRange(el.value.length, el.value.length);

                } catch (_) { }
            }
        });

    $modal.off("focusout.prPrecio", ".pr-precio-input")
        .on("focusout.prPrecio", ".pr-precio-input", function () {

            finalizarPrecioCampoProducto(this);

            validarCampoIndividualProducto("#" + this.id);
        });
}
/* =========================
   Utils
   ========================= */

function escapeRegex(text) {
    return (text + '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function validarCampoIndividualProducto(selector) {

    const $el = $(selector);

    if (!$el.length)
        return true;

    const id = $el.attr("id");

    let ok = true;

    switch (id) {

        case "txtNombre":

            ok = ($("#txtNombre").val() || "").trim() !== "";

            break;

        case "txtPrecio":

            const precio = ($("#txtPrecio").val() ?? "")
                .toString()
                .trim();

            const precioNum = parsePrecioInputProducto(precio);

            ok = precio !== ""
                && !isNaN(precioNum)
                && precioNum >= 0;

            break;

        case "cmbCategoria":

            ok = !!$("#cmbCategoria").val();

            break;
    }

    $el.toggleClass("is-invalid", !ok);
    $el.toggleClass("is-valid", ok);

    const $feedback = $el.closest(".col-md-3, .col-md-4, .col-md-6, .col-12")
        .find(".invalid-feedback")
        .first();

    if ($feedback.length) {

        $feedback.toggle(ok === false);
    }

    if (id === "cmbCategoria") {

        const $s2 = $("#cmbCategoria").next(".select2");

        if ($s2.length) {

            $s2.find(".select2-selection")
                .toggleClass("is-invalid", !ok)
                .toggleClass("is-valid", ok);
        }
    }

    return ok;
}
function validarChecklistIndividual(btnId, ok) {

    $("#" + btnId)
        .toggleClass("is-invalid", !ok);

    if (btnId === "btnTalles") {

        $("#hintTalles")
            .toggleClass("text-danger", !ok)
            .toggleClass("text-muted", ok)
            .text(ok
                ? "Podés seleccionar múltiples talles"
                : "Debes seleccionar al menos 1 talle.");
    }

    if (btnId === "btnColores") {

        $("#hintColores")
            .toggleClass("text-danger", !ok)
            .toggleClass("text-muted", ok)
            .text(ok
                ? "Podés seleccionar múltiples colores"
                : "Debes seleccionar al menos 1 color.");
    }
}

function syncChecklistUI() {
    updateChecklistButtonLabel('btnTalles', 'talles');
    updateChecklistButtonLabel('btnColores', 'colores');

    const okTalles = MultiState.talles.size > 0;
    const okColores = MultiState.colores.size > 0;
    const muted = document.getElementById("modalEdicion")?.getAttribute("data-validacion-ui") === "0";

    if (!muted) {
        $("#btnTalles").toggleClass("is-invalid", !okTalles);
        $("#btnColores").toggleClass("is-invalid", !okColores);
        actualizarMensajesChecklist(okTalles, okColores, true);
    } else {
        $("#btnTalles, #btnColores").removeClass("is-invalid");
        actualizarMensajesChecklist(okTalles, okColores, false);
    }

    // Ocultar banner de error si ya está todo OK
    if (okTalles && okColores) {
        $('#errorCampos').addClass('d-none').text('');
    }
}

/* =========================
   Atajos “+” (Levels-style) → modal configuración NavBarLogin
   (sin permisos extra: quien puede usar la pantalla usa los atajos)
   ========================= */

function aplicarPendienteSeleccionCatalogoProducto(pending) {
    if (!pending || pending.nuevoId == null) return;
    const nid = Number(pending.nuevoId);
    if (!Number.isFinite(nid) || nid <= 0) return;

    switch (pending.tipo) {
        case "ProductosCategoria":
            repoblarSelectCategoriaProducto(String(nid));
            break;
        case "ProductosCategoriasTalle":
            MultiState.talles.add(nid);
            renderChecklist("listaTalles", Catalogos.talles, "talles", "btnTalles");
            syncChecklistUI();
            if (document.getElementById("modalEdicion")?.getAttribute("data-validacion-ui") === "1") {
                validarCampos(true);
            }
            break;
        case "Colores":
            MultiState.colores.add(nid);
            renderChecklist("listaColores", Catalogos.colores, "colores", "btnColores");
            syncChecklistUI();
            if (document.getElementById("modalEdicion")?.getAttribute("data-validacion-ui") === "1") {
                validarCampos(true);
            }
            break;
        case "ListasPrecios":
            document.getElementById("lp_" + nid)?.focus();
            break;
        default:
            break;
    }
}

async function refrescarCatalogosTrasConfiguracionProducto() {
    const pend = pendingSeleccionCatalogoProducto;
    pendingSeleccionCatalogoProducto = null;

    const catVal = $("#cmbCategoria").val();
    const preciosRaw = getPreciosPorListaFromUI();
    const preciosNorm = preciosRaw.map(x => ({
        IdListaPrecio: x.idListaPrecio,
        PrecioUnitario: x.precioUnitario
    }));

    await Promise.all([cargarCategorias(catVal), cargarColores()]);

    const idCat = parseInt(catVal || "0", 10) || 0;
    await recargarTallesPorCategoria(idCat);

    Catalogos.listasPrecios = [];
    await renderPreciosListas(preciosNorm);

    renderChecklist("listaColores", Catalogos.colores, "colores", "btnColores");
    syncChecklistUI();
    if (document.getElementById("modalEdicion")?.getAttribute("data-validacion-ui") === "1") {
        validarCampos(true);
    }

    aplicarPendienteSeleccionCatalogoProducto(pend);
}

function bindAtajosCatalogosProducto() {
    const modalCfg = document.getElementById("modalConfiguracion");
    if (modalCfg && !modalCfg.dataset.productosAtajoRefresh) {
        modalCfg.dataset.productosAtajoRefresh = "1";
        modalCfg.addEventListener("hidden.bs.modal", async () => {
            const prod = document.getElementById("modalEdicion");
            if (!prod || !prod.classList.contains("show")) return;
            await refrescarCatalogosTrasConfiguracionProducto();
        });
    }

    if (!document.documentElement.dataset.productosConfigInsertListener) {
        document.documentElement.dataset.productosConfigInsertListener = "1";
        document.addEventListener("configuracionActualizada", (e) => {
            const prod = document.getElementById("modalEdicion");
            if (!prod || !prod.classList.contains("show")) return;
            const d = e.detail || {};
            if (d.accion !== "insertar") return;
            const raw = d.nuevoId ?? d.NuevoId;
            if (raw == null || raw === "") return;
            const nuevoId = Number(raw);
            if (!Number.isFinite(nuevoId) || nuevoId <= 0) return;
            const tipo = d.tipo || "";
            const soportados = ["ProductosCategoria", "ProductosCategoriasTalle", "Colores", "ListasPrecios"];
            if (!soportados.includes(tipo)) return;
            pendingSeleccionCatalogoProducto = { tipo, nuevoId };
        });
    }

    $(document).off("click.productosAtajo", "#btnPlusCategoria").on("click.productosAtajo", "#btnPlusCategoria", async function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (typeof window.abrirConfiguracion !== "function") {
            errorModal("Acción no disponible.");
            return;
        }
        await window.abrirConfiguracion("Productos Categorias", "ProductosCategoria", null, null, null, true);
    });

    $(document).off("click.productosAtajo", "#btnPlusTalles").on("click.productosAtajo", "#btnPlusTalles", async function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (typeof window.abrirConfiguracion !== "function") {
            errorModal("Acción no disponible.");
            return;
        }
        const idCat = parseInt($("#cmbCategoria").val() || "0", 10);
        if (!idCat) {
            errorModal("Seleccioná primero una categoría de producto.");
            return;
        }
        await window.abrirConfiguracion(
            "Productos Categorias Talles",
            "ProductosCategoriasTalle",
            "Productos Categoria",
            "ProductosCategoria",
            "Categoria",
            true,
            idCat
        );
    });

    $(document).off("click.productosAtajo", "#btnPlusColores").on("click.productosAtajo", "#btnPlusColores", async function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (typeof window.abrirConfiguracion !== "function") {
            errorModal("Acción no disponible.");
            return;
        }
        await window.abrirConfiguracion("Color", "Colores", null, null, null, true);
    });

    $(document).off("click.productosAtajo", "#btnPlusListaPrecios").on("click.productosAtajo", "#btnPlusListaPrecios", async function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (typeof window.abrirConfiguracion !== "function") {
            errorModal("Acción no disponible.");
            return;
        }
        await window.abrirConfiguracion("Lista de Precios", "ListasPrecios", null, null, null, true);
    });
}


