using SistemaByCliza.Models;

namespace SistemaByCliza.BLL.Service
{
    public interface IPersonalService
    {
        Task<bool> Eliminar(int id);
        Task<bool> Actualizar(Personal model);
        Task<int> Insertar(Personal model);

        Task<Personal> Obtener(int id);

        Task<IQueryable<Personal>> ObtenerTodos();
    }

}
