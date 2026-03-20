using SistemaByCliza.DAL.Repository;
using SistemaByCliza.Models;

namespace SistemaByCliza.BLL.Service
{
    public class SucursalesService : ISucursalesService
    {

        private readonly ISucursalesRepository<Sucursal> _contactRepo;

        public SucursalesService(ISucursalesRepository<Sucursal> contactRepo)
        {
            _contactRepo = contactRepo;
        }
        public async Task<bool> Actualizar(Sucursal model)
        {
            return await _contactRepo.Actualizar(model);
        }

        public async Task<bool> Eliminar(int id)
        {
            return await _contactRepo.Eliminar(id);
        }

        public async Task<bool> Insertar(Sucursal model)
        {
            return await _contactRepo.Insertar(model);
        }

        public async Task<Sucursal> Obtener(int id)
        {
            return await _contactRepo.Obtener(id);
        }


        public async Task<IQueryable<Sucursal>> ObtenerTodos()
        {
            return await _contactRepo.ObtenerTodos();
        }



    }
}
