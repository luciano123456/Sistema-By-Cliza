// ======================= SistemaByCliza.DAL/Repository/IComprasRepository.cs =======================
using SistemaByCliza.Models;

namespace SistemaByCliza.DAL.Repository
{
    public interface IComprasRepository<TCompra> where TCompra : class
    {
        // Listado / Obtener
        Task<List<Compra>> Listar(DateTime? desde, DateTime? hasta, int? idProveedor, string? texto);
        Task<Compra?> Obtener(int id);
        Task<List<ComprasInsumo>> ObtenerItemsPorCompra(int idCompra);
        Task<List<ComprasPago>> ObtenerPagosPorCompra(int idCompra);

        // Upserts
        Task<bool> InsertarConDetallesYPagos(Compra compra, IEnumerable<ComprasInsumo> items, IEnumerable<ComprasPago> pagos);
        Task<bool> ActualizarConDetallesYPagos(Compra compra, IEnumerable<ComprasInsumo> items, IEnumerable<ComprasPago> pagos);

        // Delete
        Task<bool> Eliminar(int id);
    }
}
