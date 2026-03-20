using SistemaByCliza.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;

namespace SistemaByCliza.DAL.Repository
{
    public interface ISucursalesRepository<TEntityModel> where TEntityModel : class
    {
        Task<bool> Eliminar(int id);
        Task<bool> Actualizar(Sucursal model);
        Task<bool> Insertar(Sucursal model);
        Task<Sucursal> Obtener(int id);
        Task<IQueryable<Sucursal>> ObtenerTodos();
    }
}
