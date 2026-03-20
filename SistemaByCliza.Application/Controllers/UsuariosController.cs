using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using SistemaByCliza.Application.Models;
using SistemaByCliza.Application.Models.ViewModels;
using SistemaByCliza.BLL.Service;
using SistemaByCliza.Models;
using System.Diagnostics;
using Microsoft.EntityFrameworkCore;

namespace SistemaByCliza.Application.Controllers
{
    [Authorize]
    public class UsuariosController : Controller
    {
        private readonly IUsuariosService _Usuarioservice;

        public UsuariosController(IUsuariosService Usuarioservice)
        {
            _Usuarioservice = Usuarioservice;
        }

        [AllowAnonymous]
        public IActionResult Index() => View();

        public async Task<IActionResult> Configuracion()
        {
            int idUsuario;
            string usuario;

            var idUsuarioStr = HttpContext.Session.GetString("IdUsuario");
            usuario = HttpContext.Session.GetString("Usuario");

            if (!string.IsNullOrEmpty(idUsuarioStr) && int.TryParse(idUsuarioStr, out var idSesion))
            {
                idUsuario = idSesion;
            }
            else
            {
                var idClaim = User.FindFirst("Id")?.Value;
                usuario ??= User.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value;
                if (string.IsNullOrEmpty(idClaim) || !int.TryParse(idClaim, out idUsuario))
                    return RedirectToAction("Index", "Login");
            }

            var user = await _Usuarioservice.Obtener(idUsuario);
            if (user == null) return RedirectToAction("Index", "Login");

            ViewBag.Usuario = usuario;
            return View(user);
        }

        [HttpGet]
        public async Task<IActionResult> Lista()
        {
            var Usuarios = await _Usuarioservice.ObtenerTodos();

            var lista = Usuarios.Select(c => new VMUser
            {
                Id = c.Id,
                Usuario = c.Usuario,
                Nombre = c.Nombre,
                Apellido = c.Apellido,
                Dni = c.Dni,
                Telefono = c.Telefono,
                Direccion = c.Direccion,
                IdRol = c.IdRol,
                Rol = c.IdRolNavigation.Nombre,
                IdEstado = c.IdEstado,
                Estado = c.IdEstadoNavigation.Nombre,
            }).ToList();

            return Ok(lista);
        }

        [HttpPost]
        public async Task<IActionResult> Insertar([FromBody] VMUser model)
        {
            var passwordHasher = new PasswordHasher<User>();

            var Usuario = new User
            {
                Usuario = model.Usuario,
                Nombre = model.Nombre,
                Apellido = model.Apellido,
                Dni = model.Dni,
                Telefono = model.Telefono,
                Direccion = model.Direccion,
                IdRol = model.IdRol,
                IdEstado = model.IdEstado,
                Contrasena = passwordHasher.HashPassword(null, model.Contrasena)
            };

            // ✔️ Insert con Sucursales
            bool respuesta = await _Usuarioservice.Insertar(Usuario, model.IdSucursales ?? new List<int>());
            return Ok(new { valor = respuesta });
        }

        [HttpPut]
        public async Task<IActionResult> Actualizar([FromBody] VMUser model)
        {
            var passwordHasher = new PasswordHasher<User>();

            User userbase = await _Usuarioservice.Obtener(model.Id);
            if (userbase == null) return Ok(new { valor = "Error" });

            User nombreUsuario = await _Usuarioservice.ObtenerUsuario(model.Usuario);
            if (nombreUsuario != null && nombreUsuario.Id != model.Id)
                return Ok(new { valor = "Usuario" });

            if (model.CambioAdmin != 1)
            {
                var result = passwordHasher.VerifyHashedPassword(null, userbase.Contrasena, model.Contrasena);
                if (result != PasswordVerificationResult.Success)
                    return Ok(new { valor = "Contrasena" });
            }

            var passnueva = !string.IsNullOrEmpty(model.ContrasenaNueva)
                ? passwordHasher.HashPassword(null, model.ContrasenaNueva)
                : userbase.Contrasena;

            userbase.Nombre = model.Nombre;
            userbase.Usuario = model.Usuario;
            userbase.Apellido = model.Apellido;
            userbase.Dni = model.Dni;
            userbase.Telefono = model.Telefono;
            userbase.Direccion = model.Direccion;
            userbase.IdRol = model.IdRol;
            userbase.IdEstado = model.IdEstado;
            userbase.Contrasena = passnueva;

            // ✔️ Update con Sucursales
            bool respuesta = await _Usuarioservice.Actualizar(userbase, model.IdSucursales ?? new List<int>());
            return Ok(new { valor = respuesta ? "OK" : "Error" });
        }

        [HttpDelete]
        public async Task<IActionResult> Eliminar(int id)
        {
            bool respuesta = await _Usuarioservice.Eliminar(id);
            return StatusCode(StatusCodes.Status200OK, new { valor = respuesta });
        }


        [HttpGet]
        public async Task<IActionResult> ObtenerSucursales(int id)
        {
            // Traemos el usuario con sus Sucursales + navegación
            var u = await _Usuarioservice.ObtenerConSucursales(id);
            if (u == null) return StatusCode(StatusCodes.Status404NotFound);

            // Devolvemos SOLO la lista {Id, Nombre}
            var Sucursales = u.UsuariosSucursales?
                .Where(s => s.IdSucursalNavigation != null)
                .GroupBy(s => new { s.IdSucursal, s.IdSucursalNavigation.Nombre })
                .Select(g => new VMSucursales
                {
                    Id = g.Key.IdSucursal,
                    Nombre = g.Key.Nombre
                })
                .OrderBy(x => x.Nombre)
                .ToList() ?? new List<VMSucursales>();

            return Ok(Sucursales);

        }



        [HttpGet]
        public async Task<IActionResult> EditarInfo(int id)
        {
            // ✔️ Traemos el usuario con sus Sucursales y devolvemos VMUser
            var u = await _Usuarioservice.ObtenerConSucursales(id);
            if (u == null) return StatusCode(StatusCodes.Status404NotFound);

            var vm = new VMUser
            {
                Id = u.Id,
                Usuario = u.Usuario,
                Nombre = u.Nombre,
                Apellido = u.Apellido,
                Dni = u.Dni,
                Telefono = u.Telefono,
                Direccion = u.Direccion,
                IdRol = u.IdRol,
                IdEstado = u.IdEstado,
                Rol = u.IdRolNavigation?.Nombre ?? "",
                Estado = u.IdEstadoNavigation?.Nombre ?? "",
                IdSucursales = u.UsuariosSucursales?.Select(s => s.IdSucursal).Distinct().ToList() ?? new List<int>(),
                CambioAdmin = 1 // para que no valide contraseña desde admin
            };

            return Ok(vm);
        }

        public IActionResult Privacy() => View();

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
            => View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
    }
}
