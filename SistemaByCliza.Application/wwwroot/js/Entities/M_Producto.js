/**
 * M_Producto.js — Alta de producto desde pantallas embebidas (p. ej. Orden de corte).
 * Ids mpa_*; no usa #modalEdicion de Productos/Index para evitar colisión con M_Personal.
 */
(function () {
    "use strict";

    const modalSel = "#modalAltaProductoOC";
    const Multi = { talles: new Set(), colores: new Set() };
    const Cat = { categorias: [], talles: [], colores: [], tallesMap: new Map(), coloresMap: new Map() };
    let pendingCatalogo = null;
    let pedirRefrescoConfig = false;
    let onSuccessCb = null;

    function jwt() {
        if (typeof token !== "undefined" && token) return token;
        return localStorage.getItem("JwtToken") || "";
    }

    function eventoEsAtajo(d) {
        if (d && d.esAtajo === false) return false;
        if (d && d.esAtajo === true) return true;
        return window.esModoAtajo === true || window.esModoAtajo === 1 || window.esModoAtajo === "true" || window.esModoAtajo === "1";
    }

    function escHtml(s) {
        return String(s ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }

    function parsePrecio(raw) {
        if (raw == null) return NaN;
        let str = String(raw).trim();
        if (!str) return NaN;
        str = str.replace(/\$/g, "").replace(/\s/g, "");
        const lastComma = str.lastIndexOf(",");
        if (lastComma !== -1) {
            const intPart = str.slice(0, lastComma).replace(/\./g, "").replace(/[^\d]/g, "");
            const decPart = str.slice(lastComma + 1).replace(/[^\d]/g, "");
            return parseFloat(`${intPart || "0"}.${decPart || "0"}`);
        }
        const only = str.replace(/[^\d.]/g, "");
        const parts = only.split(".");
        if (parts.length === 2 && parts[1].length <= 2 && parts[0] !== "") {
            return parseFloat(`${parts[0]}.${parts[1]}`);
        }
        return parseFloat(parts[0] || "NaN");
    }

    function formatPrecio(n) {
        if (typeof n !== "number" || isNaN(n)) return "";
        if (typeof formatNumber === "function") return formatNumber(n);
        return n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function destruirSelect2Categoria() {
        const $el = window.jQuery("#mpa_cmbCategoria");
        if (!$el.length || !window.jQuery.fn.select2) return;
        if ($el.hasClass("select2-hidden-accessible")) $el.select2("destroy");
    }

    function llenarSelect(id, items) {
        const el = document.getElementById(id);
        if (!el) return;
        el.innerHTML = '<option value="">Seleccione</option>' + (items || []).map(x =>
            `<option value="${x.Id}">${escHtml(x.Nombre ?? x.Descripcion ?? "")}</option>`).join("");
        /* El valor lo fija solo cargarCategorias(preserve) con preserve explícito; no reutilizar el valor viejo del DOM. */
    }

    async function cargarCategorias(preserve) {
        const r = await fetch("/ProductosCategoria/Lista", {
            headers: { Authorization: "Bearer " + jwt(), "Content-Type": "application/json" }
        });
        const data = await r.json();
        Cat.categorias = data || [];
        destruirSelect2Categoria();
        llenarSelect("mpa_cmbCategoria", Cat.categorias);
        if (preserve != null && preserve !== "") {
            window.jQuery("#mpa_cmbCategoria").val(String(preserve));
        }
        const $m = window.jQuery(modalSel);
        if ($m.length && $m.hasClass("show") && window.jQuery.fn.select2) {
            window.jQuery("#mpa_cmbCategoria").select2({
                width: "100%",
                dropdownParent: $m
            });
        }
    }

    async function cargarColores() {
        const r = await fetch("/Colores/Lista", {
            headers: { Authorization: "Bearer " + jwt(), "Content-Type": "application/json" }
        });
        const data = await r.json();
        Cat.colores = data || [];
        Cat.coloresMap = new Map(Cat.colores.map(x => [Number(x.Id), x.Nombre]));
    }

    async function recargarTallesPorCategoria(idCategoria) {
        let data = [];
        try {
            if (idCategoria && idCategoria > 0) {
                const r = await fetch(`/ProductosCategoriasTalle/ListaPorCategoria?idCategoria=${idCategoria}`, {
                    headers: { Authorization: "Bearer " + jwt(), "Content-Type": "application/json" }
                });
                const rel = await r.json();
                data = (rel || []).map(row => ({ Id: row.IdTalle ?? row.Id ?? 0, Nombre: row.TalleNombre ?? row.Nombre ?? "" }));
            }
        } catch (_) {
            data = [];
        }
        Cat.talles = data;
        Cat.tallesMap = new Map(data.map(x => [Number(x.Id), x.Nombre]));
        renderChecklist("mpa_listaTalles", Cat.talles, "talles", "mpa_btnTalles");
    }

    function updateBtn(btnId, stateKey) {
        const btn = document.getElementById(btnId);
        if (!btn) return;
        const set = Multi[stateKey];
        const map = stateKey === "talles" ? Cat.tallesMap : Cat.coloresMap;
        const textos = [...set].map(id => map.get(Number(id))).filter(Boolean);
        btn.textContent = textos.length ? textos.join(", ") : (stateKey === "talles" ? "Seleccionar talles" : "Seleccionar colores");
        btn.title = textos.join(", ");
        if (set.size > 0) btn.classList.remove("is-invalid");
    }

    function renderChecklist(panelId, items, stateKey, btnId) {
        const panel = document.getElementById(panelId);
        if (!panel) return;
        const selected = Multi[stateKey];
        const labelTodos = "Seleccionar todos";
        const html = [];
        const allChecked = items.length > 0 && items.every(it => selected.has(Number(it.Id)));
        html.push(`<div class="form-check"><input class="form-check-input" type="checkbox" id="${panelId}-all" ${allChecked ? "checked" : ""}><label class="form-check-label" for="${panelId}-all">${labelTodos}</label></div><hr class="my-2" />`);
        for (const it of items) {
            const checked = selected.has(Number(it.Id)) ? "checked" : "";
            html.push(`<div class="form-check"><input class="form-check-input" type="checkbox" id="${panelId}-opt-${it.Id}" data-id="${it.Id}" ${checked}><label class="form-check-label" for="${panelId}-opt-${it.Id}">${escHtml(it.Nombre)}</label></div>`);
        }
        panel.innerHTML = html.join("");

        document.getElementById(`${panelId}-all`).addEventListener("change", (ev) => {
            selected.clear();
            if (ev.target.checked) items.forEach(it => selected.add(Number(it.Id)));
            items.forEach(it => {
                const cb = document.getElementById(`${panelId}-opt-${it.Id}`);
                if (cb) cb.checked = ev.target.checked;
            });
            updateBtn(btnId, stateKey);
        });
        items.forEach(it => {
            const cb = document.getElementById(`${panelId}-opt-${it.Id}`);
            if (!cb) return;
            cb.addEventListener("change", (ev) => {
                const id = Number(ev.target.getAttribute("data-id"));
                if (ev.target.checked) selected.add(id); else selected.delete(id);
                updateBtn(btnId, stateKey);
                const allC = items.length > 0 && items.every(x => selected.has(Number(x.Id)));
                const allBox = document.getElementById(`${panelId}-all`);
                if (allBox) allBox.checked = allC;
            });
        });
        updateBtn(btnId, stateKey);
    }

    function limpiarValidacionMpa() {
        ["mpa_txtDescripcion", "mpa_txtPrecio"].forEach((id) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.classList.remove("is-invalid");
            if (id === "mpa_txtPrecio") {
                const fb = el.nextElementSibling;
                if (fb && fb.classList.contains("invalid-feedback")) fb.textContent = "Campo obligatorio";
            }
        });
        document.getElementById("mpa_cmbCategoria")?.classList.remove("is-invalid");
        document.getElementById("mpa_btnTalles")?.classList.remove("is-invalid");
        document.getElementById("mpa_btnColores")?.classList.remove("is-invalid");
    }

    function limpiarUi() {
        document.getElementById("mpa_txtDescripcion").value = "";
        document.getElementById("mpa_txtPrecio").value = "";
        Multi.talles.clear();
        Multi.colores.clear();
        document.getElementById("mpa_errorCampos")?.classList.add("d-none");
        document.getElementById("mpa_chkVariantes").checked = true;
        const catEl = document.getElementById("mpa_cmbCategoria");
        if (catEl) catEl.value = "";
        if (window.jQuery) {
            const $c = window.jQuery("#mpa_cmbCategoria");
            if ($c.length && $c.hasClass("select2-hidden-accessible")) {
                $c.val(null).trigger("change");
            }
        }
        limpiarValidacionMpa();
    }

    function aplicarPendienteCatalogo(pend) {
        if (!pend || pend.nuevoId == null) return;
        const nid = Number(pend.nuevoId);
        if (!Number.isFinite(nid) || nid <= 0) return;
        if (pend.tipo === "ProductosCategoria") {
            window.jQuery("#mpa_cmbCategoria").val(String(nid)).trigger("change");
        }
    }

    async function refrescarTrasConfiguracion() {
        const pend = pendingCatalogo;
        pendingCatalogo = null;
        const catVal = window.jQuery("#mpa_cmbCategoria").val();
        await Promise.all([cargarCategorias(catVal), cargarColores()]);
        aplicarPendienteCatalogo(pend);
        const idCat = parseInt(window.jQuery("#mpa_cmbCategoria").val() || "0", 10);
        await recargarTallesPorCategoria(idCat);
        renderChecklist("mpa_listaColores", Cat.colores, "colores", "mpa_btnColores");
        if (pend && pend.tipo === "Colores" && pend.nuevoId) {
            Multi.colores.add(Number(pend.nuevoId));
            renderChecklist("mpa_listaColores", Cat.colores, "colores", "mpa_btnColores");
        }
        if (pend && pend.tipo === "ProductosCategoriasTalle" && pend.nuevoId) {
            Multi.talles.add(Number(pend.nuevoId));
            renderChecklist("mpa_listaTalles", Cat.talles, "talles", "mpa_btnTalles");
        }
    }

    function bindModalConfigHidden() {
        const modalCfg = document.getElementById("modalConfiguracion");
        if (!modalCfg || modalCfg.dataset.mpaProdRefresh) return;
        modalCfg.dataset.mpaProdRefresh = "1";
        modalCfg.addEventListener("hidden.bs.modal", async () => {
            pedirRefrescoConfig = false;
            const m = document.getElementById("modalAltaProductoOC");
            if (!m || !m.classList.contains("show")) return;
            try {
                await refrescarTrasConfiguracion();
            } catch (e) {
                console.error(e);
            }
        });
    }

    function bindConfiguracionInsert() {
        if (document.documentElement.dataset.mpaProdConfigListener) return;
        document.documentElement.dataset.mpaProdConfigListener = "1";
        document.addEventListener("configuracionActualizada", (e) => {
            const m = document.getElementById("modalAltaProductoOC");
            if (!m || !m.classList.contains("show")) return;
            const d = e.detail || {};
            if (d.accion !== "insertar") return;
            const desdeAtajo = eventoEsAtajo(d) || pedirRefrescoConfig;
            if (!desdeAtajo) return;
            const tipo = d.tipo || "";
            const ok = ["ProductosCategoria", "ProductosCategoriasTalle", "Colores", "ListasPrecios"];
            if (!ok.includes(tipo)) return;
            const raw = d.nuevoId ?? d.NuevoId;
            if (raw == null || raw === "") return;
            const nuevoId = Number(raw);
            if (!Number.isFinite(nuevoId) || nuevoId <= 0) return;
            pendingCatalogo = { tipo, nuevoId };
        });
    }

    function bindAtajos() {
        if (!window.jQuery) return;
        const $ = window.jQuery;

        $(document).off("click.mpaProd", "#mpa_btnPlusCategoria").on("click.mpaProd", "#mpa_btnPlusCategoria", async function (e) {
            e.preventDefault();
            e.stopPropagation();
            if (typeof window.abrirConfiguracion !== "function") return;
            pedirRefrescoConfig = true;
            try {
                await window.abrirConfiguracion("Productos Categorias", "ProductosCategoria", null, null, null, true);
            } catch (_) {
                pedirRefrescoConfig = false;
            }
        });

        $(document).off("click.mpaProd", "#mpa_btnPlusTalles").on("click.mpaProd", "#mpa_btnPlusTalles", async function (e) {
            e.preventDefault();
            e.stopPropagation();
            if (typeof window.abrirConfiguracion !== "function") return;
            const idCat = parseInt($("#mpa_cmbCategoria").val() || "0", 10);
            if (!idCat) {
                if (typeof errorModal === "function") await errorModal("Seleccioná primero una categoría de producto.");
                return;
            }
            pedirRefrescoConfig = true;
            try {
                await window.abrirConfiguracion(
                    "Productos Categorias Talles",
                    "ProductosCategoriasTalle",
                    "Productos Categoria",
                    "ProductosCategoria",
                    "Categoria",
                    true,
                    idCat
                );
            } catch (_) {
                pedirRefrescoConfig = false;
            }
        });

        $(document).off("click.mpaProd", "#mpa_btnPlusColores").on("click.mpaProd", "#mpa_btnPlusColores", async function (e) {
            e.preventDefault();
            e.stopPropagation();
            if (typeof window.abrirConfiguracion !== "function") return;
            pedirRefrescoConfig = true;
            try {
                await window.abrirConfiguracion("Color", "Colores", null, null, null, true);
            } catch (_) {
                pedirRefrescoConfig = false;
            }
        });
    }

    function bindPrecioInput() {
        const $m = window.jQuery(modalSel);
        if (!$m.length) return;
        $m.off("focusout.mpaPrecio", "#mpa_txtPrecio")
            .on("focusout.mpaPrecio", "#mpa_txtPrecio", function () {
                if (this.disabled) return;
                const raw = String(this.value || "").trim();
                if (!raw) {
                    this.value = "";
                    return;
                }
                const n = parsePrecio(raw);
                if (!isNaN(n) && n >= 0) this.value = formatPrecio(n);
            });
    }

    async function guardar() {
        const desc = (document.getElementById("mpa_txtDescripcion").value || "").trim();
        const idCat = parseInt(window.jQuery("#mpa_cmbCategoria").val() || "0", 10);
        const precioRaw = document.getElementById("mpa_txtPrecio").value;
        const precio = parsePrecio(precioRaw);
        const idTalles = [...Multi.talles];
        const idColores = [...Multi.colores];

        limpiarValidacionMpa();

        let ok = true;
        if (!desc) {
            document.getElementById("mpa_txtDescripcion")?.classList.add("is-invalid");
            ok = false;
        }
        if (!idCat || idCat <= 0) {
            document.getElementById("mpa_cmbCategoria")?.classList.add("is-invalid");
            ok = false;
        }
        const precioOk = !isNaN(precio) && precio >= 0;
        if (!precioOk) {
            const inp = document.getElementById("mpa_txtPrecio");
            if (inp) {
                inp.classList.add("is-invalid");
                const fb = inp.nextElementSibling;
                if (fb && fb.classList.contains("invalid-feedback")) {
                    fb.textContent = !String(precioRaw || "").trim() ? "Campo obligatorio" : "Ingresá un precio válido.";
                }
            }
            ok = false;
        }
        if (idTalles.length === 0) {
            document.getElementById("mpa_btnTalles")?.classList.add("is-invalid");
            ok = false;
        }
        if (idColores.length === 0) {
            document.getElementById("mpa_btnColores")?.classList.add("is-invalid");
            ok = false;
        }

        document.getElementById("mpa_errorCampos").classList.toggle("d-none", ok);
        if (!ok) return;

        const payload = {
            Id: 0,
            Descripcion: desc,
            IdCategoria: idCat,
            PrecioUnitario: precio,
            IdTalles: idTalles,
            IdColores: idColores,
            GenerarVariantes: document.getElementById("mpa_chkVariantes").checked,
            PreciosPorLista: []
        };

        try {
            const r = await fetch("/Productos/Insertar", {
                method: "POST",
                headers: { Authorization: "Bearer " + jwt(), "Content-Type": "application/json;charset=utf-8" },
                body: JSON.stringify(payload)
            });
            if (!r.ok) throw new Error(r.statusText);
            const j = await r.json();
            if (!j || j.valor !== true) {
                if (typeof errorModal === "function") errorModal("No se pudo guardar el producto.");
                return;
            }
            const nuevoId = Number(j.id || j.Id || 0) || 0;
            const elOc = document.getElementById("modalAltaProductoOC");
            if (elOc && window.bootstrap?.Modal) {
                window.bootstrap.Modal.getInstance(elOc)?.hide();
            }
            if (typeof exitoModal === "function") exitoModal("Producto registrado.");
            if (typeof onSuccessCb === "function") {
                const cb = onSuccessCb;
                onSuccessCb = null;
                try {
                    await cb(nuevoId);
                } catch (e) {
                    console.error(e);
                }
            }
        } catch (e) {
            console.error(e);
            if (typeof errorModal === "function") errorModal("Error al guardar el producto.");
        }
    }

    async function abrir(opts) {
        opts = opts || {};
        onSuccessCb = typeof opts.onSuccess === "function" ? opts.onSuccess : null;

        if (typeof Permisos !== "undefined") {
            Permisos.init();
            if (!Permisos.tiene("Productos", "Crear")) {
                if (typeof errorModal === "function") errorModal("No tenés permisos.");
                return;
            }
        }

        limpiarUi();
        Multi.talles.clear();
        Multi.colores.clear();

        await Promise.all([cargarCategorias(""), cargarColores()]);
        await recargarTallesPorCategoria(0);
        renderChecklist("mpa_listaColores", Cat.colores, "colores", "mpa_btnColores");

        window.jQuery("#mpa_cmbCategoria").off("change.mpa").on("change.mpa", async function () {
            document.getElementById("mpa_cmbCategoria")?.classList.remove("is-invalid");
            const idCat = parseInt(this.value || "0", 10);
            Multi.talles.clear();
            await recargarTallesPorCategoria(idCat);
        });

        const el = document.getElementById("modalAltaProductoOC");
        if (!el || !window.bootstrap?.Modal) return;
        const modal = window.bootstrap.Modal.getOrCreateInstance(el, { backdrop: true, keyboard: true });
        el.addEventListener("shown.bs.modal", function onShown() {
            el.removeEventListener("shown.bs.modal", onShown);
            const $m = window.jQuery(modalSel);
            if (window.jQuery.fn.select2) {
                window.jQuery("#mpa_cmbCategoria").select2({ width: "100%", dropdownParent: $m });
            }
        }, { once: true });
        modal.show();
    }

    function boot() {
        if (!document.getElementById("modalAltaProductoOC")) return;
        bindModalConfigHidden();
        bindConfiguracionInsert();
        bindAtajos();
        bindPrecioInput();
        document.getElementById("mpa_btnGuardar")?.addEventListener("click", () => { guardar(); });

        document.getElementById("mpa_txtDescripcion")?.addEventListener("input", function () {
            this.classList.remove("is-invalid");
        });
        document.getElementById("mpa_txtPrecio")?.addEventListener("input", function () {
            this.classList.remove("is-invalid");
            const fb = this.nextElementSibling;
            if (fb && fb.classList.contains("invalid-feedback")) fb.textContent = "Campo obligatorio";
        });
    }

    window.MProductoByCliza = {
        abrir,
        boot
    };

    if (window.jQuery) {
        window.jQuery(document).ready(boot);
    } else {
        document.addEventListener("DOMContentLoaded", boot);
    }
})();
