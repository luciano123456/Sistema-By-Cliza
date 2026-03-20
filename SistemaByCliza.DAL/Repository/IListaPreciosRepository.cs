using SistemaByCliza.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;

namespace SistemaByCliza.DAL.Repository
{
    public interface IListaPreciosRepository<TEntityModel> where TEntityModel : class
    {
        Task<bool> Eliminar(int id);
        Task<bool> Actualizar(ListasPrecio model);
        Task<bool> Insertar(ListasPrecio model);
        Task<ListasPrecio> Obtener(int id);
        Task<IQueryable<ListasPrecio>> ObtenerTodos();
    }
}
