using SistemaByCliza.Models;

namespace SistemaByCliza.BLL.Service
{
    public interface IUsuariosService
    {
        Task<bool> Eliminar(int id);

        // ✔️ overloads con Sucursales
        Task<bool> Insertar(User u, IEnumerable<int> idSucursales);
        Task<bool> Actualizar(User u, IEnumerable<int> idSucursales);

        // (mantener si necesitás compatibilidad)
        Task<bool> Insertar(User u);
        Task<bool> Actualizar(User u);

        Task<User> Obtener(int id);
        Task<User> ObtenerUsuario(string usuario);

        Task<User?> ObtenerConSucursales(int id); // ✔️ para EditarInfo
        Task<IQueryable<User>> ObtenerTodos();
    }
}
