using SistemaByCliza.DAL.Repository;
using SistemaByCliza.Models;

namespace SistemaByCliza.BLL.Service
{
    public class TransportesService : ITransportesService
    {
        private readonly ITransportesRepository<Transporte> _repo;

        public TransportesService(ITransportesRepository<Transporte> repo)
        {
            _repo = repo;
        }

        public Task<bool> Eliminar(int id) => _repo.Eliminar(id);
        public Task<bool> Insertar(Transporte t) => _repo.Insertar(t);
        public Task<bool> Actualizar(Transporte t) => _repo.Actualizar(t);
        public Task<Transporte?> Obtener(int id) => _repo.Obtener(id);
        public Task<IQueryable<Transporte>> ObtenerTodos() => _repo.ObtenerTodos();
    }
}
