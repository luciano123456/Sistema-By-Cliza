using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using System.Diagnostics;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using SistemaByCliza.Application.Models.ViewModels;
using SistemaByCliza.Application.Models;
using SistemaByCliza.BLL.Service;
using SistemaByCliza.Models;
using Microsoft.AspNetCore.Authorization;

namespace SistemaBronx.Application.Controllers
{
    public class LoginController : Controller
    {

        private readonly ILoginService _loginService;
        private readonly IConfiguration _config;

        public LoginController(ILoginService loginService, IConfiguration config)
        {
            _loginService = loginService;
            _config = config;
        }



        public IActionResult Index()
        {
            return View();
        }



        [ValidateAntiForgeryToken]
        [HttpPost]
        public async Task<IActionResult> IniciarSesion([FromBody] VMLogin model)
        {
            try
            {
                var user = await _loginService.Login(model.Usuario, model.Contrasena); // Llama al servicio de login

                if (user == null)
                {
                    return Unauthorized(new { success = false, message = "Usuario o contraseña incorrectos." });
                }

                if (user.IdEstado == 2)
                {
                    return Unauthorized(new { success = false, message = "Tu usuario se encuentra bloqueado." });
                }

                var passwordHasher = new PasswordHasher<User>();
                var result = passwordHasher.VerifyHashedPassword(user, user.Contrasena, model.Contrasena);

                if (result == PasswordVerificationResult.Success)
                {
                    var token = GenerarToken(user);

                    // Guardar token en cookie HttpOnly para que el navegador lo envíe en cada request
                    Response.Cookies.Append("JwtToken", token, new CookieOptions
                    {
                        HttpOnly = true,
                        Secure = true,
                        SameSite = SameSiteMode.None, // 🔥 CLAVE EN PRODUCCIÓN
                        Expires = DateTimeOffset.UtcNow.AddHours(2)
                    });


                    return Ok(new
                    {
                        success = true,
                        token,
                        user = new
                        {
                            user.Id,
                            user.Usuario,
                            user.IdRol,
                            user.Nombre,
                            user.Apellido,
                            user.Direccion,
                            user.Dni,
                            user.Telefono
                        }
                    });
                }

                return Unauthorized(new { success = false, message = "Usuario o contraseña incorrectos." });
            }
            catch (Exception)
            {
                return StatusCode(500, new { success = false, message = "Ocurrió un error inesperado. Inténtalo nuevamente." });
            }
        }


        private string GenerarToken(User user)
        {
            try
            {
                // 1. Clave secreta desde configuración
                var secretKey = _config["JwtSettings:SecretKey"];
                if (string.IsNullOrEmpty(secretKey))
                    throw new InvalidOperationException("JwtSettings:SecretKey no está configurado en appsettings.json");

                var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));

                // 2. Credenciales de firma
                var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

                // 3. Claims que viajan dentro del token
                var claims = new[]
                {
            new Claim(JwtRegisteredClaimNames.Sub, user.Usuario),               // Nombre de usuario
            new Claim("Id", user.Id.ToString()),                                 // Id interno
            new Claim("Rol", user.IdRol.ToString()),                             // Rol numérico
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())    // Id único del token
        };

                // 4. Crear el token
                var token = new JwtSecurityToken(
                    issuer: _config["JwtSettings:Issuer"],       // Issuer configurado
                    audience: _config["JwtSettings:Audience"],   // Audience configurado
                    claims: claims,
                    expires: DateTime.UtcNow.AddHours(2),        // Expira en 2 horas
                    signingCredentials: creds
                );

                // 5. Retornar token como string
                return new JwtSecurityTokenHandler().WriteToken(token);
            }
            catch (Exception ex)
            {
                // Loguear el error si tenés un logger configurado
                Console.WriteLine($"Error generando token: {ex.Message}");
                return null;
            }
        }


        [AllowAnonymous]
        public IActionResult Logout()
        {
            // Eliminar cookie si la usás
            Response.Cookies.Delete("JwtToken");

            // Simplemente redirigimos
            return RedirectToAction("Index", "Login");
        }


        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }
    }

}

