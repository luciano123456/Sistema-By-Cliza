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
    public class PersonalRepository : IPersonalRepository<Personal>
    {

        private readonly SistemaByClizaContext _dbcontext;

        public PersonalRepository(SistemaByClizaContext context)
        {
            _dbcontext = context;
        }
        public async Task<bool> Actualizar(Personal model)
        {
            _dbcontext.Personals.Update(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Eliminar(int id)
        {
            Personal model = _dbcontext.Personals.First(c => c.Id == id);
            _dbcontext.Personals.Remove(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<int> Insertar(Personal model)
        {
            _dbcontext.Personals.Add(model);
            await _dbcontext.SaveChangesAsync();
            return model.Id;
        }

        public async Task<Personal> Obtener(int id)
        {
            Personal model = await _dbcontext.Personals.FindAsync(id);
            return model;
        }
        public async Task<IQueryable<Personal>> ObtenerTodos()
        {
            IQueryable<Personal> query = _dbcontext.Personals;
            return await Task.FromResult(query);
        }




    }
}
