using SistemaByCliza.Models;

namespace SistemaByCliza.BLL.Service
{
    public interface IInventarioService
    {
        // Existencias
        Task<List<Inventario>> ListarExistencias(int? idSucursal, int? idProducto, int? idVariante, string? texto);

        // Movimientos
        Task<(List<InventarioMovimiento> Lista, decimal StockAnterior)> ListarMovimientos(
            int? idSucursal, int? idProducto, int? idVariante, DateTime? desde, DateTime? hasta, string? texto);

        // Ajuste manual
        Task<bool> AjusteManual(int idSucursal, int idProducto, int? idVariante,
                                DateTime fecha, string? concepto, string tipo, decimal cantidad);

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

        // ===== Ingreso por Orden de Corte =====
        Task<bool> IngresarStockDesdeOC(
            int idSucursal, int idOrdenCorte, DateTime fecha, string? nota,
            IEnumerable<(int IdProducto, int IdProductoVariante, int Cantidad)> lineas);
        Task<bool> RevertirIngresoDesdeOC(int idSucursal, int idOrdenCorte);

        // ===== NUEVO para Select2 =====
        Task<List<OrdenesCorte>> ListarOCDisponibles(string? texto, int? top);


        // ===== NUEVO para Select2 (revertir) =====
        Task<List<OrdenesCorte>> ListarOCConIngresoPorSucursal(int idSucursal, string? texto, int? top);


        Task<List<(int IdProducto, int IdProductoVariante, string Variante)>> VariantesPorOC(int idOrdenCorte); // existente

        // NUEVA
        Task<List<(int IdProducto, int IdProductoVariante, string Producto, string Variante)>> VariantesPorOCConProducto(int idOrdenCorte);


    }
}
