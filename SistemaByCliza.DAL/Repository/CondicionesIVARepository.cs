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
    public class CondicionesIVARepository : ICondicionesIVARepository<CondicionesIva>
    {

        private readonly SistemaByClizaContext _dbcontext;

        public CondicionesIVARepository(SistemaByClizaContext context)
        {
            _dbcontext = context;
        }
        public async Task<bool> Actualizar(CondicionesIva model)
        {
            _dbcontext.CondicionesIvas.Update(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Eliminar(int id)
        {
            CondicionesIva model = _dbcontext.CondicionesIvas.First(c => c.Id == id);
            _dbcontext.CondicionesIvas.Remove(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Insertar(CondicionesIva model)
        {
            _dbcontext.CondicionesIvas.Add(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<CondicionesIva> Obtener(int id)
        {
            CondicionesIva model = await _dbcontext.CondicionesIvas.FindAsync(id);
            return model;
        }
        public async Task<IQueryable<CondicionesIva>> ObtenerTodos()
        {
            IQueryable<CondicionesIva> query = _dbcontext.CondicionesIvas;
            return await Task.FromResult(query);
        }




    }
}
