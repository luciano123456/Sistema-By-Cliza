using SistemaByCliza.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;

namespace SistemaByCliza.DAL.Repository
{
    public interface IPersonalRepository<TEntityModel> where TEntityModel : class
    {
        Task<bool> Eliminar(int id);
        Task<bool> Actualizar(Personal model);
        Task<int> Insertar(Personal model);
        Task<Personal> Obtener(int id);
        Task<IQueryable<Personal>> ObtenerTodos();
    }
}
