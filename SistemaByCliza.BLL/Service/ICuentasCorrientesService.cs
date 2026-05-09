// SistemaByCliza.BLL.Service/ICuentasCorrientesService.cs
using SistemaByCliza.Models;

namespace SistemaByCliza.BLL.Service
{
    public interface ICuentasCorrientesService
    {
        Task<List<Cliente>> ListarClientes(string? texto);

        Task<(List<ClientesCuentaCorriente> Lista, decimal SaldoAnterior)> ListarConSaldoAnterior(
            int idCliente, DateTime? desde, DateTime? hasta, int? idSucursal, string? texto,
            IReadOnlyList<int>? idsSucursalesPermitidas = null);

        Task<decimal> ObtenerSaldo(int idCliente, int? idSucursal, IReadOnlyList<int>? idsSucursalesPermitidas = null);

        Task<ClientesCuentaCorriente?> Obtener(int id);

        Task<bool> InsertarManual(ClientesCuentaCorriente mov, bool impactaCaja, int? idCuentaCaja);
        Task<bool> ActualizarManual(ClientesCuentaCorriente mov, bool impactaCaja, int? idCuentaCaja);
        Task<bool> EliminarManual(int id);

        Task<bool> ExisteVenta(int idVenta);

        // Caja asociada a un cobro manual (CC.IdMov -> Caja.Id)
        Task<int?> ObtenerCuentaCajaDeMovimientoCC(int idMovimientoCC);

        // helper sync: sólo para mapping en Lista
        int? ObtenerCuentaCajaDeMovimientoCCSync(int idMovimientoCC);
    }
}
