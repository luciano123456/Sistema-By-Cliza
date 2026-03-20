// SistemaByCliza.DAL.Repository/CuentasCorrientesRepository.cs
using Microsoft.EntityFrameworkCore;
using SistemaByCliza.DAL.DataContext;
using SistemaByCliza.Models;

namespace SistemaByCliza.DAL.Repository
{
    public class CuentasCorrientesRepository : ICuentasCorrientesRepository<ClientesCuentaCorriente>
    {
        private readonly SistemaByClizaContext _db;
        public CuentasCorrientesRepository(SistemaByClizaContext db) { _db = db; }

        private const string CONCEPTO_VENTA = "VENTA";
        private const string CONCEPTO_COBRO_VENTA = "COBRO VENTA";
        private const string CONCEPTO_COBRO_CC = "COBRO CC";

        public async Task<List<Cliente>> ListarClientes(string? texto)
        {
            var q = _db.Clientes.AsNoTracking();
            if (!string.IsNullOrWhiteSpace(texto))
            {
                var t = texto.Trim();
                q = q.Where(c =>
                    EF.Functions.Like(c.Nombre ?? "", $"%{t}%") ||
                    EF.Functions.Like(c.Dni ?? "", $"%{t}%") ||
                    EF.Functions.Like(c.Cuit ?? "", $"%{t}%"));
            }
            return await q.OrderBy(c => c.Nombre).ToListAsync();
        }

        public async Task<(List<ClientesCuentaCorriente> Lista, decimal SaldoAnterior)> ListarConSaldoAnterior(
            int idCliente, DateTime? desde, DateTime? hasta, int? idSucursal, string? texto)
        {
            var baseQ = _db.ClientesCuentaCorrientes
                .Include(m => m.IdSucursalNavigation)
                .AsNoTracking()
                .AsQueryable();

            if (idCliente != -1) baseQ = baseQ.Where(m => m.IdCliente == idCliente);
            if (idSucursal.HasValue && idSucursal > 0) baseQ = baseQ.Where(m => m.IdSucursal == idSucursal.Value);
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

        public async Task<decimal> ObtenerSaldo(int idCliente, int? idSucursal)
        {
            var q = _db.ClientesCuentaCorrientes.Where(m => m.IdCliente == idCliente);
            if (idSucursal.HasValue && idSucursal > 0) q = q.Where(m => m.IdSucursal == idSucursal.Value);
            var debe = await q.SumAsync(m => (decimal?)m.Debe) ?? 0m;
            var haber = await q.SumAsync(m => (decimal?)m.Haber) ?? 0m;
            return haber - debe;
        }

        public Task<ClientesCuentaCorriente?> Obtener(int id)
            => _db.ClientesCuentaCorrientes
                  .Include(m => m.IdSucursalNavigation)
                  .AsNoTracking()
                  .FirstOrDefaultAsync(m => m.Id == id);

        // ---- Insertar COBRO manual (IdMov = Id de Caja creada si impacta)
        public async Task<bool> InsertarManual(ClientesCuentaCorriente mov, bool impactaCaja, int? idCuentaCaja)
        {
            mov.IdMov = 0;
            mov.TipoMov = "COBRO";
            mov.Concepto = string.IsNullOrWhiteSpace(mov.Concepto) ? CONCEPTO_COBRO_CC : mov.Concepto.Trim();
            mov.Debe = 0m;

            using var trx = await _db.Database.BeginTransactionAsync();
            try
            {
                if (impactaCaja && idCuentaCaja.HasValue && idCuentaCaja.Value > 0)
                {
                    var caja = new Caja
                    {
                        IdSucursal = mov.IdSucursal,
                        IdCuenta = idCuentaCaja.Value,
                        Fecha = mov.Fecha,
                        TipoMov = "INGRESO",
                        IdMov = null, // el vínculo va CC.IdMov -> Caja.Id
                        Concepto = mov.Concepto,
                        Ingreso = mov.Haber,
                        Egreso = 0m
                    };
                    _db.Cajas.Add(caja);
                    await _db.SaveChangesAsync();
                    mov.IdMov = caja.Id; // enlazamos CC con Caja
                }

                _db.ClientesCuentaCorrientes.Add(mov);
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

        public async Task<bool> ActualizarManual(ClientesCuentaCorriente mov, bool impactaCaja, int? idCuentaCaja)
        {
            var ex = await _db.ClientesCuentaCorrientes.FirstOrDefaultAsync(m => m.Id == mov.Id);
            if (ex is null) return false;

            using var trx = await _db.Database.BeginTransactionAsync();
            try
            {
                ex.IdSucursal = mov.IdSucursal;
                ex.IdCliente = mov.IdCliente;
                ex.Fecha = mov.Fecha;
                ex.TipoMov = "COBRO";
                ex.Concepto = string.IsNullOrWhiteSpace(mov.Concepto) ? CONCEPTO_COBRO_CC : mov.Concepto.Trim();
                ex.Debe = 0m;
                ex.Haber = mov.Haber;

                Caja? caja = null;
                if (ex.IdMov > 0)
                    caja = await _db.Cajas.FirstOrDefaultAsync(c => c.Id == ex.IdMov && c.TipoMov == "INGRESO");

                if (impactaCaja && idCuentaCaja.HasValue && idCuentaCaja.Value > 0)
                {
                    if (caja is null)
                    {
                        caja = new Caja
                        {
                            IdSucursal = ex.IdSucursal,
                            IdCuenta = idCuentaCaja.Value,
                            Fecha = ex.Fecha,
                            TipoMov = "INGRESO",
                            IdMov = null,
                            Concepto = ex.Concepto,
                            Ingreso = ex.Haber,
                            Egreso = 0m
                        };
                        _db.Cajas.Add(caja);
                        await _db.SaveChangesAsync();
                        ex.IdMov = caja.Id;
                    }
                    else
                    {
                        caja.IdSucursal = ex.IdSucursal;
                        caja.IdCuenta = idCuentaCaja.Value;
                        caja.Fecha = ex.Fecha;
                        caja.Concepto = ex.Concepto;
                        caja.Ingreso = ex.Haber;
                        caja.Egreso = 0m;
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

        public async Task<bool> EliminarManual(int id)
        {
            var ex = await _db.ClientesCuentaCorrientes.FirstOrDefaultAsync(m => m.Id == id);
            if (ex is null) return false;

            using var trx = await _db.Database.BeginTransactionAsync();
            try
            {
                if (ex.IdMov > 0)
                {
                    var caja = await _db.Cajas.FirstOrDefaultAsync(c => c.Id == ex.IdMov && c.TipoMov == "INGRESO");
                    if (caja != null) _db.Cajas.Remove(caja);
                }

                _db.ClientesCuentaCorrientes.Remove(ex);
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

        public Task<bool> ExisteVenta(int idVenta)
            => _db.Ventas.AnyAsync(v => v.Id == idVenta);

        public async Task<int?> ObtenerCuentaCajaDeMovimientoCC(int idMovimientoCC)
        {
            var cc = await _db.ClientesCuentaCorrientes.AsNoTracking()
                        .FirstOrDefaultAsync(x => x.Id == idMovimientoCC);
            if (cc == null || cc.IdMov <= 0) return null;

            var caja = await _db.Cajas.AsNoTracking()
                        .FirstOrDefaultAsync(c => c.Id == cc.IdMov && c.TipoMov == "INGRESO");
            return caja?.IdCuenta;
        }
    }
}
