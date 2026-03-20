using SistemaByCliza.DAL.Repository;
using SistemaByCliza.Models;

namespace SistemaByCliza.BLL.Service
{
    public class BancosService : IBancosService
    {

        private readonly IBancosRepository<Banco> _contactRepo;

        public BancosService(IBancosRepository<Banco> contactRepo)
        {
            _contactRepo = contactRepo;
        }
        public async Task<bool> Actualizar(Banco model)
        {
            return await _contactRepo.Actualizar(model);
        }

        public async Task<bool> Eliminar(int id)
        {
            return await _contactRepo.Eliminar(id);
        }

        public async Task<bool> Insertar(Banco model)
        {
            return await _contactRepo.Insertar(model);
        }

        public async Task<Banco> Obtener(int id)
        {
            return await _contactRepo.Obtener(id);
        }


        public async Task<IQueryable<Banco>> ObtenerTodos()
        {
            return await _contactRepo.ObtenerTodos();
        }



    }
}
