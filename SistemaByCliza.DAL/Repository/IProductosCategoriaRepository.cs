using SistemaByCliza.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;

namespace SistemaByCliza.DAL.Repository
{
    public interface IProductosCategoriaRepository<TEntityModel> where TEntityModel : class
    {
        Task<bool> Eliminar(int id);
        Task<bool> Actualizar(ProductosCategoria model);
        Task<bool> Insertar(ProductosCategoria model);
        Task<ProductosCategoria> Obtener(int id);
        Task<IQueryable<ProductosCategoria>> ObtenerTodos();
    }
}
