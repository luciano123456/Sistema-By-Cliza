using SistemaByCliza.DAL.Repository;
using SistemaByCliza.Models;

namespace SistemaByCliza.BLL.Service
{
    public class ProductosCategoriaService : IProductosCategoriaService
    {

        private readonly IProductosCategoriaRepository<ProductosCategoria> _contactRepo;

        public ProductosCategoriaService(IProductosCategoriaRepository<ProductosCategoria> contactRepo)
        {
            _contactRepo = contactRepo;
        }
        public async Task<bool> Actualizar(ProductosCategoria model)
        {
            return await _contactRepo.Actualizar(model);
        }

        public async Task<bool> Eliminar(int id)
        {
            return await _contactRepo.Eliminar(id);
        }

        public async Task<bool> Insertar(ProductosCategoria model)
        {
            return await _contactRepo.Insertar(model);
        }

        public async Task<ProductosCategoria> Obtener(int id)
        {
            return await _contactRepo.Obtener(id);
        }


        public async Task<IQueryable<ProductosCategoria>> ObtenerTodos()
        {
            return await _contactRepo.ObtenerTodos();
        }



    }
}
