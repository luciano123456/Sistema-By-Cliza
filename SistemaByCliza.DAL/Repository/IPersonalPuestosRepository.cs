using SistemaByCliza.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;

namespace SistemaByCliza.DAL.Repository
{
    public interface IPersonalPuestosRepository<TEntityModel> where TEntityModel : class
    {
        Task<bool> Eliminar(int id);
        Task<bool> Actualizar(PersonalPuesto model);
        Task<bool> Insertar(PersonalPuesto model);
        Task<PersonalPuesto> Obtener(int id);
        Task<IQueryable<PersonalPuesto>> ObtenerTodos();
    }
}
