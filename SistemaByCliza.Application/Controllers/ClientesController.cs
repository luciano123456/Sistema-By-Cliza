using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SistemaByCliza.Application.Models.ViewModels;
using SistemaByCliza.BLL.Service;
using SistemaByCliza.Models;

namespace SistemaByCliza.Application.Controllers
{
    [Authorize]
    public class ClientesController : Controller
    {
        private readonly IClientesService _clientesService;

        public ClientesController(IClientesService clientesService)
        {
            _clientesService = clientesService;
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
            var clientes = await _clientesService.ObtenerTodos();

            var lista = clientes.Select(c => new VMCliente
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
                CodigoPostal = c.CodigoPostal,
                IdListaPrecio = c.IdListaPrecio,
                CondicionIva = c.IdCondicionIvaNavigation.Nombre, 
                Provincia = c.IdProvinciaNavigation.Nombre, 
                ListaPrecio = c.IdListaPrecioNavigation.Nombre  
            }).ToList();

            return Ok(lista);
        }

        [HttpPost]
        public async Task<IActionResult> Insertar([FromBody] VMCliente model)
        {
            try
            {
                //if (!ModelState.IsValid) return BadRequest(ModelState);

                var entidad = new Cliente
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
                    CodigoPostal = model.CodigoPostal,
                    IdListaPrecio = model.IdListaPrecio
                };

                var ok = await _clientesService.Insertar(entidad);
                return Ok(new { valor = ok });
            } catch (Exception ex)
            {
                return BadRequest(ModelState);
            }
        }

        [HttpPut]
        public async Task<IActionResult> Actualizar([FromBody] VMCliente model)
        {
            var clienteDb = await _clientesService.Obtener(model.Id);
            if (clienteDb == null) return NotFound(new { mensaje = "Cliente no encontrado" });

            // actualizar campos
            clienteDb.Nombre = model.Nombre;
            clienteDb.Telefono = model.Telefono;
            clienteDb.TelefonoAlternativo = model.TelefonoAlternativo;
            clienteDb.Dni = model.Dni;
            clienteDb.Cuit = model.Cuit;
            clienteDb.IdCondicionIva = model.IdCondicionIva;
            clienteDb.Domicilio = model.Domicilio;
            clienteDb.IdProvincia = model.IdProvincia;
            clienteDb.Localidad = model.Localidad;
            clienteDb.Email = model.Email;
            clienteDb.CodigoPostal = model.CodigoPostal;
            clienteDb.IdListaPrecio = model.IdListaPrecio;

            var ok = await _clientesService.Actualizar(clienteDb);
            return Ok(new { valor = ok ? "OK" : "Error" });
        }

        [HttpDelete]
        public async Task<IActionResult> Eliminar(int id)
        {
            if (id <= 0) return BadRequest(new { mensaje = "Id inválido" });

            var ok = await _clientesService.Eliminar(id);
            return Ok(new { valor = ok });
        }

        [HttpGet]
        public async Task<IActionResult> EditarInfo(int id)
        {
            if (id <= 0) return BadRequest(new { mensaje = "Id inválido" });

            var c = await _clientesService.Obtener(id);
            if (c == null) return NotFound();

            var vm = new VMCliente
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
                CodigoPostal = c.CodigoPostal,
                IdListaPrecio = c.IdListaPrecio,
                CondicionIva = c.IdCondicionIvaNavigation?.Nombre, // ajustar
                Provincia = c.IdProvinciaNavigation?.Nombre,            // ajustar
                ListaPrecio = c.IdListaPrecioNavigation?.Nombre         // ajustar
            };

            return Ok(vm);
        }

        public IActionResult Privacy() => View();
    }
}
