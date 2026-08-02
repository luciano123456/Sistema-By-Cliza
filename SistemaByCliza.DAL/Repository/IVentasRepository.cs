// SistemaByCliza.DAL/Repository/IVentasRepository.cs
using SistemaByCliza.Models;

namespace SistemaByCliza.DAL.Repository
{
    public interface IVentasRepository<TEntity> where TEntity : class
    {
        Task<List<Venta>> Listar(DateTime? desde, DateTime? hasta, int? idCliente, int? idVendedor, int? idSucursal, string? estado, string? texto,
            int? restringirUsuarioRegistraId,
            IReadOnlyList<int>? idsSucursalesPermitidas,
            string? tipoVenta = null);
        Task<Venta?> Obtener(int id);

        Task<bool> InsertarConDetallesYPagos(Venta venta, IEnumerable<VentasProducto> items, IEnumerable<VentasProductosVariante> variantes,
                                             IEnumerable<ClientesCobro> pagos);
        Task<bool> ActualizarConDetallesYPagos(Venta venta, IEnumerable<VentasProducto> items, IEnumerable<VentasProductosVariante> variantes,
                                               IEnumerable<ClientesCobro> pagos);
        Task<bool> Eliminar(int id);

        Task<List<ClientesCobro>> ObtenerPagosPorVenta(int idVenta);
        Task<List<VentasProducto>> ObtenerItemsPorVenta(int idVenta);

        Task<decimal?> ObtenerPrecioPorLista(int idProducto, int idListaPrecio);
        Task<List<ProductosVariante>> ObtenerVariantesPorProducto(int idProducto);

        /// <summary>Textos distintos de <see cref="Venta.Estado"/> ya guardados en ventas, más PENDIENTE/FINALIZADA.</summary>
        Task<List<string>> ListarEstadosDistintos();
    }
}
