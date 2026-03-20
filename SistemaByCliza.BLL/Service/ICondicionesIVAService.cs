using SistemaByCliza.Models;

namespace SistemaByCliza.BLL.Service
{
    public interface ICondicionesIVAService
    {
        Task<bool> Eliminar(int id);
        Task<bool> Actualizar(CondicionesIva model);
        Task<bool> Insertar(CondicionesIva model);

        Task<CondicionesIva> Obtener(int id);

        Task<IQueryable<CondicionesIva>> ObtenerTodos();
    }

}
