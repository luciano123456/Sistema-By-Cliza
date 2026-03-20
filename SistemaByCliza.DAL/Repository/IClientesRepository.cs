using SistemaByCliza.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;

namespace SistemaByCliza.DAL.Repository
{
    public interface IClientesRepository<TEntityModel> where TEntityModel : class
    {
        Task<bool> Eliminar(int id);
        Task<bool> Actualizar(Cliente model);
        Task<bool> Insertar(Cliente model);
        Task<Cliente> Obtener(int id);
        Task<Cliente> ObtenerCliente(string Cliente);
        Task<IQueryable<Cliente>> ObtenerTodos();
    }
}
