/* ============================== SITE.JS ============================== */
const token = localStorage.getItem('JwtToken');

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

function mostrarModalConContador(modal, texto, tiempo) {
    $(`#${modal}Text`).text(texto);
    $(`#${modal}`).modal('show');
    setTimeout(function () { $(`#${modal}`).modal('hide'); }, tiempo);
}
function exitoModal(texto) { mostrarModalConContador('exitoModal', texto, 1000); }
function errorModal(texto) { mostrarModalConContador('ErrorModal', texto, 3000); }
function advertenciaModal(texto) { mostrarModalConContador('AdvertenciaModal', texto, 3000); }

function confirmarModal(mensaje) {
    return new Promise((resolve) => {
        const modalEl = document.getElementById('modalConfirmar');
        const mensajeEl = document.getElementById('modalConfirmarMensaje');
        const btnAceptar = document.getElementById('btnModalConfirmarAceptar');

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

        nuevoBtnAceptar.onclick = function () {
            if (resuelto) return;
            resuelto = true;
            resolve(true);
            nuevoModal.hide();
        };

        nuevoModalEl.addEventListener('hidden.bs.modal', () => {
            if (resuelto) return;
            resuelto = true;
            resolve(false);
        }, { once: true });

        nuevoModal.show();
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
    if (!valor) return 0;
    if (!valor.includes('.')) return parseFloat(valor) || 0;
    const limpio = valor.replace(/\./g, '').replace(',', '.');
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
function validarCampoIndividual(elOrSelector) {
    const el = typeof elOrSelector === 'string' ? document.querySelector(elOrSelector) : elOrSelector;
    if (!el) return true;

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
        el.addEventListener('input', () => { validarCampoIndividual(el); recheck(); });
        el.addEventListener('change', () => { validarCampoIndividual(el); recheck(); });
        el.addEventListener('blur', () => { validarCampoIndividual(el); recheck(); });
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
        opt.textContent = it[textField];
        sel.appendChild(opt);
    });
}

/* ======================= OPCIONES DE COLUMNAS (DataTables) ======================= */
function configurarOpcionesColumnas(tableSelector, menuSelector, storageKey) {
    const grid = $(tableSelector).DataTable();
    const columnas = grid.settings().init().columns;
    const container = $(menuSelector);
    const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');

    container.empty();
    columnas.forEach((col, index) => {
        if (!col.data) return;                   // Saltar acciones
        if (col.data && col.data !== "Id") {     // No "Id"
            const isChecked = saved[`col_${index}`] !== undefined ? saved[`col_${index}`] : true;
            grid.column(index).visible(isChecked);

            const nombre = (typeof col.title === 'string' && col.title.trim() !== '') ? col.title : (col.data || `Col ${index}`);

            container.append(`
            <li>
              <label class="dropdown-item">
                <input type="checkbox" class="toggle-column" data-column="${index}" ${isChecked ? 'checked' : ''}>
                ${nombre}
              </label>
            </li>`);
        }
    });

    container.find('.toggle-column').on('change', function () {
        const idx = parseInt($(this).data('column'), 10);
        const on = $(this).is(':checked');
        saved[`col_${idx}`] = on;
        localStorage.setItem(storageKey, JSON.stringify(saved));
        grid.column(idx).visible(on);
    });
}

/* ======================= BANNER DE ERRORES GLOBAL (ocultar/mostrar) ======================= */
function updateErrorBanner(modalOrSelector = '#modalEdicion', errorSelector = '#errorCampos') {
    const root = typeof modalOrSelector === 'string' ? document.querySelector(modalOrSelector) : modalOrSelector;
    const err = document.querySelector(errorSelector);
    if (!root || !err) return;

    let allValid = true;
    root.querySelectorAll('input[required], select[required], textarea[required]').forEach(el => {
        const ok = el.checkValidity() && !!(el.value && el.value.toString().trim() !== '');
        if (!ok) allValid = false;
    });
    err.classList.toggle('d-none', allValid);
}

/* ======================= SELECT2 – validación genérica ======================= */
function wireSelect2Validation(scope, errorSelector = '#errorCampos') {
    const $scope = $(scope || document);
    $scope.off('change.select2val', 'select.select2-hidden-accessible')
        .on('change.select2val', 'select.select2-hidden-accessible', function () {
            const ok = this.checkValidity() && !!this.value;
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

/* ======================= CIERRE DE MENÚS ======================= */
$(document).on('click', function (e) {
    if (!$(e.target).closest('.acciones-menu').length) $('.acciones-dropdown').hide();
});

/* ======================= INPUTMILES (formateo) ======================= */
document.querySelectorAll("input.Inputmiles").forEach(input => {
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
});

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
    $(scope || document).find('select.select2').each(function () {
        const $sel = $(this);
        $sel.select2({
            width: '100%',
            dropdownParent: $sel.closest('.modal').length ? $sel.closest('.modal') : $(document.body)
        });
    });
}

/* ======================= ---- NUEVOS HELPERS GENÉRICOS ---- ======================= */
/* Soporte de validación visual unificada (Inputs + Select2) */
function isSelect2(el) {
    return !!(window.jQuery && $(el).hasClass('select2-hidden-accessible') && $(el).next('.select2').length);
}
function getSelect2Selection(el) {
    return isSelect2(el) ? $(el).next('.select2').find('.select2-selection').get(0) : null;
}
function ensureInvalidFeedback(el) {
    if (!el) return null;
    const anchor = isSelect2(el) ? $(el).next('.select2').get(0) : el;
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
    if (fb) { fb.textContent = message; fb.style.display = 'block'; }
    return false;
}
function setValid(selector) {
    const el = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (!el) return true;
    const visual = getSelect2Selection(el) || el;
    visual.classList.remove('is-invalid');
    visual.classList.add('is-valid');
    const fb = isSelect2(el) ? $(el).next('.select2').get(0)?.nextElementSibling : el.nextElementSibling;
    if (fb && fb.classList?.contains('invalid-feedback')) fb.style.display = 'none';
    return true;
}
function clearValidation(selector) {
    const el = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (!el) return;
    const visual = getSelect2Selection(el) || el;
    visual.classList.remove('is-invalid', 'is-valid');
    const fb = isSelect2(el) ? $(el).next('.select2').get(0)?.nextElementSibling : el.nextElementSibling;
    if (fb && fb.classList?.contains('invalid-feedback')) fb.style.display = 'none';
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
        const ok = this.checkValidity() && !!this.value;
        if (ok) setValid(this); else setInvalid(this);
    });

/* ============================== FIN SITE.JS ============================== */
