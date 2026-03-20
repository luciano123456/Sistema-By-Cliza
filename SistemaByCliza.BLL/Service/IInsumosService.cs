// /BLL/Service/IInsumosService.cs
using SistemaByCliza.Models;

namespace SistemaByCliza.BLL.Service
{
    public interface IInsumosService
    {
        Task<bool> Eliminar(int id);
        Task<bool> Insertar(Insumo i);
        Task<bool> Actualizar(Insumo i);
        Task<Insumo?> Obtener(int id);
        Task<IQueryable<Insumo>> ObtenerTodos();
    }
}
