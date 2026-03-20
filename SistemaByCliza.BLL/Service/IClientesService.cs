using SistemaByCliza.Models;

namespace SistemaByCliza.BLL.Service
{
    public interface IClientesService
    {
        Task<bool> Eliminar(int id);
        Task<bool> Actualizar(Cliente model);
        Task<bool> Insertar(Cliente model);

        Task<Cliente> Obtener(int id);
        Task<Cliente> ObtenerCliente(string Cliente);

        Task<IQueryable<Cliente>> ObtenerTodos();
    }

}
