using SistemaByCliza.Models;

namespace SistemaByCliza.BLL.Service
{
    public interface IGastosService
    {
        Task<bool> Eliminar(int id);
        Task<bool> Actualizar(Gasto model);
        Task<bool> Insertar(Gasto model);

        Task<Gasto> Obtener(int id);

        Task<List<Gasto>> ObtenerTodos(DateTime? fechaDesde,
                               DateTime? fechaHasta,
                               int idSucursal,
                               int idCuenta,
                               int idCategoria,
                               string concepto);
    }

}
