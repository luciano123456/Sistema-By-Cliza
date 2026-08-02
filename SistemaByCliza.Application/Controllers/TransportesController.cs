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
    public class TransportesController : Controller
    {
        private readonly ITransportesService _service;

        public TransportesController(ITransportesService service)
        {
            _service = service;
        }

        [AllowAnonymous]
        public IActionResult Index() => View();

        [HttpGet]
        public async Task<IActionResult> Lista()
        {
            var data = await _service.ObtenerTodos();
            var lista = data
                .OrderBy(t => t.Nombre)
                .Select(t => new VMTransporte
                {
                    Id = t.Id,
                    Nombre = t.Nombre ?? string.Empty,
                    Direccion = t.Direccion,
                    Telefono = t.Telefono,
                    Email = t.Email,
                    Notas = t.Notas,
                    Activo = t.Activo
                })
                .ToList();

            return Ok(lista);
        }

        [HttpPost]
        public async Task<IActionResult> Insertar([FromBody] VMTransporte model)
        {
            var entidad = Map(model);
            bool ok = await _service.Insertar(entidad);
            return Ok(new { valor = ok, id = entidad.Id });
        }

        [HttpPut]
        public async Task<IActionResult> Actualizar([FromBody] VMTransporte model)
        {
            var entidad = Map(model);
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
            var t = await _service.Obtener(id);
            if (t == null) return StatusCode(StatusCodes.Status404NotFound);

            return Ok(new VMTransporte
            {
                Id = t.Id,
                Nombre = t.Nombre ?? string.Empty,
                Direccion = t.Direccion,
                Telefono = t.Telefono,
                Email = t.Email,
                Notas = t.Notas,
                Activo = t.Activo
            });
        }

        public IActionResult Privacy() => View();

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
            => View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });

        private static Transporte Map(VMTransporte model) => new()
        {
            Id = model.Id,
            Nombre = model.Nombre?.Trim() ?? string.Empty,
            Direccion = string.IsNullOrWhiteSpace(model.Direccion) ? null : model.Direccion.Trim(),
            Telefono = string.IsNullOrWhiteSpace(model.Telefono) ? null : model.Telefono.Trim(),
            Email = string.IsNullOrWhiteSpace(model.Email) ? null : model.Email.Trim(),
            Notas = string.IsNullOrWhiteSpace(model.Notas) ? null : model.Notas.Trim(),
            Activo = model.Activo
        };
    }
}
