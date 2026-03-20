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
    public class BancosRepository : IBancosRepository<Banco>
    {

        private readonly SistemaByClizaContext _dbcontext;

        public BancosRepository(SistemaByClizaContext context)
        {
            _dbcontext = context;
        }
        public async Task<bool> Actualizar(Banco model)
        {
            _dbcontext.Bancos.Update(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Eliminar(int id)
        {
            Banco model = _dbcontext.Bancos.First(c => c.Id == id);
            _dbcontext.Bancos.Remove(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Insertar(Banco model)
        {
            _dbcontext.Bancos.Add(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<Banco> Obtener(int id)
        {
            Banco model = await _dbcontext.Bancos.FindAsync(id);
            return model;
        }
        public async Task<IQueryable<Banco>> ObtenerTodos()
        {
            IQueryable<Banco> query = _dbcontext.Bancos;
            return await Task.FromResult(query);
        }




    }
}
