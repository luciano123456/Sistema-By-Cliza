using SistemaByCliza.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;

namespace SistemaByCliza.DAL.Repository
{
    public interface IOrdenesCorteEstadosRepository<TEntityModel> where TEntityModel : class
    {
        Task<bool> Eliminar(int id);
        Task<bool> Actualizar(OrdenesCorteEstado model);
        Task<bool> Insertar(OrdenesCorteEstado model);
        Task<OrdenesCorteEstado> Obtener(int id);
        Task<IQueryable<OrdenesCorteEstado>> ObtenerTodos();
    }
}
