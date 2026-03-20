using SistemaByCliza.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;

namespace SistemaByCliza.DAL.Repository
{
    public interface IColoresRepository<TEntityModel> where TEntityModel : class
    {
        Task<bool> Eliminar(int id);
        Task<bool> Actualizar(Color model);
        Task<bool> Insertar(Color model);
        Task<Color> Obtener(int id);
        Task<IQueryable<Color>> ObtenerTodos();
    }
}
