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
    public class GastosCategoriasRepository : IGastosCategoriasRepository<GastosCategoria>
    {

        private readonly SistemaByClizaContext _dbcontext;

        public GastosCategoriasRepository(SistemaByClizaContext context)
        {
            _dbcontext = context;
        }
        public async Task<bool> Actualizar(GastosCategoria model)
        {
            _dbcontext.GastosCategorias.Update(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Eliminar(int id)
        {
            GastosCategoria model = _dbcontext.GastosCategorias.First(c => c.Id == id);
            _dbcontext.GastosCategorias.Remove(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Insertar(GastosCategoria model)
        {
            _dbcontext.GastosCategorias.Add(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<GastosCategoria> Obtener(int id)
        {
            GastosCategoria model = await _dbcontext.GastosCategorias.FindAsync(id);
            return model;
        }
        public async Task<IQueryable<GastosCategoria>> ObtenerTodos()
        {
            IQueryable<GastosCategoria> query = _dbcontext.GastosCategorias;
            return await Task.FromResult(query);
        }




    }
}
