// BLL/Service/ITransferenciasCajasService.cs
using SistemaByCliza.Models;

namespace SistemaByCliza.BLL.Service
{
    public interface ITransferenciasCajasService
    {
        // Alta “amigable”: le pasás dto + fecha + sucursal; el service arma las 2 Cajas
        Task<(bool ok, int transferenciaId)> Crear(
            CajasTransfEntreCuenta dto,
            DateTime fecha,
            int idSucursal,
            string? conceptoBase = null);

        // Operaciones de bajo nivel (ya con las Cajas armadas)
        Task<(bool ok, int transferenciaId)> CrearAtomico(
            CajasTransfEntreCuenta dto, Caja cajaEgreso, Caja cajaIngreso);

        Task<bool> ActualizarAtomico(
            int transferenciaId, DateTime fecha,
            int idCuentaOrigen, decimal importeOrigen,
            int idCuentaDestino, decimal importeDestino,
            string conceptoOrigen, string conceptoDestino, string? nota);

        Task<bool> Eliminar(int idTransferencia);
        Task<bool> EliminarAtomico(int idTransferencia);

        Task<CajasTransfEntreCuenta?> ObtenerPorCajaId(int idCaja);
        Task<List<CajasTransfEntreCuenta>> Historial();
    }
}
