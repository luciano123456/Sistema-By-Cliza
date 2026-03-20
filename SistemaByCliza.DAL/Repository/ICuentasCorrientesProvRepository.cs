// SistemaByCliza.DAL.Repository/ICuentasCorrientesProvRepository.cs
using SistemaByCliza.Models;

namespace SistemaByCliza.DAL.Repository
{
    public interface ICuentasCorrientesProvRepository<TEntity> where TEntity : class
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

        // Dado un movimiento de CC (proveedor), devuelve la cuenta de caja asociada si IdMov apunta a una Caja (EGRESO)
        Task<int?> ObtenerCuentaCajaDeMovimientoCC(int idMovimientoCC);
    }
}
