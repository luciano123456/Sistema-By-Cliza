using SistemaByCliza.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;

namespace SistemaByCliza.DAL.Repository
{
    public interface IGastosCategoriasRepository<TEntityModel> where TEntityModel : class
    {
        Task<bool> Eliminar(int id);
        Task<bool> Actualizar(GastosCategoria model);
        Task<bool> Insertar(GastosCategoria model);
        Task<GastosCategoria> Obtener(int id);
        Task<IQueryable<GastosCategoria>> ObtenerTodos();
    }
}
