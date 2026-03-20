// /Application/Controllers/TalleresController.cs
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
    public class TalleresController : Controller
    {
        private readonly ITalleresService _service;

        public TalleresController(ITalleresService service)
        {
            _service = service;
        }

        [AllowAnonymous]
        public IActionResult Index() => View();

        [HttpGet]
        public async Task<IActionResult> Lista()
        {
            var Talleres = await _service.ObtenerTodos();
            var lista = Talleres
                .Select(p => new VMTaller { Id = p.Id, Nombre = p.Nombre ?? string.Empty, DiasEntrega = p.DiasEntrega > 0 ? p.DiasEntrega : 0 })
                .ToList();

            return Ok(lista);
        }

        [HttpPost]
        public async Task<IActionResult> Insertar([FromBody] VMTaller model)
        {
            var entidad = new Taller
            {
                Id = model.Id,
                Nombre = model.Nombre?.Trim() ?? string.Empty,
                DiasEntrega = model.DiasEntrega
            };

            bool ok = await _service.Insertar(entidad);
            return Ok(new { valor = ok });
        }

        [HttpPut]
        public async Task<IActionResult> Actualizar([FromBody] VMTaller model)
        {
            var entidad = new Taller
            {
                Id = model.Id,
                Nombre = model.Nombre?.Trim() ?? string.Empty,
                DiasEntrega = model.DiasEntrega
            };

            bool ok = await _service.Actualizar(entidad);
            return Ok(new { valor = ok });
        }

        [HttpDelete]
        public async Task<IActionResult> Eliminar(int id)
        {
            bool ok = await _service.Eliminar(id);
            return StatusCode(StatusCodes.Status200OK, new { valor = ok });
        }

        [HttpGet]
        public async Task<IActionResult> EditarInfo(int id)
        {
            var p = await _service.Obtener(id);
            if (p == null) return StatusCode(StatusCodes.Status404NotFound);

            var vm = new VMTaller { Id = p.Id, Nombre = p.Nombre ?? string.Empty };
            return Ok(vm);
        }

        public IActionResult Privacy() => View();

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
            => View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
    }
}
