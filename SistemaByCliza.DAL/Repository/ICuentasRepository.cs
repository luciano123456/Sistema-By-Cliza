using SistemaByCliza.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;

namespace SistemaByCliza.DAL.Repository
{
    public interface ICuentasRepository<TEntityModel> where TEntityModel : class
    {
        Task<bool> Eliminar(int id);
        Task<bool> Actualizar(Cuenta model);
        Task<int> Insertar(Cuenta model);
        Task<Cuenta> Obtener(int id);
        Task<IQueryable<Cuenta>> ObtenerTodos();
    }
}
