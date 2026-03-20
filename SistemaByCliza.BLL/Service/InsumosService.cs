// /BLL/Service/InsumosService.cs
using SistemaByCliza.DAL.Repository;
using SistemaByCliza.Models;

namespace SistemaByCliza.BLL.Service
{
    public class InsumosService : IInsumosService
    {
        private readonly IInsumosRepository<Insumo> _repo;

        public InsumosService(IInsumosRepository<Insumo> repo)
        {
            _repo = repo;
        }

        public async Task<bool> Actualizar(Insumo i) => await _repo.Actualizar(i);

        public async Task<bool> Eliminar(int id) => await _repo.Eliminar(id);

        public async Task<bool> Insertar(Insumo i) => await _repo.Insertar(i);

        public async Task<Insumo?> Obtener(int id) => await _repo.Obtener(id);

        public async Task<IQueryable<Insumo>> ObtenerTodos() => await _repo.ObtenerTodos();
    }
}
