using SistemaByCliza.DAL.Repository;
using SistemaByCliza.Models;

namespace SistemaByCliza.BLL.Service
{
    public class UsuariosService : IUsuariosService
    {
        private readonly IUsuariosRepository<User> _repo;

        public UsuariosService(IUsuariosRepository<User> repo)
        {
            _repo = repo;
        }

        public Task<bool> Eliminar(int id) => _repo.Eliminar(id);

        // ✔️ con Sucursales
        public Task<bool> Insertar(User u, IEnumerable<int> idSucursales) => _repo.Insertar(u, idSucursales);
        public Task<bool> Actualizar(User u, IEnumerable<int> idSucursales) => _repo.Actualizar(u, idSucursales);

        // compat
        public Task<bool> Insertar(User u) => _repo.Insertar(u);
        public Task<bool> Actualizar(User u) => _repo.Actualizar(u);

        public Task<User> Obtener(int id) => _repo.Obtener(id);
        public Task<User> ObtenerUsuario(string usuario) => _repo.ObtenerUsuario(usuario);

        public Task<User?> ObtenerConSucursales(int id) => _repo.ObtenerConSucursales(id);

        public Task<IQueryable<User>> ObtenerTodos() => _repo.ObtenerTodos();
    }
}
