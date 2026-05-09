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

let pendingSeleccionCatalogoInsumo = null;

/** Se pone en true al abrir configuración desde el + del modal insumo (no depender solo de `window.esModoAtajo`). */
let insumosPedirRefrescoTrasInsertConfig = false;

/** true si el guardado viene del flujo + atajo (NavBar manda `detail.esAtajo`; fallback por compat). */
function insumosEventoConfiguracionEsAtajo(d) {
    if (d && d.esAtajo === false) return false;
    if (d && d.esAtajo === true) return true;
    return window.esModoAtajo === true || window.esModoAtajo === 1 || window.esModoAtajo === "true" || window.esModoAtajo === "1";
}

function destruirSelect2CombosInsumo() {
    ["cmbCategoria", "cmbProveedor"].forEach((id) => {
        const $s = $("#" + id);
        if ($s.length && $s.hasClass("select2-hidden-accessible")) {
            $s.select2("destroy");
        }
    });
}

/** Con modales apilados `#modalEdicion` puede perder `.show` y `initSelect2` del site no inicializa; forzamos solo estos combos. */
function inicializarSelect2CombosInsumoSiHaceFalta() {
    const $modal = $("#modalEdicion");
    if (!$modal.length || !(window.jQuery && $.fn.select2)) return;
    ["cmbCategoria", "cmbProveedor"].forEach((id) => {
        const $s = $("#" + id);
        if (!$s.length || $s.hasClass("no-select2") || $s.is('[data-no-select2="1"]')) return;
        if ($s.hasClass("select2-hidden-accessible")) return;
        $s.select2({
            width: "100%",
            dropdownParent: $modal
        });
    });
}

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
    Permisos.init();
    Permisos.aplicarUI("Insumos");
    await Promise.all([
        cargarCategorias(),
        cargarProveedores()
    ]);

    await listaInsumos();

    if (typeof attachLiveValidation === 'function') {
        attachLiveValidation('#modalEdicion');
    }
    if (typeof wireSelect2Validation === "function") {
        wireSelect2Validation("#modalEdicion");
    }

    $("#cmbCategoria, #cmbProveedor")
        .off("select2:close.insumosBlur")
        .on("select2:close.insumosBlur", function () {
            if ($(this).prop("disabled")) return;
            validarSelectIndividualInsumo("#" + this.id);
        });

    bindAtajosCatalogosInsumo();
    bindCostoInputInsumos();
});

/* =========================
   Crear / Editar
   ========================= */

function limpiarEstilosValidacionInsumo() {
    $("#errorCampos").addClass("d-none").text("Debes completar los campos obligatorios.");
    $("#txtCodigo, #txtDescripcion, #txtCosto, #cmbCategoria, #cmbProveedor").removeClass("is-invalid is-valid");
    const $s2cat = $("#cmbCategoria").next(".select2");
    if ($s2cat.length) $s2cat.find(".select2-selection").removeClass("is-invalid is-valid");
    const $s2prov = $("#cmbProveedor").next(".select2");
    if ($s2prov.length) $s2prov.find(".select2-selection").removeClass("is-invalid is-valid");
}

function camposInsumoOk() {
    const codigo = ($("#txtCodigo").val() || '').trim();
    const descripcion = ($("#txtDescripcion").val() || '').trim();
    const idCat = $("#cmbCategoria").val();
    const idProv = $("#cmbProveedor").val();
    const costo = ($("#txtCosto").val() ?? "").toString().trim();
    const costoNum = parseCostoInputInsumo(costo);

    const okCodigo = codigo !== '';
    const okDesc = descripcion !== '';
    const okCat = !!idCat;
    const okProv = !!idProv;
    const okCosto = costo !== '' && !isNaN(costoNum) && costoNum >= 0;

    return okCodigo && okDesc && okCat && okProv && okCosto;
}

function validarCampos(forzarUI = false) {
    const ok = camposInsumoOk();
    const modal = document.getElementById("modalEdicion");
    if (!forzarUI && modal && modal.getAttribute("data-validacion-ui") === "0") {
        return ok;
    }

    const codigo = ($("#txtCodigo").val() || '').trim();
    const descripcion = ($("#txtDescripcion").val() || '').trim();
    const idCat = $("#cmbCategoria").val();
    const idProv = $("#cmbProveedor").val();
    const costo = ($("#txtCosto").val() ?? "").toString().trim();
    const costoNum = parseCostoInputInsumo(costo);

    const okCodigo = codigo !== '';
    const okDesc = descripcion !== '';
    const okCat = !!idCat;
    const okProv = !!idProv;
    const okCosto = costo !== '' && !isNaN(costoNum) && costoNum >= 0;

    if (typeof setInvalid === "function" && typeof setValid === "function") {
        if (!okCodigo) setInvalid("#txtCodigo", "Campo obligatorio"); else setValid("#txtCodigo");
        if (!okDesc) setInvalid("#txtDescripcion", "Campo obligatorio"); else setValid("#txtDescripcion");
        if (!okCat) setInvalid("#cmbCategoria", "Campo obligatorio"); else setValid("#cmbCategoria");
        if (!okProv) setInvalid("#cmbProveedor", "Campo obligatorio"); else setValid("#cmbProveedor");
        if (!okCosto) setInvalid("#txtCosto", "Campo obligatorio"); else setValid("#txtCosto");
    } else {
        $("#txtCodigo").toggleClass("is-invalid", !okCodigo);
        $("#txtDescripcion").toggleClass("is-invalid", !okDesc);
        $("#cmbCategoria").toggleClass("is-invalid", !okCat);
        $("#cmbProveedor").toggleClass("is-invalid", !okProv);
        $("#txtCosto").toggleClass("is-invalid", !okCosto);
    }

    const $s2cat = $("#cmbCategoria").next(".select2");
    if ($s2cat.length) {
        $s2cat.find(".select2-selection")
            .toggleClass("is-invalid", !okCat)
            .toggleClass("is-valid", okCat && !!idCat);
    }
    const $s2prov = $("#cmbProveedor").next(".select2");
    if ($s2prov.length) {
        $s2prov.find(".select2-selection")
            .toggleClass("is-invalid", !okProv)
            .toggleClass("is-valid", okProv && !!idProv);
    }

    $("#errorCampos")
        .toggleClass('d-none', ok)
        .text('Debes completar los campos obligatorios.');

    return ok;
}

async function guardarCambios() {

    if (!camposInsumoOk()) {

        if (typeof forzarValidacionModal === "function") {

            forzarValidacionModal("#modalEdicion", "#errorCampos");

        } else {

            document.getElementById("modalEdicion")
                ?.setAttribute("data-validacion-ui", "1");
        }

        validarCampos(true);

        return;
    }

    const id = $("#txtId").val();

    const modelo = {
        Id: id !== "" ? parseInt(id) : 0,
        Codigo: $("#txtCodigo").val().trim(),
        Descripcion: $("#txtDescripcion").val().trim(),
        IdCategoria: parseInt($("#cmbCategoria").val()),
        IdProveedor: parseInt($("#cmbProveedor").val()),
        CostoUnitario: parseCostoInputInsumo($("#txtCosto").val())
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

            if (!r.ok)
                throw new Error(r.statusText);

            return r.json();
        })
        .then(() => {

            $('#modalEdicion').modal('hide');

            exitoModal(
                id === ""
                    ? "Insumo registrado"
                    : "Insumo modificado"
            );

            listaInsumos();
        })
        .catch(err => {

            console.error('Error:', err);

            errorModal("No se pudo guardar el insumo.");
        });
}
function nuevoInsumo() {

    $("#modalEdicion")
        .attr("data-validacion-ui", "0");

    limpiarModal('#modalEdicion', '#errorCampos');

    limpiarEstilosValidacionInsumo();

    destruirSelect2CombosInsumo();

    if (document.getElementById('cmbCategoria'))
        llenarSelect('cmbCategoria', Catalogos.categorias);

    if (document.getElementById('cmbProveedor'))
        llenarSelect('cmbProveedor', Catalogos.proveedores);

    $("#btnGuardar")
        .removeClass("d-none")
        .text("Registrar");

    $("#modalEdicion input, #modalEdicion select, #modalEdicion textarea")
        .prop("disabled", false);

    $("#modalEdicionLabel")
        .text("Nuevo Insumo");

    $('#modalEdicion').modal('show');
}
async function mostrarModal(modelo, opts = {}) {

    const readOnly = !!opts.readOnly;

    $("#modalEdicion").attr("data-validacion-ui", "0");

    limpiarModal('#modalEdicion', '#errorCampos');
    limpiarEstilosValidacionInsumo();

    destruirSelect2CombosInsumo();

    if (document.getElementById('cmbCategoria')) {
        llenarSelect('cmbCategoria', Catalogos.categorias);
    }

    if (document.getElementById('cmbProveedor')) {
        llenarSelect('cmbProveedor', Catalogos.proveedores);
    }

    $("#txtId").val(modelo.Id ?? 0);
    $("#txtCodigo").val(modelo.Codigo ?? '');
    $("#txtDescripcion").val(modelo.Descripcion ?? '');

    const c = modelo.CostoUnitario;
    const n = typeof c === "number"
        ? c
        : parseCostoInputInsumo(c);

    $("#txtCosto").val(
        c != null && c !== "" && !isNaN(n)
            ? formatCostoCampoInsumo(n)
            : ""
    );

    $("#cmbCategoria").val(modelo.IdCategoria ?? '').trigger("change");
    $("#cmbProveedor").val(modelo.IdProveedor ?? '').trigger("change");

    limpiarEstilosValidacionInsumo();

    if (readOnly) {
        $("#modalEdicionLabel").text("Ver Insumo");
        $("#btnGuardar").addClass("d-none");

        $("#modalEdicion input, #modalEdicion select, #modalEdicion textarea")
            .prop("disabled", true);
    } else {
        $("#modalEdicionLabel").text("Editar Insumo");
        $("#btnGuardar").removeClass("d-none").text("Guardar");

        $("#modalEdicion input, #modalEdicion select, #modalEdicion textarea")
            .prop("disabled", false);
    }

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

async function verInsumo(id) {
    Permisos.init();
    if (!Permisos.tiene("Insumos", "Ver")) {
        errorModal("No tenés permisos.");
        return;
    }
    try {
        const r = await fetch("/Insumos/EditarInfo?id=" + id, {
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

const editarInsumo = id => {
    Permisos.init();
    if (!Permisos.tiene("Insumos", "Editar")) {
        errorModal("No tenés permisos.");
        return;
    }

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
        .then(dataJson => dataJson ? mostrarModal(dataJson, { readOnly: false }) : (() => { throw new Error("Ha ocurrido un error."); })())
        .catch(() => errorModal("Ha ocurrido un error."));
};

async function eliminarInsumo(id) {
    Permisos.init();
    if (!Permisos.tiene("Insumos", "Eliminar")) {
        errorModal("No tenés permisos.");
        return;
    }
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
                        return renderAccionesGrid(data, {
                            ver: "verInsumo",
                            editar: "editarInsumo",
                            eliminar: "eliminarInsumo"
                        }, "Insumos");
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
            buttons: dataTableButtonsExportCondicional("Insumos", [
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

                if (typeof configurarOpcionesColumnas === 'function') {
                    configurarOpcionesColumnas('#grd_Insumos', '#configColumnasMenu', 'Insumos_Columnas');
                }

                if (typeof bindDataTableSeleccionFila === "function") {
                    bindDataTableSeleccionFila("#grd_Insumos", "insumos");
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

function aplicarValorSelectPorIdDom(idDom, nid) {
    const $s = $("#" + idDom);
    if (!$s.length) return;
    const el = $s.get(0);
    let valStr = String(nid);
    if (el && el.querySelector) {
        const esc = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(valStr) : valStr.replace(/["\\]/g, "\\$&");
        if (!el.querySelector(`option[value="${esc}"]`)) {
            const match = Array.from(el.options || []).find((o) => Number(o.value) === nid);
            if (match) valStr = match.value;
        }
    }
    $s.val(valStr).trigger("change");
}

function aplicarPendienteSeleccionCatalogoInsumo(pending) {
    if (!pending || pending.nuevoId == null) return;
    const nid = Number(pending.nuevoId);
    if (!Number.isFinite(nid) || nid <= 0) return;

    switch (pending.tipo) {
        case "InsumosCategoria":
            aplicarValorSelectPorIdDom("cmbCategoria", nid);
            break;
        case "Proveedores":
            aplicarValorSelectPorIdDom("cmbProveedor", nid);
            break;
        default:
            break;
    }
}

async function refrescarCatalogosTrasConfiguracionInsumo() {
    const pend = pendingSeleccionCatalogoInsumo;
    pendingSeleccionCatalogoInsumo = null;

    const catVal = $("#cmbCategoria").val();
    const provVal = $("#cmbProveedor").val();

    destruirSelect2CombosInsumo();

    await Promise.all([cargarCategorias(), cargarProveedores()]);

    if (catVal) $("#cmbCategoria").val(catVal);
    if (provVal) $("#cmbProveedor").val(provVal);

    aplicarPendienteSeleccionCatalogoInsumo(pend);

    const ins = document.getElementById("modalEdicion");
    if (ins && typeof initSelect2 === "function") {
        if (ins.classList.contains("show")) {
            initSelect2(ins);
        } else {
            inicializarSelect2CombosInsumoSiHaceFalta();
        }
    }
    ["#cmbCategoria", "#cmbProveedor"].forEach((sel) => {
        const $x = $(sel);
        if ($x.length && $x.hasClass("select2-hidden-accessible")) {
            $x.trigger("change");
        }
    });
}

function bindAtajosCatalogosInsumo() {
    const modalCfg = document.getElementById("modalConfiguracion");
    if (modalCfg && !modalCfg.dataset.insumosAtajoRefresh) {
        modalCfg.dataset.insumosAtajoRefresh = "1";
        modalCfg.addEventListener("hidden.bs.modal", async () => {
            insumosPedirRefrescoTrasInsertConfig = false;
            if (!/\/Insumos/i.test(location.pathname || "")) return;
            if (!document.getElementById("modalEdicion")) return;
            if (!pendingSeleccionCatalogoInsumo) return;
            await refrescarCatalogosTrasConfiguracionInsumo();
        });
    }

    if (!document.documentElement.dataset.insumosConfigInsertListener) {
        document.documentElement.dataset.insumosConfigInsertListener = "1";
        document.addEventListener("configuracionActualizada", async (e) => {
            if (!/\/Insumos/i.test(location.pathname || "")) return;
            if (!document.getElementById("modalEdicion")) return;
            const d = e.detail || {};
            const desdeAtajo = insumosEventoConfiguracionEsAtajo(d) || insumosPedirRefrescoTrasInsertConfig;
            if (!desdeAtajo) return;
            if (d.accion !== "insertar") {
                insumosPedirRefrescoTrasInsertConfig = false;
                return;
            }
            const tipo = (d.tipo || "").trim();
            if (tipo !== "InsumosCategoria" && tipo !== "Proveedores") {
                insumosPedirRefrescoTrasInsertConfig = false;
                return;
            }
            const raw = d.nuevoId ?? d.NuevoId ?? d.nuevoID;
            const nuevoId = raw != null && raw !== "" ? Number(raw) : NaN;
            if (!Number.isFinite(nuevoId) || nuevoId <= 0) {
                try {
                    await Promise.all([cargarCategorias(), cargarProveedores()]);
                    const ins = document.getElementById("modalEdicion");
                    if (ins && ins.classList.contains("show") && typeof initSelect2 === "function") {
                        initSelect2(ins);
                    } else if (ins) {
                        inicializarSelect2CombosInsumoSiHaceFalta();
                    }
                } catch (err) {
                    console.error(err);
                } finally {
                    insumosPedirRefrescoTrasInsertConfig = false;
                }
                return;
            }
            pendingSeleccionCatalogoInsumo = { tipo, nuevoId };
            try {
                await refrescarCatalogosTrasConfiguracionInsumo();
            } catch (err) {
                console.error(err);
            } finally {
                insumosPedirRefrescoTrasInsertConfig = false;
            }
        });
    }

    $("#btnPlusCategoria").off("click").on("click", async () => {
        if (typeof window.abrirConfiguracion !== "function") return;
        insumosPedirRefrescoTrasInsertConfig = true;
        try {
            await window.abrirConfiguracion("Insumos Categorias", "InsumosCategoria", null, null, null, true);
        } catch (_) {
            insumosPedirRefrescoTrasInsertConfig = false;
        }
    });

    $("#btnPlusProveedor").off("click").on("click", async () => {
        if (typeof window.abrirConfiguracion !== "function") return;
        insumosPedirRefrescoTrasInsertConfig = true;
        try {
            await window.abrirConfiguracion("Proveedor", "Proveedores", null, null, null, true);
        } catch (_) {
            insumosPedirRefrescoTrasInsertConfig = false;
        }
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

/* =========================
   Costo Unitario en UI (igual criterio que Productos)
   ========================= */
function formatCostoCampoInsumo(n) {
    if (typeof n !== "number" || isNaN(n)) return "";
    if (typeof formatNumber === "function") return formatNumber(n);
    return n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseCostoInputInsumo(raw) {

    if (raw == null) return NaN;

    let s = String(raw).trim();

    if (s === "") return NaN;

    // sacar símbolo $
    s = s.replace(/\$/g, "");

    // sacar espacios
    s = s.replace(/\s/g, "");

    // formato argentino
    // 1.234,56 -> 1234.56
    s = s.replace(/\./g, "");
    s = s.replace(",", ".");

    const n = parseFloat(s);

    return isNaN(n) ? NaN : n;
}
function bindCostoInputInsumos() {

    const $modal = $("#modalEdicion");

    $modal
        .off("input.insCosto", ".ins-costo-input")
        .on("input.insCosto", ".ins-costo-input", function () {

            const raw = this.value;

            const num = raw.replace(/\D/g, "");

            if (!num) {

                this.value = "";

                return;
            }

            this.value = "$ " + Number(num).toLocaleString("es-AR");
        });

    $modal
        .off("focusout.insCosto", ".ins-costo-input")
        .on("focusout.insCosto", ".ins-costo-input", function () {

            const raw = this.value;

            if (!String(raw).trim()) {

                this.value = "";

                return;
            }

            const n = parseCostoInputInsumo(raw);

            if (!isNaN(n) && n >= 0) {

                this.value = formatCostoCampoInsumo(n);
            }
        });
}

function validarSelectIndividualInsumo(selector) {

    const val = $(selector).val();

    const ok = !!val;

    if (typeof setInvalid === "function" && typeof setValid === "function") {

        if (!ok)
            setInvalid(selector, "Campo obligatorio");
        else
            setValid(selector);
    }

    const $s2 = $(selector).next(".select2");

    if ($s2.length) {

        $s2.find(".select2-selection")
            .toggleClass("is-invalid", !ok)
            .toggleClass("is-valid", ok);
    }

    return ok;
}