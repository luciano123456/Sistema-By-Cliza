// DAL/Repository/ITransferenciasCajasRepository.cs
using SistemaByCliza.Models;

namespace SistemaByCliza.DAL.Repository
{
    public interface ITransferenciasCajasRepository
    {
        Task<(bool ok, int transferenciaId)> CrearAtomico(
            CajasTransfEntreCuenta dto, Caja cajaEgreso, Caja cajaIngreso);

        Task<bool> ActualizarAtomico(
            int transferenciaId, DateTime fecha,
            int idCuentaOrigen, decimal importeOrigen,
            int idCuentaDestino, decimal importeDestino,
            string conceptoOrigen, string conceptoDestino, string? nota);

        Task<bool> EliminarAtomico(int idTransferencia);

        Task<CajasTransfEntreCuenta?> ObtenerPorCajaId(int idCaja);
        Task<List<CajasTransfEntreCuenta>> Historial();
    }
}
