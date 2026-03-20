using SistemaByCliza.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;

namespace SistemaByCliza.DAL.Repository
{
    public interface IProductosRepository<TEntityModel> where TEntityModel : class
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
