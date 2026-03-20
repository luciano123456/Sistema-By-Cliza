using SistemaByCliza.DAL.Repository;
using SistemaByCliza.Models;

namespace SistemaByCliza.BLL.Service
{
    public class PersonalService : IPersonalService
    {

        private readonly IPersonalRepository<Personal> _contactRepo;

        public PersonalService(IPersonalRepository<Personal> contactRepo)
        {
            _contactRepo = contactRepo;
        }
        public async Task<bool> Actualizar(Personal model)
        {
            return await _contactRepo.Actualizar(model);
        }

        public async Task<bool> Eliminar(int id)
        {
            return await _contactRepo.Eliminar(id);
        }

        public async Task<bool> Insertar(Personal model)
        {
            return await _contactRepo.Insertar(model);
        }

        public async Task<Personal> Obtener(int id)
        {
            return await _contactRepo.Obtener(id);
        }


        public async Task<IQueryable<Personal>> ObtenerTodos()
        {
            return await _contactRepo.ObtenerTodos();
        }



    }
}
