// SistemaByCliza.DAL.Repository/ICuentasCorrientesRepository.cs
using SistemaByCliza.Models;

namespace SistemaByCliza.DAL.Repository
{
    public interface ICuentasCorrientesRepository<TEntity> where TEntity : class
    {
        Task<List<Cliente>> ListarClientes(string? texto);

        /// <param name="idsSucursalesPermitidas"><see langword="null"/>: sin restricción (admin). Lista vacía: ninguna sucursal. Caso contrario: solo movimientos en esas sucursales.</param>
        Task<(List<ClientesCuentaCorriente> Lista, decimal SaldoAnterior)> ListarConSaldoAnterior(
            int idCliente, DateTime? desde, DateTime? hasta, int? idSucursal, string? texto,
            IReadOnlyList<int>? idsSucursalesPermitidas = null);

        Task<decimal> ObtenerSaldo(int idCliente, int? idSucursal, IReadOnlyList<int>? idsSucursalesPermitidas = null);

        Task<ClientesCuentaCorriente?> Obtener(int id);
        Task<bool> InsertarManual(ClientesCuentaCorriente mov, bool impactaCaja, int? idCuentaCaja);
        Task<bool> ActualizarManual(ClientesCuentaCorriente mov, bool impactaCaja, int? idCuentaCaja);
        Task<bool> EliminarManual(int id);

        Task<bool> ExisteVenta(int idVenta);

        // Dado un movimiento de CC, devuelve la cuenta de caja asociada (si IdMov apunta a una Caja)
        Task<int?> ObtenerCuentaCajaDeMovimientoCC(int idMovimientoCC);
    }
}
