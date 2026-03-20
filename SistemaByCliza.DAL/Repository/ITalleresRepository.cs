// /DAL/Repository/ITalleresRepository.cs
using SistemaByCliza.Models;

namespace SistemaByCliza.DAL.Repository
{
    public interface ITalleresRepository<TEntityModel> where TEntityModel : class
    {
        Task<bool> Eliminar(int id);
        Task<bool> Insertar(Taller p);
        Task<bool> Actualizar(Taller p);
        Task<Taller?> Obtener(int id);
        Task<IQueryable<Taller>> ObtenerTodos();
    }
}
