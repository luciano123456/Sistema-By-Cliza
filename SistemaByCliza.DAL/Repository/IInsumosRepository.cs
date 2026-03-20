// /DAL/Repository/IInsumosRepository.cs
using SistemaByCliza.Models;

namespace SistemaByCliza.DAL.Repository
{
    public interface IInsumosRepository<TEntityModel> where TEntityModel : class
    {
        Task<bool> Eliminar(int id);
        Task<bool> Insertar(Insumo i);
        Task<bool> Actualizar(Insumo i);
        Task<Insumo?> Obtener(int id);
        Task<IQueryable<Insumo>> ObtenerTodos();
    }
}
