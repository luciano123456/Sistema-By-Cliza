// --------------------------- Estado ---------------------------
let gridPagos = null;
let isSaving = false; // lock anti-doble click

const State = {
    pagos: [],         // { id, fecha(YYYY-MM-DD), idCuenta, cuenta, importe(number), nota }
    editIndex: -1,
    cuentas: [],
    personales: [],
};

// --------------------------- Helpers ---------------------------
function _fmtNumber(n) {
    if (typeof formatNumber === "function") return formatNumber(n);
    const v = parseFloat(n || 0);
    return new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
}
function _toNumber(s) {
    if (typeof formatearSinMiles === "function") return parseFloat(formatearSinMiles(s || 0));
    return parseFloat(String(s || "0").replace(/\./g, '').replace(',', '.')) || 0;
}
function _toMiles(n) {
    if (typeof formatearMiles === "function") return formatearMiles(n);
    return _fmtNumber(n);
}
function hoyISO() { return moment().format('YYYY-MM-DD'); }

// --- Fechas ---
function formatearFechaParaInput(fecha) {
    const m = moment(fecha, [moment.ISO_8601, 'YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DD']);
    return m.isValid() ? m.format('YYYY-MM-DD') : '';
}
function formatearFechaParaVista(fecha) {
    const m = moment(fecha, [moment.ISO_8601, 'YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DD']);
    return m.isValid() ? m.format('DD/MM/YYYY') : '';
}

// --------------------------- Init ---------------------------
document.addEventListener("DOMContentLoaded", async () => {
    try {
        // evitar submit nativo del form
        const form = document.getElementById('formSueldo');
        if (form) form.addEventListener('submit', (e) => e.preventDefault(), { once: true });

        const id = document.getElementById("txtId")?.value;
        const btnTxt = document.querySelector("#btnGuardarGlobal .txt");
        if (btnTxt) btnTxt.textContent = id ? "Guardar" : "Registrar";
        if (id) document.getElementById("btnEliminar")?.classList.remove("d-none");

        // defaults
        const dtp = document.getElementById("dtpFecha");
        if (dtp && !dtp.value) dtp.value = hoyISO();

        await Promise.all([cargarPersonales(), cargarCuentas()]);
        configurarTablaPagos();

        if (id) await cargarSueldoExistente(parseInt(id));

        attachLiveValidation?.('#formSueldo');
        document.getElementById("txtImporte")?.addEventListener("input", recalcularTotales);

        // toolbar
        document.getElementById("btnExportarPdf")?.addEventListener("click", exportarReciboPdf);
        document.getElementById("btnAgregarPago")?.addEventListener("click", abrirModalPago);
        document.getElementById("btnGuardarPago")?.addEventListener("click", guardarPago);

        // global
        document.getElementById("btnGuardarGlobal")?.addEventListener("click", guardarTodo);
    } catch (e) { console.error(e); }
});

// --------------------------- Cargas Combos ---------------------------
async function cargarPersonales() {
    try {
        const res = await fetch("/Personal/Lista", {
            headers: { "Authorization": "Bearer " + (token || ""), "Content-Type": "application/json" }
        });
        const data = await res.json();
        State.personales = data || [];
        const cmb = document.getElementById("cmbPersonal");
        if (!cmb) return;
        cmb.innerHTML = `<option value="">Seleccione</option>`;
        State.personales.forEach(p => {
            const op = document.createElement("option");
            op.value = p.Id;
            op.textContent = p.Nombre;
            cmb.appendChild(op);
        });
    } catch { /* ignore */ }
}

async function cargarCuentas() {
    try {
        const res = await fetch("/Cuentas/Lista", {
            headers: { "Authorization": "Bearer " + (token || ""), "Content-Type": "application/json" }
        });
        const data = await res.json();
        State.cuentas = data || [];
        const cmb = document.getElementById("cmbCuenta");
        if (!cmb) return;
        cmb.innerHTML = `<option value="">Seleccione</option>`;
        State.cuentas.forEach(c => {
            const op = document.createElement("option");
            op.value = c.Id;
            op.textContent = c.Nombre ?? c.Descripcion ?? "";
            cmb.appendChild(op);
        });
    } catch { /* ignore */ }
}

// --------------------------- Carga de sueldo (edición) ---------------------------
async function cargarSueldoExistente(id) {
    const res = await fetch(`/PersonalSueldos/EditarInfo?id=${id}`, {
        headers: { "Authorization": "Bearer " + (token || ""), "Content-Type": "application/json" }
    });
    if (!res.ok) { errorModal("No se pudo cargar el pago de sueldo."); return; }
    const s = await res.json();

    // Pagos
    let pagos = [];
    try {
        const rp = await fetch(`/PersonalSueldos/PagosLista?idSueldo=${id}`, {
            headers: { "Authorization": "Bearer " + (token || ""), "Content-Type": "application/json" }
        });
        pagos = rp.ok ? await rp.json() : [];
    } catch { pagos = []; }

    // Cabecera
    document.getElementById("dtpFecha").value = formatearFechaParaInput(s.Fecha) || hoyISO();
    document.getElementById("cmbPersonal").value = s.IdPersonal ?? "";
    document.getElementById("txtConcepto").value = s.Concepto ?? "";
    document.getElementById("txtImporte").value = _toMiles(s.Importe ?? 0);
    document.getElementById("txtNota").value = s.NotaInterna ?? "";

    // Pagos → estado
    State.pagos = (pagos || []).map(p => ({
        id: p.Id || 0,
        fecha: formatearFechaParaInput(p.Fecha) || hoyISO(),
        idCuenta: p.IdCuenta,
        cuenta: p.Cuenta ?? (State.cuentas.find(c => c.Id === p.IdCuenta)?.Nombre ?? ""),
        importe: parseFloat(p.Importe || 0),
        nota: p.NotaInterna ?? ""
    }));

    refrescarTablaPagos();
    recalcularTotales();
}

// --------------------------- Tabla Pagos (acciones inline) ---------------------------
function configurarTablaPagos() {
    if (gridPagos) return;

    gridPagos = $('#grd_Pagos').DataTable({
        data: [],
        language: { url: "//cdn.datatables.net/plug-ins/2.0.7/i18n/es-MX.json" },
        scrollX: true,
        columns: [
            { // Acciones directas (sin menú)
                data: null,
                width: "60px",
                orderable: false,
                className: "text-center",
                render: (_, __, ___, meta) => {
                    const idx = meta.row;
                    return `
            <button class="btn btn-link p-0 me-2 text-success" title="Editar" onclick="editarPago(${idx})">
              <i class="fa fa-pen"></i>
            </button>
            <button class="btn btn-link p-0 text-danger" title="Eliminar" onclick="eliminarPago(${idx})">
              <i class="fa fa-trash"></i>
            </button>`;
                }
            },
            { data: "fecha", render: (f) => formatearFechaParaVista(f) },
            { data: "cuenta" },
            { data: "importe", className: "text-center", render: (v) => _fmtNumber(v) },
            { data: "nota" }
        ],
        order: [[1, "desc"]],
        pageLength: 8,
        dom: 't<"row mt-2"<"col-sm-12"p>>'
    });
}
function refrescarTablaPagos() {
    if (!gridPagos) return;
    gridPagos.clear().rows.add(State.pagos).draw();
}

// --------------------------- Validación del modal de pago ---------------------------
function resetPagoValidation() {
    ["dtpPagoFecha", "cmbCuenta", "txtPagoImporte"].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.classList.remove("is-invalid", "is-valid");
    });
    document.getElementById("errorCamposPago")?.classList.add("d-none");
}

function validarCamposPago() {
    const fechaEl = document.getElementById("dtpPagoFecha");
    const cuentaEl = document.getElementById("cmbCuenta");
    const importeEl = document.getElementById("txtPagoImporte");

    const fechaOK = !!fechaEl.value;
    const cuentaOK = !!parseInt(cuentaEl.value || 0);
    const importeOK = _toNumber(importeEl.value) > 0;

    fechaEl.classList.toggle("is-invalid", !fechaOK);
    cuentaEl.classList.toggle("is-invalid", !cuentaOK);
    importeEl.classList.toggle("is-invalid", !importeOK);

    fechaEl.classList.toggle("is-valid", fechaOK);
    cuentaEl.classList.toggle("is-valid", cuentaOK);
    importeEl.classList.toggle("is-valid", importeOK);

    const ok = fechaOK && cuentaOK && importeOK;
    document.getElementById("errorCamposPago")?.classList.toggle("d-none", ok);
    return ok;
}

function attachPagoLiveValidation() {
    const f = () => validarCamposPago();
    ["dtpPagoFecha", "cmbCuenta", "txtPagoImporte", "txtPagoNota"].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.removeEventListener("input", f);
        el.removeEventListener("change", f);
        el.addEventListener("input", f);
        el.addEventListener("change", f);
    });
}

// --------------------------- Modal Pago ---------------------------
function setPagoModalMode(mode /* 'nuevo' | 'editar' */) {
    const titleEl = document.querySelector('#modalPago .modal-title');
    const btnEl = document.getElementById('btnGuardarPago')
        || document.querySelector('#modalPago .modal-footer .btn.btn-success');

    if (mode === 'editar') {
        if (titleEl) titleEl.innerHTML = `<i class="fa fa-pen-to-square me-2 text-success"></i>Editar Pago`;
        if (btnEl) btnEl.innerHTML = `<i class="fa fa-check me-1"></i> Guardar`;
    } else {
        if (titleEl) titleEl.innerHTML = `<i class="fa fa-plus-circle me-2 text-success"></i>Registrar Pago`;
        if (btnEl) btnEl.innerHTML = `<i class="fa fa-check me-1"></i> Registrar`;
    }
}

function abrirModalPago() {
    State.editIndex = -1;

    // limpiar/defaults
    document.getElementById("dtpPagoFecha").value = hoyISO();
    document.getElementById("cmbCuenta").value = "";
    document.getElementById("txtPagoImporte").value = "";
    document.getElementById("txtPagoNota").value = "";

    resetPagoValidation();
    attachPagoLiveValidation();
    setPagoModalMode('nuevo');

    new bootstrap.Modal(document.getElementById('modalPago')).show();
}

function editarPago(idx) {
    const p = State.pagos[idx]; if (!p) return;
    State.editIndex = idx;

    document.getElementById("dtpPagoFecha").value = formatearFechaParaInput(p.fecha) || hoyISO();
    document.getElementById("cmbCuenta").value = p.idCuenta || "";
    document.getElementById("txtPagoImporte").value = _toMiles(p.importe || 0);
    document.getElementById("txtPagoNota").value = p.nota || "";

    resetPagoValidation();
    attachPagoLiveValidation();
    setPagoModalMode('editar');

    new bootstrap.Modal(document.getElementById('modalPago')).show();
}

function guardarPago() {
    if (!validarCamposPago()) return;

    const fecha = document.getElementById("dtpPagoFecha").value;
    const idCuenta = parseInt(document.getElementById("cmbCuenta").value || 0);
    const cuenta = document.getElementById("cmbCuenta").selectedOptions[0]?.textContent || "";
    const importe = _toNumber(document.getElementById("txtPagoImporte").value);
    const nota = (document.getElementById("txtPagoNota").value || "").trim();

    const item = { id: 0, fecha, idCuenta, cuenta, importe, nota };

    if (State.editIndex >= 0) {
        State.pagos[State.editIndex] = { ...State.pagos[State.editIndex], ...item };
    } else {
        State.pagos.push(item);
    }

    State.editIndex = -1;
    setPagoModalMode('nuevo');

    refrescarTablaPagos();
    recalcularTotales();
    bootstrap.Modal.getInstance(document.getElementById('modalPago'))?.hide();
}

async function eliminarPago(idx) {
    const ok = await confirmarModal("¿Eliminar este pago?");
    if (!ok) return;
    State.pagos.splice(idx, 1);
    refrescarTablaPagos();
    recalcularTotales();
}

// --------------------------- Totales ---------------------------
function recalcularTotales() {
    const importe = _toNumber(document.getElementById("txtImporte")?.value);
    const abonado = State.pagos.reduce((a, p) => a + (parseFloat(p.importe) || 0), 0);
    const saldo = (importe || 0) - (abonado || 0);

    document.getElementById("statImporte").textContent = _fmtNumber(importe);
    document.getElementById("statAbonado").textContent = _fmtNumber(abonado);
    document.getElementById("statSaldo").textContent = _fmtNumber(saldo);
}

// --------------------------- Guardar todo (sueldo + pagos) ---------------------------
async function guardarTodo() {
    if (isSaving) return;
    isSaving = true;

    const id = parseInt(document.getElementById("txtId")?.value || 0);
    const fecha = document.getElementById("dtpFecha").value;
    const idPersonal = parseInt(document.getElementById("cmbPersonal").value || 0);
    const concepto = (document.getElementById("txtConcepto").value || "").trim();
    const importe = _toNumber(document.getElementById("txtImporte").value);
    const notaInterna = (document.getElementById("txtNota").value || "").trim();

    const mark = (sel, bad) => document.querySelector(sel)?.classList.toggle("is-invalid", bad);
    mark("#dtpFecha", !fecha);
    mark("#cmbPersonal", !idPersonal);
    mark("#txtConcepto", !concepto);
    mark("#txtImporte", !(importe > 0));

    // Validación de requeridos
    if (!(fecha && idPersonal && concepto && importe > 0)) {
        setErrorCampos("Debes completar los campos obligatorios.");
        isSaving = false;
        return;
    } else {
        clearErrorCampos();
    }

    // Suma de pagos vs Importe
    const abonado = State.pagos.reduce((a, p) => a + (parseFloat(p.importe) || 0), 0);
    const EPS = 0.000001; // tolerancia
    if (abonado - importe > EPS) {
        // marcar el importe como inválido (opcional) y mostrar error en #errorCampos
        setErrorCampos(`La suma de pagos (${_fmtNumber(abonado)}) supera el importe del sueldo (${_fmtNumber(importe)}).`);
        isSaving = false;
        return;
    }

    const saldo = (importe || 0) - abonado;

    const payload = {
        Id: id || 0,
        Fecha: fecha,
        IdPersonal: idPersonal,
        Concepto: concepto,
        Importe: importe,
        ImporteAbonado: abonado,
        Saldo: saldo,
        NotaInterna: notaInterna,
        Pagos: State.pagos.map(p => ({
            Id: p.id || 0,
            Fecha: p.fecha,
            IdCuenta: p.idCuenta,
            Importe: p.importe,
            NotaInterna: p.nota
        }))
    };

    const url = id ? "/PersonalSueldos/Actualizar" : "/PersonalSueldos/Insertar";
    const method = id ? "PUT" : "POST";

    try {
        const res = await fetch(url, {
            method,
            headers: {
                "Authorization": "Bearer " + (token || ""),
                "Content-Type": "application/json;charset=utf-8"
            },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error(res.statusText);
        const r = await res.json();
        if ((typeof r.valor === "boolean" && r.valor) || r.valor === "OK" || r === true) {
            exitoModal(id ? "Pago de sueldo actualizado" : "Pago de sueldo registrado");
            volverIndex();
        } else {
            errorModal("No se pudo guardar el pago");
        }
    } catch (e) {
        console.error(e);
        errorModal("Error al guardar el pago");
    } finally {
        isSaving = false;
    }
}

// --------------------------- Eliminar ---------------------------
async function eliminarActual() {
    const id = parseInt(document.getElementById("txtId")?.value || 0);
    if (!id) return;

    const ok = await confirmarModal("¿Desea eliminar este pago de sueldo?");
    if (!ok) return;

    try {
        const res = await fetch(`/PersonalSueldos/Eliminar?id=${id}`, {
            method: "DELETE",
            headers: { "Authorization": "Bearer " + (token || ""), "Content-Type": "application/json" }
        });
        if (!res.ok) throw new Error(res.statusText);
        const r = await res.json();
        if (r?.valor) { exitoModal("Eliminado correctamente"); volverIndex(); }
        else { errorModal("No se pudo eliminar"); }
    } catch (e) { console.error(e); errorModal("Error al eliminar"); }
}

// --------------------------- Exportar PDF ---------------------------
function exportarReciboPdf() {
    const idPersonal = parseInt(document.getElementById("cmbPersonal").value || 0);
    const fecha = document.getElementById("dtpFecha").value;
    const concepto = (document.getElementById("txtConcepto").value || "").trim();
    const personalName = document.getElementById("cmbPersonal").selectedOptions[0]?.textContent || "";
    const importe = _toNumber(document.getElementById("txtImporte").value);

    if (!idPersonal) { errorModal("Seleccioná un personal para exportar."); return; }
    if (!State.pagos || State.pagos.length === 0) { errorModal("Agregá al menos un pago para exportar el recibo."); return; }

    const abonado = State.pagos.reduce((a, p) => a + (parseFloat(p.importe) || 0), 0);
    const saldo = (importe || 0) - abonado;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "pt", format: "a4" });

    // Header
    doc.setFillColor(20, 28, 38);
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), 90, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("RECIBO DE SUELDO", 40, 55);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Fecha emisión: ${formatearFechaParaVista(hoyISO())}`, 40, 75);

    // Datos
    let y = 115;
    doc.setTextColor(33, 33, 33);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Detalle del Sueldo", 40, y);
    y += 12;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`Empleado: ${personalName}`, 40, y); y += 16;
    doc.text(`Fecha del Sueldo: ${formatearFechaParaVista(fecha)}`, 40, y); y += 16;
    doc.text(`Concepto: ${concepto}`, 40, y); y += 24;

    // Totales
    const boxW = 160, boxH = 60, gap = 20;
    const boxesX = [40, 40 + boxW + gap, 40 + (boxW + gap) * 2];
    const labels = ["Importe", "Abonado", "Saldo"];
    const values = [`${_fmtNumber(importe)}`, `${_fmtNumber(abonado)}`, `${_fmtNumber(saldo)}`];
    const colors = [[52, 152, 219], [46, 204, 113], [243, 156, 18]];

    boxesX.forEach((x, i) => {
        doc.setDrawColor(colors[i][0], colors[i][1], colors[i][2]);
        doc.setLineWidth(1.2);
        doc.roundedRect(x, y, boxW, boxH, 6, 6);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text(labels[i], x + 12, y + 20);

        doc.setFontSize(15);
        doc.setTextColor(colors[i][0], colors[i][1], colors[i][2]);
        doc.text(values[i], x + 12, y + 42);

        doc.setTextColor(33, 33, 33);
    });
    y += boxH + 30;

    // Tabla pagos
    const rows = State.pagos.map(p => ([
        formatearFechaParaVista(p.fecha),
        p.cuenta,
        `${_fmtNumber(p.importe)}`,
        p.nota || ""
    ]));

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Pagos Registrados", 40, y);
    y += 8;

    doc.autoTable({
        startY: y + 8,
        head: [["Fecha", "Cuenta", "Importe", "Nota"]],
        body: rows,
        theme: "grid",
        styles: { fontSize: 10, cellPadding: 6 },
        headStyles: { fillColor: [20, 28, 38], textColor: [255, 255, 255] },
        columnStyles: { 2: { halign: "right" } }
    });

    // Firma
    const finalY = doc.lastAutoTable?.finalY || (y + 50);
    doc.setFontSize(10);
    doc.text("______________________________", 40, finalY + 60);
    doc.text("Firma del Empleado", 40, finalY + 75);

    const nombreFile = `Recibo sueldo ${personalName} ${formatearFechaParaVista(hoyISO())}.pdf`;
    doc.save(nombreFile);
}

// --------------------------- Navegación ---------------------------
function volverIndex() { window.location.href = "/PersonalSueldos/Index"; }


// --- helpers para el bloque de errores (campos obligatorios / otras reglas) ---
function setErrorCampos(msg) {
    const el = document.getElementById("errorCampos");
    if (!el) return;
    el.textContent = msg || "Debes completar los campos obligatorios.";
    el.classList.remove("d-none");
    // opcional: llevar el scroll al bloque de error
    el.scrollIntoView({ behavior: "smooth", block: "center" });
}
function clearErrorCampos() {
    const el = document.getElementById("errorCampos");
    if (!el) return;
    el.textContent = "Debes completar los campos obligatorios.";
    el.classList.add("d-none");
}
