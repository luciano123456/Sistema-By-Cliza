using SistemaByCliza.DAL.Repository;
using SistemaByCliza.Models;

namespace SistemaByCliza.BLL.Service
{
    public class ListasPreciosService : IListasPreciosService
    {

        private readonly IListaPreciosRepository<ListasPrecio> _contactRepo;

        public ListasPreciosService(IListaPreciosRepository<ListasPrecio> contactRepo)
        {
            _contactRepo = contactRepo;
        }
        public async Task<bool> Actualizar(ListasPrecio model)
        {
            return await _contactRepo.Actualizar(model);
        }

        public async Task<bool> Eliminar(int id)
        {
            return await _contactRepo.Eliminar(id);
        }

        public async Task<bool> Insertar(ListasPrecio model)
        {
            return await _contactRepo.Insertar(model);
        }

        public async Task<ListasPrecio> Obtener(int id)
        {
            return await _contactRepo.Obtener(id);
        }


        public async Task<IQueryable<ListasPrecio>> ObtenerTodos()
        {
            return await _contactRepo.ObtenerTodos();
        }



    }
}
