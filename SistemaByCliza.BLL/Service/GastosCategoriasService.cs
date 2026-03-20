using SistemaByCliza.DAL.Repository;
using SistemaByCliza.Models;

namespace SistemaByCliza.BLL.Service
{
    public class GastosCategoriasService : IGastosCategoriasService
    {

        private readonly IGastosCategoriasRepository<GastosCategoria> _contactRepo;

        public GastosCategoriasService(IGastosCategoriasRepository<GastosCategoria> contactRepo)
        {
            _contactRepo = contactRepo;
        }
        public async Task<bool> Actualizar(GastosCategoria model)
        {
            return await _contactRepo.Actualizar(model);
        }

        public async Task<bool> Eliminar(int id)
        {
            return await _contactRepo.Eliminar(id);
        }

        public async Task<bool> Insertar(GastosCategoria model)
        {
            return await _contactRepo.Insertar(model);
        }

        public async Task<GastosCategoria> Obtener(int id)
        {
            return await _contactRepo.Obtener(id);
        }


        public async Task<IQueryable<GastosCategoria>> ObtenerTodos()
        {
            return await _contactRepo.ObtenerTodos();
        }



    }
}
