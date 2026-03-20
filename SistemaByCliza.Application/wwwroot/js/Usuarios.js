// ===================== Usuarios.js (alineado a Personal/Ventas) =====================
let gridUsuarios;
let wasSubmitUsuario = false; // no mostrar rojo hasta intentar guardar

// --------- Filtros por columna (thead) ----------
const columnConfig = [
    { index: 1, filterType: 'text' },                    // Usuario
    { index: 2, filterType: 'text' },                    // Nombre
    { index: 3, filterType: 'text' },                    // Apellido
    { index: 4, filterType: 'text' },                    // DNI
    { index: 5, filterType: 'text' },                    // Teléfono
    { index: 6, filterType: 'text' },                    // Dirección
    { index: 7, filterType: 'select', fetchDataFunc: listaRolesFilter },   // Rol
    { index: 8, filterType: 'select', fetchDataFunc: listaEstadosFilter }  // Estado
];

// --------- Catálogos / Estado selección Sucursales ----------
const Catalogos = { Sucursales: [], SucursalesMap: new Map() };
const MultiState = (window.MultiState || {});
MultiState.Sucursales = MultiState.Sucursales || new Set();

function getSucursalesSeleccionadas() { return [...MultiState.Sucursales].map(Number); }

// --------- Checklist Sucursales ----------
function updateChecklistButtonLabel(btnId, map, emptyText) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    const nombres = [...MultiState.Sucursales].map(id => map.get(Number(id))).filter(Boolean);
    btn.textContent = nombres.length ? nombres.join(', ') : emptyText;
    btn.title = nombres.join(', ');
}

function renderChecklist(panelId, items, stateSet, btnId, allLabel = 'Seleccionar todos') {
    const panel = document.getElementById(panelId);
    if (!panel) return;

    const selected = stateSet;
    const allChecked = items.length > 0 && items.every(it => selected.has(Number(it.Id)));

    const html = [
        `<div class="form-check">
            <input class="form-check-input" type="checkbox" id="${panelId}-all" ${allChecked ? 'checked' : ''}>
            <label class="form-check-label" for="${panelId}-all">${allLabel}</label>
        </div>
        <hr class="my-2" />`
    ];
    for (const it of items) {
        const checked = selected.has(Number(it.Id)) ? 'checked' : '';
        html.push(`
        <div class="form-check">
            <input class="form-check-input" type="checkbox" id="${panelId}-opt-${it.Id}" data-id="${it.Id}" ${checked}>
            <label class="form-check-label" for="${panelId}-opt-${it.Id}">${it.Nombre}</label>
        </div>`);
    }
    panel.innerHTML = html.join('');

    // Select all
    document.getElementById(`${panelId}-all`)?.addEventListener('change', ev => {
        selected.clear();
        if (ev.target.checked) items.forEach(it => selected.add(Number(it.Id)));
        items.forEach(it => {
            const cb = document.getElementById(`${panelId}-opt-${it.Id}`);
            if (cb) cb.checked = ev.target.checked;
        });
        updateChecklistButtonLabel(btnId, Catalogos.SucursalesMap, 'Seleccionar Sucursales');
        if (wasSubmitUsuario) validarUsuarioCampos();
    });

    // Individuales
    items.forEach(it => {
        const cb = document.getElementById(`${panelId}-opt-${it.Id}`);
        if (!cb) return;
        cb.addEventListener('change', ev => {
            const id = Number(ev.target.getAttribute('data-id'));
            if (ev.target.checked) selected.add(id); else selected.delete(id);
            const allC = items.length > 0 && items.every(x => selected.has(Number(x.Id)));
            const allBox = document.getElementById(`${panelId}-all`);
            if (allBox) allBox.checked = allC;
            updateChecklistButtonLabel(btnId, Catalogos.SucursalesMap, 'Seleccionar Sucursales');
            if (wasSubmitUsuario) validarUsuarioCampos();
        });
    });

    updateChecklistButtonLabel(btnId, Catalogos.SucursalesMap, 'Seleccionar Sucursales');
}

document.addEventListener('click', (e) => {
    const panel = document.getElementById('listaSucursales');
    const btn = document.getElementById('btnSucursales');
    if (!panel || panel.classList.contains('d-none')) return;
    if (!panel.contains(e.target) && !btn.contains(e.target)) panel.classList.add('d-none');
});
function toggleChecklist(btnId, panelId) {
    const panel = document.getElementById(panelId);
    panel?.classList.toggle('d-none');
}

// --------- Ready ----------
$(document).ready(() => {
    listaUsuarios();
});

// ======================= Validación estilo Ventas/Personal =======================
function clearAllValidationUsuario() {
    const root = document.querySelector('#modalEdicion');
    if (!root) return;
    root.querySelectorAll('input,select,textarea').forEach(el => clearValidation(el));
    const banner = document.querySelector('#errorCampos');
    if (banner) banner.classList.add('d-none');
    // reset estado visual del botón checklist
    document.getElementById('btnSucursales')?.classList.remove('is-invalid', 'is-valid');
    wasSubmitUsuario = false;
}

function validarUsuarioCampos() {
    const root = document.querySelector('#modalEdicion');
    if (!root) return true;

    let ok = true;

    // Campos requeridos nativos
    root.querySelectorAll('input[required], select[required], textarea[required]').forEach(el => {
        // Si es txtContrasena y está oculto (modo edición), ignorar
        if (el.id === 'txtContrasena' && document.getElementById('divContrasena')?.hasAttribute('hidden')) return;

        const valid = el.checkValidity() && !!(el.value && String(el.value).trim() !== '');
        if (valid) ok = setValid(el) && ok; else ok = setInvalid(el) && ok;
    });

    // Requisito: al menos 1 sucursal
    const SucursalesOk = MultiState.Sucursales.size > 0;
    const btnSuc = document.getElementById('btnSucursales');
    if (btnSuc) {
        btnSuc.classList.toggle('is-invalid', !SucursalesOk);
        btnSuc.classList.toggle('is-valid', SucursalesOk);
    }
    if (!SucursalesOk) ok = false;

    const banner = document.getElementById("errorCampos");
    if (banner) {
        if (!ok) {
            banner.textContent = SucursalesOk ? "Debes completar los campos obligatorios." : "Seleccioná al menos una sucursal.";
            banner.classList.remove("d-none");
        } else banner.classList.add("d-none");
    }
    return ok;
}

function attachUsuarioLiveValidation() {
    const root = document.querySelector('#modalEdicion');
    if (!root) return;

    const onChange = (ev) => {
        if (!wasSubmitUsuario) { clearValidation(ev.target); return; }
        validarUsuarioCampos();
    };

    root.querySelectorAll('input,select,textarea').forEach(el => {
        el.setAttribute('autocomplete', 'off');
        el.addEventListener('input', onChange);
        el.addEventListener('change', onChange);
        el.addEventListener('blur', onChange);
    });

    // Select2 (Roles/Estados)
    if (window.jQuery && $.fn.select2) {
        $(root).find('select.select2-hidden-accessible')
            .off('select2:select.uv select2:clear.uv')
            .on('select2:select.uv select2:clear.uv', function () {
                if (!wasSubmitUsuario) { clearValidation(this); return; }
                validarUsuarioCampos();
            });
    }
}

// ======================= Crear / Editar =======================
async function guardarCambiosUsuario() {
    wasSubmitUsuario = true;
    if (!validarUsuarioCampos()) return;

    const id = $("#txtId").val();
    const payload = {
        Id: id !== "" ? Number(id) : 0,
        Usuario: $("#txtUsuario").val(),
        Nombre: $("#txtNombre").val(),
        Apellido: $("#txtApellido").val(),
        Dni: $("#txtDni").val(),
        Telefono: $("#txtTelefono").val(),
        Direccion: $("#txtDireccion").val(),
        IdRol: Number($("#Roles").val() || 0),
        IdEstado: Number($("#Estados").val() || 0),
        Contrasena: (id === "" ? $("#txtContrasena").val() : ""),
        ContrasenaNueva: $("#txtContrasenaNueva").val(),
        CambioAdmin: 1,
        IdSucursales: getSucursalesSeleccionadas()
    };

    const url = id === "" ? "/Usuarios/Insertar" : "/Usuarios/Actualizar";
    const method = id === "" ? "POST" : "PUT";

    try {
        const res = await fetch(url, {
            method,
            headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json;charset=utf-8' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error(res.statusText);
        const dataJson = await res.json();

        if (dataJson?.valor === 'Contrasena') { errorModal("Contraseña incorrecta"); return; }
        if (dataJson?.valor === 'Usuario') { errorModal("El nombre de usuario ya existe."); return; }
        if (dataJson?.valor === 'Error') { errorModal("No se pudo guardar el usuario."); return; }

        $('#modalEdicion').modal('hide');
        exitoModal(id === "" ? "Usuario registrado correctamente" : "Usuario modificado correctamente");
        listaUsuarios();
    } catch (e) {
        console.error(e);
        errorModal("No se pudo guardar el usuario.");
    }
}

function nuevoUsuario() {
    limpiarModal('#modalEdicion', '#errorCampos');

    // reset Sucursales
    MultiState.Sucursales.clear();
    document.getElementById('btnSucursales')?.classList.remove('is-invalid', 'is-valid');

    Promise.all([listaEstados(), listaRoles(), cargarSucursales()]).then(() => {
        // Select2 en combos
        $('#Roles,#Estados').addClass('select2');
        initSelect2('#modalEdicion');
        ensureFeedbackBlocks('#modalEdicion');

        // Estado campos contraseña
        document.getElementById("divContrasena")?.removeAttribute("hidden");
        document.getElementById("txtContrasena")?.setAttribute('required', 'required');
        document.getElementById("divContrasenaNueva")?.setAttribute("hidden", "hidden");

        attachUsuarioLiveValidation();
        clearAllValidationUsuario();

        $('#modalEdicion').modal('show');
        $("#btnGuardarUsuario").text("Registrar");
        $("#modalEdicionLabel").text("Nuevo Usuario");
    });
}

async function mostrarModalUsuario(modelo) {
    limpiarModal('#modalEdicion', '#errorCampos');

    // Campos base
    setValorInput("#txtId", modelo.Id ?? 0);
    setValorInput("#txtUsuario", modelo.Usuario);
    setValorInput("#txtNombre", modelo.Nombre);
    setValorInput("#txtApellido", modelo.Apellido);
    setValorInput("#txtDni", modelo.Dni);
    setValorInput("#txtTelefono", modelo.Telefono);
    setValorInput("#txtDireccion", modelo.Direccion);
    setValorInput("#txtContrasena", ""); // por seguridad no se completa
    setValorInput("#txtContrasenaNueva", "");

    MultiState.Sucursales.clear();

    await Promise.all([listaEstados(), listaRoles(), cargarSucursales()]);

    // Select2
    $('#Roles,#Estados').addClass('select2');
    initSelect2('#modalEdicion');
    ensureFeedbackBlocks('#modalEdicion');

    $("#Roles").val(modelo.IdRol ?? '').trigger('change');
    $("#Estados").val(modelo.IdEstado ?? '').trigger('change');

    // Sucursales del usuario
    const idsSucursales =
        (Array.isArray(modelo.IdSucursales) && modelo.IdSucursales.map(Number)) ||
        (Array.isArray(modelo.UsuariosSucursales) && modelo.UsuariosSucursales.map(s => Number(s.IdSucursal))) ||
        [];
    idsSucursales.forEach(id => MultiState.Sucursales.add(Number(id)));
    renderChecklist('listaSucursales', Catalogos.Sucursales, MultiState.Sucursales, 'btnSucursales', 'Seleccionar todos');

    // Estado campos contraseña (editar)
    document.getElementById("divContrasena")?.setAttribute("hidden", "hidden");
    document.getElementById("txtContrasena")?.removeAttribute('required');
    document.getElementById("divContrasenaNueva")?.removeAttribute("hidden");

    attachUsuarioLiveValidation();
    clearAllValidationUsuario();

    $('#modalEdicion').modal('show');
    $("#btnGuardarUsuario").text("Guardar");
    $("#modalEdicionLabel").text("Editar Usuario");
}

// ======================= Listado / Acciones =======================
async function listaUsuarios() {
    const url = `/Usuarios/Lista`;
    const response = await fetch(url, {
        method: 'GET',
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
    });
    if (!response.ok) throw new Error(`Error en la solicitud: ${response.statusText}`);
    const data = await response.json();
    await configurarDataTableUsuarios(data);
}

const editarUsuario = id => {
    $('.acciones-dropdown').hide();
    fetch("/Usuarios/EditarInfo?id=" + id, {
        method: 'GET',
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
    })
        .then(r => { if (!r.ok) throw new Error("Ha ocurrido un error."); return r.json(); })
        .then(json => json ? mostrarModalUsuario(json) : (() => { throw new Error("Ha ocurrido un error."); })())
        .catch(() => errorModal("Ha ocurrido un error."));
};

async function eliminarUsuario(id) {
    $('.acciones-dropdown').hide();
    const confirmado = await confirmarModal("¿Desea eliminar este usuario?");
    if (!confirmado) return;

    try {
        const response = await fetch("/Usuarios/Eliminar?id=" + id, {
            method: "DELETE",
            headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
        });
        if (!response.ok) throw new Error("Error al eliminar el Usuario.");
        const dataJson = await response.json();
        if (dataJson?.valor) {
            listaUsuarios();
            exitoModal("Usuario eliminado correctamente");
        }
    } catch (error) {
        console.error("Ha ocurrido un error:", error);
        errorModal("No se pudo eliminar el usuario.");
    }
}

// ======================= DataTable (filtros + export) =======================
async function configurarDataTableUsuarios(data) {
    if (!gridUsuarios) {
        // fila de filtros (thead)
        $('#grd_Usuarios thead tr').clone(true).addClass('filters').appendTo('#grd_Usuarios thead');

        gridUsuarios = $('#grd_Usuarios').DataTable({
            data,
            language: { url: "//cdn.datatables.net/plug-ins/2.0.7/i18n/es-MX.json" },
            scrollX: true,
            scrollCollapse: true,
            columns: [
                {   // Acciones
                    data: "Id", title: '', width: "1%",
                    render: function (data) {
                        return `
                        <div class="acciones-menu" data-id="${data}">
                            <button class='btn btn-sm btnacciones' type='button' onclick='toggleAcciones(${data})' title='Acciones'>
                                <i class='fa fa-ellipsis-v fa-lg text-white' aria-hidden='true'></i>
                            </button>
                            <div class="acciones-dropdown" style="display:none;">
                                <button class='btn btn-sm btneditar' type='button' onclick='editarUsuario(${data})' title='Editar'>
                                    <i class='fa fa-pencil-square-o fa-lg text-success'></i> Editar
                                </button>
                                <button class='btn btn-sm btneliminar' type='button' onclick='eliminarUsuario(${data})' title='Eliminar'>
                                    <i class='fa fa-trash-o fa-lg text-danger'></i> Eliminar
                                </button>
                            </div>
                        </div>`;
                    },
                    orderable: false, searchable: false
                },
                { data: 'Usuario', title: 'Usuario' },     // 1
                { data: 'Nombre', title: 'Nombre' },       // 2
                { data: 'Apellido', title: 'Apellido' },   // 3
                { data: 'Dni', title: 'DNI' },             // 4
                { data: 'Telefono', title: 'Teléfono' },   // 5
                { data: 'Direccion', title: 'Dirección' }, // 6
                { data: 'Rol', title: 'Rol' },             // 7 (texto)
                { data: 'Estado', title: 'Estado', render: (d) => d === "Bloqueado" ? `<span style="color:red">${d}</span>` : d } // 8
            ],
            dom: 'Bfrtip',
            buttons: [
                {
                    extend: 'excelHtml5',
                    text: 'Exportar Excel',
                    filename: 'Reporte_Usuarios',
                    title: '',
                    exportOptions: { columns: [1, 2, 3, 4, 5, 6, 7, 8] },
                    className: 'btn-exportar-excel'
                },
                {
                    extend: 'pdfHtml5',
                    text: 'Exportar PDF',
                    filename: 'Reporte_Usuarios',
                    title: null,
                    orientation: 'landscape',
                    pageSize: 'A4',
                    exportOptions: { columns: [1, 2, 3, 4, 5, 6, 7, 8] },
                    className: 'buttons-pdf btn-exportar-pdf',
                    customize: function (doc) {
                        const now = moment().format('DD/MM/YYYY HH:mm');
                        doc.pageMargins = [20, 40, 20, 30];
                        doc.defaultStyle.fontSize = 9;
                        doc.header = {
                            columns: [
                                { text: 'Reporte de Usuarios', margin: [20, 12, 0, 0], bold: true, fontSize: 12 },
                                { text: now, alignment: 'right', margin: [0, 12, 20, 0], color: '#99a7bf' }
                            ]
                        };
                        doc.footer = function (currentPage, pageCount) {
                            return {
                                columns: [
                                    { text: 'Confidencial', margin: [20, 0, 0, 0], color: '#99a7bf' },
                                    { text: currentPage + ' / ' + pageCount, alignment: 'right', margin: [0, 0, 20, 0] }
                                ]
                            };
                        };
                        doc.styles.tableHeader = {
                            fillColor: '#1c2636', color: '#ffffff', bold: true, fontSize: 9, alignment: 'center'
                        };
                        const tableNode = doc.content.find(n => n.table);
                        if (tableNode) {
                            const colCount = tableNode.table.body[0].length;
                            tableNode.table.widths = Array(colCount).fill('*');
                            tableNode.layout = {
                                hLineWidth: () => 0.4,
                                vLineWidth: () => 0.4,
                                hLineColor: () => '#2b3647',
                                vLineColor: () => '#2b3647',
                                paddingLeft: () => 4,
                                paddingRight: () => 4,
                                paddingTop: () => 3,
                                paddingBottom: () => 3
                            };
                            tableNode.alignment = 'center';
                        }
                    }
                },
                {
                    extend: 'print',
                    text: 'Imprimir',
                    title: '',
                    exportOptions: { columns: [1, 2, 3, 4, 5, 6, 7, 8] },
                    className: 'btn-exportar-print'
                },
                'pageLength'
            ],
            orderCellsTop: true,
            fixedHeader: true,
            initComplete: async function () {
                const api = this.api();

                api.on("draw", actualizarKpiTotalUsuarios);
                actualizarKpiTotalUsuarios();

                // Construir fila de filtros
                for (const config of columnConfig) {
                    const $cell = $('.filters th').eq(config.index);

                    if (config.filterType === 'select') {
                        const $select = $(`<select><option value="">Seleccionar</option></select>`)
                            .appendTo($cell.empty())
                            .on('change', async function () {
                                const val = this.value;
                                if (val === '') { await api.column(config.index).search('').draw(); return; }
                                const txt = $(this).find('option:selected').text();
                                await api.column(config.index).search('^' + escapeRegex(txt) + '$', true, false).draw();
                            });
                        const items = await config.fetchDataFunc();
                        items.forEach(it => $select.append(`<option value="${it.Id}">${it.Nombre ?? ''}</option>`));
                    } else if (config.filterType === 'text') {
                        const $input = $(`<input type="text" placeholder="Buscar..." />`)
                            .appendTo($cell.empty())
                            .on('keyup change', function (e) {
                                e.stopPropagation();
                                const val = this.value;
                                const regexr = '({search})';
                                const cursor = this.selectionStart;
                                api.column(config.index)
                                    .search(val !== '' ? regexr.replace('{search}', '(((' + escapeRegex(val) + '))))') : '', val !== '', val === '')
                                    .draw();
                                $(this).focus()[0].setSelectionRange(cursor, cursor);
                            });
                    }
                }
                // Celda acciones sin filtro
                $('.filters th').eq(0).html('');

                // Opciones de columnas persistentes (usa helper genérico de site.js)
                configurarOpcionesColumnas('#grd_Usuarios', '#configColumnasMenu', 'Usuarios_Columnas');

                setTimeout(() => gridUsuarios.columns.adjust(), 10);
            }
        });

        // Cierre dropdown acciones al click afuera (backup; site.js ya tiene uno global)
        $(document).on('click', function (e) {
            if (!$(e.target).closest('.acciones-menu').length) $('.acciones-dropdown').hide();
        });

    } else {
        gridUsuarios.clear().rows.add(data).draw();
    }
}

function actualizarKpiTotalUsuarios() {
    if (!gridUsuarios) { $("#kpiTotalUsuarios").text("0"); return; }
    const total = gridUsuarios.rows({ search: 'applied' }).count();
    $("#kpiTotalUsuarios").text(total.toLocaleString("es-AR"));
}

// ======================= Catálogos =======================
async function listaRoles() {
    const res = await fetch('/Roles/Lista', { headers: { 'Authorization': 'Bearer ' + token } });
    const data = await res.json();
    const sel = document.getElementById("Roles");
    if (sel) {
        sel.innerHTML = '<option value="">Seleccione</option>';
        (data || []).forEach(x => {
            const opt = document.createElement("option");
            opt.value = x.Id; opt.textContent = x.Nombre;
            sel.appendChild(opt);
        });
    }
}
async function listaEstados() {
    const res = await fetch('/EstadosUsuarios/Lista', { headers: { 'Authorization': 'Bearer ' + token } });
    const data = await res.json();
    const sel = document.getElementById("Estados");
    if (sel) {
        sel.innerHTML = '<option value="">Seleccione</option>';
        (data || []).forEach(x => {
            const opt = document.createElement("option");
            opt.value = x.Id; opt.textContent = x.Nombre;
            sel.appendChild(opt);
        });
    }
}
async function listaRolesFilter() {
    const r = await fetch('/Roles/Lista', { headers: { 'Authorization': 'Bearer ' + token } });
    const data = await r.json();
    return (data || []).map(rol => ({ Id: rol.Id, Nombre: rol.Nombre }));
}
async function listaEstadosFilter() {
    const r = await fetch('/EstadosUsuarios/Lista', { headers: { 'Authorization': 'Bearer ' + token } });
    const data = await r.json();
    return (data || []).map(est => ({ Id: est.Id, Nombre: est.Nombre }));
}

async function cargarSucursales() {
    const r = await fetch("/Sucursales/Lista", { headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' } });
    const data = r.ok ? await r.json() : [];
    const norm = (data || []).map(x => ({ Id: Number(x.Id ?? 0), Nombre: String(x.Nombre ?? '') }));
    Catalogos.Sucursales = norm;
    Catalogos.SucursalesMap = new Map(norm.map(x => [x.Id, x.Nombre]));
    renderChecklist('listaSucursales', Catalogos.Sucursales, MultiState.Sucursales, 'btnSucursales', 'Seleccionar todos');
}
