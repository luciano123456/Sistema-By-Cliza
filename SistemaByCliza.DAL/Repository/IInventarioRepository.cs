using SistemaByCliza.Models;

namespace SistemaByCliza.DAL.Repository
{
    public interface IInventarioRepository<TEntity> where TEntity : class
    {
        // Existencias
        Task<List<Inventario>> ListarExistencias(int? idSucursal, int? idProducto, int? idVariante, string? texto);
        Task<Inventario?> ObtenerExistencia(int id);

        // Movimientos
        Task<(List<InventarioMovimiento> Lista, decimal StockAnterior)> ListarMovimientos(
            int? idSucursal, int? idProducto, int? idVariante, DateTime? desde, DateTime? hasta, string? texto);

        // Ajuste manual
        Task<bool> AjusteManual(InventarioMovimiento mov);

        // ===== Transferencias (NO TOCAR) =====
        Task<InventarioTransfSucursal?> ObtenerTransferencia(int id);
        Task<bool> CrearTransferencia(InventarioTransfSucursal transf,
            IEnumerable<InventarioTransfSucursalesProducto> productos,
            IEnumerable<InventarioTransfSucursalesProductosVariante> variantes);
        Task<bool> ActualizarTransferencia(InventarioTransfSucursal transf,
            IEnumerable<InventarioTransfSucursalesProducto> productos,
            IEnumerable<InventarioTransfSucursalesProductosVariante> variantes);
        Task<bool> EliminarTransferencia(int id);
        Task<List<InventarioTransfSucursal>> HistorialTransferencias(
            int? idOrigen, int? idDestino, DateTime? desde, DateTime? hasta, string? texto);

        // ===== OC =====
        Task<bool> IngresarStockDesdeOC(
            int idSucursal, int idOrdenCorte, DateTime fecha, string? nota,
            IEnumerable<(int IdProducto, int IdProductoVariante, int Cantidad)> lineas);
        Task<bool> RevertirIngresoDesdeOC(int idSucursal, int idOrdenCorte);

        // ===== NUEVO para Select2 =====
        Task<List<OrdenesCorte>> ListarOCDisponibles(string? texto, int? top);
        Task<List<(int IdProducto, int IdProductoVariante, string Variante)>> VariantesPorOC(int idOrdenCorte);

        Task<List<OrdenesCorte>> ListarOCConIngresoPorSucursal(int idSucursal, string? texto, int? top);


        // NUEVA
        Task<List<(int IdProducto, int IdProductoVariante, string Producto, string Variante)>> VariantesPorOCConProducto(int idOrdenCorte);


    }
}
