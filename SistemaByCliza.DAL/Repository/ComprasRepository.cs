// SistemaByCliza.DAL/Repository/ComprasRepository.cs
using Microsoft.EntityFrameworkCore;
using SistemaByCliza.DAL.DataContext;
using SistemaByCliza.Models;

namespace SistemaByCliza.DAL.Repository
{
    public class ComprasRepository : IComprasRepository<Compra>
    {
        private readonly SistemaByClizaContext _db;
        public ComprasRepository(SistemaByClizaContext db) { _db = db; }

        // En tu repositorio de Compras (arriba de la clase o al inicio):
        private const string TIPO_COMPRA = "COMPRA";
        private const string TIPO_PAGO = "PAGO";

        // -------- LISTADO / OBTENER --------
        public async Task<List<Compra>> Listar(DateTime? desde, DateTime? hasta, int? idProveedor, string? texto)
        {
            var q = _db.Compras
                .Include(c => c.IdProveedorNavigation)
                .AsNoTracking()
                .AsQueryable();

            if (desde.HasValue) q = q.Where(c => c.Fecha >= desde.Value.Date);
            if (hasta.HasValue)
            {
                var h = hasta.Value.Date.AddDays(1).AddTicks(-1);
                q = q.Where(c => c.Fecha <= h);
            }
            if (idProveedor.HasValue && idProveedor > 0) q = q.Where(c => c.IdProveedor == idProveedor.Value);

            if (!string.IsNullOrWhiteSpace(texto))
            {
                var t = texto.Trim();
                q = q.Where(c =>
                    EF.Functions.Like(c.NotaInterna ?? "", $"%{t}%") ||
                    EF.Functions.Like(c.IdProveedorNavigation.Nombre ?? "", $"%{t}%"));
            }

            return await q
                .OrderByDescending(c => c.Fecha)
                .ThenByDescending(c => c.Id)
                .ToListAsync();
        }

        public Task<Compra?> Obtener(int id)
        {
            return _db.Compras
                .Include(c => c.IdProveedorNavigation)
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == id);
        }

        public Task<List<ComprasInsumo>> ObtenerItemsPorCompra(int idCompra)
        {
            return _db.ComprasInsumos
                .Where(i => i.IdCompra == idCompra)
                .AsNoTracking()
                .ToListAsync();
        }

        public Task<List<ComprasPago>> ObtenerPagosPorCompra(int idCompra)
        {
            return _db.ComprasPagos
                .Where(p => p.IdCompra == idCompra)
                .AsNoTracking()
                .ToListAsync();
        }

        public async Task<bool> InsertarConDetallesYPagos(Compra compra, IEnumerable<ComprasInsumo> items, IEnumerable<ComprasPago> pagos)
        {
            using var trx = await _db.Database.BeginTransactionAsync();
            try
            {
                // (1) Compra
                _db.Compras.Add(compra);
                await _db.SaveChangesAsync();

                // (2) Ítems
                if (items != null)
                {
                    foreach (var it in items)
                    {
                        it.Id = 0;
                        it.IdCompra = compra.Id;
                    }
                    _db.ComprasInsumos.AddRange(items);
                }

                // (3) CC Proveedor: DEBE por COMPRA
                var ccDebe = new ProveedoresCuentaCorriente
                {
                    IdProveedor = compra.IdProveedor,
                    Fecha = compra.Fecha,
                    TipoMov = TIPO_COMPRA,
                    IdMov = compra.Id,                      // referenciamos la compra
                    Concepto = $"COMPRA NRO {compra.Id}",
                    Debe = compra.ImporteTotal,
                    Haber = 0m
                };
                _db.ProveedoresCuentaCorrientes.Add(ccDebe);
                await _db.SaveChangesAsync();

                // guardar vínculo si tu entidad lo contempla
                if (compra.GetType().GetProperty("IdCuentaCorriente") != null)
                {
                    compra.IdCuentaCorriente = ccDebe.Id;
                    await _db.SaveChangesAsync();
                }

                // (4) Pagos + Caja EGRESO + CC Proveedor (HABER)
                if (pagos != null)
                {
                    foreach (var p in pagos)
                    {
                        p.Id = 0;
                        p.IdCompra = compra.Id;
                        p.IdProveedor = compra.IdProveedor;
                        p.IdCuentaCorriente = ccDebe.Id; // vínculo útil si lo usás
                    }
                    _db.ComprasPagos.AddRange(pagos);
                    await _db.SaveChangesAsync(); // necesito los Id de pagos para Caja

                    foreach (var p in pagos)
                    {
                        // Caja EGRESO por pago
                        _db.Cajas.Add(new Caja
                        {
                            // IdSucursal = ??? // si tu esquema lo requiere
                            IdCuenta = p.IdCuenta,
                            Fecha = p.Fecha,
                            TipoMov = "EGRESO",
                            IdMov = p.Id, // referenciamos al pago
                            Concepto = $"PAGO COMPRA NRO {compra.Id}",
                            Ingreso = 0m,
                            Egreso = p.Importe
                        });

                        // CC Proveedor: HABER por PAGO
                        _db.ProveedoresCuentaCorrientes.Add(new ProveedoresCuentaCorriente
                        {
                            IdProveedor = compra.IdProveedor,
                            Fecha = p.Fecha,
                            TipoMov = TIPO_PAGO,
                            IdMov = compra.Id,                 // agrupamos por compra (como clientes con venta)
                            Concepto = $"PAGO COMPRA NRO {compra.Id}",
                            Debe = 0m,
                            Haber = p.Importe
                        });
                    }
                }

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
        public async Task<bool> ActualizarConDetallesYPagos(Compra compra, IEnumerable<ComprasInsumo> items, IEnumerable<ComprasPago> pagos)
        {
            using var trx = await _db.Database.BeginTransactionAsync();
            try
            {
                var ent = await _db.Compras
                    .Include(c => c.ComprasInsumos)
                    .Include(c => c.ComprasPagos)
                    .FirstOrDefaultAsync(c => c.Id == compra.Id);

                if (ent is null) return false;

                // (1) Cabecera
                ent.IdProveedor = compra.IdProveedor;
                ent.IdCuentaCorriente = compra.IdCuentaCorriente; // si aplica
                ent.Fecha = compra.Fecha;
                ent.Subtotal = compra.Subtotal;
                ent.Descuentos = compra.Descuentos;
                ent.TotalIva = compra.TotalIva;
                ent.ImporteTotal = compra.ImporteTotal;
                ent.NotaInterna = compra.NotaInterna ?? string.Empty;

                // (2) Ítems (reconciliación)
                var incomingItems = (items ?? Enumerable.Empty<ComprasInsumo>()).ToList();
                var incomingItemIds = incomingItems.Where(x => x.Id > 0).Select(x => x.Id).ToHashSet();

                var itemsToDelete = ent.ComprasInsumos.Where(x => !incomingItemIds.Contains(x.Id)).ToList();
                if (itemsToDelete.Count > 0) _db.ComprasInsumos.RemoveRange(itemsToDelete);

                foreach (var inIt in incomingItems)
                {
                    if (inIt.Id > 0)
                    {
                        var dbIt = ent.ComprasInsumos.First(i => i.Id == inIt.Id);
                        dbIt.CostoUnitario = inIt.CostoUnitario;
                        dbIt.PorcDescuento = inIt.PorcDescuento;
                        dbIt.DescuentoUnit = inIt.DescuentoUnit;
                        dbIt.DescuentoTotal = inIt.DescuentoTotal;
                        dbIt.CostoUnitCdesc = inIt.CostoUnitCdesc;
                        dbIt.PorcIva = inIt.PorcIva;
                        dbIt.IvaUnit = inIt.IvaUnit;
                        dbIt.IvaTotal = inIt.IvaTotal;
                        dbIt.CostoUnitFinal = inIt.CostoUnitFinal;
                        dbIt.Cantidad = inIt.Cantidad;
                        dbIt.Subtotal = inIt.Subtotal;
                    }
                    else
                    {
                        inIt.Id = 0;
                        inIt.IdCompra = ent.Id;
                        _db.ComprasInsumos.Add(inIt);
                    }
                }

                // (3) CC Proveedor: DEBE por COMPRA (ADD/UPD)
                var ccDebe = await _db.ProveedoresCuentaCorrientes
                    .FirstOrDefaultAsync(cc =>
                        cc.IdProveedor == ent.IdProveedor &&
                        cc.TipoMov == TIPO_COMPRA &&
                        cc.IdMov == ent.Id);

                if (ccDebe is null)
                {
                    ccDebe = new ProveedoresCuentaCorriente
                    {
                        IdProveedor = ent.IdProveedor,
                        Fecha = ent.Fecha,
                        TipoMov = TIPO_COMPRA,
                        IdMov = ent.Id,
                        Concepto = $"COMPRA NRO {ent.Id}",
                        Debe = ent.ImporteTotal,
                        Haber = 0m
                    };
                    _db.ProveedoresCuentaCorrientes.Add(ccDebe);
                    await _db.SaveChangesAsync();

                    // persistir en cabecera si la propiedad existe
                    if (ent.GetType().GetProperty("IdCuentaCorriente") != null)
                    {
                        ent.IdCuentaCorriente = ccDebe.Id;
                        await _db.SaveChangesAsync();
                    }
                }
                else
                {
                    ccDebe.Fecha = ent.Fecha;
                    ccDebe.Debe = ent.ImporteTotal;
                    ccDebe.Concepto = $"COMPRA NRO {ent.Id}";
                }

                // (4) Pagos (reconciliación + Caja + CC Proveedor HABER)
                var incomingPagos = (pagos ?? Enumerable.Empty<ComprasPago>()).ToList();
                var incomingPagoIds = incomingPagos.Where(p => p.Id > 0).Select(p => p.Id).ToHashSet();

                // Eliminados
                var pagosToDelete = ent.ComprasPagos.Where(p => !incomingPagoIds.Contains(p.Id)).ToList();
                if (pagosToDelete.Count > 0)
                {
                    foreach (var del in pagosToDelete)
                    {
                        // Caja por pago eliminado
                        var cajas = await _db.Cajas
                            .Where(ca => ca.TipoMov == "EGRESO" && ca.IdMov == del.Id)
                            .ToListAsync();
                        if (cajas.Any()) _db.Cajas.RemoveRange(cajas);

                        // CC Proveedor HABER por pago eliminado (buscamos por compra + fecha + importe)
                        var ccHaber = await _db.ProveedoresCuentaCorrientes
                            .FirstOrDefaultAsync(h => h.IdProveedor == ent.IdProveedor &&
                                                      h.TipoMov == TIPO_PAGO &&
                                                      h.IdMov == ent.Id &&
                                                      h.Fecha == del.Fecha &&
                                                      h.Haber == del.Importe);
                        if (ccHaber != null) _db.ProveedoresCuentaCorrientes.Remove(ccHaber);
                    }
                    _db.ComprasPagos.RemoveRange(pagosToDelete);
                }

                // Upsert pagos
                foreach (var inP in incomingPagos)
                {
                    if (inP.Id > 0)
                    {
                        // update pago + Caja + CC HABER
                        var dbP = ent.ComprasPagos.First(p => p.Id == inP.Id);
                        var oldFecha = dbP.Fecha; var oldImporte = dbP.Importe;

                        dbP.Fecha = inP.Fecha;
                        dbP.IdCuenta = inP.IdCuenta;
                        dbP.Concepto = inP.Concepto;
                        dbP.Importe = inP.Importe;
                        dbP.NotaInterna = inP.NotaInterna ?? string.Empty;

                        // Caja asociada
                        var caja = await _db.Cajas.FirstOrDefaultAsync(ca => ca.TipoMov == "EGRESO" && ca.IdMov == dbP.Id);
                        if (caja is null)
                        {
                            _db.Cajas.Add(new Caja
                            {
                                // IdSucursal = ??? // si aplica
                                IdCuenta = dbP.IdCuenta,
                                Fecha = dbP.Fecha,
                                TipoMov = "EGRESO",
                                IdMov = dbP.Id,
                                Concepto = $"PAGO COMPRA NRO {ent.Id}",
                                Ingreso = 0m,
                                Egreso = dbP.Importe
                            });
                        }
                        else
                        {
                            // IdSucursal = ??? // si aplica
                            caja.IdCuenta = dbP.IdCuenta;
                            caja.Fecha = dbP.Fecha;
                            caja.Concepto = $"PAGO COMPRA NRO {ent.Id}";
                            caja.Ingreso = 0m;
                            caja.Egreso = dbP.Importe;
                        }

                        // CC Proveedor HABER: buscar por compra + oldFecha + oldImporte
                        var haber = await _db.ProveedoresCuentaCorrientes
                            .FirstOrDefaultAsync(h => h.IdProveedor == ent.IdProveedor &&
                                                      h.TipoMov == TIPO_PAGO &&
                                                      h.IdMov == ent.Id &&
                                                      h.Fecha == oldFecha &&
                                                      h.Haber == oldImporte);
                        if (haber is null)
                        {
                            _db.ProveedoresCuentaCorrientes.Add(new ProveedoresCuentaCorriente
                            {
                                IdProveedor = ent.IdProveedor,
                                Fecha = dbP.Fecha,
                                TipoMov = TIPO_PAGO,
                                IdMov = ent.Id,
                                Concepto = $"PAGO COMPRA NRO {ent.Id}",
                                Debe = 0m,
                                Haber = dbP.Importe
                            });
                        }
                        else
                        {
                            haber.Fecha = dbP.Fecha;
                            haber.Haber = dbP.Importe;
                            haber.Concepto = $"PAGO COMPRA NRO {ent.Id}";
                        }
                    }
                    else
                    {
                        // insert pago + Caja + CC HABER
                        inP.Id = 0;
                        inP.IdCompra = ent.Id;
                        inP.IdProveedor = ent.IdProveedor;
                        inP.IdCuentaCorriente = ent.IdCuentaCorriente;

                        _db.ComprasPagos.Add(inP);
                        await _db.SaveChangesAsync(); // necesito Id del pago

                        _db.Cajas.Add(new Caja
                        {
                            // IdSucursal = ??? // si aplica
                            IdCuenta = inP.IdCuenta,
                            Fecha = inP.Fecha,
                            TipoMov = "EGRESO",
                            IdMov = inP.Id,
                            Concepto = $"PAGO COMPRA NRO {ent.Id}",
                            Ingreso = 0m,
                            Egreso = inP.Importe
                        });

                        _db.ProveedoresCuentaCorrientes.Add(new ProveedoresCuentaCorriente
                        {
                            IdProveedor = ent.IdProveedor,
                            Fecha = inP.Fecha,
                            TipoMov = TIPO_PAGO,
                            IdMov = ent.Id,
                            Concepto = $"PAGO COMPRA NRO {ent.Id}",
                            Debe = 0m,
                            Haber = inP.Importe
                        });
                    }
                }

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
                var compra = await _db.Compras
                    .Include(c => c.ComprasInsumos)
                    .Include(c => c.ComprasPagos)
                    .FirstOrDefaultAsync(c => c.Id == id);

                if (compra is null) return false;

                // (1) Borrar asientos de Caja por pagos de esta compra
                var pagos = compra.ComprasPagos?.ToList() ?? new List<ComprasPago>();
                foreach (var p in pagos)
                {
                    var cajas = await _db.Cajas
                        .Where(ca => ca.TipoMov == "EGRESO" && ca.IdMov == p.Id)
                        .ToListAsync();
                    if (cajas.Any()) _db.Cajas.RemoveRange(cajas);
                }

                // (2) Borrar CC proveedor (COMPRA y PAGO) vinculados a esta compra
                var ccs = await _db.ProveedoresCuentaCorrientes
                    .Where(cc => cc.IdMov == compra.Id && (cc.TipoMov == TIPO_COMPRA || cc.TipoMov == TIPO_PAGO))
                    .ToListAsync();
                if (ccs.Any()) _db.ProveedoresCuentaCorrientes.RemoveRange(ccs);

                // (3) Detalles + pagos + compra
                if (compra.ComprasInsumos?.Any() == true)
                    _db.ComprasInsumos.RemoveRange(compra.ComprasInsumos);

                if (pagos.Any())
                    _db.ComprasPagos.RemoveRange(pagos);

                _db.Compras.Remove(compra);

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

        public async Task<decimal> ObtenerSaldoProveedor(int idProveedor)
        {
            var q = _db.ProveedoresCuentaCorrientes.Where(m => m.IdProveedor == idProveedor);
            var debe = await q.SumAsync(m => (decimal?)m.Debe) ?? 0m;
            var haber = await q.SumAsync(m => (decimal?)m.Haber) ?? 0m;
            return debe - haber; // saldo a pagar (positivo = le debés)
        }

        public async Task<(List<ProveedoresCuentaCorriente> lista, decimal saldoAnterior)>
            ListarProveedorConSaldoAnterior(int idProveedor, DateTime? desde, DateTime? hasta, string? texto)
        {
            var baseQ = _db.ProveedoresCuentaCorrientes.AsNoTracking().Where(m => m.IdProveedor == idProveedor);

            if (!string.IsNullOrWhiteSpace(texto))
            {
                var t = texto.Trim();
                baseQ = baseQ.Where(m => EF.Functions.Like(m.Concepto ?? "", $"%{t}%"));
            }

            decimal saldoAnterior = 0m;
            if (desde.HasValue)
            {
                var d = desde.Value.Date;
                saldoAnterior = await baseQ
                    .Where(m => m.Fecha < d)
                    .Select(m => (decimal?)(m.Debe - m.Haber))
                    .SumAsync() ?? 0m;
            }

            var q = baseQ;
            if (desde.HasValue) q = q.Where(m => m.Fecha >= desde.Value.Date);
            if (hasta.HasValue)
            {
                var h = hasta.Value.Date.AddDays(1).AddTicks(-1);
                q = q.Where(m => m.Fecha <= h);
            }

            var lista = await q.OrderByDescending(m => m.Fecha).ThenByDescending(m => m.Id).ToListAsync();
            return (lista, saldoAnterior);
        }


    }
}
