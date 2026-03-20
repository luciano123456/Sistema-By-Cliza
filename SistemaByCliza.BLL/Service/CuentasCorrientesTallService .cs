// SistemaByCliza.BLL.Service/CuentasCorrientesTallService.cs
using SistemaByCliza.DAL.Repository;
using SistemaByCliza.Models;

namespace SistemaByCliza.BLL.Service
{
    public class CuentasCorrientesTallService : ICuentasCorrientesTallService
    {
        private readonly ICuentasCorrientesTallRepository<TalleresCuentaCorriente> _repo;
        public CuentasCorrientesTallService(ICuentasCorrientesTallRepository<TalleresCuentaCorriente> repo)
        {
            _repo = repo;
        }

        public Task<List<Taller>> ListarTalleres(string? texto)
            => _repo.ListarTalleres(texto);

        public Task<(List<TalleresCuentaCorriente> Lista, decimal SaldoAnterior)> ListarConSaldoAnterior(
            int idTaller, DateTime? desde, DateTime? hasta, string? texto)
            => _repo.ListarConSaldoAnterior(idTaller, desde, hasta, texto);

        public Task<decimal> ObtenerSaldo(int idTaller)
            => _repo.ObtenerSaldo(idTaller);

        public Task<TalleresCuentaCorriente?> Obtener(int id)
            => _repo.Obtener(id);

        public Task<bool> InsertarPagoManual(TalleresCuentaCorriente mov, bool impactaCaja, int? idCuentaCaja)
            => _repo.InsertarPagoManual(mov, impactaCaja, idCuentaCaja);

        public Task<bool> ActualizarPagoManual(TalleresCuentaCorriente mov, bool impactaCaja, int? idCuentaCaja)
            => _repo.ActualizarPagoManual(mov, impactaCaja, idCuentaCaja);

        public Task<bool> EliminarPagoManual(int id)
            => _repo.EliminarPagoManual(id);

        public Task<int?> ObtenerCuentaCajaDeMovimientoCC(int idMovimientoCC)
            => _repo.ObtenerCuentaCajaDeMovimientoCC(idMovimientoCC);

        public int? ObtenerCuentaCajaDeMovimientoCCSync(int idMovimientoCC)
            => _repo.ObtenerCuentaCajaDeMovimientoCC(idMovimientoCC).GetAwaiter().GetResult();
    }
}
