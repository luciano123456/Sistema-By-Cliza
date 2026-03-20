using SistemaByCliza.Models;

namespace SistemaByCliza.BLL.Service
{
    public interface IProductosService
    {
        Task<bool> Eliminar(int id);
        Task<bool> Insertar(Producto p, IEnumerable<int> talles, IEnumerable<int> colores,
                            bool generarVariantes, IDictionary<int, decimal> preciosPorLista = null);

        Task<bool> Actualizar(Producto p, IEnumerable<int> talles, IEnumerable<int> colores,
                                      bool generarVariantes, IDictionary<int, decimal> preciosPorLista = null);


        Task<Producto> Obtener(int id);

        Task<IQueryable<Producto>> ObtenerTodos();
    }

}
