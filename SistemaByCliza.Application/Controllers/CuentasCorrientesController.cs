using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SistemaByCliza.Application.Models.ViewModels;
using SistemaByCliza.BLL.Service;
using SistemaByCliza.Models;

namespace SistemaByCliza.Application.Controllers
{
    [Authorize]
    public class CuentasCorrientesController : Controller
    {
        private readonly ICuentasCorrientesService _service;

        public CuentasCorrientesController(ICuentasCorrientesService service)
        {
            _service = service;
        }

        [AllowAnonymous]
        public IActionResult Index() => View();

        // ---- Clientes (panel izquierdo)
        [HttpGet]
        public async Task<IActionResult> ListaClientes(string? texto, bool? saldoActivo, int? idSucursal)
        {
            var clientes = await _service.ListarClientes(texto);

            var vms = new List<VMCuentasCorrientesCliente>(clientes.Count);
            foreach (var c in clientes)
            {
                var saldo = await _service.ObtenerSaldo(c.Id, idSucursal);
                vms.Add(new VMCuentasCorrientesCliente
                {
                    Id = c.Id,
                    Nombre = c.Nombre,
                    Saldo = saldo
                });
            }

            if (saldoActivo == true)
                vms = vms.Where(x => (x.Saldo ?? 0m) != 0m).ToList();

            return Ok(vms);
        }

        // ---- Movimientos (devuelve saldo anterior + lista)
        [HttpGet]
        public async Task<IActionResult> Lista(int idCliente, DateTime? desde, DateTime? hasta, int? idSucursal, string? texto)
        {
            var (lista, saldoAnterior) = await _service.ListarConSaldoAnterior(
                idCliente, desde, hasta, idSucursal, texto);

            var vms = lista
                .OrderBy(m => m.Fecha)
                .ThenBy(m => m.Id)
                .Select(m =>
                {
                    var tipo = (m.Concepto ?? "").StartsWith("VENTA", StringComparison.OrdinalIgnoreCase) ? "VENTA"
                              : (m.Concepto ?? "").StartsWith("COBRO", StringComparison.OrdinalIgnoreCase) ? "COBRO"
                              : (m.TipoMov ?? "");

                    var concepto = m.Concepto ?? "";
                    if ((m.Concepto ?? "").Equals("VENTA", StringComparison.OrdinalIgnoreCase) && m.IdMov > 0)
                        concepto = $"VENTA NRO {m.IdMov}";
                    else if ((m.Concepto ?? "").Equals("COBRO VENTA", StringComparison.OrdinalIgnoreCase) && m.IdMov > 0)
                        concepto = $"COBRO VENTA NRO {m.IdMov}";

                    return new VMCuentasCorrientesMovimiento
                    {
                        Id = m.Id,
                        IdCliente = m.IdCliente,
                        IdSucursal = m.IdSucursal,
                        Sucursal = m.IdSucursalNavigation?.Nombre ?? "",
                        Fecha = m.Fecha,
                        TipoMov = tipo,
                        IdMov = m.IdMov,
                        Concepto = concepto,
                        Debe = m.Debe,
                        Haber = m.Haber,
                        // si es cobro manual, traer también la cuenta de caja asociada (vía IdMov -> Caja.Id)
                        IdCuentaCaja = _service.ObtenerCuentaCajaDeMovimientoCCSync(m.Id),
                        SaldoAcumulado = 0
                    };
                })
                .ToList();

            return Ok(new { SaldoAnterior = saldoAnterior, Movimientos = vms });
        }

        [HttpGet]
        public async Task<IActionResult> Saldo(int idCliente, int? idSucursal)
        {
            if (idCliente <= 0) return Ok(0m);
            var saldo = await _service.ObtenerSaldo(idCliente, idSucursal);
            return Ok(saldo);
        }

        [HttpGet]
        public async Task<IActionResult> Obtener(int id)
        {
            var mov = await _service.Obtener(id);
            if (mov is null) return NotFound();

            var tipo = (mov.Concepto ?? "").StartsWith("VENTA", StringComparison.OrdinalIgnoreCase) ? "VENTA"
                      : (mov.Concepto ?? "").StartsWith("COBRO", StringComparison.OrdinalIgnoreCase) ? "COBRO"
                      : (mov.TipoMov ?? "");
            var concepto = mov.Concepto ?? "";
            if ((mov.Concepto ?? "").Equals("VENTA", StringComparison.OrdinalIgnoreCase) && mov.IdMov > 0)
                concepto = $"VENTA NRO {mov.IdMov}";
            else if ((mov.Concepto ?? "").Equals("COBRO VENTA", StringComparison.OrdinalIgnoreCase) && mov.IdMov > 0)
                concepto = $"COBRO VENTA NRO {mov.IdMov}";

            var vm = new VMCuentasCorrientesMovimiento
            {
                Id = mov.Id,
                IdCliente = mov.IdCliente,
                IdSucursal = mov.IdSucursal,
                Sucursal = mov.IdSucursalNavigation?.Nombre ?? "",
                Fecha = mov.Fecha,
                TipoMov = tipo,
                IdMov = mov.IdMov,
                Concepto = concepto,
                Debe = mov.Debe,
                Haber = mov.Haber,
                // <- traemos la cuenta de caja asociada para edición de cobro manual
                IdCuentaCaja = await _service.ObtenerCuentaCajaDeMovimientoCC(mov.Id)
            };
            return Ok(vm);
        }

        // ---- COBRO manual (impacta caja y guarda Id de Caja en IdMov de CC)
        [HttpPost]
        public async Task<IActionResult> InsertarManual([FromBody] VMCuentasCorrientesCobroUpsert vm)
        {
            var mov = new ClientesCuentaCorriente
            {
                Id = 0,
                IdCliente = vm.IdCliente,
                IdSucursal = (int)vm.IdSucursal!,
                Fecha = vm.Fecha,
                TipoMov = "COBRO",
                IdMov = 0,
                Concepto = string.IsNullOrWhiteSpace(vm.Concepto) ? "COBRO CC" : vm.Concepto.Trim(),
                Debe = 0m,
                Haber = vm.Importe
            };

            var ok = await _service.InsertarManual(mov, impactaCaja: true, idCuentaCaja: vm.IdCuentaCaja);
            return Ok(new { valor = ok });
        }

        [HttpPut]
        public async Task<IActionResult> ActualizarManual([FromBody] VMCuentasCorrientesCobroUpsert vm)
        {
            if (vm.Id <= 0) return BadRequest();

            var mov = new ClientesCuentaCorriente
            {
                Id = vm.Id,
                IdCliente = vm.IdCliente,
                IdSucursal = (int)vm.IdSucursal!,
                Fecha = vm.Fecha,
                TipoMov = "COBRO",
                IdMov = 0,
                Concepto = string.IsNullOrWhiteSpace(vm.Concepto) ? "COBRO CC" : vm.Concepto.Trim(),
                Debe = 0m,
                Haber = vm.Importe
            };

            var ok = await _service.ActualizarManual(mov, impactaCaja: true, idCuentaCaja: vm.IdCuentaCaja);
            return Ok(new { valor = ok });
        }

        [HttpDelete]
        public async Task<IActionResult> EliminarManual(int id)
        {
            var ok = await _service.EliminarManual(id);
            return Ok(new { valor = ok });
        }
    }
}
