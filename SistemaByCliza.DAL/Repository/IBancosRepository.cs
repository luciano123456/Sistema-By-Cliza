using SistemaByCliza.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;

namespace SistemaByCliza.DAL.Repository
{
    public interface IBancosRepository<TEntityModel> where TEntityModel : class
    {
        Task<bool> Eliminar(int id);
        Task<bool> Actualizar(Banco model);
        Task<bool> Insertar(Banco model);
        Task<Banco> Obtener(int id);
        Task<IQueryable<Banco>> ObtenerTodos();
    }
}
