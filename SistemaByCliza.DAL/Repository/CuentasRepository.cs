using Microsoft.EntityFrameworkCore;
using SistemaByCliza.DAL.DataContext;
using SistemaByCliza.Models;
using System;
using System.Collections.Generic;
using System.Diagnostics.Contracts;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static Microsoft.EntityFrameworkCore.DbLoggerCategory;

namespace SistemaByCliza.DAL.Repository
{
    public class CuentasRepository : ICuentasRepository<Cuenta>
    {

        private readonly SistemaByClizaContext _dbcontext;

        public CuentasRepository(SistemaByClizaContext context)
        {
            _dbcontext = context;
        }
        public async Task<bool> Actualizar(Cuenta model)
        {
            _dbcontext.Cuentas.Update(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Eliminar(int id)
        {
            Cuenta model = _dbcontext.Cuentas.First(c => c.Id == id);
            _dbcontext.Cuentas.Remove(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<int> Insertar(Cuenta model)
        {
            _dbcontext.Cuentas.Add(model);
            await _dbcontext.SaveChangesAsync();
            return model.Id;
        }

        public async Task<Cuenta> Obtener(int id)
        {
            Cuenta model = await _dbcontext.Cuentas.FindAsync(id);
            return model;
        }
        public async Task<IQueryable<Cuenta>> ObtenerTodos()
        {
            IQueryable<Cuenta> query = _dbcontext.Cuentas;
            return await Task.FromResult(query);
        }




    }
}
