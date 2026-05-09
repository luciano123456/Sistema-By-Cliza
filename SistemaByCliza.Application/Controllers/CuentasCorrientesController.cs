using System.Linq;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SistemaByCliza.Application.Extensions;
using SistemaByCliza.Application.Models.ViewModels;
using SistemaByCliza.BLL.Service;
using SistemaByCliza.Models;

namespace SistemaByCliza.Application.Controllers
{
    [Authorize]
    public class CuentasCorrientesController : Controller
    {
        private const int RolAdministrador = 1;

        private readonly ICuentasCorrientesService _service;
        private readonly IUsuariosService _usuariosService;
        private readonly ISucursalesService _sucursalesService;

        public CuentasCorrientesController(
            ICuentasCorrientesService service,
            IUsuariosService usuariosService,
            ISucursalesService sucursalesService)
        {
            _service = service;
            _usuariosService = usuariosService;
            _sucursalesService = sucursalesService;
        }

        private bool EsAdministradorTotal() => User.GetRolId() == RolAdministrador;

        /// <summary>
        /// Admin: sin restricción (<see langword="null"/>). Resto: lista de Id sucursal asignadas (vacía si no tiene ninguna).
        /// </summary>
        private async Task<(bool esAdmin, IReadOnlyList<int>? idsSucursalesPermitidas)> ResolverSucursalesCcAsync()
        {
            if (EsAdministradorTotal())
                return (true, null);
            var uid = User.GetUserId();
            if (!uid.HasValue)
                return (false, Array.Empty<int>());
            var u = await _usuariosService.ObtenerConSucursales(uid.Value);
            var ids = u?.UsuariosSucursales?.Select(s => s.IdSucursal).Distinct().ToList() ?? new List<int>();
            return (false, ids);
        }

        private static bool IdSucursalFiltroValido(int? idSucursal, bool esAdmin, IReadOnlyList<int>? idsPerm)
        {
            if (!idSucursal.HasValue || idSucursal <= 0) return true;
            if (esAdmin) return true;
            return idsPerm != null && idsPerm.Contains(idSucursal.Value);
        }

        private bool PuedeVerSucursalMovimiento(int idSucursalMov, bool esAdmin, IReadOnlyList<int>? idsPerm)
        {
            if (esAdmin) return true;
            return idsPerm != null && idsPerm.Contains(idSucursalMov);
        }

        private async Task<bool> UsuarioPuedeUsarSucursalCcAsync(int idSucursal)
        {
            if (idSucursal <= 0) return false;
            if (EsAdministradorTotal()) return true;
            var uid = User.GetUserId();
            if (!uid.HasValue) return false;
            var u = await _usuariosService.ObtenerConSucursales(uid.Value);
            var set = u?.UsuariosSucursales?.Select(s => s.IdSucursal).ToHashSet() ?? new HashSet<int>();
            return set.Contains(idSucursal);
        }

        [AllowAnonymous]
        public IActionResult Index() => View();

        /// <summary>Sucursales para filtros y cobros: todas si es admin; solo asignadas al usuario si no.</summary>
        [HttpGet]
        public async Task<IActionResult> SucursalesOpciones()
        {
            if (EsAdministradorTotal())
            {
                var q = await _sucursalesService.ObtenerTodos();
                var lista = await q.OrderBy(s => s.Nombre).Select(s => new { s.Id, Nombre = s.Nombre }).ToListAsync();
                return Ok(lista);
            }

            var uid = User.GetUserId();
            if (!uid.HasValue) return Ok(Array.Empty<object>());

            var u = await _usuariosService.ObtenerConSucursales(uid.Value);
            if (u?.UsuariosSucursales is null || u.UsuariosSucursales.Count == 0)
                return Ok(Array.Empty<object>());
            var list = u.UsuariosSucursales
                .Where(s => s.IdSucursalNavigation != null)
                .GroupBy(s => s.IdSucursal)
                .Select(g => new { Id = g.Key, Nombre = g.First().IdSucursalNavigation!.Nombre })
                .OrderBy(x => x.Nombre)
                .ToList();
            return Ok(list);
        }

        // ---- Clientes (panel izquierdo)
        [HttpGet]
        public async Task<IActionResult> ListaClientes(string? texto, bool? saldoActivo, int? idSucursal)
        {
            if (!EsAdministradorTotal() && User.GetUserId() is null)
                return Forbid();

            var (esAdmin, idsPerm) = await ResolverSucursalesCcAsync();
            if (!IdSucursalFiltroValido(idSucursal, esAdmin, idsPerm))
                return BadRequest("Sucursal no permitida.");

            var idsRepo = esAdmin ? null : idsPerm;
            var clientes = await _service.ListarClientes(texto);

            var vms = new List<VMCuentasCorrientesCliente>(clientes.Count);
            foreach (var c in clientes)
            {
                var saldo = await _service.ObtenerSaldo(c.Id, idSucursal, idsRepo);
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
            if (!EsAdministradorTotal() && User.GetUserId() is null)
                return Forbid();

            var (esAdmin, idsPerm) = await ResolverSucursalesCcAsync();
            if (!IdSucursalFiltroValido(idSucursal, esAdmin, idsPerm))
                return BadRequest("Sucursal no permitida.");

            var idsRepo = esAdmin ? null : idsPerm;
            var (lista, saldoAnterior) = await _service.ListarConSaldoAnterior(
                idCliente, desde, hasta, idSucursal, texto, idsRepo);

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
            if (!EsAdministradorTotal() && User.GetUserId() is null)
                return Forbid();
            if (idCliente <= 0) return Ok(0m);

            var (esAdmin, idsPerm) = await ResolverSucursalesCcAsync();
            if (!IdSucursalFiltroValido(idSucursal, esAdmin, idsPerm))
                return BadRequest("Sucursal no permitida.");

            var idsRepo = esAdmin ? null : idsPerm;
            var saldo = await _service.ObtenerSaldo(idCliente, idSucursal, idsRepo);
            return Ok(saldo);
        }

        [HttpGet]
        public async Task<IActionResult> Obtener(int id)
        {
            var (esAdmin, idsPerm) = await ResolverSucursalesCcAsync();
            var mov = await _service.Obtener(id);
            if (mov is null) return NotFound();
            if (!PuedeVerSucursalMovimiento(mov.IdSucursal, esAdmin, idsPerm))
                return NotFound();

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
                IdCuentaCaja = await _service.ObtenerCuentaCajaDeMovimientoCC(mov.Id)
            };
            return Ok(vm);
        }

        // ---- COBRO manual (impacta caja y guarda Id de Caja en IdMov de CC)
        [HttpPost]
        public async Task<IActionResult> InsertarManual([FromBody] VMCuentasCorrientesCobroUpsert vm)
        {
            if (!await UsuarioPuedeUsarSucursalCcAsync((int)vm.IdSucursal!))
                return Forbid();

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

            if (!await UsuarioPuedeUsarSucursalCcAsync((int)vm.IdSucursal!))
                return Forbid();

            var ex = await _service.Obtener(vm.Id);
            if (ex is null) return NotFound();
            var (esAdmin, idsPerm) = await ResolverSucursalesCcAsync();
            if (!PuedeVerSucursalMovimiento(ex.IdSucursal, esAdmin, idsPerm))
                return NotFound();

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
            var ex = await _service.Obtener(id);
            if (ex is null) return NotFound();
            var (esAdmin, idsPerm) = await ResolverSucursalesCcAsync();
            if (!PuedeVerSucursalMovimiento(ex.IdSucursal, esAdmin, idsPerm))
                return NotFound();

            var ok = await _service.EliminarManual(id);
            return Ok(new { valor = ok });
        }
    }
}
