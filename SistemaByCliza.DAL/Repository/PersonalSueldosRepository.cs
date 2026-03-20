// SistemaByCliza.DAL/Repository/PersonalSueldosRepository.cs
using Microsoft.EntityFrameworkCore;
using SistemaByCliza.DAL.DataContext;
using SistemaByCliza.Models;

namespace SistemaByCliza.DAL.Repository
{
    public class PersonalSueldosRepository : IPersonalSueldosRepository<PersonalSueldo>
    {
        private readonly SistemaByClizaContext _db;

        public PersonalSueldosRepository(SistemaByClizaContext db) { _db = db; }

        private const string CONCEPTO_Caja = "PAGO SUELDO";

        private async Task<int> GetSucursalFromSueldoAsync(int idSueldo)
        {
            // Se asume Personal tiene IdSucursal
            return await _db.Personals
                .Where(p => _db.PersonalSueldos.Any(s => s.Id == idSueldo && s.IdPersonal == p.Id))
                .Select(p => p.IdSucursal)
                .FirstOrDefaultAsync();
        }

        private async Task<int> GetSucursalFromPersonalAsync(int idPersonal)
        {
            return await _db.Personals
                .Where(p => p.Id == idPersonal)
                .Select(p => p.IdSucursal)
                .FirstOrDefaultAsync();
        }

        public async Task<List<PersonalSueldo>> Listar(
           DateTime? fechaDesde,
           DateTime? fechaHasta,
           int? idPersonal,
           string? estado,
           string? concepto)
        {
            var q = _db.PersonalSueldos
                .Include(s => s.IdPersonalNavigation)
                .AsNoTracking()
                .AsQueryable();

            if (fechaDesde.HasValue)
                q = q.Where(s => s.Fecha >= fechaDesde.Value.Date);

            if (fechaHasta.HasValue)
            {
                var hasta = fechaHasta.Value.Date.AddDays(1).AddTicks(-1);
                q = q.Where(s => s.Fecha <= hasta);
            }

            if (idPersonal.HasValue && idPersonal.Value > 0)
                q = q.Where(s => s.IdPersonal == idPersonal.Value);

            if (!string.IsNullOrWhiteSpace(concepto))
                q = q.Where(s => EF.Functions.Like(s.Concepto ?? "", $"%{concepto}%"));

            if (!string.IsNullOrWhiteSpace(estado))
            {
                switch (estado.Trim().ToLowerInvariant())
                {
                    case "con_saldo": // aún queda saldo (>0)
                        q = q.Where(s => s.Saldo > 0);
                        break;
                    case "saldado":    // saldo = 0
                        q = q.Where(s => s.Saldo == 0);
                        break;
                    case "sinpagos":  // sin pagos realizados (abonado = 0) — opcional
                        q = q.Where(s => s.ImporteAbonado == 0);
                        break;
                        // default: no filtra (todos)
                }
            }

            return await q
                .OrderByDescending(s => s.Fecha)
                .ThenByDescending(s => s.Id)
                .ToListAsync();
        }
    

        // ----------------- SUELDOS (cabecera) -----------------
        public async Task<bool> Insertar(PersonalSueldo model)
        {
            using var trx = await _db.Database.BeginTransactionAsync();
            try
            {
                model.ImporteAbonado = 0m;
                model.Saldo = model.Importe;

                _db.PersonalSueldos.Add(model);
                await _db.SaveChangesAsync();

                await trx.CommitAsync();
                return true;
            }
            catch { await trx.RollbackAsync(); return false; }
        }

        public async Task<bool> Actualizar(PersonalSueldo model)
        {
            using var trx = await _db.Database.BeginTransactionAsync();
            try
            {
                var ent = await _db.PersonalSueldos.FirstOrDefaultAsync(x => x.Id == model.Id);
                if (ent is null) return false;

                ent.IdPersonal = model.IdPersonal;
                ent.Fecha = model.Fecha;
                ent.Concepto = model.Concepto;
                ent.Importe = model.Importe;
                ent.NotaInterna = model.NotaInterna;

                // Recalcular abonado/saldo (pagos ya están normalizados por otros métodos)
                var abonado = await _db.PersonalSueldosPagos
                    .Where(p => p.IdSueldo == ent.Id)
                    .SumAsync(p => (decimal?)p.Importe) ?? 0m;

                ent.ImporteAbonado = abonado;
                ent.Saldo = ent.Importe - abonado;

                _db.PersonalSueldos.Update(ent);
                await _db.SaveChangesAsync();

                await trx.CommitAsync();
                return true;
            }
            catch { await trx.RollbackAsync(); return false; }
        }

        public async Task<bool> Eliminar(int id)
        {
            using var trx = await _db.Database.BeginTransactionAsync();
            try
            {
                var ent = await _db.PersonalSueldos
                    .Include(s => s.PersonalSueldosPagos)
                    .FirstOrDefaultAsync(x => x.Id == id);

                if (ent is null) return false;

                // Eliminar cajas de los pagos
                var idCajas = ent.PersonalSueldosPagos
                    .Where(p => p.IdCaja.HasValue)
                    .Select(p => p.IdCaja!.Value)
                    .ToList();

                if (idCajas.Any())
                {
                    var movs = await _db.Cajas
                        .Where(c => idCajas.Contains(c.Id) && c.Concepto == CONCEPTO_Caja)
                        .ToListAsync();
                    if (movs.Any()) _db.Cajas.RemoveRange(movs);
                }

                if (ent.PersonalSueldosPagos.Any())
                    _db.PersonalSueldosPagos.RemoveRange(ent.PersonalSueldosPagos);

                _db.PersonalSueldos.Remove(ent);
                await _db.SaveChangesAsync();

                await trx.CommitAsync();
                return true;
            }
            catch { await trx.RollbackAsync(); return false; }
        }

        public Task<PersonalSueldo?> Obtener(int id) =>
            _db.PersonalSueldos
                .Include(s => s.IdPersonalNavigation)
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == id);

        public Task<IQueryable<PersonalSueldo>> ObtenerTodos()
        {
            IQueryable<PersonalSueldo> q = _db.PersonalSueldos
                .Include(s => s.IdPersonalNavigation)
                .AsNoTracking();
            return Task.FromResult(q);
        }

        // ----------------- PAGOS unitarios (con Caja) -----------------
        public async Task<bool> InsertarPago(PersonalSueldosPago pago)
        {
            using var trx = await _db.Database.BeginTransactionAsync();
            try
            {
                var sueldo = await _db.PersonalSueldos.FirstOrDefaultAsync(x => x.Id == pago.IdSueldo);
                if (sueldo is null) return false;

                // 1) Insertar pago (para obtener Id)
                _db.PersonalSueldosPagos.Add(pago);
                await _db.SaveChangesAsync();

                // 2) Insertar movimiento de caja asociado
                var idSucursal = await GetSucursalFromSueldoAsync(pago.IdSueldo);
                var mov = new Caja
                {
                    IdSucursal = idSucursal,
                    IdCuenta = pago.IdCuenta,
                    Fecha = pago.Fecha,
                    TipoMov = "EGRESO",
                    Concepto = CONCEPTO_Caja,
                    Ingreso = 0m,
                    Egreso = pago.Importe,
                    IdMov = pago.Id
                };
                _db.Cajas.Add(mov);
                await _db.SaveChangesAsync();

                // 3) Vincular IdCaja al pago
                pago.IdCaja = mov.Id;
                await _db.SaveChangesAsync();

                // 4) Recalcular cabecera
                var abonado = await _db.PersonalSueldosPagos
                    .Where(p => p.IdSueldo == pago.IdSueldo)
                    .SumAsync(p => (decimal?)p.Importe) ?? 0m;

                sueldo.ImporteAbonado = abonado;
                sueldo.Saldo = sueldo.Importe - abonado;
                await _db.SaveChangesAsync();

                await trx.CommitAsync();
                return true;
            }
            catch { await trx.RollbackAsync(); return false; }
        }

        public async Task<bool> ActualizarPago(PersonalSueldosPago pago)
        {
            using var trx = await _db.Database.BeginTransactionAsync();
            try
            {
                var ent = await _db.PersonalSueldosPagos.FirstOrDefaultAsync(x => x.Id == pago.Id);
                if (ent is null) return false;

                // 1) Actualizar pago
                ent.Fecha = pago.Fecha;
                ent.IdCuenta = pago.IdCuenta;
                ent.Importe = pago.Importe;
                ent.NotaInterna = pago.NotaInterna;
                await _db.SaveChangesAsync();

                // 2) Actualizar (o crear) movimiento de caja
                Caja? mov = null;
                if (ent.IdCaja.HasValue)
                {
                    mov = await _db.Cajas.FirstOrDefaultAsync(c => c.Id == ent.IdCaja && c.Concepto == CONCEPTO_Caja);
                }

                if (mov is null)
                {
                    var idSucursal = await GetSucursalFromSueldoAsync(ent.IdSueldo);
                    mov = new Caja
                    {
                        IdSucursal = idSucursal,
                        IdCuenta = ent.IdCuenta,
                        Fecha = ent.Fecha,
                        TipoMov = "EGRESO",
                        Concepto = CONCEPTO_Caja,
                        Ingreso = 0m,
                        Egreso = ent.Importe,
                        IdMov = ent.Id
                    };
                    _db.Cajas.Add(mov);
                    await _db.SaveChangesAsync();
                    ent.IdCaja = mov.Id;
                    await _db.SaveChangesAsync();
                }
                else
                {
                    mov.IdCuenta = ent.IdCuenta;
                    mov.Fecha = ent.Fecha;
                    mov.TipoMov = "EGRESO";
                    mov.Concepto = CONCEPTO_Caja;
                    mov.Ingreso = 0m;
                    mov.Egreso = ent.Importe;
                    await _db.SaveChangesAsync();
                }

                // 3) Recalcular cabecera
                var sueldo = await _db.PersonalSueldos.FirstAsync(x => x.Id == ent.IdSueldo);
                var abonado = await _db.PersonalSueldosPagos
                    .Where(p => p.IdSueldo == ent.IdSueldo)
                    .SumAsync(p => (decimal?)p.Importe) ?? 0m;

                sueldo.ImporteAbonado = abonado;
                sueldo.Saldo = sueldo.Importe - abonado;
                await _db.SaveChangesAsync();

                await trx.CommitAsync();
                return true;
            }
            catch { await trx.RollbackAsync(); return false; }
        }

        public async Task<bool> EliminarPago(int idPago)
        {
            using var trx = await _db.Database.BeginTransactionAsync();
            try
            {
                var pago = await _db.PersonalSueldosPagos.FirstOrDefaultAsync(x => x.Id == idPago);
                if (pago is null) return false;

                var idSueldo = pago.IdSueldo;
                var idCaja = pago.IdCaja;

                // 1) Eliminar pago
                _db.PersonalSueldosPagos.Remove(pago);
                await _db.SaveChangesAsync();

                // 2) Eliminar movimiento de caja si existía
                if (idCaja.HasValue)
                {
                    var mov = await _db.Cajas.FirstOrDefaultAsync(c => c.Id == idCaja.Value && c.Concepto == CONCEPTO_Caja);
                    if (mov is not null)
                    {
                        _db.Cajas.Remove(mov);
                        await _db.SaveChangesAsync();
                    }
                }

                // 3) Recalcular cabecera
                var sueldo = await _db.PersonalSueldos.FirstAsync(x => x.Id == idSueldo);
                var abonado = await _db.PersonalSueldosPagos
                    .Where(p => p.IdSueldo == idSueldo)
                    .SumAsync(p => (decimal?)p.Importe) ?? 0m;

                sueldo.ImporteAbonado = abonado;
                sueldo.Saldo = sueldo.Importe - abonado;
                await _db.SaveChangesAsync();

                await trx.CommitAsync();
                return true;
            }
            catch { await trx.RollbackAsync(); return false; }
        }

        public Task<PersonalSueldosPago?> ObtenerPago(int idPago) =>
            _db.PersonalSueldosPagos
                .Include(p => p.IdCuentaNavigation)
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == idPago);

        public Task<List<PersonalSueldosPago>> ObtenerPagosPorSueldo(int idSueldo) =>
            _db.PersonalSueldosPagos
                .Include(p => p.IdCuentaNavigation)
                .Where(p => p.IdSueldo == idSueldo)
                .OrderByDescending(p => p.Fecha).ThenByDescending(p => p.Id)
                .AsNoTracking()
                .ToListAsync();

        // ----------------- UPSERT TRANSACCIONAL (todo junto) -----------------
        public async Task<bool> InsertarConPagos(PersonalSueldo sueldo, IEnumerable<PersonalSueldosPago> pagos)
        {
            using var trx = await _db.Database.BeginTransactionAsync();
            try
            {
                // Insert cabecera
                sueldo.ImporteAbonado = 0m;
                sueldo.Saldo = sueldo.Importe;
                _db.PersonalSueldos.Add(sueldo);
                await _db.SaveChangesAsync();

                var idSucursal = await GetSucursalFromPersonalAsync(sueldo.IdPersonal);

                decimal abonado = 0m;

                // Insert pagos + su Caja
                foreach (var p in (pagos ?? Enumerable.Empty<PersonalSueldosPago>()))
                {
                    var pago = new PersonalSueldosPago
                    {
                        IdSueldo = sueldo.Id,
                        Fecha = p.Fecha,
                        IdCuenta = p.IdCuenta,
                        Importe = p.Importe,
                        NotaInterna = p.NotaInterna
                    };

                    _db.PersonalSueldosPagos.Add(pago);
                    await _db.SaveChangesAsync(); // para tener Id del pago

                    var mov = new Caja
                    {
                        IdSucursal = idSucursal,
                        IdCuenta = pago.IdCuenta,
                        Fecha = pago.Fecha,
                        TipoMov = "EGRESO",
                        Concepto = CONCEPTO_Caja,
                        Ingreso = 0m,
                        Egreso = pago.Importe,
                        IdMov = pago.Id
                    };
                    _db.Cajas.Add(mov);
                    await _db.SaveChangesAsync();

                    pago.IdCaja = mov.Id;
                    await _db.SaveChangesAsync();

                    abonado += pago.Importe;
                }

                // Recalcular totales
                sueldo.ImporteAbonado = abonado;
                sueldo.Saldo = sueldo.Importe - abonado;
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

        public async Task<bool> ActualizarConPagos(PersonalSueldo sueldo, IEnumerable<PersonalSueldosPago> pagos)
        {
            using var trx = await _db.Database.BeginTransactionAsync();
            try
            {
                var ent = await _db.PersonalSueldos
                    .Include(s => s.PersonalSueldosPagos)
                    .FirstOrDefaultAsync(x => x.Id == sueldo.Id);

                if (ent is null) return false;

                // Update cabecera
                ent.IdPersonal = sueldo.IdPersonal;
                ent.Fecha = sueldo.Fecha;
                ent.Concepto = sueldo.Concepto;
                ent.Importe = sueldo.Importe;
                ent.NotaInterna = sueldo.NotaInterna;

                var idSucursal = await GetSucursalFromPersonalAsync(ent.IdPersonal);
                var incoming = pagos?.ToList() ?? new List<PersonalSueldosPago>();

                // 1) Eliminar pagos (y sus Cajas) que ya no están
                var idsIncoming = incoming.Where(p => p.Id > 0).Select(p => p.Id).ToHashSet();
                var toDelete = ent.PersonalSueldosPagos.Where(p => !idsIncoming.Contains(p.Id)).ToList();
                if (toDelete.Any())
                {
                    var idCajas = toDelete.Where(p => p.IdCaja.HasValue).Select(p => p.IdCaja!.Value).ToList();
                    if (idCajas.Any())
                    {
                        var movs = await _db.Cajas
                            .Where(c => idCajas.Contains(c.Id) && c.Concepto == CONCEPTO_Caja)
                            .ToListAsync();
                        if (movs.Any()) _db.Cajas.RemoveRange(movs);
                    }
                    _db.PersonalSueldosPagos.RemoveRange(toDelete);
                }

                // 2) Agregar/Actualizar pagos (y sincronizar Caja)
                foreach (var p in incoming)
                {
                    if (p.Id > 0)
                    {
                        var ex = ent.PersonalSueldosPagos.FirstOrDefault(x => x.Id == p.Id);
                        if (ex != null)
                        {
                            ex.Fecha = p.Fecha;
                            ex.IdCuenta = p.IdCuenta;
                            ex.Importe = p.Importe;
                            ex.NotaInterna = p.NotaInterna;

                            // Caja existente o nueva
                            Caja? mov = null;
                            if (ex.IdCaja.HasValue)
                                mov = await _db.Cajas.FirstOrDefaultAsync(c => c.Id == ex.IdCaja && c.Concepto == CONCEPTO_Caja);

                            if (mov is null)
                            {
                                mov = new Caja
                                {
                                    IdSucursal = idSucursal,
                                    IdCuenta = ex.IdCuenta,
                                    Fecha = ex.Fecha,
                                    TipoMov = "EGRESO",
                                    Concepto = CONCEPTO_Caja,
                                    Ingreso = 0m,
                                    Egreso = ex.Importe,
                                    IdMov = ex.Id
                                };
                                _db.Cajas.Add(mov);
                                await _db.SaveChangesAsync();
                                ex.IdCaja = mov.Id;
                            }
                            else
                            {
                                mov.IdCuenta = ex.IdCuenta;
                                mov.Fecha = ex.Fecha;
                                mov.TipoMov = "EGRESO";
                                mov.Concepto = CONCEPTO_Caja;
                                mov.Ingreso = 0m;
                                mov.Egreso = ex.Importe;
                            }
                        }
                    }
                    else
                    {
                        var nuevo = new PersonalSueldosPago
                        {
                            IdSueldo = ent.Id,
                            Fecha = p.Fecha,
                            IdCuenta = p.IdCuenta,
                            Importe = p.Importe,
                            NotaInterna = p.NotaInterna
                        };
                        ent.PersonalSueldosPagos.Add(nuevo);
                        await _db.SaveChangesAsync(); // Id del pago

                        var mov = new Caja
                        {
                            IdSucursal = idSucursal,
                            IdCuenta = nuevo.IdCuenta,
                            Fecha = nuevo.Fecha,
                            TipoMov = "EGRESO",
                            Concepto = CONCEPTO_Caja,
                            Ingreso = 0m,
                            Egreso = nuevo.Importe,
                            IdMov = nuevo.Id
                        };
                        _db.Cajas.Add(mov);
                        await _db.SaveChangesAsync();

                        nuevo.IdCaja = mov.Id;
                    }
                }

                await _db.SaveChangesAsync();

                // 3) Recalcular abonado/saldo
                var abonado = await _db.PersonalSueldosPagos
                    .Where(p => p.IdSueldo == ent.Id)
                    .SumAsync(p => (decimal?)p.Importe) ?? 0m;

                ent.ImporteAbonado = abonado;
                ent.Saldo = ent.Importe - abonado;

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
