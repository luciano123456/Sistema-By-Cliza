// /DAL/Repository/IProveedoresRepository.cs
using SistemaByCliza.Models;

namespace SistemaByCliza.DAL.Repository
{
    public interface IProveedoresRepository<TEntityModel> where TEntityModel : class
    {
        Task<bool> Eliminar(int id);
        Task<bool> Insertar(Proveedor p);
        Task<bool> Actualizar(Proveedor p);
        Task<Proveedor?> Obtener(int id);
        Task<IQueryable<Proveedor>> ObtenerTodos();
    }
}
