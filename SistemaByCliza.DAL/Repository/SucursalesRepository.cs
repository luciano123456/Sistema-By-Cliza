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
    public class SucursalesRepository : ISucursalesRepository<Sucursal>
    {

        private readonly SistemaByClizaContext _dbcontext;

        public SucursalesRepository(SistemaByClizaContext context)
        {
            _dbcontext = context;
        }
        public async Task<bool> Actualizar(Sucursal model)
        {
            _dbcontext.Sucursales.Update(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Eliminar(int id)
        {
            Sucursal model = _dbcontext.Sucursales.First(c => c.Id == id);
            _dbcontext.Sucursales.Remove(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Insertar(Sucursal model)
        {
            _dbcontext.Sucursales.Add(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<Sucursal> Obtener(int id)
        {
            Sucursal model = await _dbcontext.Sucursales.FindAsync(id);
            return model;
        }
        public async Task<IQueryable<Sucursal>> ObtenerTodos()
        {
            IQueryable<Sucursal> query = _dbcontext.Sucursales;
            return await Task.FromResult(query);
        }




    }
}
