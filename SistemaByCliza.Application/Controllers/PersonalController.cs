using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SistemaByCliza.Application.Models.ViewModels;
using SistemaByCliza.BLL.Service;
using SistemaByCliza.Models;

namespace SistemaByCliza.Application.Controllers
{
    [Authorize]
    public class PersonalController : Controller
    {
        private readonly IPersonalService _PersonalService;

        public PersonalController(IPersonalService PersonalService)
        {
            _PersonalService = PersonalService;
        }

        // 🔹 Vista pública (si usás JWT desde el front)
        [AllowAnonymous]
        public IActionResult Index()
        {
            return View();
        }

        // 🔹 GET lista de personal
        [HttpGet]
        public async Task<IActionResult> Lista()
        {
            var personal = await _PersonalService.ObtenerTodos();

            var lista = personal.Select(c => new VMPersonal
            {
                Id = c.Id,
                Nombre = c.Nombre,
                Telefono = c.Telefono,
                TelefonoAlternativo = c.TelefonoAlternativo,
                Dni = c.Dni,
                Cuit = c.Cuit,
                IdCondicionIva = c.IdCondicionIva,
                Domicilio = c.Domicilio,
                IdProvincia = c.IdProvincia,
                Localidad = c.Localidad,
                Email = c.Email,
                IdBanco = c.IdBanco,
                BancoAlias = c.BancoAlias,
                BancoCbu = c.BancoCbu,
                IdPuesto = c.IdPuesto,
                FechaIngreso = c.FechaIngreso,
                FechaRetiro = c.FechaRetiro,
                SueldoMensual = c.SueldoMensual,
                DiasLaborales = c.DiasLaborales,
                ValorDia = c.ValorDia,
                HsLaborales = c.HsLaborales,
                ValorHora = c.ValorHora,
                IdSucursal = c.IdSucursal,

                // 🔹 Campos de navegación (pueden venir null)
                Puesto  = c.IdPuestoNavigation.Nombre,
                Sucursal  = c.IdSucursalNavigation.Nombre,
                Banco  = c.IdBancoNavigation.Nombre,
                CondicionIva = c.IdCondicionIvaNavigation.Nombre,
                Provincia = c.IdProvinciaNavigation.Nombre,
            }).ToList();

            return Ok(lista);
        }

        // 🔹 POST insertar
        [HttpPost]
        public async Task<IActionResult> Insertar([FromBody] VMPersonal model)
        {
            //if (!ModelState.IsValid) return BadRequest(ModelState);

            var entidad = new Personal
            {
                Nombre = model.Nombre,
                Telefono = model.Telefono,
                TelefonoAlternativo = model.TelefonoAlternativo,
                Dni = model.Dni,
                Cuit = model.Cuit,
                IdCondicionIva = model.IdCondicionIva,
                Domicilio = model.Domicilio,
                IdProvincia = model.IdProvincia,
                Localidad = model.Localidad,
                Email = model.Email,
                IdBanco = model.IdBanco,
                BancoAlias = model.BancoAlias,
                BancoCbu = model.BancoCbu,
                IdPuesto = model.IdPuesto,
                FechaIngreso = model.FechaIngreso,
                FechaRetiro = model.FechaRetiro,
                SueldoMensual = model.SueldoMensual,
                DiasLaborales = model.DiasLaborales,
                ValorDia = model.ValorDia,
                HsLaborales = model.HsLaborales,
                ValorHora = model.ValorHora,
                IdSucursal = model.IdSucursal,
            };

            var ok = await _PersonalService.Insertar(entidad);
            return Ok(new { valor = ok });
        }

        // 🔹 PUT actualizar
        [HttpPut]
        public async Task<IActionResult> Actualizar([FromBody] VMPersonal model)
        {
            //if (!ModelState.IsValid) return BadRequest(ModelState);

            var personalDb = await _PersonalService.Obtener(model.Id);
            if (personalDb == null) return NotFound(new { mensaje = "Personal no encontrado" });

            personalDb.Nombre = model.Nombre;
            personalDb.Telefono = model.Telefono;
            personalDb.TelefonoAlternativo = model.TelefonoAlternativo;
            personalDb.Dni = model.Dni;
            personalDb.Cuit = model.Cuit;
            personalDb.IdCondicionIva = model.IdCondicionIva;
            personalDb.Domicilio = model.Domicilio;
            personalDb.IdProvincia = model.IdProvincia;
            personalDb.Localidad = model.Localidad;
            personalDb.Email = model.Email;
            personalDb.IdBanco = model.IdBanco;
            personalDb.BancoAlias = model.BancoAlias;
            personalDb.BancoCbu = model.BancoCbu;
            personalDb.IdPuesto = model.IdPuesto;
            personalDb.FechaIngreso = model.FechaIngreso;
            personalDb.FechaRetiro = model.FechaRetiro;
            personalDb.SueldoMensual = model.SueldoMensual;
            personalDb.DiasLaborales = model.DiasLaborales;
            personalDb.ValorDia = model.ValorDia;
            personalDb.HsLaborales = model.HsLaborales;
            personalDb.ValorHora = model.ValorHora;
            personalDb.IdSucursal = model.IdSucursal;

            var ok = await _PersonalService.Actualizar(personalDb);
            return Ok(new { valor = ok ? "OK" : "Error" });
        }

        // 🔹 DELETE eliminar
        [HttpDelete]
        public async Task<IActionResult> Eliminar(int id)
        {
            if (id <= 0) return BadRequest(new { mensaje = "Id inválido" });

            var ok = await _PersonalService.Eliminar(id);
            return Ok(new { valor = ok });
        }

        // 🔹 GET editar info (trae uno por id)
        [HttpGet]
        public async Task<IActionResult> EditarInfo(int id)
        {
            if (id <= 0) return BadRequest(new { mensaje = "Id inválido" });

            var c = await _PersonalService.Obtener(id);
            if (c == null) return NotFound();

            var vm = new VMPersonal
            {
                Id = c.Id,
                Nombre = c.Nombre,
                Telefono = c.Telefono,
                TelefonoAlternativo = c.TelefonoAlternativo,
                Dni = c.Dni,
                Cuit = c.Cuit,
                IdCondicionIva = c.IdCondicionIva,
                Domicilio = c.Domicilio,
                IdProvincia = c.IdProvincia,
                Localidad = c.Localidad,
                Email = c.Email,
                IdBanco = c.IdBanco,
                BancoAlias = c.BancoAlias,
                BancoCbu = c.BancoCbu,
                IdPuesto = c.IdPuesto,
                FechaIngreso = c.FechaIngreso,
                FechaRetiro = c.FechaRetiro,
                SueldoMensual = c.SueldoMensual,
                DiasLaborales = c.DiasLaborales,
                ValorDia = c.ValorDia,
                HsLaborales = c.HsLaborales,
                ValorHora = c.ValorHora,
                IdSucursal = c.IdSucursal,

                // 🔹 Extra display
                CondicionIva = c.IdCondicionIvaNavigation?.Nombre,
                Provincia = c.IdProvinciaNavigation?.Nombre,
            };

            return Ok(vm);
        }

        public IActionResult Privacy() => View();
    }
}
