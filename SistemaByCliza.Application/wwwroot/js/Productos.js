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

/* ========== Init ========== */
$(document).ready(async () => {
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

    // Fallback para toggleAcciones si no está global
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
function validarCampos() {
    const nombre = ($("#txtNombre").val() || '').trim();
    const categoria = $("#cmbCategoria").val();
    const precio = $("#txtPrecio").val();

    const tallesSel = getTallesSeleccionados();
    const coloresSel = getColoresSeleccionados();

    const okNombre = nombre !== '';
    const okCategoria = !!categoria;
    const okPrecio = precio !== '' && !isNaN(parseFloat(precio));
    const okTalles = Array.isArray(tallesSel) && tallesSel.length > 0;
    const okColores = Array.isArray(coloresSel) && coloresSel.length > 0;

    $("#errorCampos")
        .toggleClass('d-none', (okNombre && okCategoria && okPrecio && okTalles && okColores))
        .text((!okTalles || !okColores)
            ? 'Debes seleccionar al menos un talle y un color.'
            : 'Debes completar los campos obligatorios.');

    $('#btnTalles').toggleClass('is-invalid', !okTalles);
    $('#btnColores').toggleClass('is-invalid', !okColores);

    $("#txtNombre").toggleClass("is-invalid", !okNombre);
    $("#cmbCategoria").toggleClass("is-invalid", !okCategoria);
    $("#txtPrecio").toggleClass("is-invalid", !okPrecio);

    return okNombre && okCategoria && okPrecio && okTalles && okColores;
}

async function guardarCambios() {
    if (!validarCampos()) return;

    const idProducto = $("#txtId").val();
    const nuevoModelo = {
        Id: idProducto !== "" ? parseInt(idProducto) : 0,
        Descripcion: $("#txtNombre").val().trim(),
        IdCategoria: parseInt($("#cmbCategoria").val()),
        PrecioUnitario: parseFloat($("#txtPrecio").val()),
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
    limpiarModal('#modalEdicion', '#errorCampos');

    MultiState.talles.clear();
    MultiState.colores.clear();
    renderPreciosListas([]);

    if (document.getElementById('cmbCategoria')) llenarSelect('cmbCategoria', Catalogos.categorias);

    renderChecklist('listaTalles', Catalogos.talles, 'talles', 'btnTalles');
    renderChecklist('listaColores', Catalogos.colores, 'colores', 'btnColores');

    $("#cmbCategoria").off('change').on('change', async function () {
        const idCat = parseInt(this.value || 0);
        await recargarTallesPorCategoria(idCat);
        MultiState.talles.clear();
        renderChecklist('listaTalles', Catalogos.talles, 'talles', 'btnTalles');
        validarCampos();
    });

    $("#chkVariantes").prop("checked", true);
    $("#btnGuardar").text("Registrar");
    $("#modalEdicionLabel").text("Nuevo Producto");
    $('#modalEdicion').modal('show');
}

async function mostrarModal(modelo) {
    limpiarModal('#modalEdicion', '#errorCampos');

    if (document.getElementById('cmbCategoria')) llenarSelect('cmbCategoria', Catalogos.categorias);

    $("#txtId").val(modelo.Id ?? 0);
    $("#txtNombre").val(modelo.Descripcion ?? '');
    $("#txtPrecio").val(modelo.PrecioUnitario ?? '');
    $("#cmbCategoria").val(modelo.IdCategoria ?? '').trigger('change');
    $("#chkVariantes").prop("checked", true);

    const idCat = Number(modelo.IdCategoria || 0);
    await recargarTallesPorCategoria(idCat);

    renderPreciosListas(modelo.PreciosPorLista || []);

    MultiState.talles = new Set(modelo.IdTalles || []);
    MultiState.colores = new Set(modelo.IdColores || []);

    // Render con selección aplicada
    renderChecklist('listaTalles', Catalogos.talles, 'talles', 'btnTalles');
    renderChecklist('listaColores', Catalogos.colores, 'colores', 'btnColores');

    // 🔧 forzar UI/validación inicial para que NO queden en rojo
    syncChecklistUI();

    $("#cmbCategoria").off('change').on('change', async function () {
        const idCatChange = parseInt(this.value || 0);
        await recargarTallesPorCategoria(idCatChange);
        MultiState.talles.clear();                                 // al cambiar categoría se limpia selección
        renderChecklist('listaTalles', Catalogos.talles, 'talles', 'btnTalles');
        validarCampos();                                           // actualizar estado de error
    });

    // Etiquetas del modal
    $("#btnGuardar").text("Guardar");
    $("#modalEdicionLabel").text("Editar Producto");
    $('#modalEdicion').modal('show');
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

const editarProducto = id => {
    $('.acciones-dropdown').hide();

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
        .then(dataJson => dataJson ? mostrarModal(dataJson) : (() => { throw new Error("Ha ocurrido un error."); })())
        .catch(() => errorModal("Ha ocurrido un error."));
};

async function eliminarProducto(id) {
    $('.acciones-dropdown').hide();
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
                        return `
                <div class="acciones-menu" data-id="${data}">
                    <button class='btn btn-sm btnacciones' type='button' onclick='toggleAcciones(${data})' title='Acciones'>
                        <i class='fa fa-ellipsis-v fa-lg text-white' aria-hidden='true'></i>
                    </button>
                    <div class="acciones-dropdown" style="display: none;">
                        <button class='btn btn-sm btneditar' type='button' onclick='editarProducto(${data})' title='Editar'>
                            <i class='fa fa-pencil-square-o fa-lg text-success' aria-hidden='true'></i> Editar
                        </button>
                        <button class='btn btn-sm btneliminar' type='button' onclick='eliminarProducto(${data})' title='Eliminar'>
                            <i class='fa fa-trash-o fa-lg text-danger' aria-hidden='true'></i> Eliminar
                        </button>
                    </div>
                </div>`;
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
            buttons: [
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

                // Dropdown de columnas (si tu helper existe)
                if (typeof configurarOpcionesColumnas === 'function') {
                    configurarOpcionesColumnas('#grd_Productos', '#configColumnasMenu', 'Productos_Columnas');
                }

                setTimeout(() => gridProductos.columns.adjust(), 10);

                // KPI: actualizar en cada draw (filtrado/paginado/ordenado)
                $('#grd_Productos').on('draw.dt', actualizarKpisProductos);
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

function cargarCategorias() {
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
            if (document.getElementById('cmbCategoria')) llenarSelect('cmbCategoria', data);
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
   Checklists Talles / Colores
   ========================= */

function toggleChecklist(btnId, panelId) {
    const panel = document.getElementById(panelId);
    panel?.classList.toggle('d-none');
}

document.addEventListener('click', (e) => {
    ['listaTalles', 'listaColores'].forEach(pid => {
        const panel = document.getElementById(pid);
        const btn = document.getElementById(pid === 'listaTalles' ? 'btnTalles' : 'btnColores');
        if (!panel || panel.classList.contains('d-none')) return;
        if (!panel.contains(e.target) && !btn.contains(e.target)) panel.classList.add('d-none');
    });
});

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
        <input class="form-check-input" type="checkbox" id="${panelId}-opt-${it.Id}" data-id="${it.Id}" ${checked}>
        <label class="form-check-label" for="${panelId}-opt-${it.Id}">${it.Nombre}</label>
      </div>
    `);
    }
    panel.innerHTML = html.join('');

    document.getElementById(`${panelId}-all`).addEventListener('change', (ev) => {
        selected.clear();
        if (ev.target.checked) items.forEach(it => selected.add(Number(it.Id)));
        items.forEach(it => {
            const cb = document.getElementById(`${panelId}-opt-${it.Id}`);
            if (cb) cb.checked = ev.target.checked;
        });
        updateChecklistButtonLabel(btnId, stateKey);
        validarCampos();
    });

    items.forEach(it => {
        const cb = document.getElementById(`${panelId}-opt-${it.Id}`);
        if (!cb) return;
        cb.addEventListener('change', (ev) => {
            const id = Number(ev.target.getAttribute('data-id'));
            if (ev.target.checked) selected.add(id); else selected.delete(id);
            updateChecklistButtonLabel(btnId, stateKey);
            validarCampos();
            const allC = items.length > 0 && items.every(x => selected.has(Number(x.Id)));
            const allBox = document.getElementById(`${panelId}-all`);
            if (allBox) allBox.checked = allC;
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
    const mapValores = new Map(valores.map(x => [Number(x.IdListaPrecio), Number(x.PrecioUnitario)]));

    const wrap = document.getElementById('wrapPreciosListas');
    if (!wrap) return;
    wrap.innerHTML = '';
    Catalogos.listasPrecios.forEach(lp => {
        const value = mapValores.get(Number(lp.Id)) ?? '';
        wrap.insertAdjacentHTML('beforeend', `
      <div class="col-md-3">
        <div class="input-group">
          <span class="input-group-text">${lp.Nombre}</span>
          <input type="number" step="0.01" min="0" class="form-control" id="lp_${lp.Id}" value="${value}">
        </div>
      </div>
    `);
    });
}

function getPreciosPorListaFromUI() {
    return (Catalogos.listasPrecios || []).map(lp => {
        const v = parseFloat(document.getElementById('lp_' + lp.Id)?.value);
        return isNaN(v) ? null : { idListaPrecio: Number(lp.Id), precioUnitario: v };
    }).filter(Boolean);
}

/* =========================
   Utils
   ========================= */

function escapeRegex(text) {
    return (text + '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}



function syncChecklistUI() {
    updateChecklistButtonLabel('btnTalles', 'talles');
    updateChecklistButtonLabel('btnColores', 'colores');

    const okTalles = MultiState.talles.size > 0;
    const okColores = MultiState.colores.size > 0;

    $('#btnTalles').toggleClass('is-invalid', !okTalles);
    $('#btnColores').toggleClass('is-invalid', !okColores);

    // Ocultar banner de error si ya está todo OK
    if (okTalles && okColores) {
        $('#errorCampos').addClass('d-none').text('');
    }
}
