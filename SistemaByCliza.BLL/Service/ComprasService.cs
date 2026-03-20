// SistemaByCliza.BLL/Service/ComprasService.cs
using SistemaByCliza.DAL.Repository;
using SistemaByCliza.Models;

namespace SistemaByCliza.BLL.Service
{
    public class ComprasService : IComprasService
    {
        private readonly IComprasRepository<Compra> _repo;
        public ComprasService(IComprasRepository<Compra> repo) => _repo = repo;

        public Task<List<Compra>> Listar(DateTime? desde, DateTime? hasta, int? idProveedor, string? estado, string? texto)
            => _repo.Listar(desde, hasta, idProveedor, texto);

        public Task<Compra?> Obtener(int id) => _repo.Obtener(id);

        public Task<List<ComprasInsumo>> ObtenerItemsPorCompra(int idCompra)
            => _repo.ObtenerItemsPorCompra(idCompra);

        public Task<List<ComprasPago>> ObtenerPagosPorCompra(int idCompra)
            => _repo.ObtenerPagosPorCompra(idCompra);

        public Task<bool> InsertarConDetallesYPagos(Compra compra, IEnumerable<ComprasInsumo> items, IEnumerable<ComprasPago> pagos)
            => _repo.InsertarConDetallesYPagos(compra, items, pagos);

        public Task<bool> ActualizarConDetallesYPagos(Compra compra, IEnumerable<ComprasInsumo> items, IEnumerable<ComprasPago> pagos)
            => _repo.ActualizarConDetallesYPagos(compra, items, pagos);

        public Task<bool> Eliminar(int id) => _repo.Eliminar(id);
    }
}
