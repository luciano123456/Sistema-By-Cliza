using SistemaByCliza.Models;

namespace SistemaByCliza.BLL.Service
{
    public interface IColoresService
    {
        Task<bool> Eliminar(int id);
        Task<bool> Actualizar(Color model);
        Task<bool> Insertar(Color model);

        Task<Color> Obtener(int id);

        Task<IQueryable<Color>> ObtenerTodos();
    }

}
