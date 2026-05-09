/* ============================== SITE.JS ============================== */
const token = localStorage.getItem('JwtToken');
try {
    window.token = token;
} catch (_) { /* no window (tests) */ }

async function MakeAjax(options) {
    return $.ajax({
        type: options.type,
        url: options.url,
        async: options.async,
        data: options.data,
        dataType: options.dataType,
        contentType: options.contentType
    });
}

async function MakeAjaxFormData(options) {
    return $.ajax({
        type: options.type,
        url: options.url,
        async: options.async,
        data: options.data,
        dataType: false,
        contentType: false,
        isFormData: true,
        processData: false
    });
}

// Formatear el número de manera correcta
function formatNumber(number) {
    if (typeof number !== 'number' || isNaN(number)) {
        return "$ 0,00"; // Si el número no es válido, retornar un valor por defecto
    }
    const parts = number.toFixed(2).split("."); // 2 decimales
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, "."); // miles con punto
    return "$ " + parts.join(",");
}

/**
 * NavBarLogin eleva #modalConfiguracion a ~32000; estos modales deben ir por encima (y su backdrop).
 */
const Z_INDEX_MODAL_FEEDBACK = 45000;
const Z_INDEX_MODAL_FEEDBACK_BACKDROP = 44980;

function aplicarZIndexModalFeedback(modalEl) {
    if (!modalEl) return function noop() { };
    modalEl.style.setProperty("z-index", String(Z_INDEX_MODAL_FEEDBACK), "important");
    let backdrop = null;
    const subirBackdrop = () => {
        const backs = document.querySelectorAll(".modal-backdrop");
        backdrop = backs[backs.length - 1];
        if (backdrop) backdrop.style.setProperty("z-index", String(Z_INDEX_MODAL_FEEDBACK_BACKDROP), "important");
    };
    setTimeout(subirBackdrop, 0);
    requestAnimationFrame(subirBackdrop);
    return function limpiarZIndexModalFeedback() {
        modalEl.style.removeProperty("z-index");
        if (backdrop && backdrop.isConnected) backdrop.style.removeProperty("z-index");
    };
}

function mostrarModalConContador(modal, texto, tiempo) {
    $(`#${modal}Text`).text(texto);
    $(`#${modal}`).modal("show");
    const el = document.getElementById(modal);
    const limpiar = aplicarZIndexModalFeedback(el);
    setTimeout(function () {
        $(`#${modal}`).modal("hide");
        limpiar();
    }, tiempo);
}
function exitoModal(texto) { mostrarModalConContador('exitoModal', texto, 1000); }
function errorModal(texto) { mostrarModalConContador('ErrorModal', texto, 3000); }
function advertenciaModal(texto) { mostrarModalConContador('AdvertenciaModal', texto, 3000); }

function confirmarModal(mensaje) {
    return new Promise((resolve) => {
        const modalEl = document.getElementById('modalConfirmar');
        const mensajeEl = document.getElementById('modalConfirmarMensaje');
        const btnAceptar = document.getElementById('btnModalConfirmarAceptar');

        if (!modalEl || !mensajeEl || !btnAceptar) {
            resolve(window.confirm(mensaje || '¿Confirmar?'));
            return;
        }

        mensajeEl.innerText = mensaje;

        const modal = new bootstrap.Modal(modalEl, { backdrop: 'static', keyboard: false });

        // Flag para que no resuelva dos veces
        let resuelto = false;

        // Limpia listeners anteriores
        modalEl.replaceWith(modalEl.cloneNode(true));
        // Re-obtener refs
        const nuevoModalEl = document.getElementById('modalConfirmar');
        const nuevoBtnAceptar = document.getElementById('btnModalConfirmarAceptar');

        const nuevoModal = new bootstrap.Modal(nuevoModalEl, { backdrop: 'static', keyboard: false });
        let limpiarZFeedback = function noop() { };

        nuevoBtnAceptar.onclick = function () {
            if (resuelto) return;
            resuelto = true;
            resolve(true);
            nuevoModal.hide();
        };

        nuevoModalEl.addEventListener('hidden.bs.modal', () => {
            limpiarZFeedback();
            if (resuelto) return;
            resuelto = true;
            resolve(false);
        }, { once: true });

        nuevoModal.show();
        limpiarZFeedback = aplicarZIndexModalFeedback(nuevoModalEl);
    });
}

const formatoMoneda = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2
});

function convertirMonedaAFloat(moneda) {
    const soloNumeros = moneda.replace(/[^0-9,.-]/g, '');
    const numeroFormateado = soloNumeros.replace(/\./g, '').replace(',', '.');
    const numero = parseFloat(numeroFormateado);
    return numero.toFixed(2);
}
function convertirAMonedaDecimal(valor) {
    if (typeof valor === 'string') valor = valor.replace(',', '.');
    return parseFloat(valor);
}
function formatoNumero(valor) {
    return parseFloat(valor.replace(/[^0-9,]+/g, '').replace(',', '.')) || 0;
}
function parseDecimal(value) { return parseFloat(value.replace(',', '.')); }

function formatMoneda(valor) {
    let formateado = valor.toString().replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return `$ ${formateado}`;
}

function toggleAcciones(id) {
    const dropdown = document.querySelector(`.acciones-menu[data-id='${id}'] .acciones-dropdown`);
    if (!dropdown) return;
    const isVisible = dropdown.style.display === 'block';

    // Oculta todos los demás
    document.querySelectorAll('.acciones-dropdown').forEach(el => el.style.display = 'none');

    if (!isVisible) {
        dropdown.style.display = 'block';
        const menuButton = document.querySelector(`.acciones-menu[data-id='${id}']`);
        const rect = menuButton.getBoundingClientRect();

        const dropdownClone = dropdown.cloneNode(true);
        dropdownClone.style.position = 'fixed';
        dropdownClone.style.left = `${rect.left}px`;
        dropdownClone.style.top = `${rect.bottom}px`;
        dropdownClone.style.zIndex = '10000';
        dropdownClone.style.display = 'block';

        // Limpia clones previos
        document.querySelectorAll('.acciones-dropdown-clone').forEach(clone => clone.remove());

        dropdownClone.classList.add('acciones-dropdown-clone');
        document.body.appendChild(dropdownClone);
    }
}

/** Checklist tipo multiselect (#btnTalles / #listaTalles, #btnSucursales / #listaSucursales, …). */
function toggleChecklist(btnId, panelId) {
    const panel = document.getElementById(panelId);
    const btn = typeof btnId === "string" ? document.getElementById(btnId) : btnId;
    if (!panel) return;
    panel.classList.toggle("d-none");
    if (btn && btn.hasAttribute("aria-expanded")) {
        btn.setAttribute("aria-expanded", panel.classList.contains("d-none") ? "false" : "true");
    }
}
window.toggleChecklist = toggleChecklist;

document.addEventListener("click", function (e) {
    document.querySelectorAll(".select-checklist").forEach(panel => {
        const pid = panel.id || "";
        if (!pid.startsWith("lista") && !pid.startsWith("mpa_lista")) return;
        if (panel.classList.contains("d-none")) return;
        if (panel.contains(e.target)) return;
        const host = panel.closest(".pr-field-with-plus") || panel.closest(".pr-select-plus--flex");
        if (host && host.contains(e.target)) return;
        let btn = null;
        if (pid.startsWith("mpa_lista")) {
            btn = document.getElementById("mpa_btn" + pid.slice("mpa_lista".length));
        } else if (pid.startsWith("lista")) {
            // "lista" = 5 caracteres (listaTalles → btnTalles, listaSucursales → btnSucursales)
            btn = document.getElementById("btn" + pid.slice("lista".length));
        }
        if (btn && btn.contains(e.target)) return;
        panel.classList.add("d-none");
        if (btn && btn.hasAttribute("aria-expanded")) {
            btn.setAttribute("aria-expanded", "false");
        }
    });
});

function formatearFechaParaInput(fecha) {
    const m = moment(fecha, [moment.ISO_8601, 'YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DD']);
    return m.isValid() ? m.format('YYYY-MM-DD') : '';
}
function formatearFechaParaVista(fecha) {
    const m = moment(fecha, [moment.ISO_8601, 'YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DD']);
    return m.isValid() ? m.format('DD/MM/YYYY') : '';
}

function formatearFechaParaVistaConHora(fecha) {
    const m = moment(fecha, [moment.ISO_8601, 'YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DD']);
    return m.isValid() ? m.format('DD/MM/YYYY HH:mm:ss') : '';
}


function formatearHoraParaInput(valor) {
    if (!valor) return '';
    const m = moment(valor, [
        moment.ISO_8601,
        'YYYY-MM-DD HH:mm:ss',
        'YYYY-MM-DDTHH:mm:ss',
        'HH:mm:ss',
        'HH:mm'
    ], true);
    return m.isValid() ? m.format('HH:mm') : '';
}


// --- Hora a INPUT <input type="time"> ---
function hInput(valor) {
    if (typeof formatearHoraParaInput === "function") return formatearHoraParaInput(valor);
    const m = moment(valor, [moment.ISO_8601, 'YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DDTHH:mm:ss', 'HH:mm:ss', 'HH:mm'], true);
    return m.isValid() ? m.format('HH:mm') : '';
}

// --- Hora para vista (HH:mm) ---
function hView(valor) {
    const m = moment(valor, [moment.ISO_8601, 'YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DDTHH:mm:ss', 'HH:mm:ss', 'HH:mm'], true);
    return m.isValid() ? m.format('HH:mm') : '';
}

// --- Fecha y hora para vista (DD/MM/YYYY HH:mm:ss) ---
function fhView(valor) {
    if (typeof formatearFechaParaVistaConHora === "function") return formatearFechaParaVistaConHora(valor);
    const m = moment(valor, [moment.ISO_8601, 'YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DDTHH:mm:ss', 'YYYY-MM-DD', 'HH:mm:ss', 'HH:mm'], true);
    return m.isValid() ? m.format('DD/MM/YYYY HH:mm:ss') : '';
}



function formatearMiles(valor) {
    let num = String(valor).replace(/\D/g, '');
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}
function formatearSinMiles(valor) {
    if (valor == null || valor === "") return 0;
    let s = String(valor).trim().replace(/\$/g, "").replace(/\s/g, "");
    if (!s) return 0;
    if (!s.includes(".")) return parseFloat(s.replace(",", ".")) || 0;
    const limpio = s.replace(/\./g, "").replace(",", ".");
    const num = parseFloat(limpio);
    return isNaN(num) ? 0 : num;
}

function setValorInput(selector, valor) {
    const $el = $(selector);
    if ($el.hasClass("Inputmiles")) {
        $el.val(formatearMiles(valor ?? ""));
    } else {
        $el.val(valor ?? "");
    }
}

let audioContext = null;
let audioBuffer = null;

/* ======================= LIMPIAR MODAL ======================= */
function limpiarModal(modalSelector, errorSelector) {
    const root = document.querySelector(modalSelector);
    if (!root) return;

    root.querySelectorAll('input, select, textarea').forEach(el => {
        // Reset valor
        if (el.type === 'checkbox' || el.type === 'radio') el.checked = false;
        else if (el.tagName === 'SELECT') el.selectedIndex = 0;
        else el.value = '';

        // Quitar clases de validación (visual + Select2)
        clearValidation(el);

        // Vaciar mensaje si hay invalid-feedback contiguo nativo
        const fb = el.nextElementSibling;
        if (fb && fb.classList.contains('invalid-feedback')) fb.textContent = 'Campo obligatorio';
    });

    if (errorSelector) {
        const err = document.querySelector(errorSelector);
        if (err) err.classList.add('d-none');
    }
}

/* ======================= VALIDACIÓN CAMPO A CAMPO ======================= */
function validarCampoIndividual(elOrSelector, eventKind) {
    const el = typeof elOrSelector === 'string' ? document.querySelector(elOrSelector) : elOrSelector;
    if (!el) return true;

    const validationHost = el.closest('[data-validacion-ui]') || el.closest('#modalEdicion');
    const modoSoloCampo = validationHost && validationHost.getAttribute('data-validacion-ui') === '0';
    if (modoSoloCampo) {
        // Select2: blur nativo al abrir/cerrar el desplegable — no tocar estado aquí.
        if (eventKind === 'blur' && el.tagName === 'SELECT' && el.classList.contains('select2-hidden-accessible')) {
            return true;
        }
        // Texto: no marcar "required" vacío en cada tecla; sí en blur/change.
        if (eventKind === 'input' && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {
            return true;
        }
    }

    const valor = (el.value || '').trim();
    let valido = true;
    let msg = 'Campo obligatorio';

    // required
    if (el.hasAttribute('required') && valor === '') valido = false;

    // email
    if (valido && el.type === 'email' && valor !== '') {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        valido = re.test(valor);
        if (!valido) msg = 'Correo inválido';
    }

    // patrón custom (data-pattern="[0-9]+")
    if (valido && el.dataset.pattern && valor !== '') {
        const reCustom = new RegExp(el.dataset.pattern);
        valido = reCustom.test(valor);
        if (!valido) msg = el.dataset.patternMsg || 'Formato inválido';
    }

    // min/max length
    const min = el.dataset.minlength ? parseInt(el.dataset.minlength) : null;
    const max = el.dataset.maxlength ? parseInt(el.dataset.maxlength) : null;

    if (valido && min && valor.length < min) { valido = false; msg = `Mínimo ${min} caracteres`; }
    if (valido && max && valor.length > max) { valido = false; msg = `Máximo ${max} caracteres`; }

    // aplicar estilo + mensaje
    if (!valido) setInvalid(el, msg);
    else {
        if (valor !== '' || el.hasAttribute('required')) setValid(el);
        else clearValidation(el);
    }

    return valido;
}

/* ======================= VALIDACIÓN GENERAL FORM ======================= */
function verificarErroresGenerales(modalSelector, errorSelector) {
    const root = document.querySelector(modalSelector);
    if (!root) return true;

    let valido = true;
    root.querySelectorAll('input[required], select[required], textarea[required]').forEach(el => {
        if (!validarCampoIndividual(el)) valido = false;
    });

    if (errorSelector) {
        const err = document.querySelector(errorSelector);
        if (err) err.classList.toggle('d-none', valido);
    }
    return valido;
}

// Enlaza eventos live; usa updateErrorBanner para ocultar/mostrar el banner global
function attachLiveValidation(modalSelector, errorSelector = '#errorCampos') {
    const root = document.querySelector(modalSelector);
    if (!root) return;

    const recheck = () => updateErrorBanner(modalSelector, errorSelector);

    root.querySelectorAll('input, select, textarea').forEach(el => {
        el.setAttribute('autocomplete', 'off');
        el.addEventListener('input', () => { validarCampoIndividual(el, 'input'); recheck(); });
        el.addEventListener('change', () => { validarCampoIndividual(el, 'change'); recheck(); });
        el.addEventListener('blur', () => { validarCampoIndividual(el, 'blur'); recheck(); });
    });
}

/* Solo apaga autocomplete (sin validar) */
function setAutocompleteOff(modalSelector) {
    const root = document.querySelector(modalSelector);
    if (!root) return;
    root.querySelectorAll('input, select, textarea').forEach(el => el.setAttribute('autocomplete', 'off'));
}

function setFormValues(formSelector, model) {
    const form = document.querySelector(formSelector);
    if (!form || !model) return;
    const prefixes = ['#txt', '#cmb', '#dt', '#sel', '#'];
    for (const [key, val] of Object.entries(model)) {
        let el = null;
        for (const p of prefixes) { el = form.querySelector(`${p}${key}`); if (el) break; }
        if (!el) continue;
        if (el.type === 'checkbox' || el.type === 'radio') el.checked = !!val;
        else el.value = val ?? '';
        el.classList.remove('is-invalid', 'is-valid');
    }
}
function setFormValues(formSelector, model) { // (duplicado como en tu original)
    const form = document.querySelector(formSelector);
    if (!form || !model) return;
    const prefixes = ['#txt', '#cmb', '#dt', '#sel', '#'];
    for (const [key, val] of Object.entries(model)) {
        let el = null;
        for (const p of prefixes) { el = form.querySelector(`${p}${key}`); if (el) break; }
        if (!el) continue;
        if (el.type === 'checkbox' || el.type === 'radio') el.checked = !!val;
        else el.value = val ?? '';
        el.classList.remove('is-invalid', 'is-valid');
    }
}

function llenarSelect(selectId, data, valueField = 'Id', textField = 'Nombre', conOpcionVacia = true) {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    sel.innerHTML = conOpcionVacia ? '<option value="">Seleccione</option>' : '';
    (data || []).forEach(it => {
        const opt = document.createElement('option');
        opt.value = it[valueField];
        const label = it[textField] ?? it.Nombre ?? it.Descripcion ?? String(it[valueField] ?? '');
        opt.textContent = label;
        if (it.CostoUnitario != null && it.CostoUnitario !== '') {
            opt.setAttribute('data-costo', String(it.CostoUnitario));
        }
        sel.appendChild(opt);
    });
}

/* ======================= OPCIONES DE COLUMNAS (DataTables, todos los ABMs) ======================= */
/**
 * @param {string} tableSelector
 * @param {string} menuSelector
 * @param {string} storageKey
 * @param {{ getTitle?: (col: object, index: number) => string }} [options]
 */
function configurarOpcionesColumnas(tableSelector, menuSelector, storageKey, options) {
    options = options || {};
    const getTitle = typeof options.getTitle === "function"
        ? options.getTitle
        : function (col, index) {
            return (typeof col.title === "string" && col.title.trim() !== "")
                ? col.title
                : (col.data || `Col ${index}`);
        };

    const grid = $(tableSelector).DataTable();
    const columnas = grid.settings().init().columns;
    const container = $(menuSelector);
    const saved = JSON.parse(localStorage.getItem(storageKey) || "{}");

    container.empty();
    container.addClass("column-config-dropdown");

    const $searchLi = $('<li class="column-config-dd-search" role="presentation"></li>');
    const $searchInner = $('<div class="column-config-dd-search-inner"></div>');
    const $filterInput = $("<input>", {
        type: "search",
        class: "form-control form-control-sm column-config-dd-filter",
        placeholder: "Buscar columna…",
        autocomplete: "off",
        "aria-label": "Buscar columnas visibles"
    });
    $searchInner.append($filterInput);
    $searchLi.append($searchInner);
    container.append($searchLi);

    $searchLi.on("click", function (e) {
        e.stopPropagation();
    });

    columnas.forEach((col, index) => {
        if (!col.data) return;
        /* Columna de acciones (data "Id", sin entrar al menú): siempre visible.
           Antes no se aplicaba .visible() aquí; un col_0:false viejo en localStorage dejaba la grilla sin acciones. */
        if (col.data === "Id") {
            grid.column(index).visible(true);
            delete saved[`col_${index}`];
            localStorage.setItem(storageKey, JSON.stringify(saved));
            return;
        }
        if (col.data && col.data !== "Id") {
            const isChecked = saved[`col_${index}`] !== undefined ? saved[`col_${index}`] : true;
            grid.column(index).visible(isChecked);

            const nombre = getTitle(col, index);
            const filterText = String(nombre).toLowerCase();

            const $row = $('<li class="column-config-dd-row" role="presentation"></li>');
            $row.attr("data-filter-text", filterText);

            const $label = $('<label class="dropdown-item column-config-dd-label"></label>');
            const $cb = $("<input>", {
                type: "checkbox",
                class: "toggle-column form-check-input flex-shrink-0",
                "data-column": index
            }).prop("checked", isChecked);
            const $text = $('<span class="column-config-dd-text"></span>').text(nombre);

            $label.append($cb, $text);
            $row.append($label);
            container.append($row);
        }
    });

    $filterInput.on("input", function () {
        const q = String($(this).val() || "").trim().toLowerCase();
        container.find(".column-config-dd-row").each(function () {
            const t = ($(this).attr("data-filter-text") || "");
            $(this).toggleClass("d-none", q !== "" && !t.includes(q));
        });
    });

    container.find(".toggle-column").on("change", function () {
        const idx = parseInt($(this).data("column"), 10);
        const on = $(this).is(":checked");
        saved[`col_${idx}`] = on;
        localStorage.setItem(storageKey, JSON.stringify(saved));
        grid.column(idx).visible(on);
    });
}

/**
 * Marca la tabla como seleccionable por fila: clase .seleccionada (una por tbody a la vez).
 * Añade `dt-selectable` al table para estilos en site.css.
 * @param {string} tableSelector ej. '#grd_Clientes'
 * @param {string} [namespace] sufijo único por tabla (eventos namespaced)
 */
function bindDataTableSeleccionFila(tableSelector, namespace) {
    const ns = String(namespace || "dtRowSel").replace(/[^a-zA-Z0-9_-]/g, "_");
    const $tbl = $(tableSelector);
    if (!$tbl.length) return;
    $tbl.addClass("dt-selectable");
    $tbl.off("click." + ns, "tbody tr").on("click." + ns, "tbody tr", function (e) {
        if ($(e.target).closest("button, a, input, select, textarea, label, .rp-row-actions, .acciones-menu, .dropdown, .dropdown-menu, .dt-buttons").length) {
            return;
        }
        const $tr = $(this);
        if ($tr.hasClass("seleccionada")) {
            $tr.removeClass("seleccionada");
        } else {
            $tr.addClass("seleccionada").siblings().removeClass("seleccionada");
        }
    });
    $tbl.off("draw.dt." + ns).on("draw.dt." + ns, function () {
        $tbl.find("tbody tr.seleccionada").removeClass("seleccionada");
    });
}

/* ======================= BANNER DE ERRORES GLOBAL (ocultar/mostrar) ======================= */
/** Criterio alineado con validarCampoIndividual: Select2 deja el select nativo recortado y checkValidity() puede fallar en algunos navegadores. */
function requiredFieldOkForErrorBanner(el) {
    if (!el || !el.hasAttribute('required')) return true;
    if (el.tagName === 'SELECT') {
        return !!(el.value && String(el.value).trim() !== '');
    }
    if (el.type === 'checkbox' || el.type === 'radio') return !!el.checked;
    const valor = (el.value || '').toString().trim();
    if (valor === '') return false;
    try {
        return el.checkValidity();
    } catch (_) {
        return true;
    }
}

function updateErrorBanner(modalOrSelector = '#modalEdicion', errorSelector = '#errorCampos') {
    const root = typeof modalOrSelector === 'string' ? document.querySelector(modalOrSelector) : modalOrSelector;
    const err = document.querySelector(errorSelector);
    if (!root || !err) return;
    if (err.getAttribute('data-banner-reason') === 'negocio') return;
    if (root.getAttribute('data-validacion-ui') === '0') return;

    let allValid = true;
    root.querySelectorAll('input[required], select[required], textarea[required]').forEach(el => {
        if (!requiredFieldOkForErrorBanner(el)) allValid = false;
    });
    err.classList.toggle('d-none', allValid);
    if (allValid) {
        root.setAttribute('data-validacion-ui', '0');
    }
}

/* ======================= SELECT2 – validación genérica ======================= */
function wireSelect2Validation(scope, errorSelector = '#errorCampos') {
    const $scope = $(scope || document);
    $scope.off('change.select2val', 'select.select2-hidden-accessible')
        .on('change.select2val', 'select.select2-hidden-accessible', function () {
            const host = this.closest('[data-validacion-ui]') || this.closest('#modalEdicion');
            if (host && host.getAttribute('data-validacion-ui') === '0') {
                const ok = this.hasAttribute('required')
                    ? requiredFieldOkForErrorBanner(this)
                    : (this.checkValidity() && !!String(this.value || '').trim());
                if (ok) setValid(this);
                else clearValidation(this);
                return;
            }
            const ok = this.hasAttribute('required')
                ? requiredFieldOkForErrorBanner(this)
                : (this.checkValidity() && !!String(this.value || '').trim());
            if (ok) setValid(this); else setInvalid(this);
            if (typeof updateErrorBanner === 'function') updateErrorBanner(scope || '#modalEdicion', errorSelector);
        });
}

/* ======================= VALIDAR CAMPOS (compatibilidad global) ======================= */
function validarCampos() {
    const ok = verificarErroresGenerales('#modalEdicion', '#errorCampos');
    updateErrorBanner('#modalEdicion', '#errorCampos');
    return ok;
}

function forzarValidacionModal(modalSelector = '#modalEdicion', errorSelector = '#errorCampos') {
    const root = document.querySelector(modalSelector);
    if (!root) return false;
    root.setAttribute('data-validacion-ui', '1');
    const ok = verificarErroresGenerales(modalSelector, errorSelector);
    updateErrorBanner(modalSelector, errorSelector);
    return ok;
}

/* ======================= CIERRE DE MENÚS ======================= */
$(document).on('click', function (e) {
    if (!$(e.target).closest('.acciones-menu').length) $('.acciones-dropdown').hide();
});

/* ======================= INPUTMILES (formateo) ======================= */
function bindInputMilesElement(input) {
    if (!input || !input.classList.contains("Inputmiles")) return;
    if (input.dataset.inputMilesBound === "1") return;
    input.dataset.inputMilesBound = "1";
    input.addEventListener("input", function () {
        const cursorPos = input.selectionStart;
        const originalLength = input.value.length;
        const soloNumeros = input.value.replace(/\D/g, "");
        if (soloNumeros === "") { input.value = ""; return; }
        const formateado = formatearMiles(soloNumeros);
        input.value = formateado;
        const newLength = formateado.length;
        input.setSelectionRange(cursorPos + (newLength - originalLength), cursorPos + (newLength - originalLength));
    });
}

document.querySelectorAll("input.Inputmiles").forEach(bindInputMilesElement);

/* ======================= MÓDULO DE FILTROS REUTILIZABLE ======================= */
const Filters = (() => {
    const isEmpty = (v) => v === undefined || v === null || v === "";
    const todayISO = () => new Date().toISOString().slice(0, 10);
    const firstOfMonthISO = () => {
        const d = new Date();
        return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
    };

    class FilterManager {
        constructor(cfg) {
            this.cfg = { debounce: 250, buttons: {}, ...cfg };
            this.form = $(this.cfg.form);
            this.fields = this.cfg.fields || {};
            this._debouncedTimer = null;
        }
        static todayISO = todayISO;
        static firstOfMonthISO = firstOfMonthISO;

        readRaw() {
            const out = {};
            for (const [alias, f] of Object.entries(this.fields)) {
                const $el = $(f.el);
                out[alias] = $el.length ? $el.val() : null;
            }
            return out;
        }
        normalize(raw) {
            const params = {};
            for (const [alias, f] of Object.entries(this.fields)) {
                const rawVal = raw[alias];
                const val = typeof f.parse === "function" ? f.parse(rawVal) : rawVal;
                if (!isEmpty(val)) params[f.param] = val;
            }
            return params;
        }
        toQuery(paramsObj) {
            const usp = new URLSearchParams();
            Object.entries(paramsObj || {}).forEach(([k, v]) => { if (!isEmpty(v)) usp.append(k, v); });
            return usp;
        }
        applyDefaults() {
            for (const [_, f] of Object.entries(this.fields)) {
                if (!f.default) continue;
                const $el = $(f.el);
                if (!$el.length) continue;
                const current = $el.val();
                if (isEmpty(current)) $el.val(f.default());
            }
        }
        clear(keepDefaults = true) {
            for (const [_, f] of Object.entries(this.fields)) {
                const $el = $(f.el);
                if (!$el.length) continue;
                $el.val("");
                if ($.fn.select2 && $el.hasClass("select2-hidden-accessible")) $el.val(null).trigger("change");
            }
            if (keepDefaults) this.applyDefaults();
        }
        current() {
            const raw = this.readRaw();
            const norm = this.normalize(raw);
            const query = this.toQuery(norm);
            return { raw, norm, query };
        }
        async search() {
            if (typeof this.cfg.onSearch === "function") {
                const { norm } = this.current();
                await this.cfg.onSearch(norm);
            }
        }
        bind() {
            const b = this.cfg.buttons || {};
            if (b.search && $(b.search).length) $(b.search).off("click.fm").on("click.fm", async () => { await this.search(); });
            if (b.clear && $(b.clear).length) $(b.clear).off("click.fm").on("click.fm", async () => { this.clear(b.keepDefaultsOnClear !== false); await this.search(); });
            this.form.off("keydown.fm").on("keydown.fm", "input,select", (e) => { if (e.key === "Enter") { e.preventDefault(); this.search(); } });

            const auto = this.cfg.autoSearch;
            if (auto) {
                const trigger = () => { clearTimeout(this._debouncedTimer); this._debouncedTimer = setTimeout(() => this.search(), this.cfg.debounce); };
                this.form.off("input.fm change.fm").on("input.fm change.fm", "input,select", trigger);
            }
        }
    }
    return { FilterManager };
})();

function escapeRegex(text) { return (text + '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

/* ======================= FILTROS UI ======================= */
window.FiltersUI = (function () {
    function setVisibility(el, visible) { if (!el) return; el.classList.toggle('d-none', !visible); }
    function apply(opts) {
        const raw = localStorage.getItem(opts.storageKey);
        const visible = (raw === null) ? opts.defaultVisible : JSON.parse(raw);
        setVisibility(document.querySelector(opts.panelSelector), visible);
        if (opts.headerFiltersSelector) document.querySelectorAll(opts.headerFiltersSelector).forEach(el => { el.classList.toggle('d-none', !visible); });
        const btn = document.querySelector(opts.buttonSelector);
        if (btn) { btn.classList.toggle("btn-primary", visible); btn.classList.toggle("btn-outline-primary", !visible); }
        const icon = document.querySelector(opts.iconSelector);
        if (icon) { icon.classList.remove("fa-arrow-up", "fa-arrow-down"); icon.classList.add(visible ? "fa-arrow-up" : "fa-arrow-down"); }
    }
    function toggle(opts) {
        const raw = localStorage.getItem(opts.storageKey);
        const visible = (raw === null) ? opts.defaultVisible : JSON.parse(raw);
        localStorage.setItem(opts.storageKey, JSON.stringify(!visible));
        apply(opts);
    }
    function init(opts) {
        const btn = document.querySelector(opts.buttonSelector);
        if (btn) btn.addEventListener('click', () => toggle(opts));
        apply(opts);
    }
    return { init };
})();

/* ======================= SELECT2 init genérico ======================= */
function initSelect2(scope) {
    if (!(window.jQuery && $.fn && typeof $.fn.select2 === 'function')) return;
    $(scope || document).find('select.select2, select.form-select').each(function () {
        const $sel = $(this);
        if ($sel.hasClass('no-select2') || $sel.is('[data-no-select2="1"]')) return;
        if ($sel.hasClass('select2-hidden-accessible')) return;
        const $modal = $sel.closest('.modal');
        if ($modal.length && !$modal.hasClass('show')) return;
        $sel.select2({
            width: '100%',
            dropdownParent: $sel.closest('.modal').length ? $sel.closest('.modal') : $(document.body)
        });
    });
}

function bindDeferredValidationModal(modalSelector = '#modalEdicion', saveBtnSelector = '#btnGuardar') {
    const modalEl = document.querySelector(modalSelector);
    if (!modalEl || modalEl.dataset.deferredValidationBound === '1') return;
    modalEl.dataset.deferredValidationBound = '1';

    // Evita que un clic “afuera” (p. ej. desplegable Select2 / backdrop) cierre el ABM.
    if (!modalEl.hasAttribute('data-bs-backdrop')) {
        modalEl.setAttribute('data-bs-backdrop', 'static');
    }
    if (!modalEl.hasAttribute('data-bs-keyboard')) {
        modalEl.setAttribute('data-bs-keyboard', 'false');
    }

    modalEl.addEventListener('shown.bs.modal', () => {
        // Validación completa + banner solo tras Guardar/Registrar (forzarValidacionModal / click abajo).
        modalEl.setAttribute('data-validacion-ui', '0');
        const err = modalEl.querySelector('#errorCampos');
        if (err) err.classList.add('d-none');
        requestAnimationFrame(() => {
            initSelect2(modalEl);
            initAbmSelectShortcuts(modalEl);
        });
    });

    modalEl.addEventListener('click', (ev) => {
        const btn = ev.target?.closest?.(saveBtnSelector);
        if (!btn) return;
        modalEl.setAttribute('data-validacion-ui', '1');
    }, true);
}

const ABM_SELECT_SHORTCUTS = [
    { path: /^\/Productos/i, selectId: 'cmbCategoria', nombre: 'Productos Categorias', controller: 'ProductosCategoria' },
    { path: /^\/Insumos/i, selectId: 'cmbCategoria', nombre: 'Insumos Categorias', controller: 'InsumosCategoria' },
    { path: /^\/Insumos/i, selectId: 'cmbProveedor', nombre: 'Proveedor', controller: 'Proveedores' },
    { path: /^\/Compras\/NuevoModif/i, selectId: 'cmbProveedor', nombre: 'Proveedor', controller: 'Proveedores' },
    { path: /^\/Compras\/NuevoModif/i, selectId: 'cmbItemInsumo', nombre: 'Insumo', controller: 'Insumos' },
    { path: /^\/Compras\/NuevoModif/i, selectId: 'cmbCuenta', nombre: 'Cuenta', controller: 'Cuentas' },
    { path: /^\/Ventas\/NuevoModif/i, selectId: 'cmbCliente', nombre: 'Cliente', controller: 'Clientes' },
    /* Lista de precios / sucursal: botones pr-btn-plus en Ventas/NuevoModif (igual que Clientes). */
    { path: /^\/Ventas\/NuevoModif/i, selectId: 'cmbCuenta', nombre: 'Cuenta', controller: 'Cuentas' },
    { path: /^\/Gastos/i, selectId: 'cmbCategoria', nombre: 'Gastos Categorias', controller: 'GastosCategorias' },
    { path: /^\/Gastos/i, selectId: 'cmbSucursal', nombre: 'Sucursal', controller: 'Sucursales' },
    { path: /^\/Gastos/i, selectId: 'cmbCuenta', nombre: 'Cuenta', controller: 'Cuentas' },
    { path: /^\/Clientes/i, selectId: 'cmbCondicionIva', nombre: 'Condiciones IVA', controller: 'CondicionesIVA' },
    { path: /^\/Clientes/i, selectId: 'cmbListaPrecios', nombre: 'Lista de Precios', controller: 'ListasPrecios' },
    { path: /^\/Clientes/i, selectId: 'cmbProvincia', nombre: 'Provincia', controller: 'Provincias' },
    { path: /^\/Personal/i, selectId: 'cmbCondicionIva', nombre: 'Condiciones IVA', controller: 'CondicionesIVA' },
    { path: /^\/Personal/i, selectId: 'cmbProvincia', nombre: 'Provincia', controller: 'Provincias' },
    { path: /^\/Personal/i, selectId: 'cmbBanco', nombre: 'Banco', controller: 'Bancos' },
    { path: /^\/Personal/i, selectId: 'cmbPuesto', nombre: 'Personal Puesto', controller: 'PersonalPuestos' },
    { path: /^\/Personal/i, selectId: 'cmbSucursal', nombre: 'Sucursal', controller: 'Sucursales' },
    { path: /^\/Cajas/i, selectId: 'cmbSucursal', nombre: 'Sucursal', controller: 'Sucursales' },
    { path: /^\/Cajas/i, selectId: 'cmbCuenta', nombre: 'Cuenta', controller: 'Cuentas' },
    { path: /^\/Cajas/i, selectId: 'cmbSucursalTransf', nombre: 'Sucursal', controller: 'Sucursales' },
    { path: /^\/Cajas/i, selectId: 'cmbCuentaOrigen', nombre: 'Cuenta', controller: 'Cuentas' },
    { path: /^\/Cajas/i, selectId: 'cmbCuentaDestino', nombre: 'Cuenta', controller: 'Cuentas' },
    { path: /^\/CuentasCorrientes/i, selectId: 'movSucursal', nombre: 'Sucursal', controller: 'Sucursales' },
    { path: /^\/CuentasCorrientes/i, selectId: 'movCuentaCaja', nombre: 'Cuenta', controller: 'Cuentas' },
    { path: /^\/CuentasCorrientesProveedores/i, selectId: 'pagoCuentaCajaProv', nombre: 'Cuenta', controller: 'Cuentas' },
    { path: /^\/CuentasCorrientesTalleres/i, selectId: 'pagoCuentaCajaTall', nombre: 'Cuenta', controller: 'Cuentas' },
    { path: /^\/PersonalSueldos/i, selectId: 'cmbPersonal', nombre: 'Personal', controller: 'Personal' },
    { path: /^\/PersonalSueldos/i, selectId: 'cmbCuenta', nombre: 'Cuenta', controller: 'Cuentas' },
    { path: /^\/OrdenesCorte\/NuevoModif/i, selectId: 'cmbPersonal', nombre: 'Personal', controller: 'Personal' },
    { path: /^\/OrdenesCorte\/NuevoModif/i, selectId: 'cmbTaller', nombre: 'Taller', controller: 'Talleres' },
    { path: /^\/OrdenesCorte\/NuevoModif/i, selectId: 'cmbEtEstado', nombre: 'Etapas Estados Ordenes de Corte', controller: 'OrdenesCorteEtapasEstados' },
    { path: /^\/OrdenesCorte\/NuevoModif/i, selectId: 'insABM_Categoria', nombre: 'Insumos Categorias', controller: 'InsumosCategoria' },
    { path: /^\/OrdenesCorte\/NuevoModif/i, selectId: 'insABM_Proveedor', nombre: 'Proveedor', controller: 'Proveedores' }
];

const _abmShortcutState = { bySelectId: new Map() };

function getShortcutCfgForSelect(selectEl) {
    const pathname = window.location.pathname || '';
    return ABM_SELECT_SHORTCUTS.find(x => x.selectId === selectEl.id && x.path.test(pathname)) || null;
}

function wrapSelectWithShortcutButton(selectEl, cfg) {
    if (!selectEl || !cfg) return;
    if (selectEl.dataset.atajoApplied === '1') return;
    if (selectEl.closest('.pr-select-plus') || selectEl.closest('.abm-select-plus')) return;
    const alreadyHasCustomPlus = selectEl.parentElement?.parentElement?.querySelector?.('.pr-btn-plus, .pr-atajo-catalogo');
    if (alreadyHasCustomPlus) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'abm-select-plus';
    const grow = document.createElement('div');
    grow.className = 'abm-select-grow';
    selectEl.parentNode.insertBefore(wrapper, selectEl);
    wrapper.appendChild(grow);
    grow.appendChild(selectEl);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'abm-btn-plus';
    btn.title = `Nuevo ${cfg.nombre}`;
    btn.innerHTML = '<i class="fa fa-plus"></i>';
    btn.addEventListener('click', async () => {
        if (typeof window.abrirConfiguracion !== 'function') return;
        _abmShortcutState.bySelectId.set(selectEl.id, {
            controller: cfg.controller,
            selectId: selectEl.id,
            lastNuevoId: null
        });
        await window.abrirConfiguracion(cfg.nombre, cfg.controller, null, null, null, true);
    });
    wrapper.appendChild(btn);
    selectEl.dataset.atajoApplied = '1';
}

async function refreshSelectFromController(selectId, controller, preferId) {
    const selectEl = document.getElementById(selectId);
    if (!selectEl) return;
    const prev = (preferId ?? selectEl.value ?? '').toString();
    try {
        const r = await fetch(`/${controller}/Lista`, {
            headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
        });
        if (!r.ok) return;
        const data = await r.json();
        if (typeof llenarSelect === 'function') {
            const textField = controller === 'Insumos' ? 'Descripcion' : 'Nombre';
            llenarSelect(selectId, data, 'Id', textField);
        }
        if (prev && Array.from(selectEl.options).some(o => String(o.value) === prev)) {
            $(selectEl).val(prev).trigger('change');
        } else {
            $(selectEl).trigger('change');
        }
        initSelect2(selectEl.closest('.modal') || document);
    } catch (_) { /* noop */ }
}

function initAbmSelectShortcuts(scope) {
    const root = scope || document;
    root.querySelectorAll('select').forEach(sel => {
        const cfg = getShortcutCfgForSelect(sel);
        if (!cfg) return;
        wrapSelectWithShortcutButton(sel, cfg);
    });
}

document.addEventListener('configuracionActualizada', (e) => {
    const d = e?.detail || {};
    if (!d.tipo) return;
    _abmShortcutState.bySelectId.forEach((st, selectId) => {
        if (st.controller !== d.tipo) return;
        if (d.accion === 'insertar' && d.nuevoId != null) {
            st.lastNuevoId = String(d.nuevoId);
            _abmShortcutState.bySelectId.set(selectId, st);
        }
    });
});

document.addEventListener('hidden.bs.modal', (e) => {
    if (e?.target?.id !== 'modalConfiguracion') return;
    _abmShortcutState.bySelectId.forEach((st, selectId) => {
        refreshSelectFromController(selectId, st.controller, st.lastNuevoId);
    });
});

$(function () {
    initSelect2(document);
    initAbmSelectShortcuts(document);
    bindDeferredValidationModal('#modalEdicion', '#btnGuardar');
    if (!window.__select2ModalDropdownReposition) {
        window.__select2ModalDropdownReposition = true;
        $(document).on('select2:open.select2ModalReposition', function (e) {
            const t = e.target;
            if (!t || typeof t.closest !== 'function' || !t.closest('.modal.show')) return;
            window.setTimeout(() => $(window).trigger('resize'), 0);
        });
    }
});

/* ======================= ---- NUEVOS HELPERS GENÉRICOS ---- ======================= */
/* Soporte de validación visual unificada (Inputs + Select2) */
function isSelect2(el) {
    return !!(window.jQuery && $(el).hasClass('select2-hidden-accessible') && $(el).next('.select2').length);
}
function getSelect2Selection(el) {
    return isSelect2(el) ? $(el).next('.select2').find('.select2-selection').get(0) : null;
}
function getPrSelectPlusRow(el) {
    if (!el) return null;
    return el.closest(".pr-select-plus--flex") || el.closest(".pr-select-plus--infield");
}

/** Todos los nodos .invalid-feedback asociados a un select Select2 (evita duplicados visibles bajo pr-select-plus). */
function collectSelect2InvalidFeedbackElements(el) {
    const nodes = [];
    const add = (n) => {
        if (n && n.nodeType === 1 && n.classList.contains("invalid-feedback") && nodes.indexOf(n) === -1) {
            nodes.push(n);
        }
    };
    if (!el) return nodes;
    const row = getPrSelectPlusRow(el);
    const esSelect = el.tagName === "SELECT";
    if (!isSelect2(el) && !(esSelect && row)) return nodes;
    if (row) {
        row.querySelectorAll(".invalid-feedback").forEach(add);
        const afterRow = row.nextElementSibling;
        if (afterRow?.classList.contains("invalid-feedback")) add(afterRow);
    }
    if (isSelect2(el)) {
        const s2 = $(el).next(".select2").get(0);
        if (s2) {
            const x = s2.nextElementSibling;
            if (x?.classList.contains("invalid-feedback")) add(x);
        }
    }
    return nodes;
}

function hideAllSelect2InvalidFeedback(el) {
    collectSelect2InvalidFeedbackElements(el).forEach((fb) => {
        fb.classList.add("d-none");
        fb.style.display = "none";
    });
}

function ensureInvalidFeedback(el) {
    if (!el) return null;
    const prRow = el.tagName === "SELECT" ? getPrSelectPlusRow(el) : null;
    if (prRow) {
        // Siempre fuera de la fila select + botón +: si el select aún no tiene Select2,
        // la rama "nativa" insertaba el mensaje dentro de .pr-select-plus__grow y el + quedaba centrado
        // respecto a (control + texto de error).
        prRow.querySelectorAll(".invalid-feedback").forEach((n) => n.remove());
        let fb = prRow.nextElementSibling;
        if (fb && fb.classList?.contains("invalid-feedback")) {
            return fb;
        }
        fb = document.createElement("div");
        fb.className = "invalid-feedback";
        fb.style.display = "none";
        prRow.insertAdjacentElement("afterend", fb);
        return fb;
    }
    if (isSelect2(el)) {
        const anchor = $(el).next(".select2").get(0);
        let fb = anchor?.nextElementSibling;
        if (!(fb && fb.classList?.contains("invalid-feedback"))) {
            fb = document.createElement("div");
            fb.className = "invalid-feedback";
            fb.style.display = "none";
            anchor?.parentNode?.insertBefore(fb, anchor.nextSibling);
        }
        return fb;
    }
    const anchor = el;
    let fb = anchor?.nextElementSibling;
    if (!(fb && fb.classList?.contains('invalid-feedback'))) {
        fb = document.createElement('div');
        fb.className = 'invalid-feedback';
        fb.style.display = 'none';
        anchor?.parentNode?.insertBefore(fb, anchor.nextSibling);
    }
    return fb;
}
function setInvalid(selector, message = 'Campo obligatorio') {
    const el = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (!el) return false;
    const visual = getSelect2Selection(el) || el;
    visual.classList.remove('is-valid');
    visual.classList.add('is-invalid');
    const fb = ensureInvalidFeedback(el);
    if (fb) {
        fb.textContent = message;
        fb.classList.remove('d-none');
        fb.style.display = 'block';
    }
    return false;
}
function setValid(selector) {
    const el = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (!el) return true;
    const visual = getSelect2Selection(el) || el;
    visual.classList.remove('is-invalid');
    visual.classList.add('is-valid');
    if (isSelect2(el)) {
        hideAllSelect2InvalidFeedback(el);
    } else {
        let fb = el.nextElementSibling;
        if (!(fb && fb.classList?.contains('invalid-feedback')) && el.tagName === 'SELECT') {
            const r = getPrSelectPlusRow(el);
            if (r?.nextElementSibling?.classList?.contains('invalid-feedback')) {
                fb = r.nextElementSibling;
            }
        }
        if (fb && fb.classList?.contains('invalid-feedback')) {
            fb.classList.add('d-none');
            fb.style.display = 'none';
        }
    }
    return true;
}
function clearValidation(selector) {
    const el = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (!el) return;
    const visual = getSelect2Selection(el) || el;
    visual.classList.remove('is-invalid', 'is-valid');
    if (isSelect2(el)) {
        hideAllSelect2InvalidFeedback(el);
    } else {
        let fb = el.nextElementSibling;
        if (!(fb && fb.classList?.contains('invalid-feedback')) && el.tagName === 'SELECT') {
            const r = getPrSelectPlusRow(el);
            if (r?.nextElementSibling?.classList?.contains('invalid-feedback')) {
                fb = r.nextElementSibling;
            }
        }
        if (fb && fb.classList?.contains('invalid-feedback')) {
            fb.classList.add('d-none');
            fb.style.display = 'none';
        }
    }
}

/* (Opcional) para pantallas que lo pidan: crea bloques .invalid-feedback si faltan */
function ensureFeedbackBlocks(scope) {
    const root = scope ? document.querySelector(scope) : document;
    if (!root) return;
    root.querySelectorAll('input[required], select[required], textarea[required]').forEach(el => {
        let fb = el.nextElementSibling;
        const isS2 = el.classList.contains('select2-hidden-accessible');
        if (!(fb && fb.classList?.contains('invalid-feedback'))) {
            if (isS2) {
                const $c = $(el).next('.select2');
                if ($c.length && !$c.next('.invalid-feedback').length) $('<div class="invalid-feedback">Campo obligatorio</div>').insertAfter($c);
            } else {
                const div = document.createElement('div');
                div.className = 'invalid-feedback';
                div.textContent = 'Campo obligatorio';
                el.parentNode.insertBefore(div, el.nextSibling);
            }
        }
    });
}

/* ======================= LISTENER GLOBAL SELECT2 (refleja validación) ======================= */
$(document)
    .off('change.select2-global', 'select.select2-hidden-accessible')
    .on('change.select2-global', 'select.select2-hidden-accessible', function () {
        const host = this.closest('[data-validacion-ui]') || this.closest('#modalEdicion');
        if (host && host.getAttribute('data-validacion-ui') === '0') {
            const ok = this.hasAttribute('required')
                ? requiredFieldOkForErrorBanner(this)
                : (this.checkValidity() && !!String(this.value || '').trim());
            if (ok) setValid(this);
            else clearValidation(this);
            return;
        }
        const ok = this.hasAttribute('required')
            ? requiredFieldOkForErrorBanner(this)
            : (this.checkValidity() && !!String(this.value || '').trim());
        if (ok) setValid(this); else setInvalid(this);
    });

/* ==============================
   DataTables — Excel / PDF / Imprimir (mismo criterio que Levels getBotonesExportacion)
   Solo se agregan si Permisos.tiene(módulo, "Exportar"); siempre se agrega pageLength.
============================== */
function dataTableButtonsExportCondicional(modulo, botonesExport) {
    if (typeof Permisos !== "undefined" && Permisos && typeof Permisos.init === "function") {
        Permisos.init();
    }
    const puede =
        typeof Permisos !== "undefined" &&
        Permisos &&
        typeof Permisos.tiene === "function" &&
        Permisos.tiene(modulo, "Exportar");
    const tienePrint =
        typeof jQuery !== "undefined" &&
        jQuery.fn &&
        jQuery.fn.dataTable &&
        jQuery.fn.dataTable.ext &&
        jQuery.fn.dataTable.ext.buttons &&
        typeof jQuery.fn.dataTable.ext.buttons.print === "object";
    let bloque = puede && Array.isArray(botonesExport) ? botonesExport.slice() : [];
    if (!tienePrint) {
        bloque = bloque.filter(b => !b || b.extend !== "print");
    }
    return [...bloque, "pageLength"];
}

window.dataTableButtonsExportCondicional = dataTableButtonsExportCondicional;

/* ==============================
   GS-UI — Acciones en grilla (mismo contrato que Sistema Levels)
   return renderAccionesGrid(id, { ver: "verUsuario", editar: "...", eliminar: "..." }, "Usuarios");
   Usa Permisos.tiene si está cargado; si no, lee userSession como Levels.
============================== */

function renderAccionesGrid(id, acciones, modulo) {
    const a = acciones || {};
    const mod = (modulo != null && modulo !== "")
        ? String(modulo)
        : (a.modulo != null ? String(a.modulo) : "");

    const idStr =
        typeof id === "number" && Number.isFinite(id)
            ? String(id)
            : String(id ?? "").replace(/[^\d-]/g, "");
    if (idStr === "") {
        return '<span class="text-muted abm-sin-acciones">—</span>';
    }

    const nombreFnOk = (n) => typeof n === "string" && /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(n);

    function tienePermisoGrid(mod, tipo) {
        const tipoNorm = (tipo || "VER").toString().trim().toUpperCase();
        if (typeof Permisos !== "undefined" && Permisos && typeof Permisos.init === "function" && typeof Permisos.tiene === "function") {
            Permisos.init();
            const map = { VER: "Ver", EDITAR: "Editar", ELIMINAR: "Eliminar", CREAR: "Crear", EXPORTAR: "Exportar" };
            const accionUi = map[tipoNorm] || tipoNorm;
            return Permisos.tiene(mod, accionUi);
        }

        try {
            const user = JSON.parse(localStorage.getItem("userSession") || "null");
            const permisos = user?.Permisos || [];
            const modBuscado = (mod || "").toString().trim().toLowerCase();
            return permisos.some(p => {
                const nombreModulo = (p.Modulo || "").toString().trim().toLowerCase();
                const codigoModulo = (p.CodigoModulo || "").toString().trim().toLowerCase();
                if (nombreModulo !== modBuscado && codigoModulo !== modBuscado) return false;
                if (!p.Permisos) return false;
                const permiso = p.Permisos.find(x =>
                    (x.Codigo || "").toString().trim().toUpperCase() === tipoNorm
                );
                return !!permiso?.Activo;
            });
        } catch {
            return false;
        }
    }

    const verRequiereVerOEditar = !!a.verRequiereVerOEditar;
    const puedeVer = a.ver && nombreFnOk(a.ver) && (
        verRequiereVerOEditar
            ? (tienePermisoGrid(mod, "VER") || tienePermisoGrid(mod, "EDITAR"))
            : tienePermisoGrid(mod, "VER")
    );

    const parts = [];
    if (puedeVer) {
        parts.push(
            `<button type="button" class="btn btn-sm rp-act rp-act-view" title="Ver" onclick="${a.ver}(${idStr})"><i class="fa fa-file-text-o"></i></button>`
        );
    }
    if (a.editar && nombreFnOk(a.editar) && tienePermisoGrid(mod, "EDITAR")) {
        parts.push(
            `<button type="button" class="btn btn-sm rp-act rp-act-edit" title="Editar" onclick="${a.editar}(${idStr})"><i class="fa fa-pencil-square-o"></i></button>`
        );
    }
    if (a.eliminar && nombreFnOk(a.eliminar) && tienePermisoGrid(mod, "ELIMINAR")) {
        parts.push(
            `<button type="button" class="btn btn-sm rp-act rp-act-del" title="Eliminar" onclick="${a.eliminar}(${idStr})"><i class="fa fa-trash-o"></i></button>`
        );
    }

    if (!parts.length) {
        return '<span class="text-muted abm-sin-acciones" title="Sin acciones">—</span>';
    }
    return `<div class="rp-row-actions" data-id="${idStr}">${parts.join("")}</div>`;
}

window.renderAccionesGrid = renderAccionesGrid;

document.addEventListener("DOMContentLoaded", function () {
    try {
        if (typeof Permisos !== "undefined" && Permisos && typeof Permisos.init === "function") {
            Permisos.init();
        }
    } catch (_) { /* páginas sin Permisos.js */ }
});

/* ============================== FIN SITE.JS ============================== */
