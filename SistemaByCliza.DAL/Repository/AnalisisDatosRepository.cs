using Microsoft.EntityFrameworkCore;
using SistemaByCliza.DAL.DataContext;
using SistemaByCliza.Models.Analisis;

namespace SistemaByCliza.DAL.Repository;

public class AnalisisDatosRepository : IAnalisisDatosRepository
{
    private readonly SistemaByClizaContext _db;

    public AnalisisDatosRepository(SistemaByClizaContext db)
    {
        _db = db;
    }

    private static string TipoVentaLabel(string? tipoVenta)
    {
        return string.Equals(tipoVenta, "Online", StringComparison.OrdinalIgnoreCase)
            ? "Online"
            : "Físico";
    }

    private static string NormalizarTipoVentaFiltro(string? tipo)
    {
        if (string.IsNullOrWhiteSpace(tipo)) return "";
        return string.Equals(tipo.Trim(), "Online", StringComparison.OrdinalIgnoreCase) ? "Online" : "Fisico";
    }

    private IQueryable<Models.Venta> VentasBase(AnalisisFiltro f)
    {
        var q = _db.Ventas
            .AsNoTracking()
            .Include(v => v.IdSucursalNavigation)
            .Include(v => v.IdClienteNavigation).ThenInclude(c => c.IdProvinciaNavigation)
            .Include(v => v.IdUsuarioRegistraNavigation)
            // Incluye PENDIENTE y FINALIZADA (las ventas cargadas cuentan para el análisis)
            .Where(v => v.Estado == null
                || v.Estado == "FINALIZADA"
                || v.Estado == "PENDIENTE");

        if (f.FechaDesde.HasValue)
            q = q.Where(v => v.Fecha >= f.FechaDesde.Value.Date);
        if (f.FechaHasta.HasValue)
            q = q.Where(v => v.Fecha <= f.FechaHasta.Value.Date);
        if (f.IdSucursal > 0)
            q = q.Where(v => v.IdSucursal == f.IdSucursal);
        if (!string.IsNullOrWhiteSpace(f.TipoVenta))
        {
            var tv = NormalizarTipoVentaFiltro(f.TipoVenta);
            if (tv == "Online")
                q = q.Where(v => v.TipoVenta == "Online");
            else
                q = q.Where(v => v.TipoVenta == null || v.TipoVenta == "" || v.TipoVenta == "Fisico");
        }

        return q;
    }

    public async Task<AnalisisVentasResumen> ObtenerReporteVentas(AnalisisFiltro filtro)
    {
        var ventas = await VentasBase(filtro).ToListAsync();
        var idsVentas = ventas.Select(v => v.Id).ToList();

        var lineas = await _db.VentasProductos
            .AsNoTracking()
            .Include(vp => vp.IdProductoNavigation)
            .Include(vp => vp.IdVentaNavigation).ThenInclude(v => v.IdSucursalNavigation)
            .Where(vp => idsVentas.Contains(vp.IdVenta))
            .ToListAsync();

        var variantes = await _db.VentasProductosVariantes
            .AsNoTracking()
            .Include(vv => vv.IdProductoVarianteNavigation)
                .ThenInclude(pv => pv.IdColorNavigation)
                .ThenInclude(pc => pc.IdColorNavigation)
            .Include(vv => vv.IdProductoVarianteNavigation)
                .ThenInclude(pv => pv.IdTalleNavigation)
                .ThenInclude(pt => pt.IdTalleNavigation)
            .Include(vv => vv.IdProductoNavigation)
            .Include(vv => vv.IdVentaProductoNavigation)
            .Where(vv => idsVentas.Contains(vv.IdVentaProductoNavigation.IdVenta))
            .ToListAsync();

        var resumen = new AnalisisVentasResumen
        {
            CantidadVentas = ventas.Count,
            ImporteTotal = ventas.Sum(v => v.ImporteTotal),
            UnidadesVendidas = lineas.Sum(l => l.Cantidad)
        };

        resumen.PorProducto = lineas
            .GroupBy(l => new { l.IdProducto, Nombre = l.IdProductoNavigation.Descripcion })
            .Select(g => new AnalisisItemCantidad
            {
                Clave = g.Key.IdProducto.ToString(),
                Etiqueta = g.Key.Nombre,
                Cantidad = g.Sum(x => x.Cantidad),
                Importe = g.Sum(x => x.Subtotal),
                CantidadVentas = g.Select(x => x.IdVenta).Distinct().Count()
            })
            .OrderByDescending(x => x.Cantidad)
            .ToList();

        resumen.PorTalle = variantes
            .GroupBy(v => v.IdProductoVarianteNavigation?.IdTalleNavigation?.IdTalleNavigation?.Nombre ?? "S/D")
            .Select(g => new AnalisisItemCantidad
            {
                Clave = g.Key,
                Etiqueta = g.Key,
                Cantidad = g.Sum(x => x.Cantidad),
                Importe = 0,
                CantidadVentas = g.Select(x => x.IdVentaProductoNavigation.IdVenta).Distinct().Count()
            })
            .OrderByDescending(x => x.Cantidad)
            .ToList();

        resumen.PorColor = variantes
            .GroupBy(v => v.IdProductoVarianteNavigation?.IdColorNavigation?.IdColorNavigation?.Nombre ?? "S/D")
            .Select(g => new AnalisisItemCantidad
            {
                Clave = g.Key,
                Etiqueta = g.Key,
                Cantidad = g.Sum(x => x.Cantidad),
                Importe = 0,
                CantidadVentas = g.Select(x => x.IdVentaProductoNavigation.IdVenta).Distinct().Count()
            })
            .OrderByDescending(x => x.Cantidad)
            .ToList();

        resumen.PorCanal = ventas
            .GroupBy(v => TipoVentaLabel(v.TipoVenta))
            .Select(g => new AnalisisItemCantidad
            {
                Clave = g.Key,
                Etiqueta = g.Key,
                Cantidad = g.Count(),
                Importe = g.Sum(x => x.ImporteTotal),
                CantidadVentas = g.Count()
            })
            .OrderByDescending(x => x.Importe)
            .ToList();

        resumen.PorSucursal = ventas
            .GroupBy(v => new { v.IdSucursal, Nombre = v.IdSucursalNavigation?.Nombre ?? "S/D" })
            .Select(g => new AnalisisItemCantidad
            {
                Clave = g.Key.IdSucursal.ToString(),
                Etiqueta = g.Key.Nombre,
                Cantidad = g.Count(),
                Importe = g.Sum(x => x.ImporteTotal),
                CantidadVentas = g.Count()
            })
            .OrderByDescending(x => x.Importe)
            .ToList();

        resumen.PorVendedor = ventas
            .GroupBy(v => new
            {
                Id = v.IdUsuarioRegistra ?? 0,
                Nombre = v.IdUsuarioRegistraNavigation == null
                    ? "Sin vendedor"
                    : $"{v.IdUsuarioRegistraNavigation.Nombre} {v.IdUsuarioRegistraNavigation.Apellido}".Trim()
            })
            .Select(g => new AnalisisVendedorItem
            {
                IdVendedor = g.Key.Id,
                Vendedor = string.IsNullOrWhiteSpace(g.Key.Nombre) ? "Sin vendedor" : g.Key.Nombre,
                CantidadCierres = g.Count(),
                ImporteTotal = g.Sum(x => x.ImporteTotal),
                TicketPromedio = g.Count() == 0 ? 0 : g.Sum(x => x.ImporteTotal) / g.Count()
            })
            .OrderByDescending(x => x.CantidadCierres)
            .ThenByDescending(x => x.ImporteTotal)
            .ToList();

        resumen.PorProvincia = ventas
            .GroupBy(v => new
            {
                Id = v.IdClienteNavigation?.IdProvincia,
                Nombre = v.IdClienteNavigation?.IdProvinciaNavigation?.Nombre ?? "Sin provincia"
            })
            .Select(g => new AnalisisProvinciaItem
            {
                IdProvincia = g.Key.Id,
                Provincia = g.Key.Nombre,
                CantidadVentas = g.Count(),
                ImporteTotal = g.Sum(x => x.ImporteTotal),
                CantidadClientes = g.Select(x => x.IdCliente).Distinct().Count(),
                ConPresencia = true
            })
            .OrderByDescending(x => x.ImporteTotal)
            .ToList();

        resumen.PorLocalidad = ventas
            .GroupBy(v => new
            {
                Provincia = v.IdClienteNavigation?.IdProvinciaNavigation?.Nombre ?? "Sin provincia",
                Localidad = string.IsNullOrWhiteSpace(v.IdClienteNavigation?.Localidad) ? "Sin localidad" : v.IdClienteNavigation!.Localidad!.Trim()
            })
            .Select(g => new AnalisisProvinciaItem
            {
                Provincia = g.Key.Provincia,
                Localidad = g.Key.Localidad,
                CantidadVentas = g.Count(),
                ImporteTotal = g.Sum(x => x.ImporteTotal),
                CantidadClientes = g.Select(x => x.IdCliente).Distinct().Count(),
                ConPresencia = true
            })
            .OrderByDescending(x => x.ImporteTotal)
            .ToList();

        var provinciasConVenta = resumen.PorProvincia
            .Where(p => p.IdProvincia.HasValue)
            .Select(p => p.IdProvincia!.Value)
            .ToHashSet();

        var todasProvincias = await _db.Provincias.AsNoTracking().OrderBy(p => p.Nombre).ToListAsync();
        resumen.ProvinciasSinPresencia = todasProvincias
            .Where(p => !provinciasConVenta.Contains(p.Id))
            .Select(p => new AnalisisProvinciaItem
            {
                IdProvincia = p.Id,
                Provincia = p.Nombre,
                ConPresencia = false
            })
            .ToList();

        return resumen;
    }

    public async Task<AnalisisInventarioResumen> ObtenerReporteInventario(AnalisisFiltro filtro)
    {
        var hoy = DateTime.Today;
        var diasLimite = filtro.DiasSinMovimiento <= 0 ? 90 : filtro.DiasSinMovimiento;

        var invQuery = _db.Inventarios
            .AsNoTracking()
            .Include(i => i.IdProductoNavigation)
            .Include(i => i.IdSucursalNavigation)
            .Include(i => i.IdProductoVarianteNavigation)
                .ThenInclude(pv => pv.IdColorNavigation)
                .ThenInclude(pc => pc.IdColorNavigation)
            .Include(i => i.IdProductoVarianteNavigation)
                .ThenInclude(pv => pv.IdTalleNavigation)
                .ThenInclude(pt => pt.IdTalleNavigation)
            .Where(i => i.Cantidad > 0);

        if (filtro.IdSucursal > 0)
            invQuery = invQuery.Where(i => i.IdSucursal == filtro.IdSucursal);

        var inventarios = await invQuery.ToListAsync();
        var idsInv = inventarios.Select(i => i.Id).ToList();

        var ultimosMov = await _db.InventarioMovimientos
            .AsNoTracking()
            .Where(m => idsInv.Contains(m.IdInventario))
            .GroupBy(m => m.IdInventario)
            .Select(g => new { IdInventario = g.Key, Fecha = g.Max(x => x.Fecha) })
            .ToDictionaryAsync(x => x.IdInventario, x => (DateTime?)x.Fecha);

        // Ventas del período por variante (para clasificar movimiento)
        var ventasQ = VentasBase(filtro);
        var idsVentas = await ventasQ.Select(v => v.Id).ToListAsync();
        var vendidoPorVariante = await _db.VentasProductosVariantes
            .AsNoTracking()
            .Where(vv => idsVentas.Contains(vv.IdVentaProductoNavigation.IdVenta))
            .GroupBy(vv => vv.IdProductoVariante)
            .Select(g => new { IdProductoVariante = g.Key, Cant = g.Sum(x => x.Cantidad) })
            .ToDictionaryAsync(x => x.IdProductoVariante, x => x.Cant);

        // Costo estimado por producto: promedio de costos de taller por unidad fabricada
        var costos = await EstimarCostoUnitarioPorProducto();

        var items = inventarios.Select(i =>
        {
            var ultimo = ultimosMov.TryGetValue(i.Id, out var f) ? f : null;
            var dias = ultimo.HasValue ? (int)(hoy - ultimo.Value.Date).TotalDays : 9999;
            var vendido = vendidoPorVariante.TryGetValue(i.IdProductoVariante, out var c) ? c : 0m;
            var precioVenta = i.IdProductoNavigation.PrecioUnitario;
            var costo = costos.TryGetValue(i.IdProducto, out var cos) ? cos : 0m;

            string clasif;
            if (dias >= diasLimite)
                clasif = "Sin movimiento";
            else if (vendido < 5)
                clasif = "Poco movimiento";
            else
                clasif = "Alto movimiento";

            return new AnalisisInventarioItem
            {
                IdProducto = i.IdProducto,
                IdProductoVariante = i.IdProductoVariante,
                Producto = i.IdProductoNavigation.Descripcion,
                Talle = i.IdProductoVarianteNavigation?.IdTalleNavigation?.IdTalleNavigation?.Nombre ?? "S/D",
                Color = i.IdProductoVarianteNavigation?.IdColorNavigation?.IdColorNavigation?.Nombre ?? "S/D",
                Sucursal = i.IdSucursalNavigation?.Nombre ?? "",
                Stock = i.Cantidad,
                CantidadVendida = vendido,
                UltimoMovimiento = ultimo,
                DiasSinMovimiento = dias,
                ValorInversion = Math.Round(i.Cantidad * costo, 2),
                ValorVenta = Math.Round(i.Cantidad * precioVenta, 2),
                Clasificacion = clasif
            };
        })
        .OrderByDescending(x => x.DiasSinMovimiento)
        .ThenByDescending(x => x.Stock)
        .ToList();

        var parado = items.Where(x => x.Clasificacion == "Sin movimiento").ToList();
        return new AnalisisInventarioResumen
        {
            StockTotalUnidades = items.Sum(x => x.Stock),
            ValorInversionTotal = items.Sum(x => x.ValorInversion),
            ValorVentaTotal = items.Sum(x => x.ValorVenta),
            ValorInversionParado = parado.Sum(x => x.ValorInversion),
            ValorVentaParado = parado.Sum(x => x.ValorVenta),
            ItemsSinMovimiento = parado.Count,
            ItemsPocoMovimiento = items.Count(x => x.Clasificacion == "Poco movimiento"),
            ItemsAltoMovimiento = items.Count(x => x.Clasificacion == "Alto movimiento"),
            Items = items
        };
    }

    private async Task<Dictionary<int, decimal>> EstimarCostoUnitarioPorProducto()
    {
        // Costo taller por etapa / unidades producidas en la OC, prorrateado a productos de la OC
        var etapas = await _db.OrdenesCorteEtapas
            .AsNoTracking()
            .Where(e => e.ImporteTotal != null && e.ImporteTotal > 0)
            .Select(e => new { e.IdCorte, Importe = e.ImporteTotal!.Value })
            .ToListAsync();

        var costoPorCorte = etapas
            .GroupBy(e => e.IdCorte)
            .ToDictionary(g => g.Key, g => g.Sum(x => x.Importe));

        var productosOc = await _db.OrdenesCorteProductos
            .AsNoTracking()
            .Select(p => new { p.IdOrdenCorte, p.IdProducto, p.Cantidad })
            .ToListAsync();

        var acum = new Dictionary<int, (decimal costo, decimal unidades)>();
        foreach (var grupo in productosOc.GroupBy(p => p.IdOrdenCorte))
        {
            if (!costoPorCorte.TryGetValue(grupo.Key, out var costoCorte) || costoCorte <= 0)
                continue;

            var totalUnidades = grupo.Sum(x => (decimal)x.Cantidad);
            if (totalUnidades <= 0) continue;

            foreach (var p in grupo)
            {
                var share = ((decimal)p.Cantidad / totalUnidades) * costoCorte;
                var unit = p.Cantidad > 0 ? share / p.Cantidad : 0;
                if (!acum.TryGetValue(p.IdProducto, out var cur))
                    acum[p.IdProducto] = (share, p.Cantidad);
                else
                    acum[p.IdProducto] = (cur.costo + share, cur.unidades + p.Cantidad);
            }
        }

        return acum.ToDictionary(
            kv => kv.Key,
            kv => kv.Value.unidades > 0 ? Math.Round(kv.Value.costo / kv.Value.unidades, 2) : 0m);
    }

    public async Task<AnalisisFinancieroResumen> ObtenerReporteFinanciero(AnalisisFiltro filtro)
    {
        var ventas = await VentasBase(filtro).ToListAsync();
        var idsVentas = ventas.Select(v => v.Id).ToList();

        var lineas = await _db.VentasProductos
            .AsNoTracking()
            .Include(vp => vp.IdProductoNavigation)
            .Where(vp => idsVentas.Contains(vp.IdVenta))
            .ToListAsync();

        var gastosQ = _db.Gastos.AsNoTracking().Include(g => g.IdSucursalNavigation).AsQueryable();
        if (filtro.FechaDesde.HasValue)
            gastosQ = gastosQ.Where(g => g.Fecha >= filtro.FechaDesde.Value.Date);
        if (filtro.FechaHasta.HasValue)
            gastosQ = gastosQ.Where(g => g.Fecha <= filtro.FechaHasta.Value.Date);
        if (filtro.IdSucursal > 0)
            gastosQ = gastosQ.Where(g => g.IdSucursal == filtro.IdSucursal);

        var gastos = await gastosQ.ToListAsync();
        var costos = await EstimarCostoUnitarioPorProducto();

        var porPrenda = lineas
            .GroupBy(l => new { l.IdProducto, Nombre = l.IdProductoNavigation.Descripcion })
            .Select(g =>
            {
                var cant = g.Sum(x => x.Cantidad);
                var precioProm = cant > 0 ? g.Sum(x => x.PrecioUnitFinal * x.Cantidad) / cant : 0;
                var costo = costos.TryGetValue(g.Key.IdProducto, out var c) ? c : 0m;
                var ganUnit = precioProm - costo;
                return new AnalisisGananciaPrendaItem
                {
                    IdProducto = g.Key.IdProducto,
                    Producto = g.Key.Nombre,
                    CantidadVendida = cant,
                    PrecioVentaPromedio = Math.Round(precioProm, 2),
                    CostoEstimadoUnitario = Math.Round(costo, 2),
                    GananciaUnitaria = Math.Round(ganUnit, 2),
                    GananciaTotal = Math.Round(ganUnit * cant, 2),
                    MargenPorcentaje = precioProm > 0 ? Math.Round(ganUnit / precioProm * 100, 1) : 0
                };
            })
            .OrderByDescending(x => x.GananciaTotal)
            .ToList();

        var unidades = lineas.Sum(l => l.Cantidad);
        var ventasTotal = ventas.Sum(v => v.ImporteTotal);
        var gastosTotal = gastos.Sum(g => g.Importe);
        var costoProd = lineas.Sum(l =>
        {
            var c = costos.TryGetValue(l.IdProducto, out var cos) ? cos : 0m;
            return c * l.Cantidad;
        });
        var margenUnit = unidades > 0 ? (ventasTotal - costoProd) / unidades : 0;

        // Producción costos del período (importe etapas)
        var etapasQ = _db.OrdenesCorteEtapas.AsNoTracking().AsQueryable();
        if (filtro.FechaDesde.HasValue)
            etapasQ = etapasQ.Where(e => e.FechaEntrada >= filtro.FechaDesde.Value.Date);
        if (filtro.FechaHasta.HasValue)
            etapasQ = etapasQ.Where(e => e.FechaEntrada <= filtro.FechaHasta.Value.Date);
        var costoProduccionPeriodo = await etapasQ.SumAsync(e => e.ImporteTotal ?? 0);

        var porMesDict = new Dictionary<(int y, int m), AnalisisPuntoEquilibrioMes>();

        foreach (var v in ventas)
        {
            var key = (v.Fecha.Year, v.Fecha.Month);
            if (!porMesDict.TryGetValue(key, out var item))
            {
                item = new AnalisisPuntoEquilibrioMes
                {
                    Anio = key.Item1,
                    Mes = key.Item2,
                    Periodo = $"{key.Item1}-{key.Item2:00}"
                };
                porMesDict[key] = item;
            }
            item.VentasImporte += v.ImporteTotal;
        }

        foreach (var g in gastos)
        {
            var key = (g.Fecha.Year, g.Fecha.Month);
            if (!porMesDict.TryGetValue(key, out var item))
            {
                item = new AnalisisPuntoEquilibrioMes
                {
                    Anio = key.Item1,
                    Mes = key.Item2,
                    Periodo = $"{key.Item1}-{key.Item2:00}"
                };
                porMesDict[key] = item;
            }
            item.GastosImporte += g.Importe;
        }

        foreach (var l in lineas)
        {
            var venta = ventas.FirstOrDefault(v => v.Id == l.IdVenta);
            if (venta == null) continue;
            var key = (venta.Fecha.Year, venta.Fecha.Month);
            if (!porMesDict.TryGetValue(key, out var item)) continue;
            item.UnidadesVendidas += l.Cantidad;
            var c = costos.TryGetValue(l.IdProducto, out var cos) ? cos : 0m;
            item.CostoProduccion += c * l.Cantidad;
        }

        foreach (var item in porMesDict.Values)
        {
            item.MargenUnitarioPromedio = item.UnidadesVendidas > 0
                ? Math.Round((item.VentasImporte - item.CostoProduccion) / item.UnidadesVendidas, 2)
                : Math.Round(margenUnit, 2);

            var margen = item.MargenUnitarioPromedio > 0 ? item.MargenUnitarioPromedio : margenUnit;
            item.UnidadesPuntoEquilibrio = margen > 0
                ? Math.Ceiling(item.GastosImporte / margen)
                : 0;
            item.Resultado = Math.Round(item.VentasImporte - item.GastosImporte - item.CostoProduccion, 2);
            item.EnGanancia = item.Resultado > 0;
            item.VentasImporte = Math.Round(item.VentasImporte, 2);
            item.GastosImporte = Math.Round(item.GastosImporte, 2);
            item.CostoProduccion = Math.Round(item.CostoProduccion, 2);
        }

        return new AnalisisFinancieroResumen
        {
            VentasTotal = Math.Round(ventasTotal, 2),
            GastosTotal = Math.Round(gastosTotal, 2),
            CostoProduccionTotal = Math.Round(costoProd > 0 ? costoProd : costoProduccionPeriodo, 2),
            ResultadoTotal = Math.Round(ventasTotal - gastosTotal - (costoProd > 0 ? costoProd : costoProduccionPeriodo), 2),
            UnidadesVendidas = unidades,
            MargenUnitarioPromedio = Math.Round(margenUnit, 2),
            PorPrenda = porPrenda,
            PorMes = porMesDict.Values.OrderBy(x => x.Anio).ThenBy(x => x.Mes).ToList()
        };
    }

    public async Task<AnalisisGastosResumen> ObtenerReporteGastos(AnalisisFiltro filtro)
    {
        var q = _db.Gastos
            .AsNoTracking()
            .Include(g => g.IdCategoriaNavigation)
            .Include(g => g.IdSucursalNavigation)
            .AsQueryable();

        if (filtro.FechaDesde.HasValue)
            q = q.Where(g => g.Fecha >= filtro.FechaDesde.Value.Date);
        if (filtro.FechaHasta.HasValue)
            q = q.Where(g => g.Fecha <= filtro.FechaHasta.Value.Date);
        if (filtro.IdSucursal > 0)
            q = q.Where(g => g.IdSucursal == filtro.IdSucursal);

        var gastos = await q.OrderByDescending(g => g.Fecha).ToListAsync();

        return new AnalisisGastosResumen
        {
            Total = gastos.Sum(g => g.Importe),
            Cantidad = gastos.Count,
            PorCategoria = gastos
                .GroupBy(g => g.IdCategoriaNavigation?.Nombre ?? "Sin categoría")
                .Select(g => new AnalisisGastoItem
                {
                    Categoria = g.Key,
                    Importe = g.Sum(x => x.Importe),
                    Cantidad = g.Count()
                })
                .OrderByDescending(x => x.Importe)
                .ToList(),
            PorSucursal = gastos
                .GroupBy(g => g.IdSucursalNavigation?.Nombre ?? "S/D")
                .Select(g => new AnalisisGastoItem
                {
                    Sucursal = g.Key,
                    Importe = g.Sum(x => x.Importe),
                    Cantidad = g.Count()
                })
                .OrderByDescending(x => x.Importe)
                .ToList(),
            Detalle = gastos.Select(g => new AnalisisGastoItem
            {
                Fecha = g.Fecha,
                Concepto = g.Concepto,
                Categoria = g.IdCategoriaNavigation?.Nombre ?? "",
                Sucursal = g.IdSucursalNavigation?.Nombre ?? "",
                Importe = g.Importe,
                Cantidad = 1
            }).ToList()
        };
    }

    public async Task<AnalisisProduccionResumen> ObtenerReporteProduccion(AnalisisFiltro filtro)
    {
        var ocQ = _db.OrdenesCortes.AsNoTracking().AsQueryable();
        if (filtro.FechaDesde.HasValue)
            ocQ = ocQ.Where(o => o.FechaInicio >= filtro.FechaDesde.Value.Date);
        if (filtro.FechaHasta.HasValue)
            ocQ = ocQ.Where(o => o.FechaInicio <= filtro.FechaHasta.Value.Date);

        var ordenes = await ocQ.ToListAsync();
        var idsOc = ordenes.Select(o => o.Id).ToList();

        var productosConNombre = await (
            from p in _db.OrdenesCorteProductos.AsNoTracking()
            join prod in _db.Productos.AsNoTracking() on p.IdProducto equals prod.Id
            where idsOc.Contains(p.IdOrdenCorte)
            select new { p.IdProducto, Producto = prod.Descripcion, p.Cantidad, p.IdOrdenCorte }
        ).ToListAsync();

        var perdidasProducto = new Dictionary<int, decimal>();

        if (idsOc.Count > 0)
        {
            var idsCsv = string.Join(",", idsOc);
            try
            {
                var conn = _db.Database.GetDbConnection();
                if (conn.State != System.Data.ConnectionState.Open)
                    await conn.OpenAsync();

                await using var cmd = conn.CreateCommand();
                cmd.CommandText = $@"
                    SELECT IdProducto, SUM(Cantidad) AS Cantidad
                    FROM Ordenes_Corte_Perdidas
                    WHERE IdCorte IN ({idsCsv})
                    GROUP BY IdProducto";

                await using var reader = await cmd.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                {
                    var idProd = reader.GetInt32(0);
                    var cant = reader.GetDecimal(1);
                    perdidasProducto[idProd] = cant;
                }
            }
            catch
            {
                perdidasProducto.Clear();
            }
        }

        if (perdidasProducto.Count == 0)
        {
            foreach (var o in ordenes)
            {
                var perd = o.DiferenciaFinalReal ?? o.DiferenciaCorte ?? 0;
                if (perd <= 0) continue;
                var prods = productosConNombre.Where(p => p.IdOrdenCorte == o.Id).ToList();
                var total = prods.Sum(p => (decimal)p.Cantidad);
                if (total <= 0) continue;
                foreach (var p in prods)
                {
                    var share = perd * ((decimal)p.Cantidad / total);
                    if (!perdidasProducto.ContainsKey(p.IdProducto))
                        perdidasProducto[p.IdProducto] = 0;
                    perdidasProducto[p.IdProducto] += share;
                }
            }
        }

        var porProducto = productosConNombre
            .GroupBy(p => new { p.IdProducto, p.Producto })
            .Select(g =>
            {
                var fab = g.Sum(x => (decimal)x.Cantidad);
                var perd = perdidasProducto.TryGetValue(g.Key.IdProducto, out var pe) ? pe : 0m;
                return new AnalisisProduccionProductoItem
                {
                    IdProducto = g.Key.IdProducto,
                    Producto = g.Key.Producto,
                    CantidadFabricada = fab,
                    CantidadPerdida = Math.Round(perd, 2),
                    PorcentajePerdida = fab > 0 ? Math.Round(perd / fab * 100, 1) : 0
                };
            })
            .OrderByDescending(x => x.CantidadFabricada)
            .ToList();

        var etapas = await _db.OrdenesCorteEtapas
            .AsNoTracking()
            .Include(e => e.IdTallerNavigation)
            .Where(e => idsOc.Contains(e.IdCorte))
            .ToListAsync();

        var porTaller = etapas
            .GroupBy(e => new { e.IdTaller, Nombre = e.IdTallerNavigation?.Nombre ?? "S/D" })
            .Select(g =>
            {
                var producir = g.Sum(x => x.CantidadProducir);
                var producidas = g.Sum(x => x.CantidadProducidas);
                return new AnalisisTallerProductividadItem
                {
                    IdTaller = g.Key.IdTaller,
                    Taller = g.Key.Nombre,
                    CantidadEtapas = g.Count(),
                    CantidadProducir = producir,
                    CantidadProducida = producidas,
                    Diferencias = g.Sum(x => x.Diferencias),
                    ProductividadPorcentaje = producir > 0 ? Math.Round(producidas / producir * 100, 1) : 0,
                    ImporteTotal = g.Sum(x => x.ImporteTotal ?? 0)
                };
            })
            .OrderByDescending(x => x.CantidadProducida)
            .ToList();

        return new AnalisisProduccionResumen
        {
            CantidadAProducir = ordenes.Sum(o => o.CantidadProducir),
            CantidadProducida = ordenes.Sum(o => o.CantidadProducidas ?? 0),
            CantidadFinalReal = ordenes.Sum(o => o.CantidadFinalReal ?? 0),
            PerdidasTotales = Math.Round(perdidasProducto.Values.Sum(), 2),
            PorProducto = porProducto,
            PorTaller = porTaller
        };
    }

}
