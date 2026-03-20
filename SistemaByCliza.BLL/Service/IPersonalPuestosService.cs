using SistemaByCliza.Models;

namespace SistemaByCliza.BLL.Service
{
    public interface IPersonalPuestosService
    {
        Task<bool> Eliminar(int id);
        Task<bool> Actualizar(PersonalPuesto model);
        Task<bool> Insertar(PersonalPuesto model);

        Task<PersonalPuesto> Obtener(int id);

        Task<IQueryable<PersonalPuesto>> ObtenerTodos();
    }

}
