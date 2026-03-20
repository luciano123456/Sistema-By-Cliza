// /BLL/Service/IProveedoresService.cs
using SistemaByCliza.Models;

namespace SistemaByCliza.BLL.Service
{
    public interface IProveedoresService
    {
        Task<bool> Eliminar(int id);
        Task<bool> Insertar(Proveedor p);
        Task<bool> Actualizar(Proveedor p);
        Task<Proveedor?> Obtener(int id);
        Task<IQueryable<Proveedor>> ObtenerTodos();
    }
}
