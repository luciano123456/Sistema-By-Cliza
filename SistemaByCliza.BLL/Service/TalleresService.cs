// /BLL/Service/TalleresService.cs
using SistemaByCliza.DAL.Repository;
using SistemaByCliza.Models;

namespace SistemaByCliza.BLL.Service
{
    public class TalleresService : ITalleresService
    {
        private readonly ITalleresRepository<Taller> _repo;

        public TalleresService(ITalleresRepository<Taller> repo)
        {
            _repo = repo;
        }

        public Task<bool> Eliminar(int id) => _repo.Eliminar(id);
        public Task<bool> Insertar(Taller p) => _repo.Insertar(p);
        public Task<bool> Actualizar(Taller p) => _repo.Actualizar(p);
        public Task<Taller?> Obtener(int id) => _repo.Obtener(id);
        public Task<IQueryable<Taller>> ObtenerTodos() => _repo.ObtenerTodos();
    }
}
