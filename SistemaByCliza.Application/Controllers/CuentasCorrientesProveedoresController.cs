using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SistemaByCliza.Application.Models.ViewModels;
using SistemaByCliza.BLL.Service;
using SistemaByCliza.Models;

namespace SistemaByCliza.Application.Controllers
{
    [Authorize]
    public class CuentasCorrientesProveedoresController : Controller
    {
        private readonly ICuentasCorrientesProvService _service;

        public CuentasCorrientesProveedoresController(ICuentasCorrientesProvService service)
        {
            _service = service;
        }

        [AllowAnonymous]
        public IActionResult Index() => View();

        // ---- Proveedores (panel izquierdo)
        [HttpGet]
        public async Task<IActionResult> ListaProveedores(string? texto)
        {
            var provs = await _service.ListarProveedores(texto);

            var vms = provs
                .Select(async p => new VMCuentasCorrientesProveedor
                {
                    Id = p.Id,
                    Nombre = p.Nombre ?? "",
                    Saldo = await _service.ObtenerSaldo(p.Id) // haber - debe
                })
                .Select(t => t.Result)
                .OrderBy(x => x.Nombre)
                .ToList();

            return Ok(vms);
        }

        // ---- Movimientos (devuelve saldo anterior + lista)
        [HttpGet]
        public async Task<IActionResult> Lista(int idProveedor, DateTime? desde, DateTime? hasta, string? texto)
        {
            var (lista, saldoAnterior) = await _service.ListarConSaldoAnterior(
                idProveedor, desde, hasta, texto);

            var vms = lista
                .OrderBy(m => m.Fecha)
                .ThenBy(m => m.Id)
                .Select(m =>
                {
                    var tipo = (m.Concepto ?? "").StartsWith("COMPRA", StringComparison.OrdinalIgnoreCase) ? "COMPRA"
                              : (m.Concepto ?? "").StartsWith("PAGO", StringComparison.OrdinalIgnoreCase) ? "PAGO"
                              : (m.TipoMov ?? "");

                    var concepto = m.Concepto ?? "";
                    if ((m.Concepto ?? "").Equals("COMPRA", StringComparison.OrdinalIgnoreCase) && m.IdMov > 0)
                        concepto = $"COMPRA NRO {m.IdMov}";
                    else if ((m.Concepto ?? "").Equals("PAGO PROVEEDOR", StringComparison.OrdinalIgnoreCase) && m.IdMov > 0)
                        concepto = $"PAGO PROVEEDOR NRO {m.IdMov}";

                    return new VMCuentasCorrientesMovimiento
                    {
                        Id = m.Id,
                        IdCliente = m.IdProveedor,     // reutilizo VM: mapeo en IdCliente
                        IdSucursal = null,             // no aplica
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
        public async Task<IActionResult> Saldo(int idProveedor)
        {
            if (idProveedor <= 0) return Ok(0m);
            var saldo = await _service.ObtenerSaldo(idProveedor);
            return Ok(saldo);
        }

        [HttpGet]
        public async Task<IActionResult> Obtener(int id)
        {
            var mov = await _service.Obtener(id);
            if (mov is null) return NotFound();

            var tipo = (mov.Concepto ?? "").StartsWith("COMPRA", StringComparison.OrdinalIgnoreCase) ? "COMPRA"
                      : (mov.Concepto ?? "").StartsWith("PAGO", StringComparison.OrdinalIgnoreCase) ? "PAGO"
                      : (mov.TipoMov ?? "");
            var concepto = mov.Concepto ?? "";
            if ((mov.Concepto ?? "").Equals("COMPRA", StringComparison.OrdinalIgnoreCase) && mov.IdMov > 0)
                concepto = $"COMPRA NRO {mov.IdMov}";
            else if ((mov.Concepto ?? "").Equals("PAGO PROVEEDOR", StringComparison.OrdinalIgnoreCase) && mov.IdMov > 0)
                concepto = $"PAGO PROVEEDOR NRO {mov.IdMov}";

            var vm = new VMCuentasCorrientesMovimiento
            {
                Id = mov.Id,
                IdCliente = mov.IdProveedor,
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
        public async Task<IActionResult> InsertarPagoManual([FromBody] VMCuentasCorrientesPagoProveedorUpsert vm)
        {
            var mov = new ProveedoresCuentaCorriente
            {
                Id = 0,
                IdProveedor = vm.IdProveedor,
                Fecha = vm.Fecha,
                TipoMov = "PAGO",
                IdMov = 0,
                Concepto = string.IsNullOrWhiteSpace(vm.Concepto) ? "PAGO PROVEEDOR" : vm.Concepto.Trim(),
                Debe = 0m,
                Haber = vm.Importe
            };

            var ok = await _service.InsertarPagoManual(mov, impactaCaja: true, idCuentaCaja: vm.IdCuentaCaja);
            return Ok(new { valor = ok });
        }

        [HttpPut]
        public async Task<IActionResult> ActualizarPagoManual([FromBody] VMCuentasCorrientesPagoProveedorUpsert vm)
        {
            if (vm.Id <= 0) return BadRequest();

            var mov = new ProveedoresCuentaCorriente
            {
                Id = vm.Id,
                IdProveedor = vm.IdProveedor,
                Fecha = vm.Fecha,
                TipoMov = "PAGO",
                IdMov = 0,
                Concepto = string.IsNullOrWhiteSpace(vm.Concepto) ? "PAGO PROVEEDOR" : vm.Concepto.Trim(),
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
