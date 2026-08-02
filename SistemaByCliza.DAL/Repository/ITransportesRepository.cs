using SistemaByCliza.Models;

namespace SistemaByCliza.DAL.Repository
{
    public interface ITransportesRepository<TEntityModel> where TEntityModel : class
    {
        Task<bool> Eliminar(int id);
        Task<bool> Insertar(Transporte t);
        Task<bool> Actualizar(Transporte t);
        Task<Transporte?> Obtener(int id);
        Task<IQueryable<Transporte>> ObtenerTodos();
    }
}
