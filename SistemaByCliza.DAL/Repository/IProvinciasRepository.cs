using SistemaByCliza.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;

namespace SistemaByCliza.DAL.Repository
{
    public interface IProvinciasRepository<TEntityModel> where TEntityModel : class
    {
        Task<bool> Eliminar(int id);
        Task<bool> Actualizar(Provincia model);
        Task<bool> Insertar(Provincia model);
        Task<Provincia> Obtener(int id);
        Task<IQueryable<Provincia>> ObtenerTodos();
    }
}
