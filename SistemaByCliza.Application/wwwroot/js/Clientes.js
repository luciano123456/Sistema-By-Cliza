// ========================= Clientes.js (completo) =========================
let gridClientes;

let pendingSeleccionCatalogoCliente = null;

/** Se pone en true al abrir configuración desde el + del modal cliente. */
let clientesPedirRefrescoTrasInsertConfig = false;

/** true si el guardado viene del flujo + atajo (NavBar manda `detail.esAtajo`; fallback por compat). */
function clientesEventoConfiguracionEsAtajo(d) {
    if (d && d.esAtajo === false) return false;
    if (d && d.esAtajo === true) return true;
    return window.esModoAtajo === true || window.esModoAtajo === 1 || window.esModoAtajo === "true" || window.esModoAtajo === "1";
}

function destruirSelect2CombosCliente() {
    ["cmbCondicionIva", "cmbListaPrecios", "cmbProvincia"].forEach((id) => {
        const $s = $("#" + id);
        if ($s.length && $s.hasClass("select2-hidden-accessible")) {
            $s.select2("destroy");
        }
    });
}

/** Con modales apilados `#modalEdicion` puede perder `.show` y `initSelect2` del site no inicializa; forzamos solo estos combos. */
function inicializarSelect2CombosClienteSiHaceFalta() {
    const $modal = $("#modalEdicion");
    if (!$modal.length || !(window.jQuery && $.fn.select2)) return;
    ["cmbCondicionIva", "cmbListaPrecios", "cmbProvincia"].forEach((id) => {
        const $s = $("#" + id);
        if (!$s.length || $s.hasClass("no-select2") || $s.is('[data-no-select2="1"]')) return;
        if ($s.hasClass("select2-hidden-accessible")) return;
        $s.select2({
            width: "100%",
            dropdownParent: $modal
        });
    });
}

function limpiarEstilosValidacionCliente() {
    $("#errorCampos").addClass("d-none").text("Debes completar los campos obligatorios.");
    $("#txtNombre").removeClass("is-invalid is-valid");
    if (typeof clearValidation === "function") {
        ["cmbCondicionIva", "cmbListaPrecios", "cmbProvincia"].forEach((id) => {
            const el = document.getElementById(id);
            if (el) clearValidation(el);
        });
    } else {
        $("#cmbCondicionIva, #cmbListaPrecios, #cmbProvincia").removeClass("is-invalid is-valid");
        ["cmbCondicionIva", "cmbListaPrecios", "cmbProvincia"].forEach((id) => {
            const $s2 = $("#" + id).next(".select2");
            if ($s2.length) {
                $s2.find(".select2-selection").removeClass("is-invalid is-valid");
            }
        });
    }
}

function validarSelectIndividualCliente(selector) {
    const val = $(selector).val();
    const ok = !!val;
    if (typeof setInvalid === "function" && typeof setValid === "function") {
        if (!ok) setInvalid(selector, "Campo obligatorio");
        else setValid(selector);
    }
    return ok;
}

function camposClienteOk() {
    const nombre = ($("#txtNombre").val() || "").trim();
    const okNombre = nombre !== "";
    const okIva = !!$("#cmbCondicionIva").val();
    const okLp = !!$("#cmbListaPrecios").val();
    const okProv = !!$("#cmbProvincia").val();
    return okNombre && okIva && okLp && okProv;
}

function validarCamposCliente(forzarUI = false) {
    const ok = camposClienteOk();
    const modal = document.getElementById("modalEdicion");
    if (!forzarUI && modal && modal.getAttribute("data-validacion-ui") === "0") {
        return ok;
    }

    const nombre = ($("#txtNombre").val() || "").trim();
    const okNombre = nombre !== "";
    const idIva = $("#cmbCondicionIva").val();
    const idLp = $("#cmbListaPrecios").val();
    const idProv = $("#cmbProvincia").val();
    const okIva = !!idIva;
    const okLp = !!idLp;
    const okProv = !!idProv;

    if (typeof setInvalid === "function" && typeof setValid === "function") {
        if (!okNombre) setInvalid("#txtNombre", "Campo obligatorio"); else setValid("#txtNombre");
        if (!okIva) setInvalid("#cmbCondicionIva", "Campo obligatorio"); else setValid("#cmbCondicionIva");
        if (!okLp) setInvalid("#cmbListaPrecios", "Campo obligatorio"); else setValid("#cmbListaPrecios");
        if (!okProv) setInvalid("#cmbProvincia", "Campo obligatorio"); else setValid("#cmbProvincia");
    } else {
        $("#txtNombre").toggleClass("is-invalid", !okNombre);
        $("#cmbCondicionIva").toggleClass("is-invalid", !okIva);
        $("#cmbListaPrecios").toggleClass("is-invalid", !okLp);
        $("#cmbProvincia").toggleClass("is-invalid", !okProv);
    }

    $("#errorCampos")
        .toggleClass("d-none", ok)
        .text("Debes completar los campos obligatorios.");

    return ok;
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

function aplicarPendienteSeleccionCatalogoCliente(pending) {
    if (!pending || pending.nuevoId == null) return;
    const nid = Number(pending.nuevoId);
    if (!Number.isFinite(nid) || nid <= 0) return;

    switch (pending.tipo) {
        case "CondicionesIVA":
            aplicarValorSelectPorIdDom("cmbCondicionIva", nid);
            break;
        case "ListasPrecios":
            aplicarValorSelectPorIdDom("cmbListaPrecios", nid);
            break;
        case "Provincias":
            aplicarValorSelectPorIdDom("cmbProvincia", nid);
            break;
        default:
            break;
    }
}

async function refrescarCatalogosTrasConfiguracionCliente() {
    const pend = pendingSeleccionCatalogoCliente;
    pendingSeleccionCatalogoCliente = null;

    const vIva = $("#cmbCondicionIva").val();
    const vLp = $("#cmbListaPrecios").val();
    const vProv = $("#cmbProvincia").val();

    destruirSelect2CombosCliente();

    await Promise.all([listaCondicionesIva(), listaListaPrecios(), listaProvincias()]);

    if (vIva) $("#cmbCondicionIva").val(vIva);
    if (vLp) $("#cmbListaPrecios").val(vLp);
    if (vProv) $("#cmbProvincia").val(vProv);

    aplicarPendienteSeleccionCatalogoCliente(pend);

    const cli = document.getElementById("modalEdicion");
    if (cli && typeof initSelect2 === "function") {
        if (cli.classList.contains("show")) {
            initSelect2(cli);
        } else {
            inicializarSelect2CombosClienteSiHaceFalta();
        }
    }
    ["#cmbCondicionIva", "#cmbListaPrecios", "#cmbProvincia"].forEach((sel) => {
        const $x = $(sel);
        if ($x.length && $x.hasClass("select2-hidden-accessible")) {
            $x.trigger("change");
        }
    });
}

function bindAtajosCatalogosCliente() {
    const modalCfg = document.getElementById("modalConfiguracion");
    if (modalCfg && !modalCfg.dataset.clientesAtajoRefresh) {
        modalCfg.dataset.clientesAtajoRefresh = "1";
        modalCfg.addEventListener("hidden.bs.modal", async () => {
            clientesPedirRefrescoTrasInsertConfig = false;
            if (!/\/Clientes/i.test(location.pathname || "")) return;
            if (!document.getElementById("modalEdicion")) return;
            if (!pendingSeleccionCatalogoCliente) return;
            await refrescarCatalogosTrasConfiguracionCliente();
        });
    }

    if (!document.documentElement.dataset.clientesConfigInsertListener) {
        document.documentElement.dataset.clientesConfigInsertListener = "1";
        document.addEventListener("configuracionActualizada", async (e) => {
            if (!/\/Clientes/i.test(location.pathname || "")) return;
            if (!document.getElementById("modalEdicion")) return;
            const d = e.detail || {};
            const desdeAtajo = clientesEventoConfiguracionEsAtajo(d) || clientesPedirRefrescoTrasInsertConfig;
            if (!desdeAtajo) return;
            if (d.accion !== "insertar") {
                clientesPedirRefrescoTrasInsertConfig = false;
                return;
            }
            const tipo = (d.tipo || "").trim();
            if (tipo !== "CondicionesIVA" && tipo !== "ListasPrecios" && tipo !== "Provincias") {
                clientesPedirRefrescoTrasInsertConfig = false;
                return;
            }
            const raw = d.nuevoId ?? d.NuevoId ?? d.nuevoID;
            const nuevoId = raw != null && raw !== "" ? Number(raw) : NaN;
            if (!Number.isFinite(nuevoId) || nuevoId <= 0) {
                try {
                    await Promise.all([listaCondicionesIva(), listaListaPrecios(), listaProvincias()]);
                    const cli = document.getElementById("modalEdicion");
                    if (cli && cli.classList.contains("show") && typeof initSelect2 === "function") {
                        initSelect2(cli);
                    } else if (cli) {
                        inicializarSelect2CombosClienteSiHaceFalta();
                    }
                } catch (err) {
                    console.error(err);
                } finally {
                    clientesPedirRefrescoTrasInsertConfig = false;
                }
                return;
            }
            pendingSeleccionCatalogoCliente = { tipo, nuevoId };
            try {
                await refrescarCatalogosTrasConfiguracionCliente();
            } catch (err) {
                console.error(err);
            } finally {
                clientesPedirRefrescoTrasInsertConfig = false;
            }
        });
    }

    $("#btnPlusCondicionIva").off("click.clientesAtajo").on("click.clientesAtajo", async () => {
        if (typeof window.abrirConfiguracion !== "function") return;
        clientesPedirRefrescoTrasInsertConfig = true;
        try {
            await window.abrirConfiguracion("Condiciones IVA", "CondicionesIVA", null, null, null, true);
        } catch (_) {
            clientesPedirRefrescoTrasInsertConfig = false;
        }
    });
    $("#btnPlusListaPrecios").off("click.clientesAtajo").on("click.clientesAtajo", async () => {
        if (typeof window.abrirConfiguracion !== "function") return;
        clientesPedirRefrescoTrasInsertConfig = true;
        try {
            await window.abrirConfiguracion("Lista de Precios", "ListasPrecios", null, null, null, true);
        } catch (_) {
            clientesPedirRefrescoTrasInsertConfig = false;
        }
    });
    $("#btnPlusProvincia").off("click.clientesAtajo").on("click.clientesAtajo", async () => {
        if (typeof window.abrirConfiguracion !== "function") return;
        clientesPedirRefrescoTrasInsertConfig = true;
        try {
            await window.abrirConfiguracion("Provincia", "Provincias", null, null, null, true);
        } catch (_) {
            clientesPedirRefrescoTrasInsertConfig = false;
        }
    });
}

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
    Permisos.init();
    Permisos.aplicarUI("Clientes");
    listaClientes();
    attachLiveValidation("#modalEdicion");
    if (typeof wireSelect2Validation === "function") {
        wireSelect2Validation("#modalEdicion");
    }
    $("#cmbCondicionIva, #cmbListaPrecios, #cmbProvincia")
        .off("select2:close.clientesBlur")
        .on("select2:close.clientesBlur", function () {
            if ($(this).prop("disabled")) return;
            validarSelectIndividualCliente("#" + this.id);
        });
    bindAtajosCatalogosCliente();
});

/* ======================= Crear / Editar ======================= */

function guardarCambios() {
    if (!camposClienteOk()) {
        if (typeof forzarValidacionModal === "function") {
            forzarValidacionModal("#modalEdicion", "#errorCampos");
        } else {
            document.getElementById("modalEdicion")?.setAttribute("data-validacion-ui", "1");
        }
        validarCamposCliente(true);
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
    if (!Permisos.tiene("Clientes", "Crear")) {
        errorModal("No tenés permisos.");
        return;
    }

    $("#modalEdicion").attr("data-validacion-ui", "0");
    limpiarModal("#modalEdicion", "#errorCampos");
    limpiarEstilosValidacionCliente();
    destruirSelect2CombosCliente();

    Promise.all([listaCondicionesIva(), listaListaPrecios(), listaProvincias()]).then(() => {
        $("#btnGuardar").removeClass("d-none").text("Registrar");
        $("#modalEdicion input, #modalEdicion select, #modalEdicion textarea").prop("disabled", false);
        $("#btnPlusCondicionIva, #btnPlusListaPrecios, #btnPlusProvincia").prop("disabled", false);
        $("#modalEdicionLabel").text("Nuevo Cliente");
        $("#modalEdicion").modal("show");
    });
}

async function mostrarModal(modelo, opts = {}) {
    const readOnly = !!opts.readOnly;

    $("#modalEdicion").attr("data-validacion-ui", "0");
    limpiarModal("#modalEdicion", "#errorCampos");
    limpiarEstilosValidacionCliente();
    destruirSelect2CombosCliente();

    await Promise.all([listaCondicionesIva(), listaListaPrecios(), listaProvincias()]);

    $("#txtId").val(modelo.Id ?? 0);
    $("#txtNombre").val(modelo.Nombre ?? "");
    $("#txtTelefono").val(modelo.Telefono ?? "");
    $("#txtTelefonoAlternativo").val(modelo.TelefonoAlternativo ?? "");
    $("#txtDni").val(modelo.Dni ?? "");
    $("#txtCuit").val(modelo.Cuit ?? "");
    $("#txtDomicilio").val(modelo.Domicilio ?? "");
    $("#txtLocalidad").val(modelo.Localidad ?? "");
    $("#txtEmail").val(modelo.Email ?? "");
    $("#txtCodigoPostal").val(modelo.CodigoPostal ?? "");

    $("#cmbCondicionIva").val(modelo.IdCondicionIva ?? "").trigger("change");
    $("#cmbListaPrecios").val(modelo.IdListaPrecio ?? "").trigger("change");
    $("#cmbProvincia").val(modelo.IdProvincia ?? "").trigger("change");

    limpiarEstilosValidacionCliente();

    $("#modalEdicionLabel").text(readOnly ? "Ver Cliente" : "Editar Cliente");
    if (readOnly) {
        $("#btnGuardar").addClass("d-none");
        $("#modalEdicion input, #modalEdicion select, #modalEdicion textarea").prop("disabled", true);
        $("#btnPlusCondicionIva, #btnPlusListaPrecios, #btnPlusProvincia").prop("disabled", true);
    } else {
        $("#btnGuardar").removeClass("d-none").text("Guardar");
        $("#modalEdicion input, #modalEdicion select, #modalEdicion textarea").prop("disabled", false);
        $("#btnPlusCondicionIva, #btnPlusListaPrecios, #btnPlusProvincia").prop("disabled", false);
    }

    $("#modalEdicion").modal("show");
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

async function verCliente(id) {
    Permisos.init();
    if (!Permisos.tiene("Clientes", "Ver")) {
        errorModal("No tenés permisos.");
        return;
    }
    try {
        const r = await fetch("/Clientes/EditarInfo?id=" + id, {
            method: "GET",
            headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" }
        });
        if (!r.ok) throw new Error();
        const json = await r.json();
        if (json) await mostrarModal(json, { readOnly: true });
        else throw new Error();
    } catch {
        errorModal("Ha ocurrido un error.");
    }
}

const editarCliente = id => {
    Permisos.init();
    if (!Permisos.tiene("Clientes", "Editar")) {
        errorModal("No tenés permisos.");
        return;
    }
    fetch("/Clientes/EditarInfo?id=" + id, {
        method: 'GET',
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
    })
        .then(r => { if (!r.ok) throw new Error("Ha ocurrido un error."); return r.json(); })
        .then(json => json ? mostrarModal(json, { readOnly: false }) : (() => { throw new Error("Ha ocurrido un error."); })())
        .catch(() => errorModal("Ha ocurrido un error."));
};

async function eliminarCliente(id) {
    Permisos.init();
    if (!Permisos.tiene("Clientes", "Eliminar")) {
        errorModal("No tenés permisos.");
        return;
    }
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
                        return renderAccionesGrid(data, {
                            ver: "verCliente",
                            editar: "editarCliente",
                            eliminar: "eliminarCliente"
                        }, "Clientes");
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
            buttons: dataTableButtonsExportCondicional("Clientes", [
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
            ]),
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

                if (typeof bindDataTableSeleccionFila === "function") {
                    bindDataTableSeleccionFila("#grd_Clientes", "clientes");
                }

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

/* ======================= Helpers de filtro por columna ======================= */
function escapeRegex(text) {
    return (text + '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
