using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SistemaByCliza.Application.Models;
using SistemaByCliza.Application.Models.ViewModels;
using SistemaByCliza.BLL.Service;
using SistemaByCliza.Models;
using System.Diagnostics;

namespace SistemaByCliza.Application.Controllers
{
    [Authorize]
    public class GastosController : Controller
    {
        private readonly IGastosService _gastosService;

        [AllowAnonymous]
        public IActionResult Index() => View();

        public GastosController(IGastosService gastosService)
        {
            _gastosService = gastosService;
        }

        // GET: /Gastos/Lista
        [HttpGet]
        public async Task<IActionResult> Lista(DateTime? FechaDesde = null,
    DateTime? FechaHasta = null,
    int IdSucursal = -1,
    int IdCuenta = -1,
    int idCategoria = -1,
    string Concepto = "")
        {
            var gastos = await _gastosService.ObtenerTodos(FechaDesde, FechaHasta, IdSucursal, IdCuenta, idCategoria, Concepto);

            // Mapear entidad -> VM
            var lista = gastos.Select(g => new VMGasto
            {
                Id = g.Id,
                IdSucursal = g.IdSucursal,
                IdCategoria = g.IdCategoria,
                Fecha = g.Fecha,
                Concepto = g.Concepto,
                IdCuenta = g.IdCuenta,
                Importe = g.Importe,

                Sucursal = g.IdSucursalNavigation.Nombre,
                Cuenta = g.IdCuentaNavigation.Nombre,
                Categoria = g.IdCategoriaNavigation.Nombre

            }).ToList();

            return Ok(lista);
        }

        // POST: /Gastos/Insertar
        [HttpPost]
        public async Task<IActionResult> Insertar([FromBody] VMGasto model)
        {
            // Mapear VM -> Entidad
            var gasto = new Gasto
            {
                Id = model.Id, // si tu DB lo autogenera, podés omitirlo
                IdSucursal = model.IdSucursal,
                IdCategoria = model.IdCategoria,
                Fecha = model.Fecha,
                Concepto = model.Concepto,
                IdCuenta = model.IdCuenta,
                Importe = model.Importe
            };

            bool respuesta = await _gastosService.Insertar(gasto);
            return Ok(new { valor = respuesta });
        }

        // PUT: /Gastos/Actualizar
        [HttpPut]
        public async Task<IActionResult> Actualizar([FromBody] VMGasto model)
        {

            var gasto = new Gasto
            {
                Id = model.Id,
                IdSucursal = model.IdSucursal,
                IdCategoria = model.IdCategoria,
                Fecha = model.Fecha,
                Concepto = model.Concepto,
                IdCuenta = model.IdCuenta,
                Importe = model.Importe
            };

            bool respuesta = await _gastosService.Actualizar(gasto);
            return Ok(new { valor = respuesta });
        }

        // DELETE: /Gastos/Eliminar?id=123
        [HttpDelete]
        public async Task<IActionResult> Eliminar(int id)
        {
            bool respuesta = await _gastosService.Eliminar(id);
            return StatusCode(StatusCodes.Status200OK, new { valor = respuesta });
        }

        // GET: /Gastos/EditarInfo?id=123
        [HttpGet]
        public async Task<IActionResult> EditarInfo(int id)
        {
            var g = await _gastosService.Obtener(id);

            if (g == null)
                return StatusCode(StatusCodes.Status404NotFound);

            // Entidad -> VM
            var vm = new VMGasto
            {
                Id = g.Id,
                IdSucursal = g.IdSucursal,
                IdCategoria = g.IdCategoria,
                Fecha = g.Fecha,
                Concepto = g.Concepto,
                IdCuenta = g.IdCuenta,
                Importe = g.Importe,

                IdCategoriaNavigation = g.IdCategoriaNavigation,
                IdCuentaNavigation = g.IdCuentaNavigation,
                IdSucursalNavigation = g.IdSucursalNavigation
            };

            return StatusCode(StatusCodes.Status200OK, vm);
        }

        public IActionResult Privacy()
        {
            return View();
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }
    }
}
