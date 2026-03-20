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
    public class ClientesRepository : IClientesRepository<Cliente>
    {

        private readonly SistemaByClizaContext _dbcontext;

        public ClientesRepository(SistemaByClizaContext context)
        {
            _dbcontext = context;
        }
        public async Task<bool> Actualizar(Cliente model)
        {
            try
            {
                _dbcontext.Clientes.Update(model);
                await _dbcontext.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                return false;
            }
        }

        public async Task<bool> Eliminar(int id)
        {
            try
            {
                Cliente model = _dbcontext.Clientes.First(c => c.Id == id);
                _dbcontext.Clientes.Remove(model);
                await _dbcontext.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                return false;
            }
        }

        public async Task<bool> Insertar(Cliente model)
        {
            try
            {
                _dbcontext.Clientes.Add(model);
                await _dbcontext.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                return false;
            }
        }

        public async Task<Cliente> Obtener(int id)
        {
            try
            {
                Cliente model = await _dbcontext.Clientes.FindAsync(id);
                return model;
            }
            catch (Exception ex)
            {
                return null;
            }
        }

        public async Task<Cliente> ObtenerCliente(string Cliente)
        {
            try
            {
                Cliente model = await _dbcontext.Clientes.Where(x => x.Nombre.ToUpper() == Cliente.ToUpper()).FirstOrDefaultAsync();
                return model;
            }
            catch (Exception ex)
            {
                return null;
            }
        }

        public async Task<IQueryable<Cliente>> ObtenerTodos()
        {
            try
            {
                IQueryable<Cliente> query = _dbcontext.Clientes
                    .Include(c => c.IdProvinciaNavigation)
                    .Include(c => c.IdCondicionIvaNavigation);

                return await Task.FromResult(query);

            }
            catch (Exception ex)
            {
                return null;
            }
        }




    }
}
