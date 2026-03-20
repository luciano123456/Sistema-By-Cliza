using SistemaByCliza.Models;

namespace SistemaByCliza.DAL.Repository
{
    public interface IUsuariosRepository<TEntityModel> where TEntityModel : class
    {
        Task<bool> Eliminar(int id);

        // ✔️ overloads con Sucursales
        Task<bool> Insertar(User model, IEnumerable<int> idSucursales);
        Task<bool> Actualizar(User model, IEnumerable<int> idSucursales);

        // (compat)
        Task<bool> Insertar(User model);
        Task<bool> Actualizar(User model);

        Task<User> Obtener(int id);
        Task<User?> ObtenerConSucursales(int id); // ✔️ include
        Task<User> ObtenerUsuario(string usuario);
        Task<IQueryable<User>> ObtenerTodos();
    }
}
