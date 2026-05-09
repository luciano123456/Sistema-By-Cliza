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
    public class ProductosController : Controller
    {
        private readonly IProductosService _ProductosService;

        public ProductosController(IProductosService ProductosService)
        {
            _ProductosService = ProductosService;
        }

        // Dejá la vista pública si tu navegación es con JWT en fetch desde el front
        [AllowAnonymous]
        public IActionResult Index()
        {
            return View();
        }


        [HttpGet]
        public async Task<IActionResult> Lista()
        {
            var Productos = await _ProductosService.ObtenerTodos();

            var lista = Productos.Select(c => new VMProducto
            {
                Id = c.Id,
                Descripcion = c.Descripcion,
                IdCategoria = c.IdCategoria,
                PrecioUnitario = c.PrecioUnitario
            }).ToList();

            return Ok(lista);
        }


        [HttpPost]
        public async Task<IActionResult> Insertar([FromBody] VMProducto model)
        {
            var entidad = new Producto
            {
                Id = model.Id,
                Descripcion = model.Descripcion,
                IdCategoria = model.IdCategoria,
                PrecioUnitario = model.PrecioUnitario
            };

            var precios = model.PreciosPorLista?
                .Where(x => x.PrecioUnitario.HasValue)
                .ToDictionary(x => x.IdListaPrecio, x => x.PrecioUnitario!.Value)
                ?? new Dictionary<int, decimal>();

            bool ok = await _ProductosService.Insertar(
                entidad, model.IdTalles, model.IdColores, model.GenerarVariantes, precios);

            return Ok(new { valor = ok, id = ok ? entidad.Id : 0 });
        }

        [HttpPut]
        public async Task<IActionResult> Actualizar([FromBody] VMProducto model)
        {
            var entidad = new Producto
            {
                Id = model.Id,
                Descripcion = model.Descripcion,
                IdCategoria = model.IdCategoria,
                PrecioUnitario = model.PrecioUnitario
            };

            var precios = model.PreciosPorLista?
                .Where(x => x.PrecioUnitario.HasValue)
                .ToDictionary(x => x.IdListaPrecio, x => x.PrecioUnitario!.Value)
                ?? new Dictionary<int, decimal>();

            bool ok = await _ProductosService.Actualizar(
                entidad, model.IdTalles, model.IdColores, model.GenerarVariantes, precios);

            return Ok(new { valor = ok });
        }


        [HttpDelete]
        public async Task<IActionResult> Eliminar(int id)
        {
            bool respuesta = await _ProductosService.Eliminar(id);

            return StatusCode(StatusCodes.Status200OK, new { valor = respuesta });
        }

        [HttpGet]
        public async Task<IActionResult> EditarInfo(int id)
        {
            var p = await _ProductosService.Obtener(id); // Debe venir con ProductosTalles, ProductosColores y ProductosPrecios
            if (p == null) return StatusCode(StatusCodes.Status404NotFound);

            var vm = new VMProducto
            {
                Id = p.Id,
                Descripcion = p.Descripcion,
                IdCategoria = p.IdCategoria,
                PrecioUnitario = p.PrecioUnitario,
                IdTalles = p.ProductosTalles.Select(t => t.IdTalle).Distinct().ToList(),
                IdColores = p.ProductosColores.Select(c => c.IdColor).Distinct().ToList(),
                PreciosPorLista = p.ProductosPrecios.Select(pp => new VMProductoPrecio
                {
                    IdListaPrecio = (int)pp.IdListaPrecio,         // int
                    PrecioUnitario = pp.PrecioUnitario        // decimal?
                }).ToList(),
                GenerarVariantes = true
            };

            return Ok(vm);
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