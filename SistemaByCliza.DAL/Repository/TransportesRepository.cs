using Microsoft.EntityFrameworkCore;
using SistemaByCliza.DAL.DataContext;
using SistemaByCliza.Models;

namespace SistemaByCliza.DAL.Repository
{
    public class TransportesRepository : ITransportesRepository<Transporte>
    {
        private readonly SistemaByClizaContext _dbcontext;

        public TransportesRepository(SistemaByClizaContext context)
        {
            _dbcontext = context;
        }

        public async Task<bool> Eliminar(int id)
        {
            var model = await _dbcontext.Transportes.FirstAsync(p => p.Id == id);
            _dbcontext.Transportes.Remove(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<Transporte?> Obtener(int id)
        {
            return await _dbcontext.Transportes
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == id);
        }

        public Task<IQueryable<Transporte>> ObtenerTodos()
        {
            IQueryable<Transporte> query = _dbcontext.Transportes.AsNoTracking();
            return Task.FromResult(query);
        }

        public async Task<bool> Insertar(Transporte model)
        {
            _dbcontext.Transportes.Add(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> Actualizar(Transporte model)
        {
            _dbcontext.Transportes.Update(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }
    }
}
