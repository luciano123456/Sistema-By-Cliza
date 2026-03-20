// SistemaByCliza.BLL.Service/CuentasCorrientesProvService.cs
using SistemaByCliza.DAL.Repository;
using SistemaByCliza.Models;

namespace SistemaByCliza.BLL.Service
{
    public class CuentasCorrientesProvService : ICuentasCorrientesProvService
    {
        private readonly ICuentasCorrientesProvRepository<ProveedoresCuentaCorriente> _repo;
        public CuentasCorrientesProvService(ICuentasCorrientesProvRepository<ProveedoresCuentaCorriente> repo)
        {
            _repo = repo;
        }

        public Task<List<Proveedor>> ListarProveedores(string? texto)
            => _repo.ListarProveedores(texto);

        public Task<(List<ProveedoresCuentaCorriente> Lista, decimal SaldoAnterior)> ListarConSaldoAnterior(
            int idProveedor, DateTime? desde, DateTime? hasta, string? texto)
            => _repo.ListarConSaldoAnterior(idProveedor, desde, hasta, texto);

        public Task<decimal> ObtenerSaldo(int idProveedor)
            => _repo.ObtenerSaldo(idProveedor);

        public Task<ProveedoresCuentaCorriente?> Obtener(int id)
            => _repo.Obtener(id);

        public Task<bool> InsertarPagoManual(ProveedoresCuentaCorriente mov, bool impactaCaja, int? idCuentaCaja)
            => _repo.InsertarPagoManual(mov, impactaCaja, idCuentaCaja);

        public Task<bool> ActualizarPagoManual(ProveedoresCuentaCorriente mov, bool impactaCaja, int? idCuentaCaja)
            => _repo.ActualizarPagoManual(mov, impactaCaja, idCuentaCaja);

        public Task<bool> EliminarPagoManual(int id)
            => _repo.EliminarPagoManual(id);

        public Task<bool> ExisteCompra(int idCompra)
            => _repo.ExisteCompra(idCompra);

        public Task<int?> ObtenerCuentaCajaDeMovimientoCC(int idMovimientoCC)
            => _repo.ObtenerCuentaCajaDeMovimientoCC(idMovimientoCC);

        public int? ObtenerCuentaCajaDeMovimientoCCSync(int idMovimientoCC)
            => _repo.ObtenerCuentaCajaDeMovimientoCC(idMovimientoCC).GetAwaiter().GetResult();
    }
}
