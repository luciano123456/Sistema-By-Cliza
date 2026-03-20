// /DAL/Repository/ProveedoresRepository.cs
using Microsoft.EntityFrameworkCore;
using SistemaByCliza.DAL.DataContext;
using SistemaByCliza.Models;

namespace SistemaByCliza.DAL.Repository
{
    public class ProveedoresRepository : IProveedoresRepository<Proveedor>
    {
        private readonly SistemaByClizaContext _dbcontext;

        public ProveedoresRepository(SistemaByClizaContext context)
        {
            _dbcontext = context;
        }

        public async Task<bool> Eliminar(int id)
        {
            var model = await _dbcontext.Proveedores.FirstAsync(p => p.Id == id); // Ajustá el DbSet si es Proveedors
            _dbcontext.Proveedores.Remove(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<Proveedor?> Obtener(int id)
        {
            return await _dbcontext.Proveedores
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == id);
        }

        public Task<IQueryable<Proveedor>> ObtenerTodos()
        {
            IQueryable<Proveedor> query = _dbcontext.Proveedores;
            return Task.FromResult(query);
        }

        public async Task<bool> Insertar(Proveedor model)
        {
            _dbcontext.Proveedores.Add(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Actualizar(Proveedor model)
        {
            _dbcontext.Proveedores.Update(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }
    }
}
