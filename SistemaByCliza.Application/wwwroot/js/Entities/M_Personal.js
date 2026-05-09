/**
 * M_Personal.js — Lógica del modal de Personal (ByCliza), reutilizable en otras pantallas (tipo Levels).
 * La grilla y KPI de /Personal viven en Personal.js.
 */
(function () {
    "use strict";

    const PERSONAL_ERR_SEL = "#errorCamposPersonal";

    let pendingSeleccionCatalogoPersonal = null;
    let personalPedirRefrescoTrasInsertConfig = false;

    function personalEventoConfiguracionEsAtajo(d) {
        if (d && d.esAtajo === false) return false;
        if (d && d.esAtajo === true) return true;
        return window.esModoAtajo === true || window.esModoAtajo === 1 || window.esModoAtajo === "true" || window.esModoAtajo === "1";
    }

    function destruirSelect2CombosPersonal() {
        ["cmbCondicionIva", "cmbProvincia", "cmbBanco", "cmbPuesto", "cmbSucursal"].forEach((id) => {
            const $s = window.jQuery("#" + id);
            if ($s.length && $s.hasClass("select2-hidden-accessible")) {
                $s.select2("destroy");
            }
        });
    }

    function inicializarSelect2CombosPersonalSiHaceFalta() {
        const $modal = window.jQuery("#modalEdicion");
        if (!$modal.length || !(window.jQuery && window.jQuery.fn.select2)) return;
        ["cmbCondicionIva", "cmbProvincia", "cmbBanco", "cmbPuesto", "cmbSucursal"].forEach((id) => {
            const $s = window.jQuery("#" + id);
            if (!$s.length || $s.hasClass("no-select2") || $s.is('[data-no-select2="1"]')) return;
            if ($s.hasClass("select2-hidden-accessible")) return;
            $s.select2({
                width: "100%",
                dropdownParent: $modal
            });
        });
    }

    function aplicarValorSelectPorIdDom(idDom, nid) {
        const $s = window.jQuery("#" + idDom);
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

    function aplicarPendienteSeleccionCatalogoPersonal(pending) {
        if (!pending || pending.nuevoId == null) return;
        const nid = Number(pending.nuevoId);
        if (!Number.isFinite(nid) || nid <= 0) return;
        switch (pending.tipo) {
            case "CondicionesIVA":
                aplicarValorSelectPorIdDom("cmbCondicionIva", nid);
                break;
            case "Provincias":
                aplicarValorSelectPorIdDom("cmbProvincia", nid);
                break;
            case "Bancos":
                aplicarValorSelectPorIdDom("cmbBanco", nid);
                break;
            case "PersonalPuestos":
                aplicarValorSelectPorIdDom("cmbPuesto", nid);
                break;
            case "Sucursales":
                aplicarValorSelectPorIdDom("cmbSucursal", nid);
                break;
            default:
                break;
        }
    }

    async function refrescarCatalogosTrasConfiguracionPersonal() {
        const pend = pendingSeleccionCatalogoPersonal;
        pendingSeleccionCatalogoPersonal = null;

        const vIva = window.jQuery("#cmbCondicionIva").val();
        const vProv = window.jQuery("#cmbProvincia").val();
        const vBanco = window.jQuery("#cmbBanco").val();
        const vPuesto = window.jQuery("#cmbPuesto").val();
        const vSuc = window.jQuery("#cmbSucursal").val();

        destruirSelect2CombosPersonal();

        await Promise.all([listaCondicionesIva(), listaProvincias(), listaBancos(), listaPuestos(), listaSucursales()]);

        if (vIva) window.jQuery("#cmbCondicionIva").val(vIva);
        if (vProv) window.jQuery("#cmbProvincia").val(vProv);
        if (vBanco) window.jQuery("#cmbBanco").val(vBanco);
        if (vPuesto) window.jQuery("#cmbPuesto").val(vPuesto);
        if (vSuc) window.jQuery("#cmbSucursal").val(vSuc);

        aplicarPendienteSeleccionCatalogoPersonal(pend);

        const mod = document.getElementById("modalEdicion");
        if (mod && typeof initSelect2 === "function") {
            if (mod.classList.contains("show")) {
                initSelect2(mod);
            } else {
                inicializarSelect2CombosPersonalSiHaceFalta();
            }
        }
        ["#cmbCondicionIva", "#cmbProvincia", "#cmbBanco", "#cmbPuesto", "#cmbSucursal"].forEach((sel) => {
            const $x = window.jQuery(sel);
            if ($x.length && $x.hasClass("select2-hidden-accessible")) {
                $x.trigger("change");
            }
        });
    }

    function paginaTieneModalPersonalCompleto() {
        return !!(document.getElementById("modalEdicion") && document.getElementById("formPersonal"));
    }

    function bindAtajosCatalogosPersonal() {
        const modalCfg = document.getElementById("modalConfiguracion");
        if (modalCfg && !modalCfg.dataset.personalAtajoRefresh) {
            modalCfg.dataset.personalAtajoRefresh = "1";
            modalCfg.addEventListener("hidden.bs.modal", async () => {
                personalPedirRefrescoTrasInsertConfig = false;
                if (!paginaTieneModalPersonalCompleto()) return;
                if (!pendingSeleccionCatalogoPersonal) return;
                await refrescarCatalogosTrasConfiguracionPersonal();
            });
        }

        if (!document.documentElement.dataset.personalConfigInsertListener) {
            document.documentElement.dataset.personalConfigInsertListener = "1";
            document.addEventListener("configuracionActualizada", async (e) => {
                if (!paginaTieneModalPersonalCompleto()) return;
                const d = e.detail || {};
                const desdeAtajo = personalEventoConfiguracionEsAtajo(d) || personalPedirRefrescoTrasInsertConfig;
                if (!desdeAtajo) return;
                if (d.accion !== "insertar") {
                    personalPedirRefrescoTrasInsertConfig = false;
                    return;
                }
                const tipo = (d.tipo || "").trim();
                const tiposOk = ["CondicionesIVA", "Provincias", "Bancos", "PersonalPuestos", "Sucursales"];
                if (!tiposOk.includes(tipo)) {
                    personalPedirRefrescoTrasInsertConfig = false;
                    return;
                }
                const raw = d.nuevoId ?? d.NuevoId ?? d.nuevoID;
                const nuevoId = raw != null && raw !== "" ? Number(raw) : NaN;
                if (!Number.isFinite(nuevoId) || nuevoId <= 0) {
                    try {
                        await Promise.all([listaCondicionesIva(), listaProvincias(), listaBancos(), listaPuestos(), listaSucursales()]);
                        const mod = document.getElementById("modalEdicion");
                        if (mod && mod.classList.contains("show") && typeof initSelect2 === "function") {
                            initSelect2(mod);
                        } else if (mod) {
                            inicializarSelect2CombosPersonalSiHaceFalta();
                        }
                    } catch (err) {
                        console.error(err);
                    } finally {
                        personalPedirRefrescoTrasInsertConfig = false;
                    }
                    return;
                }
                pendingSeleccionCatalogoPersonal = { tipo, nuevoId };
                try {
                    await refrescarCatalogosTrasConfiguracionPersonal();
                } catch (err) {
                    console.error(err);
                } finally {
                    personalPedirRefrescoTrasInsertConfig = false;
                }
            });
        }

        const wrapClick = (selBtn, titulo, controller) => {
            window.jQuery(selBtn).off("click.personalAtajo").on("click.personalAtajo", async () => {
                if (typeof window.abrirConfiguracion !== "function") return;
                personalPedirRefrescoTrasInsertConfig = true;
                try {
                    await window.abrirConfiguracion(titulo, controller, null, null, null, true);
                } catch (_) {
                    personalPedirRefrescoTrasInsertConfig = false;
                }
            });
        };
        wrapClick("#btnPlusCondicionIva", "Condiciones IVA", "CondicionesIVA");
        wrapClick("#btnPlusProvincia", "Provincia", "Provincias");
        wrapClick("#btnPlusBanco", "Banco", "Bancos");
        wrapClick("#btnPlusPuesto", "Personal Puesto", "PersonalPuestos");
        wrapClick("#btnPlusSucursal", "Sucursal", "Sucursales");
    }

    function parseMontoPersonal(raw) {
        if (raw == null) return NaN;
        let s = String(raw).trim();
        if (!s) return NaN;
        s = s.replace(/\$/g, "").replace(/\s/g, "");
        s = s.replace(/\./g, "").replace(",", ".");
        const n = parseFloat(s);
        return isNaN(n) ? NaN : n;
    }

    function formatMontoPersonalDisplay(n) {
        if (typeof n !== "number" || isNaN(n)) return "";
        return "$ " + n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function parseMontoPersonalParaApi(raw) {
        if (raw == null || String(raw).trim() === "") return null;
        const n = parseMontoPersonal(raw);
        return isNaN(n) ? null : n;
    }

    function setMontoPersonalField(selector, val) {
        const $el = window.jQuery(selector);
        if (!$el.length) return;
        if (val == null || val === "") {
            $el.val("");
            return;
        }
        const n = typeof val === "number" ? val : parseFloat(String(val).replace(",", "."));
        if (isNaN(n)) {
            $el.val("");
            return;
        }
        $el.val(formatMontoPersonalDisplay(n));
    }

    function bindMontosPersonal() {
        const $m = window.jQuery("#modalEdicion");
        if (!$m.length) return;
        $m.off("input.persMonto", ".pr-precio-input")
            .on("input.persMonto", ".pr-precio-input", function () {
                if (this.disabled) return;
                const raw = this.value;
                const num = raw.replace(/\D/g, "");
                if (!num) {
                    this.value = "";
                    return;
                }
                this.value = "$ " + Number(num).toLocaleString("es-AR");
            });
        $m.off("focusout.persMonto", ".pr-precio-input")
            .on("focusout.persMonto", ".pr-precio-input", function () {
                if (this.disabled) return;
                const raw = this.value;
                if (!String(raw).trim()) {
                    this.value = "";
                    return;
                }
                const n = parseMontoPersonal(raw);
                if (!isNaN(n) && n >= 0) {
                    this.value = formatMontoPersonalDisplay(n);
                }
            });
    }

    function limpiarEstilosValidacionPersonal() {
        window.jQuery(PERSONAL_ERR_SEL).addClass("d-none").text("Debes completar los campos obligatorios.");
        window.jQuery("#txtNombre").removeClass("is-invalid is-valid");
        if (typeof clearValidation === "function") {
            ["cmbCondicionIva", "cmbProvincia", "cmbBanco", "cmbPuesto", "cmbSucursal"].forEach((id) => {
                const el = document.getElementById(id);
                if (el) clearValidation(el);
            });
        }
    }

    function validarSelectIndividualPersonal(selector) {
        const val = window.jQuery(selector).val();
        const ok = !!val;
        if (typeof setInvalid === "function" && typeof setValid === "function") {
            if (!ok) setInvalid(selector, "Campo obligatorio");
            else setValid(selector);
        }
        return ok;
    }

    function valorNulo(v) {
        if (v === undefined || v === null || v === "") return null;
        const n = Number(v);
        return isNaN(n) ? null : n;
    }

    function numeroNulo(v) {
        if (v === undefined || v === null || v === "") return null;
        const n = Number(v);
        return isNaN(n) ? null : n;
    }

    function guardarCambiosPersonal() {
        if (!verificarErroresGenerales("#modalEdicion", PERSONAL_ERR_SEL)) {
            if (typeof forzarValidacionModal === "function") {
                forzarValidacionModal("#modalEdicion", PERSONAL_ERR_SEL);
            } else {
                document.getElementById("modalEdicion")?.setAttribute("data-validacion-ui", "1");
                verificarErroresGenerales("#modalEdicion", PERSONAL_ERR_SEL);
            }
            return;
        }

        const id = window.jQuery("#txtIdPersonal").val();
        const modelo = {
            Id: id !== "" ? parseInt(id, 10) : 0,
            Nombre: window.jQuery("#txtNombre").val(),
            Telefono: window.jQuery("#txtTelefono").val(),
            TelefonoAlternativo: window.jQuery("#txtTelefonoAlternativo").val(),
            Dni: window.jQuery("#txtDni").val(),
            Cuit: window.jQuery("#txtCuit").val(),
            IdCondicionIva: valorNulo(window.jQuery("#cmbCondicionIva").val()),
            Domicilio: window.jQuery("#txtDomicilio").val(),
            IdProvincia: valorNulo(window.jQuery("#cmbProvincia").val()),
            Localidad: window.jQuery("#txtLocalidad").val(),
            Email: window.jQuery("#txtEmail").val(),
            IdBanco: valorNulo(window.jQuery("#cmbBanco").val()),
            BancoAlias: window.jQuery("#txtBancoAlias").val(),
            BancoCbu: window.jQuery("#txtBancoCbu").val(),
            IdPuesto: valorNulo(window.jQuery("#cmbPuesto").val()),
            FechaIngreso: window.jQuery("#dtpFechaIngreso").val() || null,
            FechaRetiro: window.jQuery("#dtpFechaRetiro").val() || null,
            SueldoMensual: parseMontoPersonalParaApi(window.jQuery("#numSueldoMensual").val()),
            DiasLaborales: numeroNulo(window.jQuery("#numDiasLaborales").val()),
            ValorDia: parseMontoPersonalParaApi(window.jQuery("#numValorDia").val()),
            HsLaborales: numeroNulo(window.jQuery("#numHsLaborales").val()),
            ValorHora: parseMontoPersonalParaApi(window.jQuery("#numValorHora").val()),
            IdSucursal: valorNulo(window.jQuery("#cmbSucursal").val())
        };

        const url = id === "" ? "/Personal/Insertar" : "/Personal/Actualizar";
        const method = id === "" ? "POST" : "PUT";
        const tok = typeof token !== "undefined" ? token : "";

        fetch(url, {
            method,
            headers: { Authorization: "Bearer " + tok, "Content-Type": "application/json;charset=utf-8" },
            body: JSON.stringify(modelo)
        })
            .then((r) => {
                if (!r.ok) throw new Error(r.statusText);
                return r.json();
            })
            .then((data) => {
                const esNuevo = id === "";
                const nuevoId = data && (Number(data.id ?? data.Id) || 0);
                window.jQuery("#modalEdicion").modal("hide");
                exitoModal(esNuevo ? "Personal registrado correctamente" : "Personal modificado correctamente");
                if (document.getElementById("grd_Personal") && typeof window.listaPersonal === "function") {
                    window.listaPersonal();
                }
                if (esNuevo && typeof window.__personalByClizaAltaCallback === "function") {
                    const cb = window.__personalByClizaAltaCallback;
                    window.__personalByClizaAltaCallback = null;
                    try {
                        cb(nuevoId);
                    } catch (e) {
                        console.error(e);
                    }
                }
            })
            .catch((err) => console.error("Error:", err));
    }

    function nuevoPersonal() {
        Permisos.init();
        if (!Permisos.tiene("Personal", "Crear")) {
            errorModal("No tenés permisos.");
            return;
        }

        window.jQuery("#modalEdicion").attr("data-validacion-ui", "0");
        limpiarModal("#modalEdicion", PERSONAL_ERR_SEL);
        limpiarEstilosValidacionPersonal();
        destruirSelect2CombosPersonal();
        window.jQuery("#dtpFechaIngreso").val(moment().format("YYYY-MM-DD"));

        Promise.all([listaCondicionesIva(), listaProvincias(), listaBancos(), listaPuestos(), listaSucursales()]).then(() => {
            window.jQuery("#btnGuardar").removeClass("d-none").text("Registrar");
            window.jQuery("#modalEdicion input, #modalEdicion select, #modalEdicion textarea").prop("disabled", false);
            window.jQuery("#btnPlusCondicionIva, #btnPlusProvincia, #btnPlusBanco, #btnPlusPuesto, #btnPlusSucursal").prop("disabled", false);
            window.jQuery("#modalEdicionLabel").text("Nuevo Personal");
            window.jQuery("#modalEdicion").modal("show");
        });
    }

    async function mostrarModalPersonal(modelo, opts) {
        opts = opts || {};
        const readOnly = !!opts.readOnly;

        window.jQuery("#modalEdicion").attr("data-validacion-ui", "0");
        limpiarModal("#modalEdicion", PERSONAL_ERR_SEL);
        limpiarEstilosValidacionPersonal();
        destruirSelect2CombosPersonal();

        await Promise.all([listaCondicionesIva(), listaProvincias(), listaBancos(), listaPuestos(), listaSucursales()]);

        window.jQuery("#cmbCondicionIva").val(modelo.IdCondicionIva ?? "").trigger("change");
        window.jQuery("#cmbProvincia").val(modelo.IdProvincia ?? "").trigger("change");
        window.jQuery("#cmbBanco").val(modelo.IdBanco ?? "").trigger("change");
        window.jQuery("#cmbPuesto").val(modelo.IdPuesto ?? "").trigger("change");
        window.jQuery("#cmbSucursal").val(modelo.IdSucursal ?? "").trigger("change");

        setValorInput("#txtIdPersonal", modelo.Id ?? 0);
        setValorInput("#txtNombre", modelo.Nombre);
        setValorInput("#txtTelefono", modelo.Telefono);
        setValorInput("#txtTelefonoAlternativo", modelo.TelefonoAlternativo);
        setValorInput("#txtDni", modelo.Dni);
        setValorInput("#txtCuit", modelo.Cuit);
        setValorInput("#txtDomicilio", modelo.Domicilio);
        setValorInput("#txtLocalidad", modelo.Localidad);
        setValorInput("#txtEmail", modelo.Email);
        setValorInput("#txtBancoAlias", modelo.BancoAlias);
        setValorInput("#txtBancoCbu", modelo.BancoCbu);

        window.jQuery("#dtpFechaIngreso").val(modelo.FechaIngreso ? String(modelo.FechaIngreso).substring(0, 10) : "");
        window.jQuery("#dtpFechaRetiro").val(modelo.FechaRetiro ? String(modelo.FechaRetiro).substring(0, 10) : "");

        setMontoPersonalField("#numSueldoMensual", modelo.SueldoMensual);
        setValorInput("#numDiasLaborales", modelo.DiasLaborales);
        setMontoPersonalField("#numValorDia", modelo.ValorDia);
        setValorInput("#numHsLaborales", modelo.HsLaborales);
        setMontoPersonalField("#numValorHora", modelo.ValorHora);

        limpiarEstilosValidacionPersonal();

        if (readOnly) {
            window.jQuery("#modalEdicionLabel").text("Ver Personal");
            window.jQuery("#btnGuardar").addClass("d-none");
            window.jQuery("#modalEdicion input, #modalEdicion select, #modalEdicion textarea").prop("disabled", true);
            window.jQuery("#btnPlusCondicionIva, #btnPlusProvincia, #btnPlusBanco, #btnPlusPuesto, #btnPlusSucursal").prop("disabled", true);
        } else {
            window.jQuery("#modalEdicionLabel").text("Editar Personal");
            window.jQuery("#btnGuardar").removeClass("d-none").text("Guardar");
            window.jQuery("#modalEdicion input, #modalEdicion select, #modalEdicion textarea").prop("disabled", false);
            window.jQuery("#btnPlusCondicionIva, #btnPlusProvincia, #btnPlusBanco, #btnPlusPuesto, #btnPlusSucursal").prop("disabled", false);
        }

        window.jQuery("#modalEdicion").modal("show");
    }

    async function listaCondicionesIva() {
        const tok = typeof token !== "undefined" ? token : "";
        const res = await fetch("/CondicionesIva/Lista", { headers: { Authorization: "Bearer " + tok, "Content-Type": "application/json" } });
        const data = await res.json();
        llenarSelect("cmbCondicionIva", data);
    }

    async function listaProvincias() {
        const tok = typeof token !== "undefined" ? token : "";
        const res = await fetch("/Provincias/Lista", { headers: { Authorization: "Bearer " + tok, "Content-Type": "application/json" } });
        const data = await res.json();
        llenarSelect("cmbProvincia", data);
    }

    async function listaBancos() {
        const tok = typeof token !== "undefined" ? token : "";
        const res = await fetch("/Bancos/Lista", { headers: { Authorization: "Bearer " + tok, "Content-Type": "application/json" } });
        const data = await res.json();
        llenarSelect("cmbBanco", data);
    }

    async function listaPuestos() {
        const tok = typeof token !== "undefined" ? token : "";
        const res = await fetch("/PersonalPuestos/Lista", { headers: { Authorization: "Bearer " + tok, "Content-Type": "application/json" } });
        const data = await res.json();
        llenarSelect("cmbPuesto", data);
    }

    async function listaSucursales() {
        const tok = typeof token !== "undefined" ? token : "";
        const res = await fetch("/Sucursales/Lista", { headers: { Authorization: "Bearer " + tok, "Content-Type": "application/json" } });
        const data = await res.json();
        llenarSelect("cmbSucursal", data);
    }

    function bindCalculosPersonalMontos() {
        if (document.documentElement.dataset.personalCalculosBound === "1") return;
        document.documentElement.dataset.personalCalculosBound = "1";
        const sm = document.getElementById("numSueldoMensual");
        const dl = document.getElementById("numDiasLaborales");
        const vd = document.getElementById("numValorDia");
        const hl = document.getElementById("numHsLaborales");
        const vh = document.getElementById("numValorHora");
        if (!sm || !dl || !vd || !hl || !vh) return;

        const nDL = () => parseFloat(String(dl.value).replace(",", ".")) || 0;
        const nHL = () => parseFloat(String(hl.value).replace(",", ".")) || 0;

        function calcularDesdeSueldo() {
            const sueldo = parseMontoPersonal(sm.value);
            const dias = nDL();
            const horas = nHL();
            const s = isNaN(sueldo) ? 0 : sueldo;
            if (s > 0 && dias > 0) {
                const vDia = s / dias;
                vd.value = formatMontoPersonalDisplay(Math.round(vDia));
                if (horas > 0) vh.value = formatMontoPersonalDisplay(Math.round(vDia / horas));
            }
        }
        function calcularDesdeDias() {
            calcularDesdeSueldo();
        }
        function calcularDesdeValorDia() {
            const vDia = parseMontoPersonal(vd.value);
            const dias = nDL();
            const horas = nHL();
            const v = isNaN(vDia) ? 0 : vDia;
            if (v > 0 && dias > 0) {
                sm.value = formatMontoPersonalDisplay(Math.round(v * dias));
                if (horas > 0) vh.value = formatMontoPersonalDisplay(Math.round(v / horas));
            }
        }
        function calcularDesdeHoras() {
            const vDia = parseMontoPersonal(vd.value);
            const horas = nHL();
            const v = isNaN(vDia) ? 0 : vDia;
            if (v > 0 && horas > 0) {
                vh.value = formatMontoPersonalDisplay(Math.round(v / horas));
            }
        }
        function calcularDesdeValorHora() {
            const vHora = parseMontoPersonal(vh.value);
            const horas = nHL();
            const dias = nDL();
            const v = isNaN(vHora) ? 0 : vHora;
            if (v > 0 && horas > 0) {
                const vDia = v * horas;
                vd.value = formatMontoPersonalDisplay(Math.round(vDia));
                if (dias > 0) sm.value = formatMontoPersonalDisplay(Math.round(vDia * dias));
            }
        }

        sm.addEventListener("input", calcularDesdeSueldo);
        dl.addEventListener("input", calcularDesdeDias);
        vd.addEventListener("input", calcularDesdeValorDia);
        hl.addEventListener("input", calcularDesdeHoras);
        vh.addEventListener("input", calcularDesdeValorHora);
    }

    function bootModalPersonalByCliza() {
        if (!paginaTieneModalPersonalCompleto()) return;
        attachLiveValidation("#modalEdicion", PERSONAL_ERR_SEL);
        if (typeof wireSelect2Validation === "function") {
            wireSelect2Validation("#modalEdicion", PERSONAL_ERR_SEL);
        }
        window.jQuery("#cmbCondicionIva, #cmbProvincia, #cmbBanco, #cmbPuesto, #cmbSucursal")
            .off("select2:close.personalBlur")
            .on("select2:close.personalBlur", function () {
                if (window.jQuery(this).prop("disabled")) return;
                validarSelectIndividualPersonal("#" + this.id);
            });
        bindMontosPersonal();
        bindAtajosCatalogosPersonal();
        bindCalculosPersonalMontos();

        const btn = document.getElementById("btnGuardar");
        if (btn) {
            btn.removeAttribute("onclick");
            btn.addEventListener("click", guardarCambiosPersonal);
        }
    }

    window.jQuery(document).ready(function () {
        bootModalPersonalByCliza();
    });

    window.guardarCambiosPersonal = guardarCambiosPersonal;
    window.nuevoPersonal = nuevoPersonal;
    window.mostrarModalPersonal = mostrarModalPersonal;
})();
