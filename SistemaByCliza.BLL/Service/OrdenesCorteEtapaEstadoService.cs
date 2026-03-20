using SistemaByCliza.DAL.Repository;
using SistemaByCliza.Models;

namespace SistemaByCliza.BLL.Service
{
    public class OrdenesCorteEtapasEstadosService : IOrdenesCorteEtapasEstadosService
    {

        private readonly IOrdenesCorteEtapasEstadosRepository<OrdenesCorteEtapasEstado> _contactRepo;

        public OrdenesCorteEtapasEstadosService(IOrdenesCorteEtapasEstadosRepository<OrdenesCorteEtapasEstado> contactRepo)
        {
            _contactRepo = contactRepo;
        }
        public async Task<bool> Actualizar(OrdenesCorteEtapasEstado model)
        {
            return await _contactRepo.Actualizar(model);
        }

        public async Task<bool> Eliminar(int id)
        {
            return await _contactRepo.Eliminar(id);
        }

        public async Task<bool> Insertar(OrdenesCorteEtapasEstado model)
        {
            return await _contactRepo.Insertar(model);
        }

        public async Task<OrdenesCorteEtapasEstado> Obtener(int id)
        {
            return await _contactRepo.Obtener(id);
        }


        public async Task<IQueryable<OrdenesCorteEtapasEstado>> ObtenerTodos()
        {
            return await _contactRepo.ObtenerTodos();
        }



    }
}
