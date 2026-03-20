/******************************
 * CAJAS + TRANSFERENCIAS (UI)
 ******************************/

let gridCaja;
let gridTransf = null;

// Estado del modal de transferencias
// null => nueva transferencia
// { id, idCajaOrigen, idCajaDestino, conceptoOrigen, conceptoDestino } => edición
let editingTransfer = null;

/* ============================
   Config filtros (header DT)
   ============================ */

// columnas: 1 Fecha | 2 Tipo | 3 Concepto | 4 Ingreso | 5 Egreso | 6 Sucursal | 7 Cuenta
const columnConfig = [
    { index: 1, filterType: "text" },
    { index: 2, filterType: "select", fetchDataFunc: listaTiposFilter },
    { index: 3, filterType: "text" },
    { index: 4, filterType: "text" },
    { index: 5, filterType: "text" },
    { index: 6, filterType: "select", fetchDataFunc: listaSucursalesFilter },
    { index: 7, filterType: "select", fetchDataFunc: listaCuentasFilter },
];

/* ============================
   ARRANQUE
   ============================ */

$(document).ready(() => {
    initFiltros();               // filtros + primera carga
    attachLiveValidation("#modalEdicion"); // utilidad global

    ["#numImporte", "#cmbTipoMov"].forEach((sel) => {
        $(sel).on("input change", () => validarReglaMontos());
    });
});

/* ========== Validación movimiento manual ========== */
function validarReglaMontos() {
    const el = document.getElementById("numImporte");
    const v = parseFloat(formatearSinMiles(el.value));
    const ok = !isNaN(v) && v > 0;
    el.classList.toggle("is-invalid", !ok);
    if (ok) el.classList.remove("is-invalid");
    return ok;
}

function validarCamposCaja() {
    const okBasicos = verificarErroresGenerales("#modalEdicion", "#errorCampos");
    const okMontos = validarReglaMontos();
    const ok = okBasicos && okMontos;
    const err = document.querySelector("#errorCampos");
    if (err) err.classList.toggle("d-none", ok);
    return ok;
}

/* ========== Crear / Editar movimiento manual ========== */

function guardarCambios() {
    if (!validarCamposCaja()) return;

    const id = $("#txtId").val();
    const modelo = {
        Id: id ? parseInt(id) : 0,
        IdSucursal: Number($("#cmbSucursal").val()),
        IdCuenta: Number($("#cmbCuenta").val()),
        Fecha: $("#dtpFecha").val(),
        TipoMov: $("#cmbTipoMov").val(),
        Concepto: $("#txtConcepto").val().trim(),
        Importe: formatearSinMiles($("#numImporte").val()) || 0,
    };

    const url = id === "" ? "/Cajas/Insertar" : "/Cajas/Actualizar";
    const method = id === "" ? "POST" : "PUT";

    fetch(url, {
        method,
        headers: {
            Authorization: "Bearer " + token,
            "Content-Type": "application/json;charset=utf-8",
        },
        body: JSON.stringify(modelo),
    })
        .then((r) => {
            if (!r.ok) throw new Error(r.statusText);
            return r.json();
        })
        .then(() => {
            $("#modalEdicion").modal("hide");
            exitoModal(id === "" ? "Movimiento registrado correctamente" : "Movimiento modificado correctamente");
            if (window._fmCaja) window._fmCaja.search(); else listaCaja();
        })
        .catch((err) => {
            console.error("Error:", err);
            errorModal("No se pudo guardar.");
        });
}

function nuevoCaja() {
    limpiarModal("#modalEdicion", "#errorCampos");

    Promise.all([listaSucursales(), listaCuentas()]).then(() => {
        const hoyISO = new Date().toISOString().slice(0, 10);


        $("#cmbSucursal").val("").trigger("change");
        $("#cmbCuenta").val("").trigger("change");
        $("#dtpFecha").val(hoyISO);
        $("#cmbTipoMov").val("");
        $("#numImporte").val("");
        $("#txtConcepto").val("");

        $("#modalEdicionLabel").text("Nuevo Movimiento");
        $("#btnGuardar").text("Registrar");

        setModalEditableMovimiento(true);
        const btnDel = document.getElementById("btnEliminarMov");
        if (btnDel) btnDel.classList.add("d-none");

        $("#modalEdicion").modal("show");
    });
}

// habilita/deshabilita campos y el botón Guardar
function setModalEditableMovimiento(editable) {
    const $m = $("#modalEdicion");
    $m.find("#cmbSucursal, #cmbCuenta, #dtpFecha, #cmbTipoMov, #txtConcepto, #numImporte")
        .prop("disabled", !editable);
    $("#btnGuardar").toggleClass("d-none", !editable);
}

// Mostrar modal ver/editar
async function mostrarModalCaja(modelo) {
    limpiarModal("#modalEdicion", "#errorCampos");
    await Promise.all([listaSucursales(), listaCuentas()]);

    $("#txtId").val(modelo.Id ?? 0);
    $("#cmbSucursal").val(modelo.IdSucursal ?? "").trigger("change");
    $("#cmbCuenta").val(modelo.IdCuenta ?? "").trigger("change");
    $("#dtpFecha").val((modelo.Fecha || "").toString().substring(0, 10));
    $("#cmbTipoMov").val(modelo.TipoMov ?? "");
    $("#txtConcepto").val(modelo.Concepto ?? "");
    $("#numImporte").val(formatearMiles(modelo.Importe) ?? "");

    const esTransfer = !!modelo.EsTransferencia;
    const esUsuario = modelo.IdMov === null;
    const puedeEditar = !!modelo.PuedeEditar;
    const editable = esUsuario || esTransfer || puedeEditar;

    setModalEditableMovimiento(editable);

    const btnDel = document.getElementById("btnEliminarMov");
    if (btnDel) {
        const existe = !!modelo.Id && modelo.Id > 0;
        btnDel.classList.toggle("d-none", !(editable && existe));
    }

    $("#modalEdicionLabel").text(editable ? "Editar movimiento" : "Ver movimiento");
    $("#btnGuardar").text(editable ? "Guardar" : "Guardar");
    $("#modalEdicion").modal("show");
}

/* ========== Lista principal (DataTable) ========== */

async function listaCaja(filtros = {}) {
    let paginaActual = gridCaja != null ? gridCaja.page() : 0;

    const qs = new URLSearchParams();
    Object.entries(filtros).forEach(([k, v]) => {
        if (v !== '' && v != null) qs.append(k, v);
    });

    const resp = await fetch('/Cajas/Lista' + (qs.toString() ? `?${qs}` : ''), {
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
    });
    if (!resp.ok) { errorModal('Error obteniendo movimientos.'); return; }

    const json = await resp.json();
    let rows = Array.isArray(json) ? json : (json.Movimientos ?? json.movimientos ?? []);
    const saldoAnterior = Number(json.SaldoAnterior ?? json.saldoAnterior ?? 0);
    const fDesde = filtros.FechaDesde || filtros.desde || document.getElementById('fltDesde')?.value || '';

    const saldoRow = {
        Id: 0,
        Fecha: '',
        TipoMov: '',
        Concepto: fDesde ? `Saldo anterior al ${formatearFechaParaVista(fDesde)}` : `Saldo anterior`,
        Ingreso: 0,
        Egreso: 0,
        Sucursal: '',
        Cuenta: '',
        __isSaldo: true,
        __saldoAnterior: saldoAnterior
    };

    rows = [saldoRow, ...rows];

    await configurarDataTableCaja(rows);

    if (paginaActual > 0) gridCaja.page(paginaActual).draw('page');
    calcularIngresos();
}

async function configurarDataTableCaja(data) {
    if (!gridCaja) {
        $("#grd_Caja thead tr").clone(true).addClass("filters").appendTo("#grd_Caja thead");

        gridCaja = $("#grd_Caja").DataTable({
            data,
            language: { url: "//cdn.datatables.net/plug-ins/2.0.7/i18n/es-MX.json" },
            scrollX: true,
            scrollCollapse: true,
            columns: [
                {
                    data: "Id",
                    title: "",
                    width: "1%",
                    orderable: false,
                    searchable: false,
                    render: (data, type, row) => {
                        if (row.__isSaldo) return "";
                        return `
              <div class="acciones-menu" data-id="${data}">
                <button class='btn btn-sm btnacciones' type='button' onclick='toggleAcciones(${data})' title='Acciones'>
                  <i class='fa fa-ellipsis-v fa-lg text-white'></i>
                </button>
                <div class="acciones-dropdown" style="display:none;">
                  <button class='btn btn-sm btneditar' type='button' onclick='verMovimiento(${data})' title='Ver movimiento'>
                    <i class='fa fa-eye fa-lg text-info'></i> Ver movimiento
                  </button>
                </div>
              </div>`;
                    }
                },
                {
                    data: "Fecha",
                    title: "Fecha",
                    render: function (data, type, row) {
                        if (row.__isSaldo) {
                            if (type === "display" || type === "filter") {
                                const montoNum = Number(row.__saldoAnterior || 0);
                                const badgeCls = montoNum < 0 ? "bg-danger" : "bg-success";
                                return `
                  <div class="saldo-anterior-chip">
                    <span class="badge ${badgeCls} me-2">Saldo anterior</span>
                  </div>`;
                            }
                            return "";
                        }
                        if (type === "display" || type === "filter") return formatearFechaParaVista(data) || "-";
                        return data;
                    }
                },
                { data: "TipoMov", title: "Tipo" },
                {
                    data: "Concepto",
                    title: "Concepto",
                    render: function (data, type, row) {
                        if (!row.__isSaldo) return data ?? "";
                        const montoNum = Number(row.__saldoAnterior || 0);
                        const txtCls = montoNum < 0 ? "text-danger" : "text-success";
                        const montoFmt = formatNumber(montoNum);
                        const label = row.Concepto || "Saldo anterior";
                        return `
              <div class="saldo-anterior-chip">
                <span class="ms-1 fw-bold ${txtCls}">${label}:</span>
                <span class="ms-1 fw-bold ${txtCls}">${montoFmt}</span>
              </div>`;
                    }
                },
                {
                    data: "Ingreso",
                    title: "Ingreso",
                    className: "text-center",
                    render: (data) => {
                        const v = parseFloat(data);
                        return v > 0 ? `<span style="color:green;font-weight:bold;">${formatNumber(v)}</span>` : "";
                    },
                },
                {
                    data: "Egreso",
                    title: "Egreso",
                    className: "text-center",
                    render: (data) => {
                        const v = parseFloat(data);
                        return v > 0 ? `<span style="color:red;font-weight:bold;">${formatNumber(v)}</span>` : "";
                    },
                },
                { data: "Sucursal", title: "Sucursal" },
                { data: "Cuenta", title: "Cuenta" },
            ],
            dom: "Bfrtip",
            buttons: [
                {
                    extend: "excelHtml5",
                    text: "Exportar Excel",
                    filename: "Caja",
                    title: "",
                    exportOptions: { columns: [1, 2, 3, 4, 5, 6, 7] },
                    className: "btn-exportar-excel",
                },
                {
                    extend: "pdfHtml5",
                    text: "Exportar PDF",
                    filename: "Caja",
                    title: "",
                    exportOptions: { columns: [1, 2, 3, 4, 5, 6, 7] },
                    className: "btn-exportar-pdf",
                },
                {
                    extend: "print",
                    text: "Imprimir",
                    title: "",
                    exportOptions: { columns: [1, 2, 3, 4, 5, 6, 7] },
                    className: "btn-exportar-print",
                },
                "pageLength",
            ],
            orderCellsTop: true,
            fixedHeader: true,
            initComplete: async function () {
                const api = this.api();

                for (const config of columnConfig) {
                    const cell = $(".filters th").eq(config.index);

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
                        items.forEach((item) => select.append(`<option value="${item.Id}">${item.Nombre ?? ""}</option>`));
                    } else if (config.filterType === "text") {
                        $('<input type="text" placeholder="Buscar..." />')
                            .appendTo(cell.empty())
                            .off("keyup change")
                            .on("keyup change", function (e) {
                                e.stopPropagation();
                                const regexr = "({search})";
                                const cursorPosition = this.selectionStart;
                                api
                                    .column(config.index)
                                    .search(this.value !== "" ? regexr.replace("{search}", "(((" + escapeRegex(this.value) + ")))") : "", this.value !== "", this.value === "")
                                    .draw();
                                $(this).focus()[0].setSelectionRange(cursorPosition, cursorPosition);
                            });
                    }
                }

                $(".filters th").eq(0).html("");

                configurarOpcionesColumnas("#grd_Caja", "#configColumnasMenu", "Caja_Columnas");

                calcularIngresos();
                api.on("draw", () => calcularIngresos());

                setTimeout(() => gridCaja.columns.adjust(), 10);
            },
        });
    } else {
        gridCaja.clear().rows.add(data).draw();
    }
}

/* ========== Cargas para selects (con token) ========== */

async function listaSucursales() {
    const res = await fetch("/Sucursales/Lista", {
        headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    });
    const data = await res.json();
    llenarSelect("cmbSucursal", data);
}

async function listaCuentas() {
    const res = await fetch("/Cuentas/Lista", {
        headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    });
    const data = await res.json();
    llenarSelect("cmbCuenta", data);
}

/* ========== Filtros (header DT) helpers ========== */

async function listaSucursalesFilter() {
    const response = await fetch("/Sucursales/Lista", {
        method: "GET",
        headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    });
    if (!response.ok) throw new Error("Error cargando Sucursales");
    const data = await response.json();
    return data.map((item) => ({ Id: item.Id, Nombre: item.Nombre }));
}

async function listaCuentasFilter() {
    const response = await fetch("/Cuentas/Lista", {
        method: "GET",
        headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    });
    if (!response.ok) throw new Error("Error cargando Cuentas");
    const data = await response.json();
    return data.map((item) => ({ Id: item.Id, Nombre: item.Nombre }));
}

async function listaTiposFilter() {
    return [
        { Id: 1, Nombre: "Ingreso" },
        { Id: 2, Nombre: "Egreso" },
    ];
}

function escapeRegex(text) {
    return (text + "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/* ========== Totales (respetan lo filtrado) ========== */

async function calcularIngresos() {
  

    const rows = gridCaja.rows({ search: "applied" }).data().toArray()
        .filter(r => !r.__isSaldo);

    let totalIngreso = 0, totalEgreso = 0;
    for (const r of rows) {
        totalIngreso += r.Ingreso;
        totalEgreso += r.Egreso;
    }
    const totalSaldo = totalIngreso - totalEgreso;

    // KPIs del header
    $("#kpiIngresos").text(formatNumber(totalIngreso));
    $("#kpiEgresos").text(formatNumber(totalEgreso));
    $("#kpiSaldo")
        .text(formatNumber(totalSaldo))
        .toggleClass("text-success", totalSaldo >= 0)
        .toggleClass("text-danger", totalSaldo < 0);
    $("#kpiCantMovs").text(rows.length.toLocaleString("es-AR"));
}
/* ======================================================
   TRANSFERENCIAS – MODAL #modalTransfer
   ====================================================== */

/* ---------- helpers visuales ---------- */

// 1) Check verde/rojo del input-group con “bloqueo” para errores de igualdad
function toggleCheck(selector, show, isError = false, lock = false) {
    const $ind = $(selector).closest('.input-group').find('.valid-indicator');
    if (!$ind.length) return;

    if (lock) $ind.addClass('force-error'); else $ind.removeClass('force-error');

    if ($ind.hasClass('force-error')) {
        $ind.removeClass('d-none bg-success').addClass('text-white bg-danger');
        return;
    }

    $ind.removeClass('d-none bg-success bg-danger text-white');
    if (!show) { $ind.addClass('d-none'); return; }
    $ind.addClass('text-white').addClass(isError ? 'bg-danger' : 'bg-success');
}

// 2) Invalid para select2
function markSelect2Invalid(sel, invalid) {
    if ($.fn.select2 && $(sel).hasClass('select2-hidden-accessible')) {
        $(sel).next('.select2-container')
            .find('.select2-selection')
            .toggleClass('is-invalid', !!invalid);
    }
}

// 3) Ancla donde insertar feedback (select2 / input-group / el)
function _anchorFor($el) {
    if ($.fn.select2 && $el.hasClass('select2-hidden-accessible')) {
        return $el.next('.select2-container');
    }
    const $ig = $el.closest('.input-group');
    return $ig.length ? $ig : $el;
}

// 4) Feedback único por campo (sin duplicados)
function _fbId(sel) { return 'fb-' + sel.replace('#', ''); }

function showInvalid(sel, msg) {
    const $el = $(sel);
    const $anc = _anchorFor($el);

    $el.addClass('is-invalid');
    markSelect2Invalid(sel, true);

    const id = _fbId(sel);
    // Eliminar/actualizar único feedback
    $('#' + id).remove();

    $('<div/>', {
        id,
        class: 'invalid-feedback auto-feedback d-block',
        text: msg || 'Campo obligatorio'
    }).insertAfter($anc);
}

function clearInvalid(sel) {
    const $el = $(sel);
    $el.removeClass('is-invalid');
    markSelect2Invalid(sel, false);
    $('#' + _fbId(sel)).remove();
}

// 5) limpiar todo el estado de validación del modal
function resetTransferValidationUI() {
    $('#errorTransf').addClass('d-none').text('');
    ['#dtpFechaTransf', '#cmbSucursalTransf', '#cmbCuentaOrigen', '#cmbCuentaDestino', '#numImporteTransf']
        .forEach(clearInvalid);
    toggleCheck('#cmbCuentaOrigen', false);
    toggleCheck('#cmbCuentaDestino', false);
}

/* ---------- validaciones de campos (en vivo y al guardar) ---------- */

function validarCampoTransfer(sel) {
    let ok = true;
    const v = $(sel).val();

    // Reglas por campo
    if (sel === '#dtpFechaTransf') {
        ok = !!v;
        ok ? clearInvalid(sel) : showInvalid(sel, 'Campo obligatorio');
    }
    else if (sel === '#cmbSucursalTransf') {
        ok = !!v;
        ok ? clearInvalid(sel) : showInvalid(sel, 'Campo obligatorio');
    }
    else if (sel === '#numImporteTransf') {
        const n = Number(formatearSinMiles(v));
        ok = n > 0;
        ok ? clearInvalid(sel) : showInvalid(sel, 'El importe debe ser mayor a 0.');
    }
    else if (sel === '#cmbCuentaOrigen' || sel === '#cmbCuentaDestino') {
        // requerido
        if (!v) { showInvalid(sel, 'Campo obligatorio'); ok = false; }
        else { clearInvalid(sel); }

        // igualdad
        const o = $('#cmbCuentaOrigen').val();
        const d = $('#cmbCuentaDestino').val();

        // primero, si alguno falta, solo resaltar requerido y apagar checks
        if (!o || !d) {
            toggleCheck('#cmbCuentaOrigen', !!o, false, false);
            toggleCheck('#cmbCuentaDestino', !!d, false, false);
            return ok;
        }

        if (o === d) {
            showInvalid('#cmbCuentaOrigen', 'Cuenta origen y destino no pueden ser iguales.');
            showInvalid('#cmbCuentaDestino', 'Cuenta origen y destino no pueden ser iguales.');
            toggleCheck('#cmbCuentaOrigen', true, true, true);
            toggleCheck('#cmbCuentaDestino', true, true, true);
            ok = false;
        } else {
            clearInvalid('#cmbCuentaOrigen');
            clearInvalid('#cmbCuentaDestino');
            toggleCheck('#cmbCuentaOrigen', true, false, false);
            toggleCheck('#cmbCuentaDestino', true, false, false);
        }
    }

    // Ocultar/mostrar error general
    if (!ok) $('#errorTransf').text('Debes completar los campos requeridos.').removeClass('d-none');
    else if ($('.invalid-feedback.auto-feedback:visible').length === 0) $('#errorTransf').addClass('d-none').text('');

    return ok;
}

function validarTransferenciaModal() {
    // Validación integral (sin duplicar mensajes)
    let ok = true;
    ok = validarCampoTransfer('#dtpFechaTransf') && ok;
    ok = validarCampoTransfer('#cmbSucursalTransf') && ok;
    ok = validarCampoTransfer('#cmbCuentaOrigen') && ok;
    ok = validarCampoTransfer('#cmbCuentaDestino') && ok;
    ok = validarCampoTransfer('#numImporteTransf') && ok;
    return ok;
}

/* ---------- abrir nuevo / editar ---------- */

function abrirModalTransfer() {
    const modalEl = document.getElementById("modalTransfer");
    if (!modalEl) { console.error("No se encontró #modalTransfer"); return; }

    editingTransfer = null;
    limpiarModal("#modalTransfer", "#errorTransf");
    resetTransferValidationUI();
    attachLiveValidation("#modalTransfer");
    ensureDeleteBtn(false); // alta: no mostrar botón eliminar
    $("#modalTransferLabel").text("Transferencia entre cuentas");

    $("#dtpFechaTransf").val(new Date().toISOString().slice(0, 10));
    $("#numImporteTransf").val("");
    $("#txtNotaTransf").val("");

    // quitar handlers previos para evitar duplicados
    $('#dtpFechaTransf, #cmbSucursalTransf, #cmbCuentaOrigen, #cmbCuentaDestino, #numImporteTransf').off('.live');

    Promise.all([listaSucursalesTransf(), listaCuentasTransf()]).then(() => {
        if ($.fn.select2) {
            $("#cmbSucursalTransf, #cmbCuentaOrigen, #cmbCuentaDestino").select2({
                dropdownParent: $("#modalTransfer"),
                width: "100%",
                placeholder: "Seleccione",
            });
        }

        $("#cmbSucursalTransf, #cmbCuentaOrigen, #cmbCuentaDestino").val("").trigger("change");
        resetTransferValidationUI();

        // validación en vivo
        $('#dtpFechaTransf').on('change.live', () => validarCampoTransfer('#dtpFechaTransf'));
        $('#cmbSucursalTransf').on('change.live', () => validarCampoTransfer('#cmbSucursalTransf'));

        $('#numImporteTransf').on('input.live blur.live', () => validarCampoTransfer('#numImporteTransf'));

        $('#cmbCuentaOrigen, #cmbCuentaDestino')
            .on('change.live', function () {
                const okPar1 = validarCampoTransfer('#cmbCuentaOrigen');
                const okPar2 = validarCampoTransfer('#cmbCuentaDestino');

                // cargar historial solo si ambas válidas y distintas
                if (okPar1 && okPar2 && $('#cmbCuentaOrigen').val() && $('#cmbCuentaDestino').val()
                    && $('#cmbCuentaOrigen').val() !== $('#cmbCuentaDestino').val()) {
                    cargarHistorialTransferencias();
                } else {
                    // limpiar historial si aún no se puede mostrar
                    if ($.fn.DataTable.isDataTable("#grd_TransfHist")) {
                        $("#grd_TransfHist").DataTable().clear().draw();
                    }
                }
            });

        // resetear historial (grilla)
        if ($.fn.DataTable.isDataTable("#grd_TransfHist")) {
            $("#grd_TransfHist").DataTable().clear().destroy();
            $("#grd_TransfHist tbody").empty();
            gridTransf = null;
        }

        bootstrap.Modal.getOrCreateInstance(modalEl).show();
    });
}

/* ======================
   Cargas de combos modal
   ====================== */

async function listaSucursalesTransf() {
    const res = await fetch("/Sucursales/Lista", {
        headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    });
    const data = await res.json();
    llenarSelect("cmbSucursalTransf", data);
}

async function listaCuentasTransf() {
    const res = await fetch("/Cuentas/Lista", {
        headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    });
    const data = await res.json();
    llenarSelect("cmbCuentaOrigen", data);
    llenarSelect("cmbCuentaDestino", data);
}

/* ======================
   Guardar transferencia
   ====================== */

async function guardarTransferencia() {
    if (!validarTransferenciaModal()) return;

    const payloadBase = {
        Fecha: $("#dtpFechaTransf").val(),
        IdCuentaOrigen: Number($("#cmbCuentaOrigen").val()),
        ImporteOrigen: formatearSinMiles($("#numImporteTransf").val()),
        IdCuentaDestino: Number($("#cmbCuentaDestino").val()),
        ImporteDestino: formatearSinMiles($("#numImporteTransf").val()),
        NotaInterna: $("#txtNotaTransf").val().trim(),
    };

    try {
        if (!editingTransfer) {
            const vm = { ...payloadBase, IdSucursal: Number($("#cmbSucursalTransf").val()) };
            const r = await fetch("/TransferenciasCajas/Crear", {
                method: "POST",
                headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
                body: JSON.stringify(vm),
            });
            if (!r.ok) throw new Error(await r.text());
            await r.json();
            exitoModal("Transferencia registrada");
        } else {
            const vmUpd = {
                Id: editingTransfer.id,
                IdCajaOrigen: editingTransfer.idCajaOrigen,
                IdCajaDestino: editingTransfer.idCajaDestino,
                Fecha: payloadBase.Fecha,
                IdCuentaOrigen: payloadBase.IdCuentaOrigen,
                ImporteOrigen: payloadBase.ImporteOrigen,
                ConceptoOrigen: editingTransfer.conceptoOrigen ?? "Transferencia entre cuentas",
                IdCuentaDestino: payloadBase.IdCuentaDestino,
                ImporteDestino: payloadBase.ImporteDestino,
                ConceptoDestino: editingTransfer.conceptoDestino ?? "Transferencia entre cuentas",
                NotaInterna: payloadBase.NotaInterna,
            };
            const r = await fetch("/TransferenciasCajas/Actualizar", {
                method: "PUT",
                headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
                body: JSON.stringify(vmUpd),
            });
            if (!r.ok) throw new Error(await r.text());
            exitoModal("Transferencia actualizada correctamente.");
        }

        $("#modalTransfer").modal("hide");
        editingTransfer = null;

        if (window._fmCaja) window._fmCaja.search();
        else {
            await listaCaja();
            calcularIngresos();
            cargarHistorialTransferencias();
        }
    } catch (e) {
        console.error(e);
        errorModal("No se pudo guardar la transferencia.");
    }
}

/* ======================
   Historial + eliminar
   ====================== */

async function cargarHistorialTransferencias() {
    const o = $("#cmbCuentaOrigen").val();
    const d = $("#cmbCuentaDestino").val();
    if (!o || !d || o === d) return;

    const url = `/TransferenciasCajas/Historial?idCuentaOrigen=${o}&idCuentaDestino=${d}`;
    const r = await fetch(url, { headers: { Authorization: "Bearer " + token } });
    if (!r.ok) return;
    const data = await r.json();

    if (!gridTransf) {
        gridTransf = $("#grd_TransfHist").DataTable({
            data,
            paging: true,
            searching: false,
            info: false,
            columns: [
                { data: "Fecha", render: (f) => formatearFechaParaVista(f) },
                { data: "CuentaOrigen" },
                { data: "ImporteOrigen", render: (x) => formatNumber(x) },
                { data: "CuentaDestino" },
                { data: "ImporteDestino", render: (x) => formatNumber(x) },
                { data: "NotaInterna" },
                {
                    data: "Id",
                    orderable: false,
                    render: (id) =>
                        `<button type="button" class="btn btn-sm btn-danger" onclick="eliminarTransferencia(${id})">
               <i class="fa fa-trash"></i>
             </button>`,
                },
            ],
            order: [[0, "desc"]],
        });
    } else {
        gridTransf.clear().rows.add(data).draw();
    }
}

async function eliminarTransferencia(id, opts = {}) {
    if (!(await confirmarModal("¿Eliminar esta transferencia? Se revertirán los asientos."))) return;
    const { closeModal = false } = opts;
    try {
        const r = await fetch("/TransferenciasCajas/Eliminar?id=" + id, {
            method: "DELETE",
            headers: { Authorization: "Bearer " + token },
        });
        if (!r.ok) throw new Error(await r.text());
        const j = await r.json();
        if (j.valor) {
            exitoModal("Transferencia eliminada");
            await cargarHistorialTransferencias();
            if (window._fmCaja) await window._fmCaja.search(); else await listaCaja();
            calcularIngresos();
            if (closeModal) {
                $("#modalTransfer").modal("hide");
                editingTransfer = null;
            }
        }
    } catch (e) {
        console.error(e);
        errorModal("No se pudo eliminar la transferencia.");
    }
}

// Evitar submit por Enter en modal
$("#formNuevaTransferencia").on("submit", (e) => e.preventDefault());

/* ======================
   Entradas desde la lista
   ====================== */

const verMovimiento = (id) => {
    $(".acciones-dropdown").hide();

    const row = gridCaja.rows().data().toArray().find((r) => r.Id === id);
    if (row?.EsTransferencia) {
        editarTransferenciaDesdeMovimiento(id);
        return;
    }

    fetch("/Cajas/EditarInfo?id=" + id, {
        method: "GET",
        headers: {
            Authorization: "Bearer " + token,
            "Content-Type": "application/json",
        },
    })
        .then((r) => {
            if (!r.ok) throw new Error("Ha ocurrido un error.");
            return r.json();
        })
        .then((dataJson) => (dataJson ? mostrarModalCaja(dataJson) : (() => { throw new Error("Ha ocurrido un error."); })()))
        .catch(() => errorModal("Ha ocurrido un error."));
};

async function editarTransferenciaDesdeMovimiento(idCaja) {
    try {
        const modalEl = document.getElementById("modalTransfer");
        if (!modalEl) return;

        await Promise.all([listaSucursalesTransf(), listaCuentasTransf()]);

        const r = await fetch("/TransferenciasCajas/PorCaja?idCaja=" + idCaja, {
            headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
        });
        if (!r.ok) throw new Error("No se pudo obtener la transferencia.");
        const vm = await r.json();

        editingTransfer = {
            id: vm.Id,
            idCajaOrigen: vm.IdCajaOrigen,
            idCajaDestino: vm.IdCajaDestino,
            conceptoOrigen: vm.ConceptoOrigen,
            conceptoDestino: vm.ConceptoDestino,
        };

        limpiarModal("#modalTransfer", "#errorTransf");
        resetTransferValidationUI();
        attachLiveValidation("#modalTransfer");
        ensureDeleteBtn(true, vm.Id); // edición: mostrar botón eliminar

        $("#dtpFechaTransf").val((vm.Fecha || "").toString().substring(0, 10));
        $("#cmbCuentaOrigen").val(vm.IdCuentaOrigen).trigger("change");
        $("#cmbCuentaDestino").val(vm.IdCuentaDestino).trigger("change");
        toggleCheck("#cmbCuentaOrigen", true, false);
        toggleCheck("#cmbCuentaDestino", true, false);

        $("#numImporteTransf").val(formatearMiles(vm.ImporteDestino));
        $("#txtNotaTransf").val(vm.NotaInterna || "");

        if (vm.IdCajaOrigen) {
            const rCaja = await fetch("/Cajas/EditarInfo?id=" + vm.IdCajaOrigen, {
                headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
            });
            if (rCaja.ok) {
                const caja = await rCaja.json();
                if (caja?.IdSucursal) $("#cmbSucursalTransf").val(caja.IdSucursal).trigger("change");
            }
        }

        $("#modalTransferLabel").text("Editar transferencia");

        // limpiar handlers previos
        $('#dtpFechaTransf, #cmbSucursalTransf, #cmbCuentaOrigen, #cmbCuentaDestino, #numImporteTransf').off('.live');

        // validación en vivo
        $('#dtpFechaTransf').on('change.live', () => validarCampoTransfer('#dtpFechaTransf'));
        $('#cmbSucursalTransf').on('change.live', () => validarCampoTransfer('#cmbSucursalTransf'));
        $('#numImporteTransf').on('input.live blur.live', () => validarCampoTransfer('#numImporteTransf'));

        $('#cmbCuentaOrigen, #cmbCuentaDestino')
            .on('change.live', async function () {
                const okPar1 = validarCampoTransfer('#cmbCuentaOrigen');
                const okPar2 = validarCampoTransfer('#cmbCuentaDestino');
                if (okPar1 && okPar2 && $('#cmbCuentaOrigen').val() && $('#cmbCuentaDestino').val()
                    && $('#cmbCuentaOrigen').val() !== $('#cmbCuentaDestino').val()) {
                    await cargarHistorialTransferencias();
                }
            });

        await cargarHistorialTransferencias();

        bootstrap.Modal.getOrCreateInstance(modalEl).show();
    } catch (e) {
        console.error(e);
        errorModal("No se pudo abrir la transferencia.");
    }
}

/* ===========================
   Eliminar movimiento manual
   =========================== */

async function eliminarCajaDesdeModal() {
    const id = Number($("#txtId").val() || 0);
    if (!id) return;

    const ok = await confirmarModal("¿Eliminar este movimiento?");
    if (!ok) return;

    try {
        const r = await fetch("/Cajas/Eliminar?id=" + id, {
            method: "DELETE",
            headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
        });
        const j = await r.json();
        if (!r.ok || !j.valor) throw new Error(j.mensaje || "No se pudo eliminar.");
        $("#modalEdicion").modal("hide");
        exitoModal("Movimiento eliminado.");
        if (window._fmCaja) window._fmCaja.search(); else { await listaCaja(); calcularIngresos(); }
    } catch (e) {
        console.error(e);
        errorModal(e.message || "No se pudo eliminar.");
    }
}

/* ==========================================================
   Inicialización de filtros superiores (formulario externo)
   ========================================================== */

async function initFiltros() {
    try {
        const [sucs, ctas] = await Promise.all([
            fetch('/Sucursales/Lista', { headers: { 'Authorization': 'Bearer ' + token } }).then(r => r.json()),
            fetch('/Cuentas/Lista', { headers: { 'Authorization': 'Bearer ' + token } }).then(r => r.json())
        ]);
        if ($('#fltSucursal').length) {
            const $s = $('#fltSucursal').empty().append('<option value="">Todas</option>');
            sucs.forEach(x => $s.append(`<option value="${x.Id}">${x.Nombre}</option>`));
        }
        if ($('#fltCuenta').length) {
            const $c = $('#fltCuenta').empty().append('<option value="">Todas</option>');
            ctas.forEach(x => $c.append(`<option value="${x.Id}">${x.Nombre}</option>`));
        }
    } catch { /* ignora fallos */ }

    window._fmCaja = new Filters.FilterManager({
        form: '#formFiltros',
        debounce: 300,
        buttons: {
            search: '#btnBuscar',
            clear: '#btnLimpiar',
            keepDefaultsOnClear: true,
        },
        fields: {
            desde: { el: '#fltDesde', param: 'fechaDesde', parse: v => v || null, default: Filters.FilterManager.firstOfMonthISO },
            hasta: { el: '#fltHasta', param: 'fechaHasta', parse: v => v || null, default: Filters.FilterManager.todayISO },
            tipo: { el: '#fltTipo', param: 'tipo', parse: v => v || null },
            idSucursal: { el: '#fltSucursal', param: 'idSucursal', parse: v => v ? Number(v) : null },
            idCuenta: { el: '#fltCuenta', param: 'idCuenta', parse: v => v ? Number(v) : null },
            concepto: { el: '#fltConcepto', param: 'concepto', parse: v => (v || '').trim() || null },
        },
        onSearch: async (params) => {
            await listaCaja(params);
        },
    });

    window._fmCaja.applyDefaults();
    window._fmCaja.bind();
    await window._fmCaja.search();
}

document.addEventListener('DOMContentLoaded', () => {
    FiltersUI.init({
        storageKey: 'Cajas_FiltrosVisibles',
        panelSelector: '#formFiltros',
        headerFiltersSelector: '#grd_Caja thead tr.filters',
        buttonSelector: '#btnToggleFiltros',
        iconSelector: '#iconFiltros',
        defaultVisible: true
    });
});

/* ======================
   Dropdown acciones
   ====================== */
function toggleAcciones(id) {
    const $dd = $(`.acciones-menu[data-id="${id}"] .acciones-dropdown`);
    if ($dd.is(":visible")) $dd.hide();
    else { $('.acciones-dropdown').hide(); $dd.show(); }
}
$(document).on('click', function (e) {
    if (!$(e.target).closest('.acciones-menu').length) $('.acciones-dropdown').hide();
});


// Crea / actualiza el botón "Eliminar transferencia" en el footer del modal
function ensureDeleteBtn(show, idTransf) {
    const $footer = $("#modalTransfer .modal-footer");
    let $btn = $("#btnEliminarTransf");

    if (!show) {
        if ($btn.length) $btn.remove();
        return;
    }

    if (!$btn.length) {
        $btn = $(`
      <button type="button" id="btnEliminarTransf" class="btn btn-danger me-auto">
        <i class="fa fa-trash"></i> Eliminar transferencia
      </button>
    `);
        $footer.prepend($btn);
    }

    // Wire al eliminador con cierre del modal
    $btn.off("click").on("click", async () => {
        await eliminarTransferencia(idTransf, { closeModal: true });
    });
}
