using SistemaByCliza.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;

namespace SistemaByCliza.DAL.Repository
{
    public interface IOrdenesCorteEtapasEstadosRepository<TEntityModel> where TEntityModel : class
    {
        Task<bool> Eliminar(int id);
        Task<bool> Actualizar(OrdenesCorteEtapasEstado model);
        Task<bool> Insertar(OrdenesCorteEtapasEstado model);
        Task<OrdenesCorteEtapasEstado> Obtener(int id);
        Task<IQueryable<OrdenesCorteEtapasEstado>> ObtenerTodos();
    }
}
