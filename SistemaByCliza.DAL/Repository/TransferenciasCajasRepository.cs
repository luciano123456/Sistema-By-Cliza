// DAL/Repository/TransferenciasCajasRepository.cs
using Microsoft.EntityFrameworkCore;
using SistemaByCliza.DAL.DataContext;
using SistemaByCliza.Models;

namespace SistemaByCliza.DAL.Repository
{
    public class TransferenciasCajasRepository : ITransferenciasCajasRepository
    {
        private readonly SistemaByClizaContext _db;
        public TransferenciasCajasRepository(SistemaByClizaContext db) => _db = db;

        public async Task<(bool ok, int transferenciaId)> CrearAtomico(
            CajasTransfEntreCuenta dto, Caja cajaEgreso, Caja cajaIngreso)
        {
            using var tx = await _db.Database.BeginTransactionAsync();
            try
            {
                _db.Cajas.AddRange(cajaEgreso, cajaIngreso);
                await _db.SaveChangesAsync();

                dto.IdCajaOrigen = cajaEgreso.Id;
                dto.IdCajaDestino = cajaIngreso.Id;
                _db.CajasTransfEntreCuentas.Add(dto);
                await _db.SaveChangesAsync();

                await tx.CommitAsync();
                return (true, dto.Id);
            }
            catch
            {
                await tx.RollbackAsync();
                throw;
            }
        }

        public async Task<bool> ActualizarAtomico(
            int transferenciaId, DateTime fecha,
            int idCuentaOrigen, decimal importeOrigen,
            int idCuentaDestino, decimal importeDestino,
            string conceptoOrigen, string conceptoDestino, string? nota)
        {
            using var tx = await _db.Database.BeginTransactionAsync();
            try
            {
                var tr = await _db.CajasTransfEntreCuentas
                    .FirstOrDefaultAsync(t => t.Id == transferenciaId);
                if (tr is null) return false;

                var co = await _db.Cajas.FirstOrDefaultAsync(c => c.Id == tr.IdCajaOrigen);
                var cd = await _db.Cajas.FirstOrDefaultAsync(c => c.Id == tr.IdCajaDestino);
                if (co is null || cd is null) return false;

                // Caja origen (Egreso)
                co.Fecha = fecha;
                co.IdCuenta = idCuentaOrigen;
                co.TipoMov = "Egreso";
                co.Concepto = conceptoOrigen;
                co.Ingreso = 0m;
                co.Egreso = importeOrigen;

                // Caja destino (Ingreso)
                cd.Fecha = fecha;
                cd.IdCuenta = idCuentaDestino;
                cd.TipoMov = "Ingreso";
                cd.Concepto = conceptoDestino;
                cd.Ingreso = importeDestino;
                cd.Egreso = 0m;

                // Transferencia
                tr.IdCuentaOrigen = idCuentaOrigen;
                tr.ImporteOrigen = importeOrigen;
                tr.IdCuentaDestino = idCuentaDestino;
                tr.ImporteDestino = importeDestino;
                tr.NotaInterna = nota;

                await _db.SaveChangesAsync();
                await tx.CommitAsync();
                return true;
            }
            catch
            {
                await tx.RollbackAsync();
                throw;
            }
        }

        public async Task<bool> EliminarAtomico(int idTransferencia)
        {
            using var tx = await _db.Database.BeginTransactionAsync();
            try
            {
                var tr = await _db.CajasTransfEntreCuentas
                    .FirstOrDefaultAsync(t => t.Id == idTransferencia);
                if (tr is null) return false;

                // Traer cajas
                var co = tr.IdCajaOrigen is int ido ? await _db.Cajas.FindAsync(ido) : null;
                var cd = tr.IdCajaDestino is int idd ? await _db.Cajas.FindAsync(idd) : null;

                if (co is not null) _db.Cajas.Remove(co);
                if (cd is not null) _db.Cajas.Remove(cd);

                _db.CajasTransfEntreCuentas.Remove(tr);
                await _db.SaveChangesAsync();

                await tx.CommitAsync();
                return true;
            }
            catch
            {
                await tx.RollbackAsync();
                throw;
            }
        }

        public async Task<CajasTransfEntreCuenta?> ObtenerPorCajaId(int idCaja)
        {
            return await _db.CajasTransfEntreCuentas
                .Include(t => t.IdCuentaOrigenNavigation)
                .Include(t => t.IdCuentaDestinoNavigation)
                .AsNoTracking()
                .FirstOrDefaultAsync(t => t.IdCajaOrigen == idCaja || t.IdCajaDestino == idCaja);
        }

        public async Task<List<CajasTransfEntreCuenta>> Historial()
        {
            return await _db.CajasTransfEntreCuentas
                .Include(t => t.IdCuentaOrigenNavigation)
                .Include(t => t.IdCuentaDestinoNavigation)
                .AsNoTracking()
                .OrderByDescending(t => t.Id)
                .ToListAsync();
        }
    }
}
