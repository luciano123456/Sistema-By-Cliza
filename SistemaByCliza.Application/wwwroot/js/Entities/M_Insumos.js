/**
 * M_Insumos.js — Atajos de categoría/proveedor para el modal #modalInsumoABM (Órdenes de corte u otras pantallas).
 * La lógica de guardado sigue en la pantalla anfitriona; acá solo abrimos configuración y refrescamos combos vía callback.
 */
(function () {
    "use strict";

    let pedirRefrescoTrasInsert = false;

    function jwt() {
        if (typeof token !== "undefined" && token) return token;
        return localStorage.getItem("JwtToken") || "";
    }

    function eventoEsAtajo(d) {
        if (d && d.esAtajo === false) return false;
        if (d && d.esAtajo === true) return true;
        return window.esModoAtajo === true || window.esModoAtajo === 1 || window.esModoAtajo === "true" || window.esModoAtajo === "1";
    }

    function paginaTieneModalInsumoAbm() {
        return !!document.getElementById("modalInsumoABM");
    }

    function bindModalConfigHidden() {
        const modalCfg = document.getElementById("modalConfiguracion");
        if (!modalCfg || modalCfg.dataset.insAbmOcRefresh) return;
        modalCfg.dataset.insAbmOcRefresh = "1";
        modalCfg.addEventListener("hidden.bs.modal", async () => {
            pedirRefrescoTrasInsert = false;
            if (!paginaTieneModalInsumoAbm()) return;
            if (typeof window.__MInsumosByClizaRefill !== "function") return;
            try {
                await window.__MInsumosByClizaRefill(null);
            } catch (e) {
                console.error(e);
            }
        });
    }

    function bindConfiguracionInsert() {
        if (document.documentElement.dataset.insAbmOcConfigListener) return;
        document.documentElement.dataset.insAbmOcConfigListener = "1";
        document.addEventListener("configuracionActualizada", async (e) => {
            if (!paginaTieneModalInsumoAbm()) return;
            const d = e.detail || {};
            const desdeAtajo = eventoEsAtajo(d) || pedirRefrescoTrasInsert;
            if (!desdeAtajo) return;
            if (d.accion !== "insertar") {
                pedirRefrescoTrasInsert = false;
                return;
            }
            const tipo = (d.tipo || "").trim();
            if (tipo !== "InsumosCategoria" && tipo !== "Proveedores") {
                pedirRefrescoTrasInsert = false;
                return;
            }
            try {
                if (typeof window.__MInsumosByClizaRefill === "function") {
                    await window.__MInsumosByClizaRefill(d);
                }
            } catch (err) {
                console.error(err);
            } finally {
                pedirRefrescoTrasInsert = false;
            }
        });
    }

    function bindPlusButtons() {
        if (!window.jQuery) return;
        const $ = window.jQuery;

        $(document)
            .off("click.insAbmOc", "#insABM_btnPlusCategoria")
            .on("click.insAbmOc", "#insABM_btnPlusCategoria", async function (e) {
                e.preventDefault();
                e.stopPropagation();
                if (typeof window.abrirConfiguracion !== "function") return;
                pedirRefrescoTrasInsert = true;
                try {
                    await window.abrirConfiguracion("Insumos Categorias", "InsumosCategoria", null, null, null, true);
                } catch (_) {
                    pedirRefrescoTrasInsert = false;
                }
            });

        $(document)
            .off("click.insAbmOc", "#insABM_btnPlusProveedor")
            .on("click.insAbmOc", "#insABM_btnPlusProveedor", async function (e) {
                e.preventDefault();
                e.stopPropagation();
                if (typeof window.abrirConfiguracion !== "function") return;
                pedirRefrescoTrasInsert = true;
                try {
                    await window.abrirConfiguracion("Proveedor", "Proveedores", null, null, null, true);
                } catch (_) {
                    pedirRefrescoTrasInsert = false;
                }
            });
    }

    function boot() {
        if (!paginaTieneModalInsumoAbm()) return;
        bindModalConfigHidden();
        bindConfiguracionInsert();
        bindPlusButtons();
    }

    if (window.jQuery) {
        window.jQuery(document).ready(boot);
    } else {
        document.addEventListener("DOMContentLoaded", boot);
    }
})();
