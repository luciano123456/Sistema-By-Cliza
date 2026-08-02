using SistemaByCliza.Models;

namespace SistemaByCliza.BLL.Service
{
    public interface ITransportesService
    {
        Task<bool> Eliminar(int id);
        Task<bool> Insertar(Transporte t);
        Task<bool> Actualizar(Transporte t);
        Task<Transporte?> Obtener(int id);
        Task<IQueryable<Transporte>> ObtenerTodos();
    }
}
