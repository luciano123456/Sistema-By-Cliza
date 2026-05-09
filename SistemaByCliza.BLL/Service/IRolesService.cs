using SistemaByCliza.Models;

namespace SistemaByCliza.BLL.Service
{
    public interface IRolesService
    {
        Task<bool> Eliminar(int id);
        Task<bool> Actualizar(UsuariosRol model);
        Task<bool> Insertar(UsuariosRol model);

        Task<UsuariosRol> Obtener(int id);

        Task<IQueryable<UsuariosRol>> ObtenerTodos();
    }

}
