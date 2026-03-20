using Microsoft.EntityFrameworkCore;
using SistemaByCliza.DAL.DataContext;
using SistemaByCliza.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SistemaByCliza.DAL.Repository
{
    public class CajasRepository : ICajasRepository<Caja>
    {
        private readonly SistemaByClizaContext _dbcontext;

        public CajasRepository(SistemaByClizaContext context) => _dbcontext = context;

        public async Task<bool> Actualizar(Caja model)
        {
            _dbcontext.Cajas.Update(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Eliminar(int id)
        {
            Caja model = _dbcontext.Cajas.First(c => c.Id == id);
            _dbcontext.Cajas.Remove(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Insertar(Caja model)
        {
            _dbcontext.Cajas.Add(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<(List<Caja> Lista, decimal SaldoAnterior)> ObtenerFiltradoConSaldoAnterior(
    DateTime? fechaDesde,
    DateTime? fechaHasta,
    int idSucursal,
    int idCuenta,
    string tipo,
    string concepto)
        {
            if (fechaDesde.HasValue && fechaDesde.Value == DateTime.MinValue) fechaDesde = null;
            if (fechaHasta.HasValue && fechaHasta.Value == DateTime.MinValue) fechaHasta = null;

            // Base con TODOS los filtros excepto el rango de fechas (sirve para saldoAnterior y para la lista)
            var baseQ = _dbcontext.Cajas
                .AsNoTracking()
                .Include(c => c.IdCuentaNavigation)
                .Include(c => c.IdSucursalNavigation)
                .AsQueryable();

            if (idSucursal != -1)
                baseQ = baseQ.Where(x => x.IdSucursal == idSucursal);

            if (idCuenta != -1)
                baseQ = baseQ.Where(x => x.IdCuenta == idCuenta);

            if (!string.IsNullOrWhiteSpace(tipo) && !tipo.Equals("TODOS", StringComparison.OrdinalIgnoreCase))
                baseQ = baseQ.Where(x => x.TipoMov == tipo);

            if (!string.IsNullOrWhiteSpace(concepto))
                baseQ = baseQ.Where(x => EF.Functions.Like(x.Concepto ?? "", $"%{concepto}%"));

            // Saldo anterior: todo lo anterior estrictamente a FechaDesde (si la hay)
            decimal saldoAnterior = 0m;
            if (fechaDesde.HasValue)
            {
                var desde = fechaDesde.Value.Date;
                saldoAnterior = await baseQ
                    .Where(x => x.Fecha < desde)
                    .Select(x => (decimal?)(x.Ingreso - x.Egreso))
                    .SumAsync() ?? 0m;
            }

            // Ahora aplicamos rango de fechas para la lista
            var q = baseQ;

            if (fechaDesde.HasValue)
                q = q.Where(x => x.Fecha >= fechaDesde.Value.Date);

            if (fechaHasta.HasValue)
            {
                var hasta = fechaHasta.Value.Date.AddDays(1).AddTicks(-1);
                q = q.Where(x => x.Fecha <= hasta);
            }

            var lista = await q
                .OrderByDescending(x => x.Fecha)
                .ThenByDescending(x => x.Id)
                .ToListAsync();

            return (lista, saldoAnterior);
        }


        public async Task<Caja> Obtener(int id)
        {
            return await _dbcontext.Cajas
                .Include(c => c.IdSucursalNavigation)
                .Include(c => c.IdCuentaNavigation)
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == id);
        }

        public async Task<IQueryable<Caja>> ObtenerTodos()
        {
            IQueryable<Caja> query = _dbcontext.Cajas;
            return await Task.FromResult(query);
        }

        public async Task<List<Caja>> ObtenerFiltrado(
     DateTime? fechaDesde,
     DateTime? fechaHasta,
     int idSucursal,
     int idCuenta,
     string tipo,
     string concepto)
        {
            // Compat: si te llegan MinValue, tratarlos como null
            if (fechaDesde.HasValue && fechaDesde.Value == DateTime.MinValue) fechaDesde = null;
            if (fechaHasta.HasValue && fechaHasta.Value == DateTime.MinValue) fechaHasta = null;

            var q = _dbcontext.Cajas
                .AsNoTracking()
                .Include(c => c.IdCuentaNavigation)
                .Include(c => c.IdSucursalNavigation)
                .AsQueryable();

            if (fechaDesde.HasValue)
            {
                var desde = fechaDesde.Value.Date;
                q = q.Where(x => x.Fecha >= desde);
            }

            if (fechaHasta.HasValue)
            {
                // Hasta inclusiva (23:59:59.9999999 del día)
                var hasta = fechaHasta.Value.Date.AddDays(1).AddTicks(-1);
                q = q.Where(x => x.Fecha <= hasta);
            }

            if (idSucursal != -1)
                q = q.Where(x => x.IdSucursal == idSucursal);

            if (idCuenta != -1)
                q = q.Where(x => x.IdCuenta == idCuenta);

            if (!string.IsNullOrWhiteSpace(tipo) && !tipo.Equals("TODOS", StringComparison.OrdinalIgnoreCase))
                q = q.Where(x => x.TipoMov == tipo);

            if (!string.IsNullOrWhiteSpace(concepto))
                q = q.Where(x => EF.Functions.Like(x.Concepto ?? "", $"%{concepto}%"));

            return await q
                .OrderByDescending(x => x.Fecha)
                .ThenByDescending(x => x.Id)
                .ToListAsync();
        }
    }


}
