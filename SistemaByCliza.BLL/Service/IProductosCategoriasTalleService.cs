using SistemaByCliza.Models;

namespace SistemaByCliza.BLL.Service
{
    public interface IProductosCategoriasTalleService
    {
        Task<bool> Eliminar(int id);
        Task<bool> Actualizar(ProductosCategoriasTalle model);
        Task<bool> Insertar(ProductosCategoriasTalle model);

        Task<ProductosCategoriasTalle> Obtener(int id);

        Task<IQueryable<ProductosCategoriasTalle>> ObtenerTodos();
        Task<IQueryable<ProductosCategoriasTalle>> ObtenerPorCategoria(int idCategoria);
    }

}
