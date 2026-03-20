// SistemaByCliza.BLL/Service/IComprasService.cs
using SistemaByCliza.Models;

namespace SistemaByCliza.BLL.Service
{
    public interface IComprasService
    {
        // Listado / Obtener
        Task<List<Compra>> Listar(DateTime? desde, DateTime? hasta, int? idProveedor, string? estado, string? texto);
        Task<Compra?> Obtener(int id);
        Task<List<ComprasInsumo>> ObtenerItemsPorCompra(int idCompra);
        Task<List<ComprasPago>> ObtenerPagosPorCompra(int idCompra);

        // Upsert con detalles y pagos (lo que usa el Controller)
        Task<bool> InsertarConDetallesYPagos(Compra compra, IEnumerable<ComprasInsumo> items, IEnumerable<ComprasPago> pagos);
        Task<bool> ActualizarConDetallesYPagos(Compra compra, IEnumerable<ComprasInsumo> items, IEnumerable<ComprasPago> pagos);

        // Eliminar
        Task<bool> Eliminar(int id);
    }
}
