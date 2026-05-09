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
    public class OrdenesCorteEstadosController : Controller
    {
        private readonly IOrdenesCorteEstadosService _OrdenesCorteEstadosService;

        public OrdenesCorteEstadosController(IOrdenesCorteEstadosService OrdenesCorteEstadosService)
        {
            _OrdenesCorteEstadosService = OrdenesCorteEstadosService;
        }

        [HttpGet]
        public async Task<IActionResult> Lista()
        {
            var OrdenesCorteEstados = await _OrdenesCorteEstadosService.ObtenerTodos();

            var lista = OrdenesCorteEstados.Select(c => new VMGenericModel
            {
                Id = c.Id,
                Nombre = c.Nombre,
            }).ToList();

            return Ok(lista);
        }


        [HttpPost]
        public async Task<IActionResult> Insertar([FromBody] VMGenericModel model)
        {
            var result = new OrdenesCorteEstado
            {
                Id = model.Id,
                Nombre = model.Nombre,
            };

            bool respuesta = await _OrdenesCorteEstadosService.Insertar(result);

            return Ok(new { valor = respuesta, id = result.Id });
        }

        [HttpPut]
        public async Task<IActionResult> Actualizar([FromBody] VMGenericModel model)
        {
            var result = new OrdenesCorteEstado
            {
                Id = model.Id,
                Nombre = model.Nombre,
            };

            bool respuesta = await _OrdenesCorteEstadosService.Actualizar(result);

            return Ok(new { valor = respuesta });
        }

        [HttpDelete]
        public async Task<IActionResult> Eliminar(int id)
        {
            bool respuesta = await _OrdenesCorteEstadosService.Eliminar(id);

            return StatusCode(StatusCodes.Status200OK, new { valor = respuesta });
        }

        [HttpGet]
        public async Task<IActionResult> EditarInfo(int id)
        {
             var result = await _OrdenesCorteEstadosService.Obtener(id);

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