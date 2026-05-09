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
    public class InsumosCategoriaController : Controller
    {
        private readonly IInsumosCategoriaService _InsumosCategoriaService;

        public InsumosCategoriaController(IInsumosCategoriaService InsumosCategoriaService)
        {
            _InsumosCategoriaService = InsumosCategoriaService;
        }

        [HttpGet]
        public async Task<IActionResult> Lista()
        {
            var InsumosCategoria = await _InsumosCategoriaService.ObtenerTodos();

            var lista = InsumosCategoria.Select(c => new VMGenericModel
            {
                Id = c.Id,
                Nombre = c.Nombre,
            }).ToList();

            return Ok(lista);
        }


        [HttpPost]
        public async Task<IActionResult> Insertar([FromBody] VMGenericModel model)
        {
            var result = new InsumosCategoria
            {
                Id = model.Id,
                Nombre = model.Nombre,
            };

            bool respuesta = await _InsumosCategoriaService.Insertar(result);

            return Ok(new { valor = respuesta, id = result.Id });
        }

        [HttpPut]
        public async Task<IActionResult> Actualizar([FromBody] VMGenericModel model)
        {
            var result = new InsumosCategoria
            {
                Id = model.Id,
                Nombre = model.Nombre,
            };

            bool respuesta = await _InsumosCategoriaService.Actualizar(result);

            return Ok(new { valor = respuesta });
        }

        [HttpDelete]
        public async Task<IActionResult> Eliminar(int id)
        {
            bool respuesta = await _InsumosCategoriaService.Eliminar(id);

            return StatusCode(StatusCodes.Status200OK, new { valor = respuesta });
        }

        [HttpGet]
        public async Task<IActionResult> EditarInfo(int id)
        {
             var result = await _InsumosCategoriaService.Obtener(id);

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