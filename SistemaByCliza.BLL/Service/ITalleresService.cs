// /BLL/Service/ITalleresService.cs
using SistemaByCliza.Models;

namespace SistemaByCliza.BLL.Service
{
    public interface ITalleresService
    {
        Task<bool> Eliminar(int id);
        Task<bool> Insertar(Taller p);
        Task<bool> Actualizar(Taller p);
        Task<Taller?> Obtener(int id);
        Task<IQueryable<Taller>> ObtenerTodos();
    }
}
