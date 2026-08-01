/* Análisis de datos — dashboard compacto */
(function () {
    const charts = {};
    const PALETTE = ["#38bdf8", "#2dd4bf", "#fbbf24", "#f87171", "#a78bfa", "#fb7185", "#34d399", "#fb923c", "#60a5fa", "#94a3b8"];
    const CHART_TXT = "#94a3b8";
    const CHART_GRID = "rgba(148,163,184,0.12)";

    let periodoActivo = "3m";

    function authHeaders() {
        const token = window.token || localStorage.getItem("JwtToken") || "";
        return { Authorization: "Bearer " + token };
    }

    function money(n) {
        return Number(n || 0).toLocaleString("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }

    function moneyDec(n) {
        return Number(n || 0).toLocaleString("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 2 });
    }

    function num(n) {
        return Number(n || 0).toLocaleString("es-AR", { maximumFractionDigits: 1 });
    }

    function qs(id) { return document.getElementById(id); }

    function fmtDate(d) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
    }

    function startOfWeek(d) {
        const x = new Date(d);
        const day = x.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        x.setDate(x.getDate() + diff);
        x.setHours(0, 0, 0, 0);
        return x;
    }

    const PERIODO_LABELS = {
        hoy: "Hoy",
        semana: "Esta semana",
        mes: "Este mes",
        "3m": "Últimos 3 meses",
        "6m": "Últimos 6 meses",
        anio: "Último año",
        ytd: "Este año",
        custom: "Personalizado"
    };

    function aplicarPeriodo(key) {
        periodoActivo = key;
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        let desde = new Date(hoy);
        let hasta = new Date(hoy);

        switch (key) {
            case "hoy":
                break;
            case "semana":
                desde = startOfWeek(hoy);
                break;
            case "mes":
                desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
                break;
            case "3m":
                desde = new Date(hoy.getFullYear(), hoy.getMonth() - 2, 1);
                break;
            case "6m":
                desde = new Date(hoy.getFullYear(), hoy.getMonth() - 5, 1);
                break;
            case "anio":
                desde = new Date(hoy);
                desde.setFullYear(desde.getFullYear() - 1);
                break;
            case "ytd":
                desde = new Date(hoy.getFullYear(), 0, 1);
                break;
            case "custom":
                qs("axCustomDates").classList.remove("d-none");
                qs("axPeriodoLabel").textContent = "Personalizado";
                return;
            default:
                desde = new Date(hoy.getFullYear(), hoy.getMonth() - 2, 1);
        }

        qs("axCustomDates").classList.add("d-none");
        qs("fltDesde").value = fmtDate(desde);
        qs("fltHasta").value = fmtDate(hasta);
        qs("axPeriodoLabel").textContent = PERIODO_LABELS[key] || key;
    }

    function filtrosQuery(opts = {}) {
        const p = new URLSearchParams();
        const desde = qs("fltDesde").value;
        const hasta = qs("fltHasta").value;
        const suc = qs("fltSucursal").value;
        const tipoVenta = qs("fltTipoVenta")?.value || "";
        const dias = qs("fltDiasSinMov").value;
        if (desde) p.set("fechaDesde", desde);
        if (hasta) p.set("fechaHasta", hasta);
        if (suc) p.set("idSucursal", suc);
        // Tipo de venta solo para reportes comerciales (ventas / financiero)
        if (opts.usarTipoVenta && tipoVenta) p.set("tipoVenta", tipoVenta);
        if (dias) p.set("diasSinMovimiento", dias);
        return p.toString();
    }

    async function api(path, opts = {}) {
        const q = filtrosQuery(opts);
        const url = q ? `${path}?${q}` : path;
        const res = await fetch(url, { headers: authHeaders() });
        if (!res.ok) throw new Error("Error al cargar " + path);
        return res.json();
    }

    function destroyChart(key) {
        if (charts[key]) {
            charts[key].destroy();
            delete charts[key];
        }
    }

    function baseOptions(extra = {}) {
        const opts = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: !!extra.legend,
                    position: "bottom",
                    labels: { color: CHART_TXT, boxWidth: 10, font: { size: 10 }, padding: 10 }
                },
                tooltip: {
                    backgroundColor: "rgba(15,23,42,0.95)",
                    titleFont: { size: 11 },
                    bodyFont: { size: 11 },
                    padding: 8
                }
            }
        };
        if (!extra.noScales) {
            opts.scales = {
                x: {
                    ticks: { color: CHART_TXT, font: { size: 10 }, maxRotation: 40 },
                    grid: { color: CHART_GRID }
                },
                y: {
                    ticks: { color: CHART_TXT, font: { size: 10 } },
                    grid: { color: CHART_GRID }
                },
                ...(extra.scales || {})
            };
        }
        return opts;
    }

    function makeChart(key, canvasId, config) {
        destroyChart(key);
        const el = qs(canvasId);
        if (!el || typeof Chart === "undefined") return;
        charts[key] = new Chart(el, config);
    }

    function setText(id, text) {
        const el = qs(id);
        if (el) el.textContent = text;
    }

    function renderRank(containerId, items, mapFn) {
        const el = qs(containerId);
        if (!el) return;
        if (!items || !items.length) {
            el.innerHTML = '<div class="ax-rank-empty">Sin datos en el período</div>';
            return;
        }
        const max = Math.max(...items.map(x => mapFn(x).value), 1);
        el.innerHTML = items.map((item, i) => {
            const m = mapFn(item);
            const pct = Math.round((m.value / max) * 100);
            return `<div class="ax-rank-item">
                <span class="ax-rank-pos">${i + 1}</span>
                <div>
                    <div class="ax-rank-name">${m.name}</div>
                    ${m.sub ? `<span class="ax-rank-sub">${m.sub}</span>` : ""}
                </div>
                <div class="ax-rank-val">${m.valueText}</div>
                <div class="ax-rank-bar"><i style="width:${pct}%"></i></div>
            </div>`;
        }).join("");
    }

    function renderChips(containerId, items, labelFn) {
        const el = qs(containerId);
        if (!el) return;
        if (!items || !items.length) {
            el.innerHTML = '<div class="ax-rank-empty">Todas las provincias tienen presencia 🎉</div>';
            return;
        }
        el.innerHTML = items.map(x => `<span class="ax-chip-tag">${labelFn(x)}</span>`).join("");
    }

    async function cargarSucursales() {
        const res = await fetch("/Sucursales/Lista", { headers: authHeaders() });
        if (!res.ok) return;
        const lista = await res.json();
        const sel = qs("fltSucursal");
        sel.innerHTML = '<option value="">Todas las sucursales</option>';
        (lista || []).forEach(s => {
            const opt = document.createElement("option");
            opt.value = s.Id;
            opt.textContent = s.Nombre;
            sel.appendChild(opt);
        });
    }

    async function cargarVentas() {
        const d = await api("/AnalisisDatos/Ventas", { usarTipoVenta: true });
        setText("kpiVentas", money(d.ImporteTotal));

        const prod = [...(d.PorProducto || [])].sort((a, b) => b.Cantidad - a.Cantidad);
        const top = prod.slice(0, 8);
        const bottom = prod.length > 1 ? [...prod].reverse().slice(0, 8) : [];
        const mixTop = prod.slice(0, 5);
        const mixBottom = prod.length > 5 ? prod.slice(-3).reverse() : [];
        const mix = [...mixTop.map(x => ({ ...x, _tag: "↑" })), ...mixBottom.map(x => ({ ...x, _tag: "↓" }))];

        renderRank("rankPrendasMas", top, x => ({
            name: x.Etiqueta,
            sub: `${x.CantidadVentas} ventas`,
            value: x.Cantidad,
            valueText: `${num(x.Cantidad)} u.`
        }));
        renderRank("rankPrendasMenos", bottom, x => ({
            name: x.Etiqueta,
            sub: `${x.CantidadVentas} ventas · ${money(x.Importe)}`,
            value: x.Cantidad,
            valueText: `${num(x.Cantidad)} u.`
        }));

        makeChart("productos", "chartProductos", {
            type: "bar",
            data: {
                labels: mix.map(x => `${x._tag} ${x.Etiqueta}`),
                datasets: [{
                    data: mix.map(x => x.Cantidad),
                    backgroundColor: mix.map(x => x._tag === "↑" ? "#38bdf8" : "#f87171"),
                    borderRadius: 6,
                    maxBarThickness: 28
                }]
            },
            options: { ...baseOptions(), plugins: { ...baseOptions().plugins, legend: { display: false } } }
        });

        const talles = [...(d.PorTalle || [])].sort((a, b) => b.Cantidad - a.Cantidad);
        const colores = [...(d.PorColor || [])].sort((a, b) => b.Cantidad - a.Cantidad);

        makeChart("talles", "chartTalles", {
            type: "doughnut",
            data: {
                labels: talles.slice(0, 6).map(x => x.Etiqueta),
                datasets: [{ data: talles.slice(0, 6).map(x => x.Cantidad), backgroundColor: PALETTE, borderWidth: 0 }]
            },
            options: { ...baseOptions({ legend: true, noScales: true }), cutout: "62%" }
        });
        renderRank("rankTallesMas", talles.slice(0, 6), x => ({
            name: x.Etiqueta, sub: `${x.CantidadVentas} ventas`, value: x.Cantidad, valueText: `${num(x.Cantidad)} u.`
        }));
        renderRank("rankTallesMenos", [...talles].reverse().slice(0, 6), x => ({
            name: x.Etiqueta, sub: `${x.CantidadVentas} ventas`, value: x.Cantidad, valueText: `${num(x.Cantidad)} u.`
        }));

        makeChart("colores", "chartColores", {
            type: "doughnut",
            data: {
                labels: colores.slice(0, 6).map(x => x.Etiqueta),
                datasets: [{ data: colores.slice(0, 6).map(x => x.Cantidad), backgroundColor: PALETTE, borderWidth: 0 }]
            },
            options: { ...baseOptions({ legend: true, noScales: true }), cutout: "62%" }
        });
        renderRank("rankColoresMas", colores.slice(0, 6), x => ({
            name: x.Etiqueta, sub: `${x.CantidadVentas} ventas`, value: x.Cantidad, valueText: `${num(x.Cantidad)} u.`
        }));
        renderRank("rankColoresMenos", [...colores].reverse().slice(0, 6), x => ({
            name: x.Etiqueta, sub: `${x.CantidadVentas} ventas`, value: x.Cantidad, valueText: `${num(x.Cantidad)} u.`
        }));

        const porTipo = d.PorCanal || [];
        makeChart("canal", "chartCanal", {
            type: "doughnut",
            data: {
                labels: porTipo.map(x => x.Etiqueta),
                datasets: [{
                    data: porTipo.map(x => x.Importe),
                    backgroundColor: porTipo.map(x => x.Etiqueta === "Online" ? "#a78bfa" : "#38bdf8"),
                    borderWidth: 0
                }]
            },
            options: { ...baseOptions({ legend: true, noScales: true }), cutout: "62%" }
        });
        renderRank("rankCanal", porTipo, x => ({
            name: x.Etiqueta,
            sub: `${x.CantidadVentas} ventas`,
            value: x.Importe,
            valueText: money(x.Importe)
        }));

        makeChart("sucursal", "chartSucursal", {
            type: "bar",
            data: {
                labels: (d.PorSucursal || []).map(x => x.Etiqueta),
                datasets: [{ data: (d.PorSucursal || []).map(x => x.Importe), backgroundColor: "#2dd4bf", borderRadius: 6, maxBarThickness: 26 }]
            },
            options: { ...baseOptions(), plugins: { ...baseOptions().plugins, legend: { display: false } } }
        });

        const vendedores = [...(d.PorVendedor || [])].sort((a, b) => b.CantidadCierres - a.CantidadCierres);
        makeChart("vendedores", "chartVendedores", {
            type: "bar",
            data: {
                labels: vendedores.slice(0, 8).map(x => x.Vendedor),
                datasets: [{ data: vendedores.slice(0, 8).map(x => x.CantidadCierres), backgroundColor: "#fbbf24", borderRadius: 6, maxBarThickness: 18 }]
            },
            options: {
                ...baseOptions(),
                indexAxis: "y",
                plugins: { ...baseOptions().plugins, legend: { display: false } }
            }
        });
        renderRank("rankVendedores", vendedores.slice(0, 12), x => ({
            name: x.Vendedor,
            sub: `Ticket prom. ${money(x.TicketPromedio)}`,
            value: x.CantidadCierres,
            valueText: `${x.CantidadCierres} cierres · ${money(x.ImporteTotal)}`
        }));

        renderRank("rankProvincias", (d.PorProvincia || []).slice(0, 12), x => ({
            name: x.Provincia,
            sub: `${x.CantidadVentas} ventas · ${x.CantidadClientes} clientes`,
            value: x.ImporteTotal,
            valueText: money(x.ImporteTotal)
        }));

        renderChips("chipsSinPresencia", d.ProvinciasSinPresencia || [], x => x.Provincia);

        renderRank("rankLocalidades", (d.PorLocalidad || []).slice(0, 14), x => ({
            name: x.Localidad,
            sub: x.Provincia,
            value: x.ImporteTotal,
            valueText: money(x.ImporteTotal)
        }));
    }

    async function cargarInventario() {
        const d = await api("/AnalisisDatos/Inventario");
        const invPresente = Math.max(0, (d.ValorInversionTotal || 0) - (d.ValorInversionParado || 0));
        const ventaPresente = Math.max(0, (d.ValorVentaTotal || 0) - (d.ValorVentaParado || 0));

        setText("invUnidades", num(d.StockTotalUnidades));
        setText("invInversion", money(d.ValorInversionTotal));
        setText("invVenta", money(d.ValorVentaTotal));
        setText("invInvPresente", money(invPresente));
        setText("invVentaPresente", money(ventaPresente));
        setText("invParado", `${money(d.ValorInversionParado)} / ${money(d.ValorVentaParado)}`);
        setText("kpiStock", money(d.ValorVentaTotal));
        setText("kpiParado", money(d.ValorVentaParado));

        const clasif = [
            { label: "Alto movimiento", value: d.ItemsAltoMovimiento || 0, color: "#34d399" },
            { label: "Poco movimiento", value: d.ItemsPocoMovimiento || 0, color: "#fbbf24" },
            { label: "Sin movimiento", value: d.ItemsSinMovimiento || 0, color: "#f87171" }
        ];

        makeChart("invClasif", "chartInvClasif", {
            type: "doughnut",
            data: {
                labels: clasif.map(x => x.label),
                datasets: [{ data: clasif.map(x => x.value), backgroundColor: clasif.map(x => x.color), borderWidth: 0 }]
            },
            options: { ...baseOptions({ legend: false, noScales: true }), cutout: "68%" }
        });

        const legend = qs("legendInvClasif");
        if (legend) {
            legend.innerHTML = clasif.map(x =>
                `<span><i style="background:${x.color}"></i>${x.label}: <b style="color:#e2e8f0">${x.value}</b></span>`
            ).join("");
        }

        makeChart("invValor", "chartInvValor", {
            type: "bar",
            data: {
                labels: ["Presente", "Parado"],
                datasets: [
                    {
                        label: "Inversión",
                        data: [invPresente, d.ValorInversionParado || 0],
                        backgroundColor: "#38bdf8",
                        borderRadius: 6,
                        maxBarThickness: 36
                    },
                    {
                        label: "Valor venta",
                        data: [ventaPresente, d.ValorVentaParado || 0],
                        backgroundColor: "#2dd4bf",
                        borderRadius: 6,
                        maxBarThickness: 36
                    }
                ]
            },
            options: { ...baseOptions({ legend: true }) }
        });

        const items = d.Items || [];
        const parado = items.filter(x => x.Clasificacion === "Sin movimiento")
            .sort((a, b) => b.DiasSinMovimiento - a.DiasSinMovimiento)
            .slice(0, 12);
        const poco = items.filter(x => x.Clasificacion === "Poco movimiento")
            .sort((a, b) => a.CantidadVendida - b.CantidadVendida)
            .slice(0, 10);
        const alto = items.filter(x => x.Clasificacion === "Alto movimiento")
            .sort((a, b) => b.CantidadVendida - a.CantidadVendida)
            .slice(0, 10);

        renderRank("rankStockAlto", alto, x => ({
            name: x.Producto,
            sub: `${x.Talle} · ${x.Color} · vendido ${num(x.CantidadVendida)}`,
            value: x.CantidadVendida,
            valueText: `${num(x.Stock)} u. · ${money(x.ValorVenta)}`
        }));
        renderRank("rankStockPoco", poco, x => ({
            name: x.Producto,
            sub: `${x.Talle} · ${x.Color} · ${x.Sucursal}`,
            value: x.CantidadVendida,
            valueText: `${num(x.CantidadVendida)} vend. · ${money(x.ValorVenta)}`
        }));
        renderRank("rankStockParado", parado, x => ({
            name: x.Producto,
            sub: `${x.Talle} · ${x.Color} · ${x.Sucursal} · ${x.DiasSinMovimiento} días sin mov.`,
            value: x.ValorVenta,
            valueText: `Inv ${money(x.ValorInversion)} · Vta ${money(x.ValorVenta)}`
        }));
    }

    async function cargarFinanciero() {
        const d = await api("/AnalisisDatos/Financiero", { usarTipoVenta: true });
        setText("finVentas", money(d.VentasTotal));
        setText("finGastos", money(d.GastosTotal));
        setText("finCosto", money(d.CostoProduccionTotal));
        setText("finResultado", money(d.ResultadoTotal));
        setText("kpiResultado", money(d.ResultadoTotal));

        const meses = d.PorMes || [];
        makeChart("equilibrio", "chartEquilibrio", {
            type: "line",
            data: {
                labels: meses.map(x => x.Periodo),
                datasets: [
                    { label: "Ventas", data: meses.map(x => x.VentasImporte), borderColor: "#38bdf8", backgroundColor: "rgba(56,189,248,0.12)", fill: true, tension: 0.3, pointRadius: 3 },
                    { label: "Gastos", data: meses.map(x => x.GastosImporte), borderColor: "#f87171", tension: 0.3, pointRadius: 3 },
                    { label: "Resultado", data: meses.map(x => x.Resultado), borderColor: "#34d399", tension: 0.3, pointRadius: 3 },
                    { label: "Unid. equilibrio", data: meses.map(x => x.UnidadesPuntoEquilibrio), borderColor: "#fbbf24", borderDash: [5, 4], yAxisID: "y1", tension: 0.3, pointRadius: 2 }
                ]
            },
            options: {
                ...baseOptions({
                    legend: true,
                    scales: {
                        y1: {
                            position: "right",
                            ticks: { color: CHART_TXT, font: { size: 10 } },
                            grid: { drawOnChartArea: false }
                        }
                    }
                })
            }
        });

        const topG = (d.PorPrenda || []).slice(0, 8);
        makeChart("ganancia", "chartGananciaPrenda", {
            type: "bar",
            data: {
                labels: topG.map(x => x.Producto),
                datasets: [{
                    data: topG.map(x => x.GananciaTotal),
                    backgroundColor: topG.map(x => x.GananciaTotal >= 0 ? "#a78bfa" : "#f87171"),
                    borderRadius: 6,
                    maxBarThickness: 28
                }]
            },
            options: { ...baseOptions(), plugins: { ...baseOptions().plugins, legend: { display: false } } }
        });

        renderRank("rankGananciaPrenda", (d.PorPrenda || []).slice(0, 14), x => ({
            name: x.Producto,
            sub: `Venta ${moneyDec(x.PrecioVentaPromedio)} · Costo ${moneyDec(x.CostoEstimadoUnitario)} · Margen ${num(x.MargenPorcentaje)}%`,
            value: Math.abs(x.GananciaTotal),
            valueText: `${moneyDec(x.GananciaUnitaria)}/u · Total ${money(x.GananciaTotal)}`
        }));

        const cards = qs("cardsEquilibrio");
        if (cards) {
            if (!meses.length) {
                cards.innerHTML = '<div class="ax-rank-empty">Sin datos mensuales</div>';
            } else {
                cards.innerHTML = meses.map(m => {
                    const llega = m.UnidadesVendidas >= m.UnidadesPuntoEquilibrio && m.UnidadesPuntoEquilibrio > 0;
                    return `
                    <div class="ax-month-card ${m.EnGanancia ? "ok" : "bad"}">
                        <div class="m-title">
                            <span>${m.Periodo}</span>
                            <span class="ax-badge ${m.EnGanancia ? "ok" : "warn"}">${m.EnGanancia ? "Ganancia" : "Pérdida"}</span>
                        </div>
                        <div class="m-row"><span>Ventas</span><strong>${money(m.VentasImporte)}</strong></div>
                        <div class="m-row"><span>Gastos</span><strong>${money(m.GastosImporte)}</strong></div>
                        <div class="m-row"><span>Vendidas</span><strong>${num(m.UnidadesVendidas)}</strong></div>
                        <div class="m-row"><span>Punto equilibrio</span><strong>${num(m.UnidadesPuntoEquilibrio)} u.</strong></div>
                        <div class="m-row"><span>¿Llegó?</span><strong style="color:${llega ? "#34d399" : "#fbbf24"}">${llega ? "Sí" : "No"}</strong></div>
                        <div class="m-row"><span>Resultado</span><strong style="color:${m.EnGanancia ? "#34d399" : "#f87171"}">${money(m.Resultado)}</strong></div>
                    </div>`;
                }).join("");
            }
        }
    }

    async function cargarGastos() {
        const d = await api("/AnalisisDatos/Gastos");
        setText("gastosTotal", money(d.Total));
        setText("gastosCant", num(d.Cantidad));

        makeChart("gastosCat", "chartGastosCat", {
            type: "doughnut",
            data: {
                labels: (d.PorCategoria || []).map(x => x.Categoria),
                datasets: [{ data: (d.PorCategoria || []).map(x => x.Importe), backgroundColor: PALETTE, borderWidth: 0 }]
            },
            options: { ...baseOptions({ legend: true, noScales: true }), cutout: "62%" }
        });

        makeChart("gastosSuc", "chartGastosSuc", {
            type: "bar",
            data: {
                labels: (d.PorSucursal || []).map(x => x.Sucursal),
                datasets: [{ data: (d.PorSucursal || []).map(x => x.Importe), backgroundColor: "#fb7185", borderRadius: 6, maxBarThickness: 28 }]
            },
            options: { ...baseOptions(), plugins: { ...baseOptions().plugins, legend: { display: false } } }
        });

        renderRank("rankGastosCat", d.PorCategoria || [], x => ({
            name: x.Categoria,
            sub: `${x.Cantidad} movimientos`,
            value: x.Importe,
            valueText: moneyDec(x.Importe)
        }));
    }

    async function cargarProduccion() {
        const d = await api("/AnalisisDatos/Produccion");
        setText("prodAProducir", num(d.CantidadAProducir));
        setText("prodProducidas", num(d.CantidadProducida));
        setText("prodFinal", num(d.CantidadFinalReal));
        setText("prodPerdidas", num(d.PerdidasTotales));

        const prods = (d.PorProducto || []).slice(0, 8);
        makeChart("prodProd", "chartProdProducto", {
            type: "bar",
            data: {
                labels: prods.map(x => x.Producto),
                datasets: [
                    { label: "Fabricadas", data: prods.map(x => x.CantidadFabricada), backgroundColor: "#38bdf8", borderRadius: 6, maxBarThickness: 22 },
                    { label: "Pérdidas", data: prods.map(x => x.CantidadPerdida), backgroundColor: "#f87171", borderRadius: 6, maxBarThickness: 22 }
                ]
            },
            options: { ...baseOptions({ legend: true }) }
        });

        makeChart("prodTaller", "chartProdTaller", {
            type: "bar",
            data: {
                labels: (d.PorTaller || []).map(x => x.Taller),
                datasets: [{
                    label: "% Productividad",
                    data: (d.PorTaller || []).map(x => x.ProductividadPorcentaje),
                    backgroundColor: "#2dd4bf",
                    borderRadius: 6,
                    maxBarThickness: 28
                }]
            },
            options: {
                ...baseOptions({ legend: false }),
                scales: {
                    ...baseOptions().scales,
                    y: { ...baseOptions().scales.y, max: 120 }
                }
            }
        });

        const porProd = [...(d.PorProducto || [])];
        renderRank("rankProdProducto", porProd.slice(0, 10), x => ({
            name: x.Producto,
            sub: `Pérdida ${num(x.CantidadPerdida)} (${num(x.PorcentajePerdida)}%)`,
            value: x.CantidadFabricada,
            valueText: `${num(x.CantidadFabricada)} fab.`
        }));

        const porPerdida = [...porProd].sort((a, b) => b.CantidadPerdida - a.CantidadPerdida).slice(0, 10);
        renderRank("rankProdPerdidas", porPerdida, x => ({
            name: x.Producto,
            sub: `${num(x.PorcentajePerdida)}% sobre fabricado`,
            value: x.CantidadPerdida,
            valueText: `${num(x.CantidadPerdida)} u.`
        }));

        renderRank("rankProdTaller", [...(d.PorTaller || [])].sort((a, b) => b.ProductividadPorcentaje - a.ProductividadPorcentaje), x => ({
            name: x.Taller,
            sub: `${num(x.CantidadProducida)} / ${num(x.CantidadProducir)} · ${x.CantidadEtapas} etapas · Dif. ${num(x.Diferencias)}`,
            value: x.ProductividadPorcentaje,
            valueText: `${num(x.ProductividadPorcentaje)}%`
        }));
    }

    async function cargarTodo() {
        const btn = qs("btnAplicar");
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Cargando';
        }
        try {
            await Promise.all([
                cargarVentas(),
                cargarInventario(),
                cargarFinanciero(),
                cargarGastos(),
                cargarProduccion()
            ]);
        } catch (e) {
            console.error(e);
            if (typeof errorModal === "function") errorModal("Error al cargar el análisis de datos");
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fa fa-refresh"></i> Actualizar';
            }
        }
    }

    function syncFiltroTipoVentaVisible(tabId) {
        const sel = qs("fltTipoVenta");
        if (!sel) return;
        // Tipo de venta solo tiene sentido en reportes de ventas / financiero
        const aplica = tabId === "tabVentas" || tabId === "tabFinanciero";
        sel.style.display = aplica ? "" : "none";
        if (!aplica && sel.value) {
            // no limpiamos el valor: al volver a Ventas sigue el filtro elegido
        }
    }

    function initTabs() {
        document.querySelectorAll(".ax-tab").forEach(tab => {
            tab.addEventListener("click", () => {
                document.querySelectorAll(".ax-tab").forEach(t => t.classList.remove("active"));
                document.querySelectorAll(".ax-panel").forEach(p => p.classList.remove("active"));
                tab.classList.add("active");
                const panel = qs(tab.dataset.tab);
                if (panel) panel.classList.add("active");
                syncFiltroTipoVentaVisible(tab.dataset.tab);
            });
        });
        syncFiltroTipoVentaVisible("tabVentas");
    }

    function initPeriodos() {
        document.querySelectorAll("#axPeriodos .ax-chip").forEach(chip => {
            chip.addEventListener("click", async () => {
                document.querySelectorAll("#axPeriodos .ax-chip").forEach(c => c.classList.remove("active"));
                chip.classList.add("active");
                aplicarPeriodo(chip.dataset.periodo);
                if (chip.dataset.periodo !== "custom") await cargarTodo();
            });
        });
    }

    document.addEventListener("DOMContentLoaded", async () => {
        if (typeof Permisos !== "undefined") {
            Permisos.init();
            if (!Permisos.puede("AnalisisDatos", "Ver") && !Permisos.esRolAdministrador()) {
                if (typeof errorModal === "function") errorModal("No tenés permiso para ver Análisis de datos");
                return;
            }
        }

        initTabs();
        initPeriodos();
        aplicarPeriodo("3m");
        await cargarSucursales();
        await cargarTodo();

        qs("btnAplicar").addEventListener("click", cargarTodo);
        ["fltSucursal", "fltTipoVenta", "fltDiasSinMov"].forEach(id => {
            qs(id)?.addEventListener("change", cargarTodo);
        });
    });
})();
