using SistemaByCliza.DAL.Repository;
using SistemaByCliza.Models;

namespace SistemaByCliza.BLL.Service
{
    public class ClientesService : IClientesService
    {

        private readonly IClientesRepository<Cliente> _contactRepo;

        public ClientesService(IClientesRepository<Cliente> contactRepo)
        {
            _contactRepo = contactRepo;
        }
        public async Task<bool> Actualizar(Cliente model)
        {
            return await _contactRepo.Actualizar(model);
        }

        public async Task<bool> Eliminar(int id)
        {
            return await _contactRepo.Eliminar(id);
        }

        public async Task<bool> Insertar(Cliente model)
        {
            return await _contactRepo.Insertar(model);
        }

        public async Task<Cliente> Obtener(int id)
        {
            return await _contactRepo.Obtener(id);
        }

        public async Task<Cliente> ObtenerCliente(string Cliente)
        {
            return await _contactRepo.ObtenerCliente(Cliente);
        }


        public async Task<IQueryable<Cliente>> ObtenerTodos()
        {
            return await _contactRepo.ObtenerTodos();
        }



    }
}
