// SistemaByCliza.BLL.Service/ICuentasCorrientesTallService.cs
using SistemaByCliza.Models;

namespace SistemaByCliza.BLL.Service
{
    public interface ICuentasCorrientesTallService
    {
        Task<List<Taller>> ListarTalleres(string? texto);

        Task<(List<TalleresCuentaCorriente> Lista, decimal SaldoAnterior)> ListarConSaldoAnterior(
            int idTaller, DateTime? desde, DateTime? hasta, string? texto);

        Task<decimal> ObtenerSaldo(int idTaller);

        Task<TalleresCuentaCorriente?> Obtener(int id);

        Task<bool> InsertarPagoManual(TalleresCuentaCorriente mov, bool impactaCaja, int? idCuentaCaja);
        Task<bool> ActualizarPagoManual(TalleresCuentaCorriente mov, bool impactaCaja, int? idCuentaCaja);
        Task<bool> EliminarPagoManual(int id);

        Task<int?> ObtenerCuentaCajaDeMovimientoCC(int idMovimientoCC);
        int? ObtenerCuentaCajaDeMovimientoCCSync(int idMovimientoCC);
    }
}
