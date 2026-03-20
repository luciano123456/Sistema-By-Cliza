using SistemaByCliza.DAL.Repository;
using SistemaByCliza.Models;

namespace SistemaByCliza.BLL.Service
{
    public class ColoresService : IColoresService
    {

        private readonly IColoresRepository<Color> _contactRepo;

        public ColoresService(IColoresRepository<Color> contactRepo)
        {
            _contactRepo = contactRepo;
        }
        public async Task<bool> Actualizar(Color model)
        {
            return await _contactRepo.Actualizar(model);
        }

        public async Task<bool> Eliminar(int id)
        {
            return await _contactRepo.Eliminar(id);
        }

        public async Task<bool> Insertar(Color model)
        {
            return await _contactRepo.Insertar(model);
        }

        public async Task<Color> Obtener(int id)
        {
            return await _contactRepo.Obtener(id);
        }


        public async Task<IQueryable<Color>> ObtenerTodos()
        {
            return await _contactRepo.ObtenerTodos();
        }



    }
}
