using SistemaByCliza.DAL.Repository;
using SistemaByCliza.Models;

namespace SistemaByCliza.BLL.Service
{
    public class CondicionesIVAService : ICondicionesIVAService
    {

        private readonly ICondicionesIVARepository<CondicionesIva> _contactRepo;

        public CondicionesIVAService(ICondicionesIVARepository<CondicionesIva> contactRepo)
        {
            _contactRepo = contactRepo;
        }
        public async Task<bool> Actualizar(CondicionesIva model)
        {
            return await _contactRepo.Actualizar(model);
        }

        public async Task<bool> Eliminar(int id)
        {
            return await _contactRepo.Eliminar(id);
        }

        public async Task<bool> Insertar(CondicionesIva model)
        {
            return await _contactRepo.Insertar(model);
        }

        public async Task<CondicionesIva> Obtener(int id)
        {
            return await _contactRepo.Obtener(id);
        }


        public async Task<IQueryable<CondicionesIva>> ObtenerTodos()
        {
            return await _contactRepo.ObtenerTodos();
        }



    }
}
