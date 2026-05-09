using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using SistemaByCliza.DAL.DataContext;
using SistemaByCliza.Models;

namespace SistemaByCliza.DAL.Repository
{
    public class VentasRepository : IVentasRepository<Venta>
    {
        private readonly SistemaByClizaContext _db;
        public VentasRepository(SistemaByClizaContext db) { _db = db; }

        // Tipo de movimiento de CC (de negocio)
        private const string TIPO_VENTA = "VENTA";            // Debe
        private const string TIPO_COBRO = "COBRO VENTA";      // Haber

        // Inventario (movimientos por venta)
        private const string INV_TIPO_VENTA = "VENTA";
        // Si tu esquema usa una variante "sin variante", dejá 0. Ajustá si tenés otra convención.
        private const int VARIANTE_SIN = 0;

        // ------------------------------ HELPERS INVENTARIO ------------------------------

        private async Task<Inventario> EnsureInventario(int idSucursal, int idProducto, int idVariante)
        {
            var inv = await _db.Inventarios
                .FirstOrDefaultAsync(i => i.IdSucursal == idSucursal &&
                                          i.IdProducto == idProducto &&
                                          i.IdProductoVariante == idVariante);

            if (inv != null) return inv;

            inv = new Inventario
            {
                IdSucursal = idSucursal,
                IdProducto = idProducto,
                IdProductoVariante = idVariante,
                Cantidad = 0m
            };
            _db.Inventarios.Add(inv);
            await _db.SaveChangesAsync();
            return inv;
        }

        /// <summary>
        /// Revierte TODO el impacto de inventario de una venta (borra los movimientos "VENTA"
        /// e incrementa Inventario.Cantidad con (Salida-Entrada) de esos movimientos).
        /// </summary>
        private async Task RevertirImpactoInventarioVenta(int idVenta)
        {
            var movs = await _db.InventarioMovimientos
                .Where(m => m.TipoMov == INV_TIPO_VENTA && m.IdMov == idVenta)
                .ToListAsync();

            foreach (var m in movs)
            {
                var inv = await _db.Inventarios.FirstAsync(i => i.Id == m.IdInventario);
                inv.Cantidad += (m.Salida - m.Entrada);
                _db.Inventarios.Update(inv);
                _db.InventarioMovimientos.Remove(m);
            }
            await _db.SaveChangesAsync();
        }

        /// <summary>
        /// Aplica el impacto de inventario de una venta: descuenta por variante (permite negativos)
        /// y crea movimientos "VENTA".
        /// </summary>
        private async Task ImpactarInventarioVenta(Venta venta)
        {
            // Tomamos todos los items + sus variantes de la venta
            var items = await _db.VentasProductos
                .Where(i => i.IdVenta == venta.Id)
                .Select(i => new
                {
                    Item = i,
                    Variantes = i.VentasProductosVariantes.ToList()
                })
                .ToListAsync();

            foreach (var it in items)
            {
                if (it.Variantes != null && it.Variantes.Count > 0)
                {
                    // Descontar por cada variante informada
                    foreach (var vr in it.Variantes)
                    {
                        var inv = await EnsureInventario(venta.IdSucursal, vr.IdProducto, vr.IdProductoVariante);
                        inv.Cantidad -= vr.Cantidad; // permite negativos
                        _db.Inventarios.Update(inv);

                        _db.InventarioMovimientos.Add(new InventarioMovimiento
                        {
                            IdInventario = inv.Id,
                            IdSucursal = venta.IdSucursal,
                            Fecha = venta.Fecha,
                            TipoMov = INV_TIPO_VENTA,
                            IdMov = venta.Id, // referencia a la venta
                            Concepto = $"VENTA NRO {venta.Id}",
                            Entrada = 0m,
                            Salida = vr.Cantidad
                        });
                    }
                }
                else
                {
                    // Sin variantes informadas: descontar todo el item en una "variante" genérica
                    var inv = await EnsureInventario(venta.IdSucursal, it.Item.IdProducto, VARIANTE_SIN);
                    inv.Cantidad -= it.Item.Cantidad;
                    _db.Inventarios.Update(inv);

                    _db.InventarioMovimientos.Add(new InventarioMovimiento
                    {
                        IdInventario = inv.Id,
                        IdSucursal = venta.IdSucursal,
                        Fecha = venta.Fecha,
                        TipoMov = INV_TIPO_VENTA,
                        IdMov = venta.Id,
                        Concepto = $"VENTA NRO {venta.Id}",
                        Entrada = 0m,
                        Salida = it.Item.Cantidad
                    });
                }
            }

            await _db.SaveChangesAsync();
        }

        // -------------------------------- LISTADO / OBTENER --------------------------------

        public async Task<List<Venta>> Listar(DateTime? desde, DateTime? hasta, int? idCliente, int? idVendedor, int? idSucursal, string? estado, string? texto,
            int? restringirUsuarioRegistraId,
            IReadOnlyList<int>? idsSucursalesPermitidas)
        {
            var q = _db.Ventas
                .Include(v => v.IdClienteNavigation)
                .Include(v => v.IdSucursalNavigation)
                .Include(v => v.IdUsuarioRegistraNavigation)
                .AsNoTracking()
                .AsQueryable();

            if (restringirUsuarioRegistraId.HasValue && restringirUsuarioRegistraId.Value > 0)
                q = q.Where(v => v.IdUsuarioRegistra == restringirUsuarioRegistraId.Value);

            if (idsSucursalesPermitidas != null)
            {
                if (idsSucursalesPermitidas.Count == 0)
                    q = q.Where(v => false);
                else
                    q = q.Where(v => idsSucursalesPermitidas.Contains(v.IdSucursal));
            }

            if (desde.HasValue) q = q.Where(v => v.Fecha >= desde.Value.Date);
            if (hasta.HasValue)
            {
                var h = hasta.Value.Date.AddDays(1).AddTicks(-1);
                q = q.Where(v => v.Fecha <= h);
            }
            if (idCliente.HasValue && idCliente > 0) q = q.Where(v => v.IdCliente == idCliente.Value);

            if (idSucursal.HasValue && idSucursal > 0) q = q.Where(v => v.IdSucursal == idSucursal.Value);

            if (idVendedor.HasValue && idVendedor > 0) q = q.Where(v => v.IdUsuarioRegistra == idVendedor.Value);

            if (!string.IsNullOrWhiteSpace(texto))
            {
                var t = texto.Trim();
                q = q.Where(v =>
                    EF.Functions.Like(v.NotaCliente ?? "", $"%{t}%") ||
                    EF.Functions.Like(v.NotaInterna ?? "", $"%{t}%") ||
                    EF.Functions.Like(v.IdClienteNavigation.Nombre ?? "", $"%{t}%"));
            }

            // estado: con_saldo / saldado usando CC por TipoMov
            if (!string.IsNullOrWhiteSpace(estado))
            {
                var st = estado.Trim().ToLowerInvariant();

                if (st == "con_saldo")
                {
                    q = q.Where(v =>
                        v.ImporteTotal - (
                            _db.ClientesCuentaCorrientes
                                .Where(cc => cc.IdCliente == v.IdCliente
                                          && cc.IdSucursal == v.IdSucursal
                                          && cc.IdMov == v.Id
                                          && cc.TipoMov == TIPO_COBRO)
                                .Sum(cc => (decimal?)cc.Haber) ?? 0m) > 0m);
                }
                else if (st == "saldado")
                {
                    q = q.Where(v =>
                        v.ImporteTotal - (
                            _db.ClientesCuentaCorrientes
                                .Where(cc => cc.IdCliente == v.IdCliente
                                          && cc.IdSucursal == v.IdSucursal
                                          && cc.IdMov == v.Id
                                          && cc.TipoMov == TIPO_COBRO)
                                .Sum(cc => (decimal?)cc.Haber) ?? 0m) <= 0m);
                }
            }

            return await q.OrderByDescending(v => v.Fecha).ThenByDescending(v => v.Id).ToListAsync();
        }

        public Task<Venta?> Obtener(int id)
        {
            return _db.Ventas
                .Include(v => v.IdClienteNavigation)
                .Include(v => v.IdSucursalNavigation)
                .Include(v => v.IdUsuarioRegistraNavigation)
                .Include(v => v.VentasProductos).ThenInclude(p => p.VentasProductosVariantes)
                .AsNoTracking()
                .FirstOrDefaultAsync(v => v.Id == id);
        }

        public Task<List<ClientesCobro>> ObtenerPagosPorVenta(int idVenta)
        {
            return _db.ClientesCobros
                .Include(c => c.IdCuentaNavigation)
                .Where(c => c.IdVenta == idVenta)
                .OrderByDescending(c => c.Fecha).ThenByDescending(c => c.Id)
                .AsNoTracking()
                .ToListAsync();
        }

        public Task<List<VentasProducto>> ObtenerItemsPorVenta(int idVenta)
        {
            return _db.VentasProductos
                .Where(i => i.IdVenta == idVenta)
                .Include(i => i.IdProductoNavigation)
                .Include(i => i.VentasProductosVariantes)
                    .ThenInclude(v => v.IdProductoVarianteNavigation)
                        .ThenInclude(pv => pv.IdColorNavigation)
                            .ThenInclude(pc => pc.IdColorNavigation)
                .Include(i => i.VentasProductosVariantes)
                    .ThenInclude(v => v.IdProductoVarianteNavigation)
                        .ThenInclude(pv => pv.IdTalleNavigation)
                            .ThenInclude(pt => pt.IdTalleNavigation)
                .AsNoTracking()
                .ToListAsync();
        }

        public Task<decimal?> ObtenerPrecioPorLista(int idProducto, int idListaPrecio)
        {
            var precio = _db.ProductosPrecios
                .Where(pp => pp.IdProducto == idProducto && pp.IdListaPrecio == idListaPrecio)
                .Select(pp => (decimal?)pp.PrecioUnitario)
                .FirstOrDefault();
            return Task.FromResult(precio);
        }

        public Task<List<ProductosVariante>> ObtenerVariantesPorProducto(int idProducto)
        {
            return _db.ProductosVariantes
                .Where(v => v.IdProducto == idProducto)
                .Include(v => v.IdColorNavigation).ThenInclude(pc => pc.IdColorNavigation)
                .Include(v => v.IdTalleNavigation).ThenInclude(pt => pt.IdTalleNavigation)
                .AsNoTracking()
                .ToListAsync();
        }

        public async Task<List<string>> ListarEstadosDistintos()
        {
            var fromDb = await _db.Ventas.AsNoTracking()
                .Where(v => v.Estado != null && v.Estado.Trim() != "")
                .Select(v => v.Estado!.Trim().ToUpper())
                .Distinct()
                .ToListAsync();

            var all = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (var e in fromDb)
            {
                if (!string.IsNullOrWhiteSpace(e))
                    all.Add(e.Trim().ToUpperInvariant());
            }
            all.Add("PENDIENTE");
            all.Add("FINALIZADA");

            var rest = all
                .Where(x => !string.Equals(x, "PENDIENTE", StringComparison.OrdinalIgnoreCase)
                         && !string.Equals(x, "FINALIZADA", StringComparison.OrdinalIgnoreCase))
                .OrderBy(x => x, StringComparer.OrdinalIgnoreCase)
                .ToList();

            var result = new List<string>();
            if (all.Any(x => string.Equals(x, "PENDIENTE", StringComparison.OrdinalIgnoreCase)))
                result.Add("PENDIENTE");
            if (all.Any(x => string.Equals(x, "FINALIZADA", StringComparison.OrdinalIgnoreCase)))
                result.Add("FINALIZADA");
            result.AddRange(rest);
            return result;
        }

        // -------------------------------- INSERTAR --------------------------------

        public async Task<bool> InsertarConDetallesYPagos(
            Venta venta,
            IEnumerable<VentasProducto> items,
            IEnumerable<VentasProductosVariante> variantes,
            IEnumerable<ClientesCobro> pagos)
        {
            using var trx = await _db.Database.BeginTransactionAsync();
            try
            {
                // (1) Venta
                _db.Ventas.Add(venta);
                await _db.SaveChangesAsync();

                // (2) Items + variantes
                var listItems = items?.ToList() ?? new List<VentasProducto>();
                var listVars = variantes?.ToList() ?? new List<VentasProductosVariante>();

                foreach (var inIt in listItems)
                {
                    var it = new VentasProducto
                    {
                        IdVenta = venta.Id,
                        IdProducto = inIt.IdProducto,
                        PrecioUnitario = inIt.PrecioUnitario,
                        PorcDescuento = inIt.PorcDescuento,
                        DescuentoUnit = inIt.DescuentoUnit,
                        DescuentoTotal = inIt.DescuentoTotal,
                        PrecioUnitCdesc = inIt.PrecioUnitCdesc,
                        PorcIva = inIt.PorcIva,
                        IvaUnit = inIt.IvaUnit,
                        IvaTotal = inIt.IvaTotal,
                        PrecioUnitFinal = inIt.PrecioUnitFinal,
                        Cantidad = inIt.Cantidad,
                        Subtotal = inIt.Subtotal
                      
                        
                    };
                    _db.VentasProductos.Add(it);
                    await _db.SaveChangesAsync();

                    var varForItem = listVars.Where(v =>
                        (v.IdVentaProducto > 0 && v.IdVentaProducto == inIt.Id) ||
                        (v.IdVentaProducto == 0 && v.IdProducto == inIt.IdProducto)).ToList();

                    foreach (var vr in varForItem)
                    {
                        _db.VentasProductosVariantes.Add(new VentasProductosVariante
                        {
                            IdVentaProducto = it.Id,
                            IdProducto = vr.IdProducto,
                            IdProductoVariante = vr.IdProductoVariante,
                            Cantidad = vr.Cantidad
                        });
                    }
                    await _db.SaveChangesAsync();
                }

                // (3) CC: movimiento de VENTA (Debe)
                var ccDebe = new ClientesCuentaCorriente
                {
                    IdSucursal = venta.IdSucursal,
                    IdCliente = venta.IdCliente,
                    Fecha = venta.Fecha,
                    TipoMov = TIPO_VENTA,
                    IdMov = venta.Id,
                    Concepto = $"VENTA NRO {venta.Id}",
                    Debe = venta.ImporteTotal,
                    Haber = 0m
                };
                _db.ClientesCuentaCorrientes.Add(ccDebe);
                await _db.SaveChangesAsync();

                venta.IdCuentaCorriente = ccDebe.Id;
                await _db.SaveChangesAsync();

                // (4) Pagos => Cobro + CC(HABER) + Caja(INGRESO con IdMov = IdCobro)
                foreach (var p in (pagos ?? Enumerable.Empty<ClientesCobro>()))
                {
                    var cobro = new ClientesCobro
                    {
                        IdSucursal = venta.IdSucursal,
                        IdCliente = venta.IdCliente,
                        IdVenta = venta.Id,
                        IdCuentaCorriente = ccDebe.Id,
                        Fecha = p.Fecha,
                        IdCuenta = p.IdCuenta,
                        Concepto = "",
                        Importe = p.Importe,
                        NotaInterna = p.NotaInterna
                    };
                    _db.ClientesCobros.Add(cobro);
                    await _db.SaveChangesAsync();

                    _db.ClientesCuentaCorrientes.Add(new ClientesCuentaCorriente
                    {
                        IdSucursal = venta.IdSucursal,
                        IdCliente = venta.IdCliente,
                        Fecha = p.Fecha,
                        TipoMov = TIPO_COBRO,
                        IdMov = venta.Id,
                        Concepto = $"COBRO VENTA NRO {venta.Id}",
                        Debe = 0m,
                        Haber = p.Importe
                    });

                    _db.Cajas.Add(new Caja
                    {
                        IdSucursal = venta.IdSucursal,
                        IdCuenta = p.IdCuenta,
                        Fecha = p.Fecha,
                        TipoMov = "INGRESO",
                        IdMov = cobro.Id,
                        Concepto = "COBRO VENTA",
                        Ingreso = p.Importe,
                        Egreso = 0m
                    });

                    await _db.SaveChangesAsync();
                }

                // (5) Impacto en INVENTARIO (permite negativos)
                await ImpactarInventarioVenta(venta);

                await trx.CommitAsync();
                return true;
            }
            catch
            {
                await trx.RollbackAsync();
                return false;
            }
        }

        // -------------------------------- ACTUALIZAR --------------------------------

        public async Task<bool> ActualizarConDetallesYPagos(
            Venta venta,
            IEnumerable<VentasProducto> items,
            IEnumerable<VentasProductosVariante> variantes,
            IEnumerable<ClientesCobro> pagos)
        {
            using var trx = await _db.Database.BeginTransactionAsync();
            try
            {
                var ent = await _db.Ventas
                    .Include(v => v.VentasProductos)
                        .ThenInclude(i => i.VentasProductosVariantes)
                    .FirstOrDefaultAsync(v => v.Id == venta.Id);

                if (ent is null) return false;

                // (0) REVERSIÓN de impacto de inventario previo
                await RevertirImpactoInventarioVenta(ent.Id);

                // Cabecera
                ent.IdSucursal = venta.IdSucursal;
                ent.IdListaPrecio = venta.IdListaPrecio;
                ent.IdCliente = venta.IdCliente;
                ent.Fecha = venta.Fecha;
                ent.Subtotal = venta.Subtotal;
                ent.Descuentos = venta.Descuentos;
                ent.TotalIva = venta.TotalIva;
                ent.ImporteTotal = venta.ImporteTotal;
                ent.NotaInterna = venta.NotaInterna;
                ent.NotaCliente = venta.NotaCliente;
                ent.Estado = venta.Estado;
                ent.IdUsuarioModifica = venta.IdUsuarioModifica;
                ent.FechaModifica = venta.FechaModifica;
                await _db.SaveChangesAsync();

                // Items / variantes (ADD/UPD/DEL)
                var incomingItems = (items ?? Enumerable.Empty<VentasProducto>()).ToList();
                var incomingVars = (variantes ?? Enumerable.Empty<VentasProductosVariante>()).ToList();

                var incomingItemIds = incomingItems.Where(x => x.Id > 0).Select(x => x.Id).ToHashSet();
                var itemsToDelete = ent.VentasProductos.Where(x => !incomingItemIds.Contains(x.Id)).ToList();
                if (itemsToDelete.Any())
                {
                    var varsDel = itemsToDelete.SelectMany(x => x.VentasProductosVariantes).ToList();
                    if (varsDel.Any()) _db.VentasProductosVariantes.RemoveRange(varsDel);
                    _db.VentasProductos.RemoveRange(itemsToDelete);
                    await _db.SaveChangesAsync();
                }

                foreach (var inIt in incomingItems)
                {
                    VentasProducto target;

                    if (inIt.Id > 0)
                    {
                        target = ent.VentasProductos.First(i => i.Id == inIt.Id);
                        target.IdProducto = inIt.IdProducto;
                        target.PrecioUnitario = inIt.PrecioUnitario;
                        target.PorcDescuento = inIt.PorcDescuento;
                        target.DescuentoUnit = inIt.DescuentoUnit;
                        target.DescuentoTotal = inIt.DescuentoTotal;
                        target.PrecioUnitCdesc = inIt.PrecioUnitCdesc;
                        target.PorcIva = inIt.PorcIva;
                        target.IvaUnit = inIt.IvaUnit;
                        target.IvaTotal = inIt.IvaTotal;
                        target.PrecioUnitFinal = inIt.PrecioUnitFinal;
                        target.Cantidad = inIt.Cantidad;
                        target.Subtotal = inIt.Subtotal;
                        await _db.SaveChangesAsync();
                    }
                    else
                    {
                        target = new VentasProducto
                        {
                            IdVenta = ent.Id,
                            IdProducto = inIt.IdProducto,
                            PrecioUnitario = inIt.PrecioUnitario,
                            PorcDescuento = inIt.PorcDescuento,
                            DescuentoUnit = inIt.DescuentoUnit,
                            DescuentoTotal = inIt.DescuentoTotal,
                            PrecioUnitCdesc = inIt.PrecioUnitCdesc,
                            PorcIva = inIt.PorcIva,
                            IvaUnit = inIt.IvaUnit,
                            IvaTotal = inIt.IvaTotal,
                            PrecioUnitFinal = inIt.PrecioUnitFinal,
                            Cantidad = inIt.Cantidad,
                            Subtotal = inIt.Subtotal
                        };
                        _db.VentasProductos.Add(target);
                        await _db.SaveChangesAsync();
                    }

                    var inVarsForItem = incomingVars
                        .Where(v => (v.IdVentaProducto > 0 && v.IdVentaProducto == inIt.Id) ||
                                    (v.IdVentaProducto == 0 && v.IdProducto == inIt.IdProducto))
                        .ToList();

                    var exVars = await _db.VentasProductosVariantes
                        .Where(v => v.IdVentaProducto == target.Id)
                        .ToListAsync();

                    var mapInById = inVarsForItem.Where(v => v.Id > 0).ToDictionary(v => v.Id, v => v);

                    var toDelete = exVars.Where(ev =>
                        !mapInById.ContainsKey(ev.Id) &&
                        !inVarsForItem.Any(iv => iv.Id == 0 && iv.IdProductoVariante == ev.IdProductoVariante)).ToList();
                    if (toDelete.Any())
                    {
                        _db.VentasProductosVariantes.RemoveRange(toDelete);
                        await _db.SaveChangesAsync();
                    }

                    foreach (var iv in inVarsForItem)
                    {
                        var ex = exVars.FirstOrDefault(ev => ev.Id == iv.Id) ??
                                 exVars.FirstOrDefault(ev => iv.Id == 0 && ev.IdProductoVariante == iv.IdProductoVariante);

                        if (ex is null)
                        {
                            _db.VentasProductosVariantes.Add(new VentasProductosVariante
                            {
                                IdVentaProducto = target.Id,
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
                    await _db.SaveChangesAsync();
                }

                // (3) CC Debe (VENTA)
                var ccDebe = await _db.ClientesCuentaCorrientes
                    .FirstOrDefaultAsync(cc => cc.IdCliente == ent.IdCliente &&
                                               cc.IdSucursal == ent.IdSucursal &&
                                               cc.TipoMov == TIPO_VENTA &&
                                               cc.IdMov == ent.Id);
                if (ccDebe is null)
                {
                    ccDebe = new ClientesCuentaCorriente
                    {
                        IdSucursal = ent.IdSucursal,
                        IdCliente = ent.IdCliente,
                        Fecha = ent.Fecha,
                        TipoMov = TIPO_VENTA,
                        IdMov = ent.Id,
                        Concepto = $"VENTA NRO {ent.Id}",
                        Debe = ent.ImporteTotal,
                        Haber = 0m
                    };
                    _db.ClientesCuentaCorrientes.Add(ccDebe);
                    await _db.SaveChangesAsync();
                    ent.IdCuentaCorriente = ccDebe.Id;
                    await _db.SaveChangesAsync();
                }
                else
                {
                    ccDebe.Fecha = ent.Fecha;
                    ccDebe.Debe = ent.ImporteTotal;
                    ccDebe.Concepto = $"VENTA NRO {ent.Id}";
                    await _db.SaveChangesAsync();
                }

                // (4) Pagos (ClientesCobro + CC Haber [COBRO VENTA] + Caja)
                var incomingPagos = (pagos ?? Enumerable.Empty<ClientesCobro>()).ToList();
                var incomingPagoIds = incomingPagos.Where(p => p.Id > 0).Select(p => p.Id).ToHashSet();
                var pagosEx = await _db.ClientesCobros.Where(c => c.IdVenta == ent.Id).ToListAsync();

                // borrar pagos quitados y sus efectos
                var delPagos = pagosEx.Where(pe => !incomingPagoIds.Contains(pe.Id)).ToList();
                foreach (var dp in delPagos)
                {
                    var haber = await _db.ClientesCuentaCorrientes
                        .FirstOrDefaultAsync(h => h.IdCliente == ent.IdCliente &&
                                                  h.IdSucursal == ent.IdSucursal &&
                                                  h.TipoMov == TIPO_COBRO &&
                                                  h.IdMov == ent.Id &&
                                                  h.Fecha == dp.Fecha &&
                                                  h.Haber == dp.Importe);
                    if (haber != null) _db.ClientesCuentaCorrientes.Remove(haber);

                    var caja = await _db.Cajas.FirstOrDefaultAsync(ca => ca.IdMov == dp.Id && ca.TipoMov == "INGRESO");
                    if (caja != null) _db.Cajas.Remove(caja);

                    _db.ClientesCobros.Remove(dp);
                }
                if (delPagos.Any()) await _db.SaveChangesAsync();

                // upsert pagos
                foreach (var p in incomingPagos)
                {
                    if (p.Id > 0)
                    {
                        var ex = await _db.ClientesCobros.FirstAsync(c => c.Id == p.Id);
                        var oldFecha = ex.Fecha; var oldImporte = ex.Importe;

                        ex.Fecha = p.Fecha;
                        ex.IdCuenta = p.IdCuenta;
                        ex.Importe = p.Importe;
                        ex.NotaInterna = p.NotaInterna;
                        await _db.SaveChangesAsync();

                        var haber = await _db.ClientesCuentaCorrientes
                            .FirstOrDefaultAsync(h => h.IdCliente == ent.IdCliente &&
                                                      h.IdSucursal == ent.IdSucursal &&
                                                      h.TipoMov == TIPO_COBRO &&
                                                      h.IdMov == ent.Id &&
                                                      h.Fecha == oldFecha &&
                                                      h.Haber == oldImporte);
                        if (haber is null)
                        {
                            _db.ClientesCuentaCorrientes.Add(new ClientesCuentaCorriente
                            {
                                IdSucursal = ent.IdSucursal,
                                IdCliente = ent.IdCliente,
                                Fecha = ex.Fecha,
                                TipoMov = TIPO_COBRO,
                                IdMov = ent.Id,
                                Concepto = $"COBRO VENTA NRO {ent.Id}",
                                Debe = 0m,
                                Haber = ex.Importe
                            });
                        }
                        else
                        {
                            haber.Fecha = ex.Fecha;
                            haber.Haber = ex.Importe;
                            haber.Concepto = $"COBRO VENTA NRO {ent.Id}";
                        }

                        var caja = await _db.Cajas.FirstOrDefaultAsync(ca => ca.IdMov == ex.Id && ca.TipoMov == "INGRESO");
                        if (caja is null)
                        {
                            _db.Cajas.Add(new Caja
                            {
                                IdSucursal = ent.IdSucursal,
                                IdCuenta = ex.IdCuenta,
                                Fecha = ex.Fecha,
                                TipoMov = "INGRESO",
                                IdMov = ex.Id,
                                Concepto = "COBRO VENTA",
                                Ingreso = ex.Importe,
                                Egreso = 0m
                            });
                        }
                        else
                        {
                            caja.IdSucursal = ent.IdSucursal;
                            caja.IdCuenta = ex.IdCuenta;
                            caja.Fecha = ex.Fecha;
                            caja.Concepto = "COBRO VENTA";
                            caja.Ingreso = ex.Importe;
                            caja.Egreso = 0m;
                        }

                        await _db.SaveChangesAsync();
                    }
                    else
                    {
                        var nuevo = new ClientesCobro
                        {
                            IdSucursal = ent.IdSucursal,
                            IdCliente = ent.IdCliente,
                            IdVenta = ent.Id,
                            IdCuentaCorriente = ent.IdCuentaCorriente,
                            Fecha = p.Fecha,
                            IdCuenta = p.IdCuenta,
                            Concepto = "",
                            Importe = p.Importe,
                            NotaInterna = p.NotaInterna
                        };
                        _db.ClientesCobros.Add(nuevo);
                        await _db.SaveChangesAsync();

                        _db.ClientesCuentaCorrientes.Add(new ClientesCuentaCorriente
                        {
                            IdSucursal = ent.IdSucursal,
                            IdCliente = ent.IdCliente,
                            Fecha = p.Fecha,
                            TipoMov = TIPO_COBRO,
                            IdMov = ent.Id,
                            Concepto = $"COBRO VENTA NRO {ent.Id}",
                            Debe = 0m,
                            Haber = p.Importe
                        });

                        _db.Cajas.Add(new Caja
                        {
                            IdSucursal = ent.IdSucursal,
                            IdCuenta = p.IdCuenta,
                            Fecha = p.Fecha,
                            TipoMov = "INGRESO",
                            IdMov = nuevo.Id,         // caja referencia al cobro
                            Concepto = "COBRO VENTA",
                            Ingreso = p.Importe,
                            Egreso = 0m
                        });

                        await _db.SaveChangesAsync();
                    }
                }

                // (5) Re-impacto INVENTARIO con el estado NUEVO de la venta
                await ImpactarInventarioVenta(ent);

                await trx.CommitAsync();
                return true;
            }
            catch
            {
                await trx.RollbackAsync();
                return false;
            }
        }

        // -------------------------------- ELIMINAR --------------------------------

        public async Task<bool> Eliminar(int id)
        {
            using var trx = await _db.Database.BeginTransactionAsync();
            try
            {
                var v = await _db.Ventas
                    .Include(v => v.VentasProductos).ThenInclude(i => i.VentasProductosVariantes)
                    .FirstOrDefaultAsync(v => v.Id == id);
                if (v is null) return false;

                // (0) Revertir INVENTARIO (borra movimientos "VENTA" y repone cantidades)
                await RevertirImpactoInventarioVenta(id);

                // CC por Venta (VENTA / COBRO VENTA)
                var ccs = await _db.ClientesCuentaCorrientes
                    .Where(cc => cc.IdMov == id && (cc.TipoMov == TIPO_VENTA || cc.TipoMov == TIPO_COBRO))
                    .ToListAsync();
                if (ccs.Any()) _db.ClientesCuentaCorrientes.RemoveRange(ccs);

                // Cobros + caja por cobro
                var cobros = await _db.ClientesCobros.Where(c => c.IdVenta == id).ToListAsync();
                foreach (var c in cobros)
                {
                    var caja = await _db.Cajas.Where(ca => ca.IdMov == c.Id && ca.TipoMov == "INGRESO").ToListAsync();
                    if (caja.Any()) _db.Cajas.RemoveRange(caja);
                }
                if (cobros.Any()) _db.ClientesCobros.RemoveRange(cobros);

                // Detalles/variantes
                var vars = v.VentasProductos.SelectMany(i => i.VentasProductosVariantes).ToList();
                if (vars.Any()) _db.VentasProductosVariantes.RemoveRange(vars);
                if (v.VentasProductos.Any()) _db.VentasProductos.RemoveRange(v.VentasProductos);

                _db.Ventas.Remove(v);
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
    }
}
