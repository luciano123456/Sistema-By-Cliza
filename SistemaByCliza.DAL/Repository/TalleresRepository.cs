// /DAL/Repository/TalleresRepository.cs
using Microsoft.EntityFrameworkCore;
using SistemaByCliza.DAL.DataContext;
using SistemaByCliza.Models;

namespace SistemaByCliza.DAL.Repository
{
    public class TalleresRepository : ITalleresRepository<Taller>
    {
        private readonly SistemaByClizaContext _dbcontext;

        public TalleresRepository(SistemaByClizaContext context)
        {
            _dbcontext = context;
        }

        public async Task<bool> Eliminar(int id)
        {
            var model = await _dbcontext.Talleres.FirstAsync(p => p.Id == id); // Ajustá el DbSet si es Tallers
            _dbcontext.Talleres.Remove(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<Taller?> Obtener(int id)
        {
            return await _dbcontext.Talleres
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == id);
        }

        public Task<IQueryable<Taller>> ObtenerTodos()
        {
            IQueryable<Taller> query = _dbcontext.Talleres;
            return Task.FromResult(query);
        }

        public async Task<bool> Insertar(Taller model)
        {
            _dbcontext.Talleres.Add(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Actualizar(Taller model)
        {
            _dbcontext.Talleres.Update(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }
    }
}
