using SistemaByCliza.DAL.Repository;
using SistemaByCliza.Models;

namespace SistemaByCliza.BLL.Service
{
    public class ProductosService : IProductosService
    {

        private readonly IProductosRepository<Producto> _contactRepo;

        public ProductosService(IProductosRepository<Producto> contactRepo)
        {
            _contactRepo = contactRepo;
        }
      

        public async Task<bool> Actualizar(Producto p, IEnumerable<int> idTallesCat, IEnumerable<int> idColores, bool generarVariantes, IDictionary<int, decimal> preciosPorLista = null)
        {
            return await _contactRepo.Actualizar(p, idTallesCat, idColores, generarVariantes, preciosPorLista);
        }

        public async Task<bool> Eliminar(int id)
        {
            return await _contactRepo.Eliminar(id);
        }

        public async Task<bool> Insertar(Producto p, IEnumerable<int> idTallesCat, IEnumerable<int> idColores, bool generarVariantes, IDictionary<int, decimal> preciosPorLista = null)
        {
            return await _contactRepo.Insertar(p, idTallesCat, idColores, generarVariantes, preciosPorLista);
        }

        public async Task<Producto> Obtener(int id)
        {
            return await _contactRepo.Obtener(id);
        }


        public async Task<IQueryable<Producto>> ObtenerTodos()
        {
            return await _contactRepo.ObtenerTodos();
        }



    }
}
