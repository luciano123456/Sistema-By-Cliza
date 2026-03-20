using Microsoft.EntityFrameworkCore;
using SistemaByCliza.DAL.DataContext;
using SistemaByCliza.Models;
using System.Linq;

namespace SistemaByCliza.DAL.Repository
{
    public class OrdenesCorteRepository : IOrdenesCorteRepository
    {
        private readonly SistemaByClizaContext _db;
        public OrdenesCorteRepository(SistemaByClizaContext db) { _db = db; }

        public async Task<List<OrdenesCorte>> Listar(DateTime? desde, DateTime? hasta, int? idEstado, string? texto)
        {
            var q = _db.OrdenesCortes
                .Include(o => o.IdEstadoNavigation)
                .Include(o => o.OrdenesCorteInsumos).ThenInclude(i => i.IdInsumoNavigation)
                .Include(o => o.OrdenesCorteProductos)
                    .ThenInclude(p => p.OrdenCorteProductosVariantes)
                        .ThenInclude(v => v.IdProductoNavigation) // descripción de producto por variante
                .AsNoTracking()
                .AsQueryable();

            if (desde.HasValue) q = q.Where(x => x.FechaInicio >= desde.Value.Date);
            if (hasta.HasValue) q = q.Where(x => x.FechaInicio <= hasta.Value.Date.AddDays(1).AddTicks(-1));

            if (idEstado.HasValue && idEstado > 0) q = q.Where(x => x.IdEstado == idEstado.Value);

            if (!string.IsNullOrWhiteSpace(texto))
            {
                var t = texto.Trim();
                q = q.Where(x =>
                    EF.Functions.Like(x.IdEstadoNavigation.Nombre, $"%{t}%") ||
                    x.OrdenesCorteProductos.Any(p =>
                        p.OrdenCorteProductosVariantes.Any(v =>
                            EF.Functions.Like(v.IdProductoNavigation.Descripcion, $"%{t}%"))));
            }

            return await q.OrderByDescending(x => x.FechaInicio)
                          .ThenByDescending(x => x.Id)
                          .ToListAsync();
        }

        public Task<OrdenesCorte?> Obtener(int id)
        {
            return _db.OrdenesCortes
                .Include(o => o.IdEstadoNavigation)
                .Include(o => o.OrdenesCorteInsumos).ThenInclude(i => i.IdInsumoNavigation)

                // Producto (para Descripcion)
                .Include(o => o.OrdenesCorteProductos)
                    .ThenInclude(p => p.OrdenCorteProductosVariantes)
                        .ThenInclude(v => v.IdProductoNavigation)

                // Variante -> Color -> Catálogo
                .Include(o => o.OrdenesCorteProductos)
                    .ThenInclude(p => p.OrdenCorteProductosVariantes)
                        .ThenInclude(v => v.IdProductoVarianteNavigation)
                            .ThenInclude(pv => pv.IdColorNavigation)
                                .ThenInclude(pc => pc.IdColorNavigation)

                // Variante -> Talle -> Catálogo
                .Include(o => o.OrdenesCorteProductos)
                    .ThenInclude(p => p.OrdenCorteProductosVariantes)
                        .ThenInclude(v => v.IdProductoVarianteNavigation)
                            .ThenInclude(pv => pv.IdTalleNavigation)
                                .ThenInclude(pt => pt.IdTalleNavigation)

                .Include(o => o.OrdenesCorteEtapas).ThenInclude(e => e.IdTallerNavigation)
                .Include(o => o.OrdenesCorteEtapas).ThenInclude(e => e.IdEstadoNavigation)
                .AsNoTracking()
                .FirstOrDefaultAsync(o => o.Id == id);
        }




        // PRODUCTOS + VARIANTES (con nombres de producto, color y talle)
        public Task<List<OrdenesCorteProducto>> ObtenerProductosPorOrden(int idCorte)
        {
            return _db.OrdenesCorteProductos
                .Where(p => p.IdOrdenCorte == idCorte)
                // Variantes -> Producto (para Descripcion del producto)
                .Include(p => p.OrdenCorteProductosVariantes)
                    .ThenInclude(v => v.IdProductoNavigation)
                // Variantes -> ProductoVariante -> Color -> Color (catálogo)
                .Include(p => p.OrdenCorteProductosVariantes)
                    .ThenInclude(v => v.IdProductoVarianteNavigation)
                        .ThenInclude(pv => pv.IdColorNavigation)
                            .ThenInclude(pc => pc.IdColorNavigation)
                // Variantes -> ProductoVariante -> Talle -> Talle (catálogo)
                .Include(p => p.OrdenCorteProductosVariantes)
                    .ThenInclude(v => v.IdProductoVarianteNavigation)
                        .ThenInclude(pv => pv.IdTalleNavigation)
                            .ThenInclude(pt => pt.IdTalleNavigation)
                .AsNoTracking()
                .ToListAsync();
        }

        // INSUMOS (con descripción)
        public Task<List<OrdenesCorteInsumo>> ObtenerInsumosPorOrden(int idCorte)
        {
            return _db.OrdenesCorteInsumos
                .Where(i => i.IdCorte == idCorte)
                .Include(i => i.IdInsumoNavigation)
                .AsNoTracking()
                .ToListAsync();
        }

        public Task<List<OrdenesCorteEtapa>> ObtenerEtapasPorOrden(int idCorte)
        {
            return _db.OrdenesCorteEtapas
                .Include(e => e.IdTallerNavigation)
                .Include(e => e.IdEstadoNavigation)
                .AsNoTracking()
                .Where(e => e.IdCorte == idCorte)
                .OrderByDescending(e => e.FechaEntrada)
                .ToListAsync();
        }


        public async Task<bool> InsertarConDetalles(
            OrdenesCorte orden,
            IEnumerable<OrdenesCorteProducto> productos,
            IEnumerable<OrdenesCorteInsumo> insumos,
            IEnumerable<OrdenesCorteEtapa> etapas)
        {
            if (orden == null) throw new ArgumentNullException(nameof(orden));
            _db.ChangeTracker.Clear();

            using var trx = await _db.Database.BeginTransactionAsync();
            try
            {
                // 1) Cabecera
                orden.Id = 0;
                _db.OrdenesCortes.Add(orden);
                await _db.SaveChangesAsync(); // orden.Id

                // Optimización opcional
                var prev = _db.ChangeTracker.AutoDetectChangesEnabled;
                _db.ChangeTracker.AutoDetectChangesEnabled = false;
                try
                {
                    // 2) Productos + Variantes
                    foreach (var p in (productos ?? Enumerable.Empty<OrdenesCorteProducto>()))
                    {
                        var variantes = p.OrdenCorteProductosVariantes?.ToList() ?? new List<OrdenCorteProductosVariante>();
                        p.OrdenCorteProductosVariantes = null;

                        p.Id = 0;
                        p.IdOrdenCorte = orden.Id;
                        _db.OrdenesCorteProductos.Add(p);
                        await _db.SaveChangesAsync(); // p.Id

                        if (variantes.Count > 0)
                        {
                            foreach (var v in variantes)
                            {
                                v.Id = 0;
                                v.IdOrdenCorteProducto = p.Id;
                            }
                            _db.OrdenCorteProductosVariantes.AddRange(variantes);
                            await _db.SaveChangesAsync();
                        }
                    }

                    // 3) Insumos
                    var insList = (insumos ?? Enumerable.Empty<OrdenesCorteInsumo>()).ToList();
                    if (insList.Any())
                    {
                        foreach (var i in insList)
                        {
                            i.Id = 0;
                            i.IdCorte = orden.Id;
                        }
                        _db.OrdenesCorteInsumos.AddRange(insList);
                        await _db.SaveChangesAsync();
                    }

                    // 4) Etapas
                    var etList = (etapas ?? Enumerable.Empty<OrdenesCorteEtapa>()).ToList();
                    if (etList.Any())
                    {
                        foreach (var e in etList)
                        {
                            e.Id = 0;
                            e.IdCorte = orden.Id;
                            e.DiasReales = e.FechaSalidaReal.HasValue
                                ? (int)(e.FechaSalidaReal.Value.Date - e.FechaEntrada.Date).TotalDays
                                : null;
                        }
                        _db.OrdenesCorteEtapas.AddRange(etList);
                        await _db.SaveChangesAsync();
                    }
                }
                finally
                {
                    _db.ChangeTracker.AutoDetectChangesEnabled = prev;
                }

                await trx.CommitAsync();
                return true;
            }
            catch
            {
                await trx.RollbackAsync();
                throw;
            }
        }

        public async Task<bool> ActualizarConDetalles(
      OrdenesCorte orden,
      IEnumerable<OrdenesCorteProducto> productos,
      IEnumerable<OrdenesCorteInsumo> insumos,
      IEnumerable<OrdenesCorteEtapa> etapas)
        {
            using var trx = await _db.Database.BeginTransactionAsync();
            try
            {
                // Cargar entidad con hijos
                var ent = await _db.OrdenesCortes
                    .Include(o => o.OrdenesCorteProductos)
                        .ThenInclude(p => p.OrdenCorteProductosVariantes)
                    .Include(o => o.OrdenesCorteInsumos)
                    .Include(o => o.OrdenesCorteEtapas)
                    .FirstOrDefaultAsync(o => o.Id == orden.Id);

                if (ent is null) return false;

                // -------- Cabecera --------
                ent.IdPersonal = orden.IdPersonal;
                ent.IdEstado = orden.IdEstado;
                ent.FechaInicio = orden.FechaInicio;
                ent.FechaFinalizacion = orden.FechaFinalizacion;
                ent.CantidadProducir = orden.CantidadProducir;
                ent.CantidadProducidas = orden.CantidadProducidas;
                ent.DiferenciaCorte = orden.DiferenciaCorte;
                ent.CantidadFinalReal = orden.CantidadFinalReal;
                ent.DiferenciaFinalReal = orden.DiferenciaFinalReal;
                ent.LargoTizada = orden.LargoTizada;
                ent.AnchoTizada = orden.AnchoTizada;
                ent.CantidadCapas = orden.CantidadCapas;
                ent.HoraInicioCorte = orden.HoraInicioCorte;
                ent.HoraFinCorte = orden.HoraFinCorte;

                // Materializar entradas
                var inProds = (productos ?? Enumerable.Empty<OrdenesCorteProducto>()).ToList();
                var inIns = (insumos ?? Enumerable.Empty<OrdenesCorteInsumo>()).ToList();
                var inEt = (etapas ?? Enumerable.Empty<OrdenesCorteEtapa>()).ToList();

                // ======================= PRODUCTOS =======================
                var incomingProdIds = inProds.Where(p => p.Id > 0).Select(p => p.Id).ToHashSet();

                // Eliminar productos quitados (y sus variantes)
                var prodsToDelete = ent.OrdenesCorteProductos.Where(p => !incomingProdIds.Contains(p.Id)).ToList();
                if (prodsToDelete.Any())
                {
                    var varsDel = prodsToDelete.SelectMany(p => p.OrdenCorteProductosVariantes).ToList();
                    if (varsDel.Any()) _db.OrdenCorteProductosVariantes.RemoveRange(varsDel);
                    _db.OrdenesCorteProductos.RemoveRange(prodsToDelete);
                }

                foreach (var inP in inProds)
                {
                    OrdenesCorteProducto target;

                    if (inP.Id > 0)
                    {
                        // Update item existente
                        target = ent.OrdenesCorteProductos.First(p => p.Id == inP.Id);
                        target.IdProducto = inP.IdProducto;
                        target.Cantidad = inP.Cantidad;
                    }
                    else
                    {
                        // Insert item nuevo
                        target = new OrdenesCorteProducto
                        {
                            IdOrdenCorte = ent.Id,
                            IdProducto = inP.IdProducto,
                            Cantidad = inP.Cantidad
                        };
                        _db.OrdenesCorteProductos.Add(target);
                        ent.OrdenesCorteProductos.Add(target);

                        // *** CLAVE: persistir para obtener target.Id antes de variantes ***
                        await _db.SaveChangesAsync();
                    }

                    // Upsert de variantes del item
                    var inVars = (inP.OrdenCorteProductosVariantes ?? Enumerable.Empty<OrdenCorteProductosVariante>()).ToList();
                    var incomingVarIds = inVars.Where(v => v.Id > 0).Select(v => v.Id).ToHashSet();

                    var exVars = await _db.OrdenCorteProductosVariantes
                        .Where(v => v.IdOrdenCorteProducto == target.Id)
                        .ToListAsync();

                    // Eliminar variantes quitadas (por Id o por “natural key” IdProductoVariante si vinieron nuevas sin Id)
                    var varsToDelete = exVars.Where(ev =>
                        !incomingVarIds.Contains(ev.Id) &&
                        !inVars.Any(iv => iv.Id == 0 && iv.IdProductoVariante == ev.IdProductoVariante)
                    ).ToList();
                    if (varsToDelete.Any()) _db.OrdenCorteProductosVariantes.RemoveRange(varsToDelete);

                    // Add/Update
                    foreach (var iv in inVars)
                    {
                        var ex = exVars.FirstOrDefault(ev => ev.Id == iv.Id) ??
                                 exVars.FirstOrDefault(ev => iv.Id == 0 && ev.IdProductoVariante == iv.IdProductoVariante);

                        if (ex is null)
                        {
                            _db.OrdenCorteProductosVariantes.Add(new OrdenCorteProductosVariante
                            {
                                IdOrdenCorteProducto = target.Id,   // ya tiene Id seguro
                                IdProducto = iv.IdProducto,
                                IdProductoVariante = iv.IdProductoVariante,
                                Cantidad = iv.Cantidad
                            });
                        }
                        else
                        {
                            ex.IdProducto = iv.IdProducto;
                            ex.IdProductoVariante = iv.IdProductoVariante;
                            ex.Cantidad = iv.Cantidad;
                        }
                    }
                }

                // ======================= INSUMOS =======================
                var incomingInsIds = inIns.Where(i => i.Id > 0).Select(i => i.Id).ToHashSet();

                var insToDelete = ent.OrdenesCorteInsumos.Where(i => !incomingInsIds.Contains(i.Id)).ToList();
                if (insToDelete.Any()) _db.OrdenesCorteInsumos.RemoveRange(insToDelete);

                foreach (var inI in inIns)
                {
                    if (inI.Id > 0)
                    {
                        var ex = ent.OrdenesCorteInsumos.First(i => i.Id == inI.Id);
                        ex.IdInsumo = inI.IdInsumo;
                        ex.Cantidad = inI.Cantidad;
                    }
                    else
                    {
                        _db.OrdenesCorteInsumos.Add(new OrdenesCorteInsumo
                        {
                            IdCorte = ent.Id,
                            IdInsumo = inI.IdInsumo,
                            Cantidad = inI.Cantidad
                        });
                    }
                }

                // ======================= ETAPAS =======================
                var incomingEtIds = inEt.Where(e => e.Id > 0).Select(e => e.Id).ToHashSet();

                var etToDelete = ent.OrdenesCorteEtapas.Where(e => !incomingEtIds.Contains(e.Id)).ToList();
                if (etToDelete.Any()) _db.OrdenesCorteEtapas.RemoveRange(etToDelete);

                int? CalcDias(DateTime? salidaReal, DateTime entrada)
                    => salidaReal.HasValue ? (int?)(salidaReal.Value.Date - entrada.Date).TotalDays : null;

                foreach (var inE in inEt)
                {
                    if (inE.Id > 0)
                    {
                        var ex = ent.OrdenesCorteEtapas.First(e => e.Id == inE.Id);
                        ex.IdTaller = inE.IdTaller;
                        ex.IdCorte = ent.Id; // por consistencia
                        ex.FechaEntrada = inE.FechaEntrada;
                        ex.FechaSalidaAproximada = inE.FechaSalidaAproximada;
                        ex.FechaSalidaReal = inE.FechaSalidaReal;
                        ex.DiasReales = CalcDias(inE.FechaSalidaReal, inE.FechaEntrada);
                        ex.CantidadProducir = inE.CantidadProducir;
                        ex.CantidadProducidas = inE.CantidadProducidas;
                        ex.Diferencias = inE.Diferencias;
                        ex.IdEstado = inE.IdEstado;
                        ex.NotaInterna = inE.NotaInterna;
                    }
                    else
                    {
                        _db.OrdenesCorteEtapas.Add(new OrdenesCorteEtapa
                        {
                            IdTaller = inE.IdTaller,
                            IdCorte = ent.Id,
                            FechaEntrada = inE.FechaEntrada,
                            FechaSalidaAproximada = inE.FechaSalidaAproximada,
                            FechaSalidaReal = inE.FechaSalidaReal,
                            DiasReales = CalcDias(inE.FechaSalidaReal, inE.FechaEntrada),
                            CantidadProducir = inE.CantidadProducir,
                            CantidadProducidas = inE.CantidadProducidas,
                            Diferencias = inE.Diferencias,
                            IdEstado = inE.IdEstado,
                            NotaInterna = inE.NotaInterna
                        });
                    }
                }

                // Persistir todo lo pendiente
                await _db.SaveChangesAsync();

                await trx.CommitAsync();
                return true;
            }
            catch
            {
                await trx.RollbackAsync();
                return false;
            }
        }



        public async Task<bool> Eliminar(int id)
        {
            using var trx = await _db.Database.BeginTransactionAsync();
            try
            {
                var orden = await _db.OrdenesCortes.FirstOrDefaultAsync(o => o.Id == id);
                if (orden is null) return false;

                // ===== 1) Revertir ingreso de stock por OC (si existiera) =====
                const string TIPOMOV_OC = "INGRESO_OC";

                var movsOC = await _db.InventarioMovimientos
                    .Where(m => m.TipoMov == TIPOMOV_OC && m.IdMov == id)
                    .ToListAsync();

                if (movsOC.Any())
                {
                    foreach (var m in movsOC)
                    {
                        // devolver el stock (en el ingreso original sumamos Entrada)
                        var inv = await _db.Inventarios.FirstOrDefaultAsync(i => i.Id == m.IdInventario);
                        if (inv != null)
                        {
                            inv.Cantidad -= m.Entrada;
                            _db.Inventarios.Update(inv);
                        }

                        _db.InventarioMovimientos.Remove(m);
                    }

                    await _db.SaveChangesAsync();

                    // (opcional) Si usás las tablas de "ingreso OC", borrarlas también
                    var ingresos = await _db.InventarioIngresosOrdenesCortes
                        .Where(i => i.IdOrdenCorte == id)
                        .ToListAsync();

                    if (ingresos.Any())
                    {
                        var ingresoIds = ingresos.Select(i => i.Id).ToList();

                        var ingProds = await _db.InventarioIngresosOrdenesCorteProductos
                            .Where(p => ingresoIds.Contains(p.IdIngreso))
                            .ToListAsync();

                        if (ingProds.Any())
                        {
                            var ingProdIds = ingProds.Select(p => p.Id).ToList();

                            var ingVars = await _db.InventarioIngresosOrdenesCorteProductosVariantes
                                .Where(v => ingProdIds.Contains(v.IdIngresoProducto))
                                .ToListAsync();

                            if (ingVars.Any())
                                _db.InventarioIngresosOrdenesCorteProductosVariantes.RemoveRange(ingVars);

                            _db.InventarioIngresosOrdenesCorteProductos.RemoveRange(ingProds);
                        }

                        _db.InventarioIngresosOrdenesCortes.RemoveRange(ingresos);
                        await _db.SaveChangesAsync();
                    }
                }

                // ===== 2) Borrar detalle de la OC (productos/variantes, insumos, etapas) =====
                var prods = await _db.OrdenesCorteProductos.Where(p => p.IdOrdenCorte == id).ToListAsync();
                if (prods.Any())
                {
                    var prodIds = prods.Select(p => p.Id).ToList();
                    var vars = await _db.OrdenCorteProductosVariantes
                        .Where(v => prodIds.Contains(v.IdOrdenCorteProducto))
                        .ToListAsync();
                    if (vars.Any()) _db.OrdenCorteProductosVariantes.RemoveRange(vars);
                    _db.OrdenesCorteProductos.RemoveRange(prods);
                }

                var ins = await _db.OrdenesCorteInsumos.Where(i => i.IdCorte == id).ToListAsync();
                if (ins.Any()) _db.OrdenesCorteInsumos.RemoveRange(ins);

                var ets = await _db.OrdenesCorteEtapas.Where(e => e.IdCorte == id).ToListAsync();
                if (ets.Any()) _db.OrdenesCorteEtapas.RemoveRange(ets);

                // ===== 3) Borrar cabecera =====
                _db.OrdenesCortes.Remove(orden);
                await _db.SaveChangesAsync();

                await trx.CommitAsync();
                return true;
            }
            catch
            {
                await trx.RollbackAsync();
                return false;
            }
        }


        public Task<List<OrdenesCorteEstado>> ObtenerEstados()
            => _db.OrdenesCorteEstados.AsNoTracking().OrderBy(e => e.Nombre).ToListAsync();
    }
}
