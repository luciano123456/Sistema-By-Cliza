// SistemaByCliza.Application/Controllers/CuentasCorrientesTalleresController.cs
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SistemaByCliza.Application.Models.ViewModels;
using SistemaByCliza.BLL.Service;
using SistemaByCliza.Models;

namespace SistemaByCliza.Application.Controllers
{
    [Authorize]
    public class CuentasCorrientesTalleresController : Controller
    {
        private readonly ICuentasCorrientesTallService _service;

        public CuentasCorrientesTalleresController(ICuentasCorrientesTallService service)
        {
            _service = service;
        }

        [AllowAnonymous]
        public IActionResult Index() => View();

        // ---- Talleres (panel izquierdo)
        [HttpGet]
        public async Task<IActionResult> ListaTalleres(string? texto)
        {
            var talls = await _service.ListarTalleres(texto);

            var vms = talls
                .Select(async t => new VMCuentasCorrientesTaller
                {
                    Id = t.Id,
                    Nombre = t.Nombre ?? "",
                    Saldo = await _service.ObtenerSaldo(t.Id) // haber - debe
                })
                .Select(t => t.Result)
                .OrderBy(x => x.Nombre)
                .ToList();

            return Ok(vms);
        }

        // ---- Movimientos (devuelve saldo anterior + lista)
        [HttpGet]
        public async Task<IActionResult> Lista(int idTaller, DateTime? desde, DateTime? hasta, string? texto)
        {
            var (lista, saldoAnterior) = await _service.ListarConSaldoAnterior(
                idTaller, desde, hasta, texto);

            var vms = lista
                .OrderBy(m => m.Fecha)
                .ThenBy(m => m.Id)
                .Select(m =>
                {
                    // Tipificación simple por prefijo de concepto
                    var tipo = (m.Concepto ?? "").StartsWith("SERVICIO", StringComparison.OrdinalIgnoreCase) ? "SERVICIO"
                              : (m.Concepto ?? "").StartsWith("PAGO", StringComparison.OrdinalIgnoreCase) ? "PAGO"
                              : (m.TipoMov ?? "");

                    var concepto = m.Concepto ?? "";
                    if ((m.Concepto ?? "").Equals("SERVICIO TALLER", StringComparison.OrdinalIgnoreCase) && m.IdMov > 0)
                        concepto = $"SERVICIO TALLER NRO {m.IdMov}";
                    else if ((m.Concepto ?? "").Equals("PAGO TALLER", StringComparison.OrdinalIgnoreCase) && m.IdMov > 0)
                        concepto = $"PAGO TALLER NRO {m.IdMov}";

                    return new VMCuentasCorrientesMovimiento
                    {
                        Id = m.Id,
                        IdCliente = m.IdTaller, // reutilizo VM
                        IdSucursal = null,
                        Sucursal = "",
                        Fecha = m.Fecha,
                        TipoMov = tipo,
                        IdMov = m.IdMov,
                        Concepto = concepto,
                        Debe = m.Debe,
                        Haber = m.Haber,
                        IdCuentaCaja = _service.ObtenerCuentaCajaDeMovimientoCCSync(m.Id),
                        SaldoAcumulado = 0
                    };
                })
                .ToList();

            return Ok(new { SaldoAnterior = saldoAnterior, Movimientos = vms });
        }

        [HttpGet]
        public async Task<IActionResult> Saldo(int idTaller)
        {
            if (idTaller <= 0) return Ok(0m);
            var saldo = await _service.ObtenerSaldo(idTaller);
            return Ok(saldo);
        }

        [HttpGet]
        public async Task<IActionResult> Obtener(int id)
        {
            var mov = await _service.Obtener(id);
            if (mov is null) return NotFound();

            var tipo = (mov.Concepto ?? "").StartsWith("SERVICIO", StringComparison.OrdinalIgnoreCase) ? "SERVICIO"
                      : (mov.Concepto ?? "").StartsWith("PAGO", StringComparison.OrdinalIgnoreCase) ? "PAGO"
                      : (mov.TipoMov ?? "");
            var concepto = mov.Concepto ?? "";
            if ((mov.Concepto ?? "").Equals("SERVICIO TALLER", StringComparison.OrdinalIgnoreCase) && mov.IdMov > 0)
                concepto = $"SERVICIO TALLER NRO {mov.IdMov}";
            else if ((mov.Concepto ?? "").Equals("PAGO TALLER", StringComparison.OrdinalIgnoreCase) && mov.IdMov > 0)
                concepto = $"PAGO TALLER NRO {mov.IdMov}";

            var vm = new VMCuentasCorrientesMovimiento
            {
                Id = mov.Id,
                IdCliente = mov.IdTaller,
                IdSucursal = null,
                Sucursal = "",
                Fecha = mov.Fecha,
                TipoMov = tipo,
                IdMov = mov.IdMov,
                Concepto = concepto,
                Debe = mov.Debe,
                Haber = mov.Haber,
                IdCuentaCaja = await _service.ObtenerCuentaCajaDeMovimientoCC(mov.Id)
            };
            return Ok(vm);
        }

        // ---- PAGO manual (impacta caja como EGRESO y guarda Id de Caja en IdMov de CC)
        [HttpPost]
        public async Task<IActionResult> InsertarPagoManual([FromBody] VMCuentasCorrientesPagoTallerUpsert vm)
        {
            var mov = new TalleresCuentaCorriente
            {
                Id = 0,
                IdTaller = vm.IdTaller,
                Fecha = vm.Fecha,
                TipoMov = "PAGO",
                IdMov = 0,
                Concepto = string.IsNullOrWhiteSpace(vm.Concepto) ? "PAGO TALLER" : vm.Concepto.Trim(),
                Debe = 0m,
                Haber = vm.Importe
            };

            var ok = await _service.InsertarPagoManual(mov, impactaCaja: true, idCuentaCaja: vm.IdCuentaCaja);
            return Ok(new { valor = ok });
        }

        [HttpPut]
        public async Task<IActionResult> ActualizarPagoManual([FromBody] VMCuentasCorrientesPagoTallerUpsert vm)
        {
            if (vm.Id <= 0) return BadRequest();

            var mov = new TalleresCuentaCorriente
            {
                Id = vm.Id,
                IdTaller = vm.IdTaller,
                Fecha = vm.Fecha,
                TipoMov = "PAGO",
                IdMov = 0,
                Concepto = string.IsNullOrWhiteSpace(vm.Concepto) ? "PAGO TALLER" : vm.Concepto.Trim(),
                Debe = 0m,
                Haber = vm.Importe
            };

            var ok = await _service.ActualizarPagoManual(mov, impactaCaja: true, idCuentaCaja: vm.IdCuentaCaja);
            return Ok(new { valor = ok });
        }

        [HttpDelete]
        public async Task<IActionResult> EliminarPagoManual(int id)
        {
            var ok = await _service.EliminarPagoManual(id);
            return Ok(new { valor = ok });
        }
    }
}
