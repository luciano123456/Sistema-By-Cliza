// /BLL/Service/ProveedoresService.cs
using SistemaByCliza.DAL.Repository;
using SistemaByCliza.Models;

namespace SistemaByCliza.BLL.Service
{
    public class ProveedoresService : IProveedoresService
    {
        private readonly IProveedoresRepository<Proveedor> _repo;

        public ProveedoresService(IProveedoresRepository<Proveedor> repo)
        {
            _repo = repo;
        }

        public Task<bool> Eliminar(int id) => _repo.Eliminar(id);
        public Task<bool> Insertar(Proveedor p) => _repo.Insertar(p);
        public Task<bool> Actualizar(Proveedor p) => _repo.Actualizar(p);
        public Task<Proveedor?> Obtener(int id) => _repo.Obtener(id);
        public Task<IQueryable<Proveedor>> ObtenerTodos() => _repo.ObtenerTodos();
    }
}
