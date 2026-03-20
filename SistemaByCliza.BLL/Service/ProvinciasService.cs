using SistemaByCliza.DAL.Repository;
using SistemaByCliza.Models;

namespace SistemaByCliza.BLL.Service
{
    public class ProvinciasService : IProvinciasService
    {

        private readonly IProvinciasRepository<Provincia> _contactRepo;

        public ProvinciasService(IProvinciasRepository<Provincia> contactRepo)
        {
            _contactRepo = contactRepo;
        }
        public async Task<bool> Actualizar(Provincia model)
        {
            return await _contactRepo.Actualizar(model);
        }

        public async Task<bool> Eliminar(int id)
        {
            return await _contactRepo.Eliminar(id);
        }

        public async Task<bool> Insertar(Provincia model)
        {
            return await _contactRepo.Insertar(model);
        }

        public async Task<Provincia> Obtener(int id)
        {
            return await _contactRepo.Obtener(id);
        }


        public async Task<IQueryable<Provincia>> ObtenerTodos()
        {
            return await _contactRepo.ObtenerTodos();
        }



    }
}
