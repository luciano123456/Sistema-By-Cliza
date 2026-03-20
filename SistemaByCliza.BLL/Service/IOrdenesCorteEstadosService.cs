using SistemaByCliza.Models;

namespace SistemaByCliza.BLL.Service
{
    public interface IOrdenesCorteEstadosService
    {
        Task<bool> Eliminar(int id);
        Task<bool> Actualizar(OrdenesCorteEstado model);
        Task<bool> Insertar(OrdenesCorteEstado model);

        Task<OrdenesCorteEstado> Obtener(int id);

        Task<IQueryable<OrdenesCorteEstado>> ObtenerTodos();
    }

}
