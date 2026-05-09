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
    public class ProductosCategoriasTalleController : Controller
    {
        private readonly IProductosCategoriasTalleService _ProductosCategoriasTalleService;

        public ProductosCategoriasTalleController(IProductosCategoriasTalleService ProductosCategoriasTalleService)
        {
            _ProductosCategoriasTalleService = ProductosCategoriasTalleService;
        }

        [HttpGet]
        public async Task<IActionResult> Lista()
        {
            var ProductosCategoriasTalle = await _ProductosCategoriasTalleService.ObtenerTodos();

            var lista = ProductosCategoriasTalle.Select(c => new VMGenericModelConfCombo
            {
                Id = c.Id,
                IdCombo = c.IdCategoria,
                Nombre = c.Nombre,
                NombreCombo = c.IdCategoriaNavigation.Nombre
            }).ToList();

            return Ok(lista);
        }


        [HttpGet]
        public async Task<IActionResult> ListaPorCategoria(int idCategoria)
        {
            var ProductosCategoriasTalle = await _ProductosCategoriasTalleService.ObtenerPorCategoria(idCategoria);

            var lista = ProductosCategoriasTalle.Select(c => new VMGenericModelConfCombo
            {
                Id = c.Id,
                IdCombo = c.IdCategoria,
                Nombre = c.Nombre,
            }).ToList();

            return Ok(lista);
        }


        [HttpPost]
        public async Task<IActionResult> Insertar([FromBody] VMGenericModelConfCombo model)
        {
            var result = new ProductosCategoriasTalle
            {
                Id = model.Id,
                IdCategoria = model.IdCombo,
                Nombre = model.Nombre,
            };

            bool respuesta = await _ProductosCategoriasTalleService.Insertar(result);

            return Ok(new { valor = respuesta, id = result.Id });
        }

        [HttpPut]
        public async Task<IActionResult> Actualizar([FromBody] VMGenericModelConfCombo model)
        {
            var result = new ProductosCategoriasTalle
            {
                Id = model.Id,
                IdCategoria = model.IdCombo,

                Nombre = model.Nombre,
            };

            bool respuesta = await _ProductosCategoriasTalleService.Actualizar(result);

            return Ok(new { valor = respuesta });
        }

        [HttpDelete]
        public async Task<IActionResult> Eliminar(int id)
        {
            bool respuesta = await _ProductosCategoriasTalleService.Eliminar(id);

            return StatusCode(StatusCodes.Status200OK, new { valor = respuesta });
        }

        [HttpGet]
        public async Task<IActionResult> EditarInfo(int id)
        {
             var resultBase = await _ProductosCategoriasTalleService.Obtener(id);

            var result = new VMGenericModelConfCombo
            {
                Id = resultBase.Id,
                IdCombo = resultBase.IdCategoria,
                Nombre = resultBase.Nombre,
                NombreCombo = resultBase.IdCategoriaNavigation.Nombre
            };

            if (result != null)
            {
                return StatusCode(StatusCodes.Status200OK, result);
            }
            else
            {
                return StatusCode(StatusCodes.Status404NotFound);
            }
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