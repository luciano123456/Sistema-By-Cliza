using SistemaByCliza.DAL.Repository;
using SistemaByCliza.Models;

namespace SistemaByCliza.BLL.Service
{
    public class CuentasService : ICuentasService
    {

        private readonly ICuentasRepository<Cuenta> _contactRepo;

        public CuentasService(ICuentasRepository<Cuenta> contactRepo)
        {
            _contactRepo = contactRepo;
        }
        public async Task<bool> Actualizar(Cuenta model)
        {
            return await _contactRepo.Actualizar(model);
        }

        public async Task<bool> Eliminar(int id)
        {
            return await _contactRepo.Eliminar(id);
        }

        public async Task<int> Insertar(Cuenta model)
        {
            return await _contactRepo.Insertar(model);
        }

        public async Task<Cuenta> Obtener(int id)
        {
            return await _contactRepo.Obtener(id);
        }


        public async Task<IQueryable<Cuenta>> ObtenerTodos()
        {
            return await _contactRepo.ObtenerTodos();
        }



    }
}
