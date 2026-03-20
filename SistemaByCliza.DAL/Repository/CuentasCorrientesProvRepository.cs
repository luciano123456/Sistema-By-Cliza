// SistemaByCliza.DAL.Repository/CuentasCorrientesProvRepository.cs
using Microsoft.EntityFrameworkCore;
using SistemaByCliza.DAL.DataContext;
using SistemaByCliza.Models;

namespace SistemaByCliza.DAL.Repository
{
    public class CuentasCorrientesProvRepository : ICuentasCorrientesProvRepository<ProveedoresCuentaCorriente>
    {
        private readonly SistemaByClizaContext _db;
        public CuentasCorrientesProvRepository(SistemaByClizaContext db) { _db = db; }

        private const string CONCEPTO_COMPRA = "COMPRA";
        private const string CONCEPTO_PAGO_PROV = "PAGO PROVEEDOR";
        private const string CONCEPTO_PAGO_CC = "PAGO CC PROV";

        public async Task<List<Proveedor>> ListarProveedores(string? texto)
        {
            var q = _db.Proveedores.AsNoTracking();
            if (!string.IsNullOrWhiteSpace(texto))
            {
                var t = texto.Trim();
                q = q.Where(p => EF.Functions.Like(p.Nombre ?? "", $"%{t}%"));
            }
            return await q.OrderBy(p => p.Nombre).ToListAsync();
        }

        public async Task<(List<ProveedoresCuentaCorriente> Lista, decimal SaldoAnterior)> ListarConSaldoAnterior(
            int idProveedor, DateTime? desde, DateTime? hasta, string? texto)
        {
            var baseQ = _db.ProveedoresCuentaCorrientes
                .Include(m => m.IdProveedorNavigation)
                .AsNoTracking()
                .AsQueryable();

            if (idProveedor != -1) baseQ = baseQ.Where(m => m.IdProveedor == idProveedor);
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
                    .Select(m => (decimal?)(m.Haber - m.Debe))
                    .SumAsync() ?? 0m;
            }

            var q = baseQ;
            if (desde.HasValue) q = q.Where(m => m.Fecha >= desde.Value.Date);
            if (hasta.HasValue)
            {
                var h = hasta.Value.Date.AddDays(1).AddTicks(-1);
                q = q.Where(m => m.Fecha <= h);
            }

            var lista = await q
                .OrderByDescending(m => m.Fecha)
                .ThenByDescending(m => m.Id)
                .ToListAsync();

            return (lista, saldoAnterior);
        }

        public async Task<decimal> ObtenerSaldo(int idProveedor)
        {
            var q = _db.ProveedoresCuentaCorrientes.Where(m => m.IdProveedor == idProveedor);
            var debe = await q.SumAsync(m => (decimal?)m.Debe) ?? 0m;
            var haber = await q.SumAsync(m => (decimal?)m.Haber) ?? 0m;
            return haber - debe; // saldo a favor nuestro (positivo) o deuda (negativo)
        }

        public Task<ProveedoresCuentaCorriente?> Obtener(int id)
            => _db.ProveedoresCuentaCorrientes
                  .Include(m => m.IdProveedorNavigation)
                  .AsNoTracking()
                  .FirstOrDefaultAsync(m => m.Id == id);

        // ---- Insertar PAGO manual (IdMov = Id de Caja creada si impacta) => EGRESO
        public async Task<bool> InsertarPagoManual(ProveedoresCuentaCorriente mov, bool impactaCaja, int? idCuentaCaja)
        {
            mov.IdMov = 0;
            mov.TipoMov = "PAGO";
            mov.Concepto = string.IsNullOrWhiteSpace(mov.Concepto) ? CONCEPTO_PAGO_CC : mov.Concepto.Trim();
            mov.Debe = 0m;

            using var trx = await _db.Database.BeginTransactionAsync();
            try
            {
                if (impactaCaja && idCuentaCaja.HasValue && idCuentaCaja.Value > 0)
                {
                    var caja = new Caja
                    {
                        // sin sucursal
                        IdSucursal = null, // si tu modelo requiere NOT NULL, definí una convención o quitalo de Caja
                        IdCuenta = idCuentaCaja.Value,
                        Fecha = mov.Fecha,
                        TipoMov = "EGRESO",
                        IdMov = null, // vínculo va CC.IdMov -> Caja.Id
                        Concepto = mov.Concepto,
                        Ingreso = 0m,
                        Egreso = mov.Haber
                    };
                    _db.Cajas.Add(caja);
                    await _db.SaveChangesAsync();
                    mov.IdMov = caja.Id; // enlazamos CC con Caja
                }

                _db.ProveedoresCuentaCorrientes.Add(mov);
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

        public async Task<bool> ActualizarPagoManual(ProveedoresCuentaCorriente mov, bool impactaCaja, int? idCuentaCaja)
        {
            var ex = await _db.ProveedoresCuentaCorrientes.FirstOrDefaultAsync(m => m.Id == mov.Id);
            if (ex is null) return false;

            using var trx = await _db.Database.BeginTransactionAsync();
            try
            {
                ex.IdProveedor = mov.IdProveedor;
                ex.Fecha = mov.Fecha;
                ex.TipoMov = "PAGO";
                ex.Concepto = string.IsNullOrWhiteSpace(mov.Concepto) ? CONCEPTO_PAGO_CC : mov.Concepto.Trim();
                ex.Debe = 0m;
                ex.Haber = mov.Haber;

                Caja? caja = null;
                if (ex.IdMov > 0)
                    caja = await _db.Cajas.FirstOrDefaultAsync(c => c.Id == ex.IdMov && c.TipoMov == "EGRESO");

                if (impactaCaja && idCuentaCaja.HasValue && idCuentaCaja.Value > 0)
                {
                    if (caja is null)
                    {
                        caja = new Caja
                        {
                            IdSucursal = null, // ver comentario en InsertarPagoManual
                            IdCuenta = idCuentaCaja.Value,
                            Fecha = ex.Fecha,
                            TipoMov = "EGRESO",
                            IdMov = null,
                            Concepto = ex.Concepto,
                            Ingreso = 0m,
                            Egreso = ex.Haber
                        };
                        _db.Cajas.Add(caja);
                        await _db.SaveChangesAsync();
                        ex.IdMov = caja.Id;
                    }
                    else
                    {
                        caja.IdCuenta = idCuentaCaja.Value;
                        caja.Fecha = ex.Fecha;
                        caja.Concepto = ex.Concepto;
                        caja.Ingreso = 0m;
                        caja.Egreso = ex.Haber;
                    }
                }
                else
                {
                    if (caja != null)
                    {
                        _db.Cajas.Remove(caja);
                        ex.IdMov = 0;
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

        public async Task<bool> EliminarPagoManual(int id)
        {
            var ex = await _db.ProveedoresCuentaCorrientes.FirstOrDefaultAsync(m => m.Id == id);
            if (ex is null) return false;

            using var trx = await _db.Database.BeginTransactionAsync();
            try
            {
                if (ex.IdMov > 0)
                {
                    var caja = await _db.Cajas.FirstOrDefaultAsync(c => c.Id == ex.IdMov && c.TipoMov == "EGRESO");
                    if (caja != null) _db.Cajas.Remove(caja);
                }

                _db.ProveedoresCuentaCorrientes.Remove(ex);
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

        public Task<bool> ExisteCompra(int idCompra)
            => _db.Compras.AnyAsync(c => c.Id == idCompra);

        public async Task<int?> ObtenerCuentaCajaDeMovimientoCC(int idMovimientoCC)
        {
            var cc = await _db.ProveedoresCuentaCorrientes.AsNoTracking()
                        .FirstOrDefaultAsync(x => x.Id == idMovimientoCC);
            if (cc == null || cc.IdMov <= 0) return null;

            var caja = await _db.Cajas.AsNoTracking()
                        .FirstOrDefaultAsync(c => c.Id == cc.IdMov && c.TipoMov == "EGRESO");
            return caja?.IdCuenta;
        }
    }
}
