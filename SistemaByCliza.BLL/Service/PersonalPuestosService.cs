using SistemaByCliza.DAL.Repository;
using SistemaByCliza.Models;

namespace SistemaByCliza.BLL.Service
{
    public class PersonalPuestosService : IPersonalPuestosService
    {

        private readonly IPersonalPuestosRepository<PersonalPuesto> _contactRepo;

        public PersonalPuestosService(IPersonalPuestosRepository<PersonalPuesto> contactRepo)
        {
            _contactRepo = contactRepo;
        }
        public async Task<bool> Actualizar(PersonalPuesto model)
        {
            return await _contactRepo.Actualizar(model);
        }

        public async Task<bool> Eliminar(int id)
        {
            return await _contactRepo.Eliminar(id);
        }

        public async Task<bool> Insertar(PersonalPuesto model)
        {
            return await _contactRepo.Insertar(model);
        }

        public async Task<PersonalPuesto> Obtener(int id)
        {
            return await _contactRepo.Obtener(id);
        }


        public async Task<IQueryable<PersonalPuesto>> ObtenerTodos()
        {
            return await _contactRepo.ObtenerTodos();
        }



    }
}
