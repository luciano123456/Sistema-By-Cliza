// SistemaByCliza.BLL.Service/ICuentasCorrientesProvService.cs
using SistemaByCliza.Models;

namespace SistemaByCliza.BLL.Service
{
    public interface ICuentasCorrientesProvService
    {
        Task<List<Proveedor>> ListarProveedores(string? texto);

        Task<(List<ProveedoresCuentaCorriente> Lista, decimal SaldoAnterior)> ListarConSaldoAnterior(
            int idProveedor, DateTime? desde, DateTime? hasta, string? texto);

        Task<decimal> ObtenerSaldo(int idProveedor);

        Task<ProveedoresCuentaCorriente?> Obtener(int id);

        Task<bool> InsertarPagoManual(ProveedoresCuentaCorriente mov, bool impactaCaja, int? idCuentaCaja);
        Task<bool> ActualizarPagoManual(ProveedoresCuentaCorriente mov, bool impactaCaja, int? idCuentaCaja);
        Task<bool> EliminarPagoManual(int id);

        Task<bool> ExisteCompra(int idCompra);

        Task<int?> ObtenerCuentaCajaDeMovimientoCC(int idMovimientoCC);
        int? ObtenerCuentaCajaDeMovimientoCCSync(int idMovimientoCC);
    }
}
