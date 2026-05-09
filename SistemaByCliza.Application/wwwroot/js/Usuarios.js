let gridUsuarios;
let personalSelectorData = [];
let personalSeleccionado = null;

let permisosUsuarioCache = [];
let permisosUsuarioOriginal = [];
let usuarioPermisosModo = "nuevo"; // nuevo | editar | ver
let moduloPermisoSeleccionadoId = 0;

let sucursalesUsuarioCatalog = [];
const sucursalesUsuarioSelected = new Set();

const PERMISOS_COLUMNAS = ["VER", "CREAR", "EDITAR", "ELIMINAR", "EXPORTAR"];

const columnConfig = [
    { index: 1, filterType: 'text' },
    { index: 2, filterType: 'text' },
    { index: 3, filterType: 'text' },
    { index: 4, filterType: 'text' },
    { index: 5, filterType: 'text' },
    { index: 6, filterType: 'text' },
    { index: 7, filterType: 'select', fetchDataFunc: listaRolesFilter },
    { index: 8, filterType: 'select', fetchDataFunc: listaEstadosFilter },
    { index: 9, filterType: 'text' }
];

$(document).ready(() => {
    listaUsuarios();

    Permisos.init();
    Permisos.aplicarUI("Usuarios");

    document.querySelectorAll("#modalEdicion input, #modalEdicion select, #modalEdicion textarea").forEach(el => {
        el.setAttribute("autocomplete", "off");
        el.addEventListener("input", () => validarCampoIndividual(el));
        el.addEventListener("change", () => validarCampoIndividual(el));
        el.addEventListener("blur", () => validarCampoIndividual(el));
    });

    $("#Roles, #Estados").on("change", function () {
        validarCampoIndividual(this);
        if (this.id === "Roles") actualizarBadgeUsuarioPermisos();
    });

    $("#txtUsuario, #txtNombre, #txtApellido").on("input", function () {
        actualizarBadgeUsuarioPermisos();
    });

    $("#buscarPersonalSelector").on("keyup", function () {
        const txt = ($(this).val() || "").toLowerCase();

        const filtrado = personalSelectorData.filter(p =>
            (p.Nombre || "").toLowerCase().includes(txt) ||
            String(p.Dni || p.NumeroDocumento || "").toLowerCase().includes(txt)
        );

        renderPersonalSelector(filtrado);
    });

    $(document).on("input", "#txtBuscarModuloPermiso", function () {
        renderListaModulosPermisos($(this).val() || "");
    });
});

/* =========================
   CRUD
========================= */

async function guardarCambios() {

    if (!validarCampos()) return false;

    const idUsuario = $("#txtId").val();

    const nuevoModelo = {
        "Id": idUsuario !== "" ? idUsuario : 0,
        "Usuario": $("#txtUsuario").val(),
        "Nombre": $("#txtNombre").val(),
        "Apellido": $("#txtApellido").val(),
        "DNI": $("#txtDni").val(),
        "Telefono": $("#txtTelefono").val(),
        "Direccion": $("#txtDireccion").val(),
        "Correo": $("#txtCorreo").val(),
        "IdRol": $("#Roles").val(),
        "IdEstado": $("#Estados").val(),
        "IdSucursales": [...sucursalesUsuarioSelected].map(x => Number(x)).filter(n => n > 0),
        "Contrasena": idUsuario === "" ? $("#txtContrasena").val() : "",
        "ContrasenaNueva": $("#txtContrasenaNueva").val(),
        "CambioAdmin": 1
    };

    const url = idUsuario === "" ? "/Usuarios/Insertar" : "/Usuarios/Actualizar";
    const method = idUsuario === "" ? "POST" : "PUT";

    try {

        // 🔥 1. GUARDAR USUARIO
        const response = await fetch(url, {
            method: method,
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json;charset=utf-8'
            },
            body: JSON.stringify(nuevoModelo)
        });

        if (!response.ok) throw new Error("Error al guardar usuario");

        const dataJson = await response.json();

        if (dataJson.valor === "Contrasena") {
            errorModal("Contraseña incorrecta");
            return;
        }
        if (dataJson.valor === "Usuario") {
            errorModal("El nombre de usuario ya está en uso.");
            return;
        }
        if (dataJson.valor === false || dataJson.valor === "Error") {
            errorModal(dataJson.mensaje || "No se pudo guardar el usuario.");
            return;
        }
        if (idUsuario === "" && dataJson.valor !== true) {
            errorModal("No se pudo registrar el usuario.");
            return;
        }
        if (idUsuario !== "" && dataJson.valor !== "OK") {
            errorModal("No se pudo actualizar el usuario.");
            return;
        }

        // 🔥 2. OBTENER ID (clave)
        let idFinal = Number($("#txtId").val());

        if (!idFinal || idFinal <= 0) {
            idFinal =
                normalizarIdUsuarioGuardado(dataJson?.Id) ||
                normalizarIdUsuarioGuardado(dataJson?.id) ||
                normalizarIdUsuarioGuardado(dataJson?.IdUsuario) ||
                normalizarIdUsuarioGuardado(dataJson?.idUsuario) ||
                normalizarIdUsuarioGuardado(dataJson?.valor);
        }

        if (!idFinal || idFinal <= 0) {
            errorModal("No se pudo obtener el ID del usuario.");
            return;
        }

        $("#txtId").val(idFinal);

        // 🔥 3. GUARDAR PERMISOS (SI EXISTEN)
        if (permisosUsuarioCache && permisosUsuarioCache.length > 0) {

            const lista = [];

            (permisosUsuarioCache || []).forEach(mod => {

                const idModulo = Number(mod.IdModulo);
                if (!idModulo) return;

                (mod.Permisos || []).forEach(p => {

                    lista.push({
                        IdUsuario: idFinal,
                        IdModulo: idModulo,
                        Permiso: p.Codigo,
                        Activo: !!p.Activo
                    });

                });

            });

            await fetch(`/UsuariosPermisos/ActualizarMasivo`, {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json;charset=utf-8'
                },
                body: JSON.stringify({
                    IdUsuario: idFinal,
                    Permisos: lista
                })
            });
        }

        // 🔥 4. FIN
        $('#modalEdicion').modal('hide');

        exitoModal(idUsuario === ""
            ? "El usuario se registró correctamente."
            : "Los datos del usuario se guardaron correctamente.");

        await listaUsuarios();

    } catch (err) {
        console.error(err);
        errorModal("Error al guardar usuario y permisos.");
    }
}
async function nuevoUsuario() {
    limpiarModal();
    listaEstados();
    listaRoles();

    usuarioPermisosModo = "nuevo";
    setModalSoloLectura(false);
    $('#modalEdicion').modal('show');

    $("#btnGuardar").html(`<i class="fa fa-check"></i> Registrar`);
    $("#modalEdicionLabel").text("Nuevo Usuario");

    document.getElementById("divContrasena").removeAttribute("hidden");
    document.getElementById("divContrasenaNueva").setAttribute("hidden", "hidden");

    await iniciarSucursalesUsuarioChecklist([]);

    prepararPermisosEnModalNuevo();
}

async function mostrarModal(modelo) {
    limpiarModal();

    usuarioPermisosModo = "editar";
    setModalSoloLectura(false);

    const campos = ["Id", "Usuario", "Nombre", "Apellido", "Dni", "Telefono", "Direccion", "Correo", "Contrasena", "ContrasenaNueva"];
    campos.forEach(campo => {
        const el = $(`#txt${campo}`);
        if (el.length) el.val(modelo[campo] ?? "");
    });

    await listaEstados();
    await listaRoles();

    if (modelo.IdRol != null) $("#Roles").val(modelo.IdRol);
    if (modelo.IdEstado != null) $("#Estados").val(modelo.IdEstado);

    const idsSuc = modelo.IdSucursales ?? modelo.idSucursales ?? [];
    await iniciarSucursalesUsuarioChecklist(Array.isArray(idsSuc) ? idsSuc : []);

    $('#modalEdicion').modal('show');

    $("#btnGuardar").html(`<i class="fa fa-check"></i> Guardar`);
    $("#modalEdicionLabel").text("Editar Usuario");

    document.getElementById("divContrasena").setAttribute("hidden", "hidden");
    document.getElementById("divContrasenaNueva").removeAttribute("hidden");

    actualizarBadgeUsuarioPermisos();
    habilitarSeccionPermisos(true);
    await cargarPermisosUsuario(modelo.Id);
}

const editarUsuario = id => {
    Permisos.init();
    if (!Permisos.tiene("Usuarios", "Editar")) {
        errorModal("No tenés permisos.");
        return;
    }

    fetch("/Usuarios/EditarInfo?id=" + id, {
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
        .then(dataJson => {
            if (dataJson) mostrarModal(dataJson);
            else throw new Error("Ha ocurrido un error.");
        })
        .catch(_ => errorModal("Ha ocurrido un error."));
};

async function eliminarUsuario(id) {
    Permisos.init();
    if (!Permisos.tiene("Usuarios", "Eliminar")) {
        errorModal("No tenés permisos.");
        return;
    }

    const confirmado = await confirmarModal("¿Desea eliminar este usuario?");
    if (!confirmado) return;

    try {
        const response = await fetch("/Usuarios/Eliminar?id=" + id, {
            method: "DELETE",
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error("Error al eliminar el Usuario.");

        const dataJson = await response.json();
        if (dataJson.valor === true) {
            listaUsuarios();
            exitoModal("Usuario eliminado correctamente");
            return;
        }
        errorModal(dataJson.mensaje || "No se pudo eliminar el usuario.");
    } catch (e) {
        console.error("Ha ocurrido un error:", e);
        errorModal("Ha ocurrido un error.");
    }
}

/* =========================
   LISTA + DATATABLE
========================= */

async function listaUsuarios() {
    let paginaActual = gridUsuarios != null ? gridUsuarios.page() : 0;

    const response = await fetch(`/Usuarios/Lista`, {
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) throw new Error(`Error en la solicitud: ${response.statusText}`);

    const data = await response.json();
    await configurarDataTable(data);

    if (paginaActual > 0) {
        gridUsuarios.page(paginaActual).draw('page');
    }
}

function rpBadgeEstado(estado) {
    const s = (estado || "").toString().toLowerCase();
    if (s.includes("bloq")) return `<span class="rp-badge rp-badge-danger">Bloqueado</span>`;
    if (s.includes("acti")) return `<span class="rp-badge rp-badge-success">Activo</span>`;
    return `<span class="rp-badge rp-badge-soft">${estado || "—"}</span>`;
}

async function configurarDataTable(data) {

    if (!gridUsuarios) {

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
                        return renderAccionesGrid(data, {
                            ver: "verUsuario",
                            editar: "editarUsuario",
                            eliminar: "eliminarUsuario"
                        }, "Usuarios");
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
            buttons: dataTableButtonsExportCondicional("Usuarios", [
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
            ]),
            orderCellsTop: true,
            fixedHeader: true,
            initComplete: async function () {
                const api = this.api();

                for (const config of columnConfig) {
                    if (config.index > 8) continue;

                    const cell = $('.filters th').eq(config.index);

                    if (config.filterType === 'select') {
                        const select = $(`<select class="rp-filter-select" id="filter${config.index}">
                                            <option value="">Todos</option>
                                          </select>`)
                            .appendTo(cell.empty())
                            .on('change', async function () {
                                const val = $(this).val();
                                const selectedText = $(this).find('option:selected').text();

                                await api.column(config.index)
                                    .search(val ? '^' + selectedText + '$' : '', true, false)
                                    .draw();
                            });

                        const datos = await config.fetchDataFunc();
                        (datos || []).forEach(item => {
                            select.append(`<option value="${item.Id}">${item.Nombre}</option>`);
                        });

                    } else {
                        const input = $(`<input class="rp-filter-input" type="text" placeholder="Buscar...">`)
                            .appendTo(cell.empty())
                            .off('keyup change')
                            .on('keyup change', function (e) {
                                e.stopPropagation();
                                const cursorPosition = this.selectionStart;

                                api.column(config.index)
                                    .search(this.value ? this.value : '', true, false)
                                    .draw();

                                this.setSelectionRange(cursorPosition, cursorPosition);
                            });
                    }
                }

                $('.filters th').eq(0).html('');

                if (typeof configurarOpcionesColumnas === "function") {
                    configurarOpcionesColumnas("#grd_Usuarios", "#configColumnasMenu", "Usuarios_Columnas", {
                        getTitle: (col, index) => (index === 6 ? "Direccion" : (col.data || "Col"))
                    });
                }

                if (typeof bindDataTableSeleccionFila === "function") {
                    bindDataTableSeleccionFila("#grd_Usuarios", "usuarios");
                }

                setTimeout(() => gridUsuarios.columns.adjust(), 10);

                actualizarKpis(data);
            }
        });

    } else {
        gridUsuarios.clear().rows.add(data).draw();
        actualizarKpis(data);
    }
}

/* =========================
   ROLES / ESTADOS
========================= */

async function listaRoles() {
    const res = await fetch("/Roles/Lista", {
        headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" }
    });
    const data = await res.json();

    $('#Roles option').remove();
    const select = document.getElementById("Roles");

    const op0 = document.createElement("option");
    op0.value = "";
    op0.text = "Seleccionar";
    select.appendChild(op0);

    for (let i = 0; i < data.length; i++) {
        const option = document.createElement("option");
        option.value = data[i].Id;
        option.text = data[i].Nombre;
        select.appendChild(option);
    }
}

async function listaEstados() {
    const res = await fetch("/EstadosUsuarios/Lista", {
        headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" }
    });
    const data = await res.json();

    $('#Estados option').remove();
    const select = document.getElementById("Estados");

    const op0 = document.createElement("option");
    op0.value = "";
    op0.text = "Seleccionar";
    select.appendChild(op0);

    for (let i = 0; i < data.length; i++) {
        const option = document.createElement("option");
        option.value = data[i].Id;
        option.text = data[i].Nombre;
        select.appendChild(option);
    }
}

async function listaEstadosFilter() {
    const res = await fetch("/EstadosUsuarios/Lista", {
        headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" }
    });
    const data = await res.json();
    return (data || []).map(x => ({ Id: x.Id, Nombre: x.Nombre }));
}

async function listaRolesFilter() {
    const res = await fetch("/Roles/Lista", {
        headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" }
    });

    const data = await res.json();
    return (data || []).map(x => ({ Id: x.Id, Nombre: x.Nombre }));

}

/* =========================
   SUCURSALES (checklist modal usuario)
========================= */

async function cargarCatalogoSucursalesUsuario() {
    try {
        const res = await fetch("/Sucursales/Lista", {
            headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" }
        });
        if (!res.ok) throw new Error();
        sucursalesUsuarioCatalog = await res.json();
    } catch {
        sucursalesUsuarioCatalog = [];
    }
}

/** Mismo criterio que Productos.js → renderChecklist / updateChecklistButtonLabel (talles, colores). */
function actualizarLabelSucursalesUsuario() {
    const btn = document.getElementById("btnSucursales");
    if (!btn) return;
    const map = new Map((sucursalesUsuarioCatalog || []).map(s => [Number(s.Id), s.Nombre]));
    const textos = [...sucursalesUsuarioSelected].map(id => map.get(Number(id))).filter(Boolean);
    btn.textContent = textos.length ? textos.join(", ") : "Seleccionar sucursales";
    btn.title = textos.join(", ");
}

function renderSucursalesUsuarioChecklist() {
    const panelId = "listaSucursales";
    const panel = document.getElementById(panelId);
    if (!panel) return;

    const items = (sucursalesUsuarioCatalog || []).filter(it => Number(it.Id) > 0);
    const selected = sucursalesUsuarioSelected;

    const allChecked = items.length > 0 && items.every(it => selected.has(Number(it.Id)));
    const html = [];
    html.push(`
    <div class="form-check">
      <input class="form-check-input" type="checkbox" id="${panelId}-all" ${allChecked ? "checked" : ""}>
      <label class="form-check-label" for="${panelId}-all">Seleccionar todos</label>
    </div>
    <hr class="my-2" />
  `);

    for (const it of items) {
        const id = Number(it.Id);
        const checked = selected.has(id) ? "checked" : "";
        html.push(`
      <div class="form-check">
        <input class="form-check-input" type="checkbox" id="${panelId}-opt-${id}" data-id="${id}" ${checked}>
        <label class="form-check-label" for="${panelId}-opt-${id}">${escapeHtml(it.Nombre || "")}</label>
      </div>
    `);
    }
    panel.innerHTML = html.join("");

    const allBox = document.getElementById(`${panelId}-all`);
    if (allBox) {
        allBox.addEventListener("change", ev => {
            selected.clear();
            if (ev.target.checked) {
                items.forEach(x => selected.add(Number(x.Id)));
            }
            items.forEach(x => {
                const cb = document.getElementById(`${panelId}-opt-${x.Id}`);
                if (cb) cb.checked = !!ev.target.checked;
            });
            actualizarLabelSucursalesUsuario();
        });
    }

    items.forEach(it => {
        const id = Number(it.Id);
        const cb = document.getElementById(`${panelId}-opt-${id}`);
        if (!cb) return;
        cb.addEventListener("change", ev => {
            const sid = Number(ev.target.getAttribute("data-id"));
            if (ev.target.checked) selected.add(sid);
            else selected.delete(sid);
            actualizarLabelSucursalesUsuario();
            const allC = items.length > 0 && items.every(x => selected.has(Number(x.Id)));
            const ab = document.getElementById(`${panelId}-all`);
            if (ab) ab.checked = allC;
        });
    });

    actualizarLabelSucursalesUsuario();
}

async function iniciarSucursalesUsuarioChecklist(idsIniciales) {
    await cargarCatalogoSucursalesUsuario();
    sucursalesUsuarioSelected.clear();
    (idsIniciales || []).forEach(x => {
        const n = Number(x);
        if (n > 0) sucursalesUsuarioSelected.add(n);
    });
    renderSucursalesUsuarioChecklist();
    const panel = document.getElementById("listaSucursales");
    if (panel) panel.classList.add("d-none");
}

/* =========================
   VALIDACIONES
========================= */

function limpiarModal() {
    const formulario = document.querySelector("#modalEdicion");
    if (!formulario) return;

    formulario.querySelectorAll("input, select, textarea").forEach(el => {
        if (el.id === "txtBuscarModuloPermiso") {
            el.value = "";
            return;
        }

        if (el.tagName === "SELECT") el.selectedIndex = 0;
        else if (el.type === "checkbox") el.checked = false;
        else el.value = "";

        el.classList.remove("is-invalid", "is-valid");
        el.removeAttribute("disabled");
        el.removeAttribute("readonly");
    });

    const errorMsg = document.getElementById("errorCampos");
    if (errorMsg) errorMsg.classList.add("d-none");

    personalSeleccionado = null;
    personalSelectorData = [];
    permisosUsuarioCache = [];
    permisosUsuarioOriginal = [];
    moduloPermisoSeleccionadoId = 0;

    sucursalesUsuarioCatalog = [];
    sucursalesUsuarioSelected.clear();
    const panelSuc = document.getElementById("listaSucursales");
    if (panelSuc) {
        panelSuc.innerHTML = "";
        panelSuc.classList.add("d-none");
    }
    const btnSuc = document.getElementById("btnSucursales");
    if (btnSuc) {
        btnSuc.textContent = "Seleccionar sucursales";
        btnSuc.title = "";
        btnSuc.classList.remove("disabled");
        btnSuc.style.pointerEvents = "";
    }

    actualizarBadgeUsuarioPermisos();
    renderPermisosPlaceholder("Guardá el usuario para administrar permisos.");
    habilitarSeccionPermisos(false);
    actualizarResumenPermisos();
}

function obtenerInvalidFeedback(el) {
    if (!el) return null;
    let sib = el.nextElementSibling;
    while (sib) {
        if (sib.classList && sib.classList.contains("invalid-feedback")) return sib;
        sib = sib.nextElementSibling;
    }
    const parent = el.parentElement;
    return parent ? parent.querySelector(".invalid-feedback") : null;
}

function validarCampoIndividual(el) {
    if (!el || !el.id) return;

    if (el.id === "txtTelefono" || el.id === "txtDireccion") {
        el.classList.remove("is-invalid", "is-valid");
        verificarErroresGenerales();
        return;
    }

    const esNuevo = !$("#txtId").val();
    const obligatorios = [
        "txtNombre",
        "txtUsuario",
        "Roles",
        "Estados"
    ];
    if (esNuevo) obligatorios.push("txtContrasena");

    if (!obligatorios.includes(el.id)) return;

    const valor = el.value != null ? String(el.value).trim() : "";
    const feedback = obtenerInvalidFeedback(el);
    if (feedback) feedback.textContent = "Campo obligatorio";

    if (valor === "" || valor === "Seleccionar") {
        el.classList.remove("is-valid");
        el.classList.add("is-invalid");
    } else {
        el.classList.remove("is-invalid");
        el.classList.add("is-valid");
    }

    verificarErroresGenerales();
}

function verificarErroresGenerales() {
    const errorMsg = document.getElementById("errorCampos");
    const hayInvalidos = document.querySelectorAll("#modalEdicion .is-invalid").length > 0;
    if (!errorMsg) return;

    if (hayInvalidos) {
        errorMsg.classList.remove("d-none");
    } else {
        errorMsg.classList.add("d-none");
    }
}

function validarCampos() {
    const idUsuario = $("#txtId").val();

    const campos = [
        "#txtNombre",
        "#txtUsuario",
        "#Roles",
        "#Estados"
    ];

    if (idUsuario === "") {
        campos.push("#txtContrasena");
    }

    let valido = true;

    campos.forEach(selector => {
        const campo = document.querySelector(selector);
        if (!campo) return;

        const valor = campo.value != null ? String(campo.value).trim() : "";
        const feedback = obtenerInvalidFeedback(campo);
        if (feedback) feedback.textContent = "Campo obligatorio";

        if (!valor || valor === "Seleccionar") {
            campo.classList.add("is-invalid");
            campo.classList.remove("is-valid");
            valido = false;
        } else {
            campo.classList.remove("is-invalid");
            campo.classList.add("is-valid");
        }
    });

    const panel = document.getElementById("errorCampos");
    if (panel) panel.classList.toggle("d-none", valido);
    verificarErroresGenerales();

    return valido;
}

function cerrarErrorCampos() {
    $("#errorCampos").addClass("d-none");
}

function actualizarKpis(data) {
    const cant = Array.isArray(data) ? data.length : 0;
    const el = document.getElementById('kpiCantUsuarios');
    if (el) el.textContent = cant;
}

function setModalSoloLectura(soloLectura) {
    const inputs = document.querySelectorAll("#modalEdicion input, #modalEdicion select, #modalEdicion textarea");

    inputs.forEach(el => {
        if (el.id === "txtId") return;
        if (el.id === "txtBuscarModuloPermiso") return;

        if (soloLectura) {
            if (el.tagName === "SELECT") {
                el.setAttribute("disabled", "disabled");
            } else {
                el.setAttribute("readonly", "readonly");
            }
        } else {
            el.removeAttribute("disabled");
            el.removeAttribute("readonly");
        }
    });

    $("#btnGuardar").prop("disabled", !!soloLectura);

    const btnSuc = document.getElementById("btnSucursales");
    if (btnSuc) {
        if (soloLectura) {
            btnSuc.classList.add("disabled");
            btnSuc.style.pointerEvents = "none";
        } else {
            btnSuc.classList.remove("disabled");
            btnSuc.style.pointerEvents = "";
        }
    }
}

const verUsuario = id => {
    Permisos.init();
    if (!Permisos.tiene("Usuarios", "Ver")) {
        errorModal("No tenés permisos.");
        return;
    }

    fetch("/Usuarios/EditarInfo?id=" + id, {
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
        .then(async dataJson => {
            if (!dataJson) throw new Error("Ha ocurrido un error.");

            usuarioPermisosModo = "ver";
            await mostrarModal(dataJson);

            setModalSoloLectura(true);
            document.getElementById("divContrasenaNueva").setAttribute("hidden", "hidden");

            $("#modalEdicionLabel").text("Ver Usuario");
            bloquearControlesPermisos(true);
        })
        .catch(_ => errorModal("Ha ocurrido un error."));
};

/* =========================
   SELECTOR PERSONAL
========================= */

async function abrirSelectorPersonal() {
    $('#modalSelectorPersonal').modal('show');

    const r = await fetch('/Personal/Lista', {
        headers: { 'Authorization': 'Bearer ' + token }
    });

    personalSelectorData = await r.json();
    renderPersonalSelector(personalSelectorData);
}

function renderPersonalSelector(data) {
    const container = $("#listaPersonalSelector");
    container.empty();

    data.forEach(p => {
        container.append(`
            <div class="rp-personal-card" data-id="${p.Id}">
                <div class="rp-personal-name">${escapeHtml(p.Nombre || "")}</div>

                <div class="rp-personal-info">
                    <i class="fa fa-id-card"></i>
                    ${escapeHtml(p.Dni ?? p.NumeroDocumento ?? "-")}
                </div>

                <div class="rp-personal-info">
                    <i class="fa fa-phone"></i>
                    ${escapeHtml(p.Telefono ?? "-")}
                </div>

                <div class="rp-personal-info">
                    <i class="fa fa-envelope"></i>
                    ${escapeHtml(p.Email ?? "-")}
                </div>
            </div>
        `);
    });

    $(".rp-personal-card").off("click").on("click", function () {
        $(".rp-personal-card").removeClass("selected");
        $(this).addClass("selected");

        const id = $(this).data("id");
        personalSeleccionado = personalSelectorData.find(x => x.Id === id);
    });

    $(".rp-personal-card").off("dblclick").on("dblclick", function () {
        $(".rp-personal-card").removeClass("selected");
        $(this).addClass("selected");

        const id = $(this).data("id");
        personalSeleccionado = personalSelectorData.find(x => x.Id === id);

        aplicarPersonalSeleccionado();
    });
}

function aplicarPersonalSeleccionado() {
    if (!personalSeleccionado) {
        errorModal("Seleccione un personal.");
        return;
    }

    const p = personalSeleccionado;

    $("#txtNombre").val(p.Nombre ?? "");
    $("#txtDni").val(p.Dni || p.NumeroDocumento || "");
    $("#txtTelefono").val(p.Telefono ?? "");
    $("#txtDireccion").val(p.Direccion ?? "");
    $("#txtCorreo").val(p.Email ?? "");

    $('#modalSelectorPersonal').modal('hide');
    actualizarBadgeUsuarioPermisos();
}

/* =========================
   PERMISOS
========================= */

function prepararPermisosEnModalNuevo() {
    permisosUsuarioCache = [];
    permisosUsuarioOriginal = [];
    moduloPermisoSeleccionadoId = 0;
    renderPermisosPlaceholder("Guardá el usuario para administrar permisos.");
    habilitarSeccionPermisos(false);
    actualizarBadgeUsuarioPermisos();
    actualizarResumenPermisos();
}

function habilitarSeccionPermisos(habilitar) {
    const section = document.getElementById("sectionPermisosUsuario");
    const hint = document.getElementById("permisoHint");

    if (!section || !hint) return;

    if (habilitar) {
        section.classList.remove("rp-section-disabled");
        hint.classList.add("success");
        hint.innerHTML = `<i class="fa fa-check-circle"></i> Ya podés administrar permisos por módulo.`;
    } else {
        section.classList.add("rp-section-disabled");
        hint.classList.remove("success");
        hint.innerHTML = `<i class="fa fa-info-circle"></i> Guardá el usuario para administrar permisos.`;
    }

    bloquearControlesPermisos(usuarioPermisosModo === "ver" || !habilitar);
}

function bloquearControlesPermisos(bloquear) {
    $("#btnGuardarPermisos").prop("disabled", bloquear);
    $("#btnResetPermisos").prop("disabled", bloquear);
    $("#btnCopiarRolPermisos").prop("disabled", bloquear);
    $("#btnPermisosTodos").prop("disabled", bloquear);
    $("#btnPermisosNinguno").prop("disabled", bloquear);
    $("#txtBuscarModuloPermiso").prop("disabled", bloquear);

    $("#permDetalleContainer").find("input, button").prop("disabled", bloquear);
}

function actualizarBadgeUsuarioPermisos() {
    const usuario = ($("#txtUsuario").val() || "").trim();
    const nombre = ($("#txtNombre").val() || "").trim();
    const apellido = ($("#txtApellido").val() || "").trim();

    let texto = "Nuevo";
    if (usuario || nombre || apellido) {
        texto = [usuario, nombre, apellido].filter(Boolean).join(" · ");
    }

    $("#permUsuarioNombre").text(texto);
}

function normalizarIdUsuarioGuardado(valor) {
    const n = Number(valor);
    return Number.isFinite(n) && n > 0 ? n : 0;
}

async function cargarPermisosUsuario(idUsuario) {
    try {
        if (!idUsuario || Number(idUsuario) <= 0) {
            prepararPermisosEnModalNuevo();
            return;
        }

        const response = await fetch(`/UsuariosPermisos/Obtener?idUsuario=${idUsuario}`, {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error("No se pudieron obtener los permisos.");

        const data = await response.json();
        permisosUsuarioCache = Array.isArray(data) ? data : [];
        permisosUsuarioOriginal = JSON.parse(JSON.stringify(permisosUsuarioCache));

        if (permisosUsuarioCache.length > 0) {
            moduloPermisoSeleccionadoId = Number(permisosUsuarioCache[0].IdModulo || 0);
        } else {
            moduloPermisoSeleccionadoId = 0;
        }

        renderPermisosUI();
        habilitarSeccionPermisos(true);
        actualizarResumenPermisos();
        actualizarBadgeUsuarioPermisos();
    } catch (e) {
        console.error(e);
        permisosUsuarioCache = [];
        permisosUsuarioOriginal = [];
        moduloPermisoSeleccionadoId = 0;
        renderPermisosPlaceholder("No se pudieron cargar los permisos.");
        actualizarResumenPermisos();
        errorModal("No se pudieron cargar los permisos del usuario.");
    }
}

function renderPermisosUI() {
    renderListaModulosPermisos($("#txtBuscarModuloPermiso").val() || "");
    renderDetalleModuloSeleccionado();
}

function renderListaModulosPermisos(filtro = "") {

    const container = $("#listaModulosPermisos");
    container.empty();

    if (!Array.isArray(permisosUsuarioCache) || permisosUsuarioCache.length === 0) {
        container.html(`<div class="rp-perm-empty-state">No hay módulos.</div>`);
        return;
    }

    const txt = (filtro || "").toLowerCase();

    // 🔥 FILTRAR
    const lista = permisosUsuarioCache.filter(x => {
        if (!txt) return true;
        return (x.Modulo || "").toLowerCase().includes(txt)
            || (x.CodigoModulo || "").toLowerCase().includes(txt)
            || (x.GrupoNombre || "").toLowerCase().includes(txt);
    });

    if (!lista.length) {
        container.html(`<div class="rp-perm-empty-state">Sin resultados</div>`);
        return;
    }

    // 🔥 AGRUPAR POR IDGRUPO
    const gruposMap = {};

    lista.forEach(x => {

        const idGrupo = x.IdGrupo || 0;
        const nombreGrupo = x.GrupoNombre || "SIN GRUPO";

        if (!gruposMap[idGrupo]) {
            gruposMap[idGrupo] = {
                IdGrupo: idGrupo,
                Nombre: nombreGrupo,
                Modulos: []
            };
        }

        gruposMap[idGrupo].Modulos.push(x);
    });

    // 🔥 ORDENAR GRUPOS
    const grupos = Object.values(gruposMap)
        .sort((a, b) => a.Nombre.localeCompare(b.Nombre));

    let html = "";

    grupos.forEach(grupo => {

        html += `
            <div class="rp-mod-group">

                <div class="rp-mod-group-title">
                    ${escapeHtml(grupo.Nombre)}
                </div>
        `;

        const modulosOrdenados = grupo.Modulos.sort((a, b) => {
            const ordenA = Number.isFinite(a.Orden) ? a.Orden : 9999;
            const ordenB = Number.isFinite(b.Orden) ? b.Orden : 9999;
            return ordenA - ordenB;
        });

        modulosOrdenados.forEach(mod => {

            const total = contarPermisosActivosModulo(mod);
            const isActive = Number(mod.IdModulo) === Number(moduloPermisoSeleccionadoId);

            html += `
                <button type="button"
                        class="rp-mod-item ${isActive ? 'active' : ''}"
                        onclick="seleccionarModuloPermisos(${mod.IdModulo})">

                    <div class="rp-mod-item-main">
                        <div class="rp-mod-item-title">
                            ${escapeHtml(mod.Modulo)}
                        </div>
                    </div>

                    <div class="rp-mod-item-count ${total > 0 ? 'activo' : 'inactivo'}">
                        ${total}/5
                    </div>
                </button>
            `;
        });

        html += `</div>`;
    });

    container.html(html);
}
function renderDetalleModuloSeleccionado() {
    const container = $("#permDetalleContainer");
    const titulo = $("#permModuloNombre");
    const desc = $("#permModuloDesc");

    container.empty();

    const item = permisosUsuarioCache.find(x => Number(x.IdModulo) === Number(moduloPermisoSeleccionadoId));

    if (!item) {
        titulo.text("Seleccioná un módulo");
        desc.text("Configuración de permisos.");
        container.html(`<div class="rp-perm-empty-state">Seleccioná un módulo.</div>`);
        return;
    }

    titulo.text(item.Modulo || "Módulo");
    desc.text("Permisos disponibles para este módulo.");

    const idRol = Number($("#Roles").val());
    const esModuloUsuarios = (item.Modulo || "").toLowerCase() === "usuarios";

    let html = `<div class="rp-perm-grid">`;

    (item.Permisos || []).forEach(p => {

        // 🔥 REGLA ADMIN (no se puede tocar)
        const esCritico =
            idRol === 1 &&
            esModuloUsuarios &&
            (p.Codigo === "VER" || p.Codigo === "EDITAR");

        // 🔥 FORZAR SIEMPRE ACTIVO
        if (esCritico) {
            p.Activo = true;
        }

        html += `
            <div class="rp-perm-card ${p.Activo ? 'active' : ''} ${esCritico ? 'rp-perm-locked' : ''}">
                
                <div class="rp-perm-card-top">
                    <div class="rp-perm-card-titlewrap">
                        <div class="rp-perm-card-title">${p.Nombre}</div>
                        <div class="rp-perm-card-desc">${p.Descripcion || ""}</div>
                    </div>
                </div>

                <div class="rp-perm-card-bottom">
                    <label class="rp-switch">
                        <input type="checkbox"
                               class="rp-perm-toggle"
                               data-idmodulo="${item.IdModulo}"
                               data-codigo="${p.Codigo}"
                               ${p.Activo ? "checked" : ""}
                               ${usuarioPermisosModo === "ver" || esCritico ? "disabled" : ""}>
                        <span class="rp-switch-slider"></span>
                    </label>

                    <span class="rp-switch-label">
                        ${esCritico ? "Obligatorio" : (p.Activo ? "Activo" : "Inactivo")}
                    </span>
                </div>
            </div>
        `;
    });

    html += `</div>`;
    container.html(html);

    $(".rp-perm-toggle").off("change").on("change", function () {

        const idModulo = Number($(this).data("idmodulo"));
        const codigo = $(this).data("codigo");
        const checked = $(this).is(":checked");

        const idRol = Number($("#Roles").val());
        const esModuloUsuarios = (item.Modulo || "").toLowerCase() === "usuarios";

        const esCritico =
            idRol === 1 &&
            esModuloUsuarios &&
            (codigo === "VER" || codigo === "EDITAR");

        // 🔥 DOBLE SEGURIDAD
        if (esCritico) {
            $(this).prop("checked", true);
            return;
        }

        actualizarPermisoEnCache(idModulo, codigo, checked);
        actualizarVisualPermisos();
        actualizarResumenPermisos();
        renderListaModulosPermisos($("#txtBuscarModuloPermiso").val() || "");
    });

    actualizarVisualPermisos();
}
function actualizarVisualPermisos() {
    $("#permDetalleContainer .rp-perm-card").each(function () {
        const checkbox = $(this).find(".rp-perm-toggle");
        const activo = checkbox.is(":checked");
        $(this).toggleClass("active", activo);
        $(this).find(".rp-switch-label").text(activo ? "Activo" : "Inactivo");
    });
}

function actualizarPermisoEnCache(idModulo, codigo, activo) {

    const mod = permisosUsuarioCache.find(x => Number(x.IdModulo) === Number(idModulo));
    if (!mod) return;

    const permiso = (mod.Permisos || []).find(p => p.Codigo === codigo);
    if (!permiso) return;

    const idRol = Number($("#Roles").val());

    // 🔥 REGLA ADMIN
    const esModuloUsuarios = (mod.Modulo || "").toLowerCase() === "usuarios";

    if (idRol === 1 && esModuloUsuarios && (codigo === "VER" || codigo === "EDITAR")) {
        permiso.Activo = true; // 🔥 FORZAR
        return;
    }

    permiso.Activo = !!activo;
}

function contarPermisosActivosModulo(item) {
    if (!item || !item.Permisos) return 0;
    return item.Permisos.filter(p => p.Activo).length;
}

function seleccionarModuloPermisos(idModulo) {
    moduloPermisoSeleccionadoId = Number(idModulo) || 0;
    renderListaModulosPermisos($("#txtBuscarModuloPermiso").val() || "");
    renderDetalleModuloSeleccionado();
}

function renderPermisosPlaceholder(texto) {
    $("#listaModulosPermisos").html(`
        <div class="rp-perm-empty-state">${texto}</div>
    `);

    $("#permDetalleContainer").html(`
        <div class="rp-perm-empty-state">${texto}</div>
    `);

    $("#permModuloNombre").text("Seleccioná un módulo");
    $("#permModuloDesc").text("Acá vas a poder activar o desactivar cada permiso de forma individual.");
}

function actualizarResumenPermisos() {
    const cantModulos = Array.isArray(permisosUsuarioCache) ? permisosUsuarioCache.length : 0;

    let checksActivos = 0;
    (permisosUsuarioCache || []).forEach(item => {
        checksActivos += contarPermisosActivosModulo(item);
    });

    $("#permCantModulos").text(cantModulos);
    $("#permCantChecksActivos").text(checksActivos);
}

function marcarTodosPermisos(valor) {

    if (usuarioPermisosModo === "ver") return;

    permisosUsuarioCache.forEach(mod => {
        (mod.Permisos || []).forEach(p => {
            p.Activo = !!valor;
        });
    });

    renderPermisosUI();
    actualizarResumenPermisos();
}

function marcarPermisosModuloActual(valor) {

    if (usuarioPermisosModo === "ver") return;

    const mod = permisosUsuarioCache.find(x => Number(x.IdModulo) === Number(moduloPermisoSeleccionadoId));
    if (!mod) return;

    (mod.Permisos || []).forEach(p => {
        p.Activo = !!valor;
    });

    renderDetalleModuloSeleccionado();
    renderListaModulosPermisos($("#txtBuscarModuloPermiso").val() || "");
    actualizarResumenPermisos();
}

function resetearPermisos() {
    if (usuarioPermisosModo === "ver") return;

    if (!Array.isArray(permisosUsuarioOriginal) || permisosUsuarioOriginal.length === 0) {
        marcarTodosPermisos(false);
        return;
    }

    permisosUsuarioCache = JSON.parse(JSON.stringify(permisosUsuarioOriginal));

    if (!permisosUsuarioCache.some(x => Number(x.IdModulo) === Number(moduloPermisoSeleccionadoId))) {
        moduloPermisoSeleccionadoId = permisosUsuarioCache.length > 0
            ? Number(permisosUsuarioCache[0].IdModulo || 0)
            : 0;
    }

    renderPermisosUI();
    actualizarResumenPermisos();
}

async function copiarDesdeRolUsuario() {
    try {
        if (usuarioPermisosModo === "ver") return;

        const idUsuario = Number($("#txtId").val());
        const idRol = Number($("#Roles").val());

        if (!idUsuario || idUsuario <= 0) {
            errorModal("Primero guardá el usuario.");
            return;
        }

        if (!idRol || idRol <= 0) {
            errorModal("Seleccione un rol.");
            return;
        }

        const confirmado = await confirmarModal("¿Desea copiar los permisos desde el rol seleccionado y reemplazar los actuales?");
        if (!confirmado) return;

        const response = await fetch(`/UsuariosPermisos/CopiarDesdeRol`, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json;charset=utf-8'
            },
            body: JSON.stringify({
                IdUsuario: idUsuario,
                IdRol: idRol,
                ReemplazarExistentes: true
            })
        });

        if (!response.ok) throw new Error("No se pudieron copiar los permisos.");

        const dataJson = await response.json();
        if (!dataJson.valor) {
            errorModal("No se pudieron copiar los permisos desde el rol.");
            return;
        }

        await cargarPermisosUsuario(idUsuario);
        exitoModal("Permisos copiados desde el rol correctamente");
    } catch (e) {
        console.error(e);
        errorModal("Ha ocurrido un error al copiar permisos desde el rol.");
    }
}

async function guardarPermisosMasivo() {
    try {
        if (usuarioPermisosModo === "ver") return;

        const idUsuario = Number($("#txtId").val());
        if (!idUsuario || idUsuario <= 0) {
            errorModal("Primero guardá el usuario.");
            return;
        }

        const lista = [];

        (permisosUsuarioCache || []).forEach(mod => {

            const idModulo = Number(mod.IdModulo);
            if (!idModulo) return;

            (mod.Permisos || []).forEach(p => {

                lista.push({
                    IdUsuario: idUsuario,
                    IdModulo: idModulo,
                    Permiso: p.Codigo,
                    Activo: !!p.Activo
                });

            });

        });

        const response = await fetch(`/UsuariosPermisos/ActualizarMasivo`, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json;charset=utf-8'
            },
            body: JSON.stringify({
                IdUsuario: idUsuario,
                Permisos: lista
            })
        });

        if (!response.ok) throw new Error("No se pudieron guardar los permisos.");

        const dataJson = await response.json();
        if (!dataJson.valor) {
            errorModal("No se pudieron guardar los permisos.");
            return;
        }

        permisosUsuarioOriginal = JSON.parse(JSON.stringify(permisosUsuarioCache));
        actualizarResumenPermisos();
        exitoModal("Permisos guardados correctamente");
    } catch (e) {
        console.error(e);
        errorModal("Ha ocurrido un error al guardar permisos.");
    }
}

/* =========================
   HELPERS
========================= */

function escapeHtml(str) {
    return String(str || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll(`"`, "&quot;")
        .replaceAll(`'`, "&#039;");
}