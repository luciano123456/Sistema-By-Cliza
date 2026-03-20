using SistemaByCliza.Models;

namespace SistemaByCliza.BLL.Service
{
    public interface IProductosCategoriaService
    {
        Task<bool> Eliminar(int id);
        Task<bool> Actualizar(ProductosCategoria model);
        Task<bool> Insertar(ProductosCategoria model);

        Task<ProductosCategoria> Obtener(int id);

        Task<IQueryable<ProductosCategoria>> ObtenerTodos();
    }

}
