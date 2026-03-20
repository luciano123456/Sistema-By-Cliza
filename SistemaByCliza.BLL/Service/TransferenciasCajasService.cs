// BLL/Service/TransferenciasCajasService.cs
using SistemaByCliza.DAL.Repository;
using SistemaByCliza.Models;

namespace SistemaByCliza.BLL.Service
{
    public class TransferenciasCajasService : ITransferenciasCajasService
    {
        private readonly ITransferenciasCajasRepository _repo;
        public TransferenciasCajasService(ITransferenciasCajasRepository repo) => _repo = repo;

        public async Task<(bool ok, int transferenciaId)> Crear(
            CajasTransfEntreCuenta dto,
            DateTime fecha,
            int idSucursal,
            string? conceptoBase = null)
        {
            conceptoBase ??= "Transferencia entre cuentas";

            var cajaEgreso = new Caja
            {
                IdSucursal = idSucursal,
                IdCuenta = dto.IdCuentaOrigen,
                Fecha = fecha,
                TipoMov = "Egreso",
                Concepto = $"{conceptoBase}",
                Ingreso = 0m,
                Egreso = dto.ImporteOrigen
            };

            var cajaIngreso = new Caja
            {
                IdSucursal = idSucursal,
                IdCuenta = dto.IdCuentaDestino,
                Fecha = fecha,
                TipoMov = "Ingreso",
                Concepto = $"{conceptoBase}",
                Ingreso = dto.ImporteDestino,
                Egreso = 0m
            };

            return await _repo.CrearAtomico(dto, cajaEgreso, cajaIngreso);
        }

        public Task<List<CajasTransfEntreCuenta>> Historial() => _repo.Historial();

        public Task<bool> Eliminar(int idTransferencia) => _repo.EliminarAtomico(idTransferencia);

        public Task<(bool ok, int transferenciaId)> CrearAtomico(CajasTransfEntreCuenta dto, Caja cajaEgreso, Caja cajaIngreso)
       => _repo.CrearAtomico(dto, cajaEgreso, cajaIngreso);


        public Task<bool> EliminarAtomico(int idTransferencia) => _repo.EliminarAtomico(idTransferencia);

        public Task<CajasTransfEntreCuenta?> ObtenerPorCajaId(int idCaja) => _repo.ObtenerPorCajaId(idCaja);

        public Task<bool> ActualizarAtomico(int transferenciaId, DateTime fecha,
            int idCuentaOrigen, decimal importeOrigen,
            int idCuentaDestino, decimal importeDestino,
            string conceptoOrigen, string conceptoDestino, string? nota)
            => _repo.ActualizarAtomico(transferenciaId, fecha, idCuentaOrigen, importeOrigen,
                                       idCuentaDestino, importeDestino, conceptoOrigen, conceptoDestino, nota);
    }
}
