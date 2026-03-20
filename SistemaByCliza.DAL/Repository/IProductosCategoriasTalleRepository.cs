using SistemaByCliza.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;

namespace SistemaByCliza.DAL.Repository
{
    public interface IProductosCategoriasTalleRepository<TEntityModel> where TEntityModel : class
    {
        Task<bool> Eliminar(int id);
        Task<bool> Actualizar(ProductosCategoriasTalle model);
        Task<bool> Insertar(ProductosCategoriasTalle model);
        Task<ProductosCategoriasTalle> Obtener(int id);
        Task<IQueryable<ProductosCategoriasTalle>> ObtenerTodos();
        Task<IQueryable<ProductosCategoriasTalle>> ObtenerPorCategoria(int idCategoria);
    }
}
