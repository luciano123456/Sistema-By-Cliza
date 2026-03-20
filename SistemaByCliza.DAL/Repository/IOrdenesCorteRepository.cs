using SistemaByCliza.Models;

namespace SistemaByCliza.DAL.Repository
{
    public interface IOrdenesCorteRepository
    {
        Task<List<OrdenesCorte>> Listar(DateTime? desde, DateTime? hasta, int? idEstado, string? texto);
        Task<OrdenesCorte?> Obtener(int id);
        Task<List<OrdenesCorteEtapa>> ObtenerEtapasPorOrden(int idCorte);

        Task<bool> InsertarConDetalles(
            OrdenesCorte orden,
            IEnumerable<OrdenesCorteProducto> productos,
            IEnumerable<OrdenesCorteInsumo> insumos,
            IEnumerable<OrdenesCorteEtapa> etapas);

        Task<bool> ActualizarConDetalles(
            OrdenesCorte orden,
            IEnumerable<OrdenesCorteProducto> productos,
            IEnumerable<OrdenesCorteInsumo> insumos,
            IEnumerable<OrdenesCorteEtapa> etapas);

        Task<bool> Eliminar(int id);

        Task<List<OrdenesCorteEstado>> ObtenerEstados();
    }
}
