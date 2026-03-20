// /DAL/Repository/InsumosRepository.cs
using Microsoft.EntityFrameworkCore;
using SistemaByCliza.DAL.DataContext;
using SistemaByCliza.Models;

namespace SistemaByCliza.DAL.Repository
{
    public class InsumosRepository : IInsumosRepository<Insumo>
    {
        private readonly SistemaByClizaContext _dbcontext;

        public InsumosRepository(SistemaByClizaContext context)
        {
            _dbcontext = context;
        }

        public async Task<bool> Eliminar(int id)
        {
            var model = await _dbcontext.Insumos.FirstAsync(c => c.Id == id);
            _dbcontext.Insumos.Remove(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<Insumo?> Obtener(int id)
        {
            return await _dbcontext.Insumos
                .Include(i => i.IdCategoriaNavigation)
                .Include(i => i.IdProveedorNavigation)
                .AsNoTracking()
                .FirstOrDefaultAsync(i => i.Id == id);
        }

        public async Task<IQueryable<Insumo>> ObtenerTodos()
        {
            IQueryable<Insumo> query = _dbcontext.Insumos;
            return await Task.FromResult(query);
        }

        public async Task<bool> Insertar(Insumo model)
        {
            _dbcontext.Insumos.Add(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Actualizar(Insumo model)
        {
            _dbcontext.Insumos.Update(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }
    }
}
