using SistemaByCliza.DAL.Repository;
using SistemaByCliza.Models;

namespace SistemaByCliza.BLL.Service
{
    public class OrdenesCorteService : IOrdenesCorteService
    {
        private readonly IOrdenesCorteRepository _repo;
        public OrdenesCorteService(IOrdenesCorteRepository repo) { _repo = repo; }

        public Task<List<OrdenesCorte>> Listar(DateTime? desde, DateTime? hasta, int? idEstado, string? texto)
            => _repo.Listar(desde, hasta, idEstado, texto);

        public Task<OrdenesCorte?> Obtener(int id) => _repo.Obtener(id);

        public Task<List<OrdenesCorteEtapa>> ObtenerEtapasPorOrden(int idCorte)
            => _repo.ObtenerEtapasPorOrden(idCorte);

        public Task<bool> InsertarConDetalles(OrdenesCorte orden,
                                              IEnumerable<OrdenesCorteProducto> productos,
                                              IEnumerable<OrdenesCorteInsumo> insumos,
                                              IEnumerable<OrdenesCorteEtapa> etapas)
            => _repo.InsertarConDetalles(orden, productos, insumos, etapas);

        public Task<bool> ActualizarConDetalles(OrdenesCorte orden,
                                                IEnumerable<OrdenesCorteProducto> productos,
                                                IEnumerable<OrdenesCorteInsumo> insumos,
                                                IEnumerable<OrdenesCorteEtapa> etapas)
            => _repo.ActualizarConDetalles(orden, productos, insumos, etapas);

        public Task<bool> Eliminar(int id) => _repo.Eliminar(id);

        public Task<List<OrdenesCorteEstado>> ObtenerEstados() => _repo.ObtenerEstados();
    }
}
