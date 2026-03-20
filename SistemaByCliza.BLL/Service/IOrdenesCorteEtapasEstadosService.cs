using SistemaByCliza.Models;

namespace SistemaByCliza.BLL.Service
{
    public interface IOrdenesCorteEtapasEstadosService
    {
        Task<bool> Eliminar(int id);
        Task<bool> Actualizar(OrdenesCorteEtapasEstado model);
        Task<bool> Insertar(OrdenesCorteEtapasEstado model);

        Task<OrdenesCorteEtapasEstado> Obtener(int id);

        Task<IQueryable<OrdenesCorteEtapasEstado>> ObtenerTodos();
    }

}
