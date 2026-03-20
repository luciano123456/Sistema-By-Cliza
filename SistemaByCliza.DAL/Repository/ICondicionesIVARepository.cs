using SistemaByCliza.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;

namespace SistemaByCliza.DAL.Repository
{
    public interface ICondicionesIVARepository<TEntityModel> where TEntityModel : class
    {
        Task<bool> Eliminar(int id);
        Task<bool> Actualizar(CondicionesIva model);
        Task<bool> Insertar(CondicionesIva model);
        Task<CondicionesIva> Obtener(int id);
        Task<IQueryable<CondicionesIva>> ObtenerTodos();
    }
}
