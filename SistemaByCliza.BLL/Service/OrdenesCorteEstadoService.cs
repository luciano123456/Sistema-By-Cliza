using SistemaByCliza.DAL.Repository;
using SistemaByCliza.Models;

namespace SistemaByCliza.BLL.Service
{
    public class OrdenesCorteEstadosService : IOrdenesCorteEstadosService
    {

        private readonly IOrdenesCorteEstadosRepository<OrdenesCorteEstado> _contactRepo;

        public OrdenesCorteEstadosService(IOrdenesCorteEstadosRepository<OrdenesCorteEstado> contactRepo)
        {
            _contactRepo = contactRepo;
        }
        public async Task<bool> Actualizar(OrdenesCorteEstado model)
        {
            return await _contactRepo.Actualizar(model);
        }

        public async Task<bool> Eliminar(int id)
        {
            return await _contactRepo.Eliminar(id);
        }

        public async Task<bool> Insertar(OrdenesCorteEstado model)
        {
            return await _contactRepo.Insertar(model);
        }

        public async Task<OrdenesCorteEstado> Obtener(int id)
        {
            return await _contactRepo.Obtener(id);
        }


        public async Task<IQueryable<OrdenesCorteEstado>> ObtenerTodos()
        {
            return await _contactRepo.ObtenerTodos();
        }



    }
}
