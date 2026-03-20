using SistemaByCliza.DAL.Repository;
using SistemaByCliza.Models;

namespace SistemaByCliza.BLL.Service
{
    public class RolesService : IRolesService
    {

        private readonly IRolesRepository<Rol> _contactRepo;

        public RolesService(IRolesRepository<Rol> contactRepo)
        {
            _contactRepo = contactRepo;
        }
        public async Task<bool> Actualizar(Rol model)
        {
            return await _contactRepo.Actualizar(model);
        }

        public async Task<bool> Eliminar(int id)
        {
            return await _contactRepo.Eliminar(id);
        }

        public async Task<bool> Insertar(Rol model)
        {
            return await _contactRepo.Insertar(model);
        }

        public async Task<Rol> Obtener(int id)
        {
            return await _contactRepo.Obtener(id);
        }


        public async Task<IQueryable<Rol>> ObtenerTodos()
        {
            return await _contactRepo.ObtenerTodos();
        }



    }
}
