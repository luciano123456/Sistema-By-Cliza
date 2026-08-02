using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SistemaByCliza.Application.Models.ViewModels;
using SistemaByCliza.BLL.Service;
using SistemaByCliza.Models;

namespace SistemaByCliza.Application.Controllers
{
    [Authorize]
    public class PersonalSueldosController : Controller
    {
        private readonly IPersonalSueldosService _srv;
        public PersonalSueldosController(IPersonalSueldosService srv) { _srv = srv; }

        [AllowAnonymous]
        public IActionResult Index() => View();

        [AllowAnonymous]
        public IActionResult NuevoModif(int? id)
        {
            if (id.HasValue) ViewBag.Data = id.Value;
            return View();
        }

        [HttpGet]
        public async Task<IActionResult> Lista(
            DateTime? fechaDesde,
            DateTime? fechaHasta,
            int? idPersonal = null,
            string? estado = null,
            string? concepto = null)
        {
            var data = await _srv.Listar(fechaDesde, fechaHasta, idPersonal, estado, concepto);

            var vm = data.Select(s => new VMPersonalSueldo
            {
                Id = s.Id,
                IdPersonal = s.IdPersonal,
                Personal = s.IdPersonalNavigation?.Nombre ?? "",
                Fecha = s.Fecha,
                Concepto = s.Concepto,
                Importe = s.Importe,
                ImporteAbonado = s.ImporteAbonado,
                Saldo = s.Saldo,
                NotaInterna = s.NotaInterna
            }).ToList();

            return Ok(vm);
        }

        [HttpGet]
        public async Task<IActionResult> EditarInfo(int id)
        {
            var s = await _srv.Obtener(id);
            if (s is null) return NotFound();

            var pagos = await _srv.ObtenerPagosPorSueldo(id);

            var vm = new VMPersonalSueldo
            {
                Id = s.Id,
                IdPersonal = s.IdPersonal,
                Personal = s.IdPersonalNavigation?.Nombre ?? "",
                Fecha = s.Fecha,
                Concepto = s.Concepto,
                Importe = s.Importe,
                ImporteAbonado = s.ImporteAbonado,
                Saldo = s.Saldo,
                NotaInterna = s.NotaInterna,
                Pagos = pagos.Select(p => new VMPersonalSueldosPago
                {
                    Id = p.Id,
                    IdSueldo = p.IdSueldo,
                    Fecha = p.Fecha,
                    IdCuenta = p.IdCuenta,
                    Cuenta = p.IdCuentaNavigation?.Nombre ?? "",
                    Importe = p.Importe,
                    NotaInterna = p.NotaInterna
                }).ToList()
            };
            return Ok(vm);
        }

        // ----------- API: SUELDOS (UPSERT TODO JUNTO) -----------
        // Insertar TODO: sueldo + pagos
        [HttpPost]
        public async Task<IActionResult> Insertar([FromBody] VMPersonalSueldo vm)
        {
            if (vm is null) return BadRequest("Payload inválido");

            var sueldo = new PersonalSueldo
            {
                IdPersonal = vm.IdPersonal,
                Fecha = vm.Fecha,
                Concepto = vm.Concepto,
                Importe = vm.Importe,
                NotaInterna = vm.NotaInterna
            };

            var pagos = (vm.Pagos ?? new List<VMPersonalSueldosPago>()).Select(p => new PersonalSueldosPago
            {
                Fecha = p.Fecha,
                IdCuenta = p.IdCuenta,
                Importe = p.Importe,
                NotaInterna = p.NotaInterna
            }).ToList();

            try
            {
                var ok = await _srv.InsertarConPagos(sueldo, pagos);
                return Ok(new { valor = ok, id = ok ? sueldo.Id : 0 });
            }
            catch (Exception ex) { return BadRequest(ex.Message); }
        }

        // Actualizar TODO: sueldo + pagos (agrega/actualiza/elimina)
        [HttpPut]
        public async Task<IActionResult> Actualizar([FromBody] VMPersonalSueldo vm)
        {
            if (vm is null || vm.Id <= 0) return BadRequest("Id inválido");

            var sueldo = new PersonalSueldo
            {
                Id = vm.Id,
                IdPersonal = vm.IdPersonal,
                Fecha = vm.Fecha,
                Concepto = vm.Concepto,
                Importe = vm.Importe,
                NotaInterna = vm.NotaInterna
            };

            var pagos = (vm.Pagos ?? new List<VMPersonalSueldosPago>()).Select(p => new PersonalSueldosPago
            {
                Id = p.Id,
                IdSueldo = vm.Id,
                Fecha = p.Fecha,
                IdCuenta = p.IdCuenta,
                Importe = p.Importe,
                NotaInterna = p.NotaInterna
            }).ToList();

            try
            {
                var ok = await _srv.ActualizarConPagos(sueldo, pagos);
                return Ok(new { valor = ok });
            }
            catch (Exception ex) { return BadRequest(ex.Message); }
        }

        [HttpDelete]
        public async Task<IActionResult> Eliminar(int id)
        {
            var ok = await _srv.Eliminar(id);
            return Ok(new { valor = ok });
        }

        // ----------- API auxiliares (si las seguís usando) -----------
        [HttpGet]
        public async Task<IActionResult> PagosLista(int idSueldo)
        {
            var list = await _srv.ObtenerPagosPorSueldo(idSueldo);
            var vm = list.Select(p => new VMPersonalSueldosPago
            {
                Id = p.Id,
                IdSueldo = p.IdSueldo,
                Fecha = p.Fecha,
                IdCuenta = p.IdCuenta,
                Cuenta = p.IdCuentaNavigation?.Nombre ?? "",
                Importe = p.Importe,
                NotaInterna = p.NotaInterna
            }).ToList();
            return Ok(vm);
        }
    }
}
