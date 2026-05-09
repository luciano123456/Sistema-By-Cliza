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
    public class RolesController : Controller
    {
        private readonly IRolesService _RolesService;

        public RolesController(IRolesService RolesService)
        {
            _RolesService = RolesService;
        }

        [HttpGet]
        public async Task<IActionResult> Lista()
        {
            var Roles = await _RolesService.ObtenerTodos();

            var lista = Roles.Select(c => new VMRoles
            {
                Id = c.Id,
                Nombre = c.Nombre,
            }).ToList();

            return Ok(lista);
        }


        [HttpPost]
        public async Task<IActionResult> Insertar([FromBody] VMRoles model)
        {
            var UsuariosRol = new UsuariosRol
            {
                Id = model.Id,
                Nombre = model.Nombre,
            };

            bool respuesta = await _RolesService.Insertar(UsuariosRol);

            return Ok(new { valor = respuesta });
        }

        [HttpPut]
        public async Task<IActionResult> Actualizar([FromBody] VMRoles model)
        {
            var UsuariosRol = new UsuariosRol
            {
                Id = model.Id,
                Nombre = model.Nombre,
            };

            bool respuesta = await _RolesService.Actualizar(UsuariosRol);

            return Ok(new { valor = respuesta });
        }

        [HttpDelete]
        public async Task<IActionResult> Eliminar(int id)
        {
            bool respuesta = await _RolesService.Eliminar(id);

            return StatusCode(StatusCodes.Status200OK, new { valor = respuesta });
        }

        [HttpGet]
        public async Task<IActionResult> EditarInfo(int id)
        {
             var UsuariosRol = await _RolesService.Obtener(id);

            if (UsuariosRol != null)
            {
                return StatusCode(StatusCodes.Status200OK, UsuariosRol);
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