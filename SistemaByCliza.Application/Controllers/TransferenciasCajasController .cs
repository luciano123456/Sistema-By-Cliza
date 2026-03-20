// Application/Controllers/TransferenciasCajasController.cs
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SistemaByCliza.Application.Models.ViewModels;
using SistemaByCliza.BLL.Service;
using SistemaByCliza.DAL.DataContext;
using SistemaByCliza.Models;

namespace SistemaByCliza.Application.Controllers
{
    [Authorize]
    public class TransferenciasCajasController : Controller
    {
        private readonly ITransferenciasCajasService _svc;
        private readonly SistemaByClizaContext _db;

        public TransferenciasCajasController(ITransferenciasCajasService svc, SistemaByClizaContext db)
        {
            _svc = svc; _db = db;
        }

        [HttpPost]
        public async Task<IActionResult> Crear([FromBody] VMTransferenciaCaja vm)
        {
            if (vm == null) return BadRequest("Modelo inválido.");
            if (vm.IdCuentaOrigen <= 0 || vm.IdCuentaDestino <= 0) return BadRequest("Cuentas inválidas.");
            if (vm.IdCuentaOrigen == vm.IdCuentaDestino) return BadRequest("Origen y destino no pueden ser la misma cuenta.");
            if (vm.IdSucursal <= 0) return BadRequest("Seleccioná sucursal.");
            if (vm.ImporteOrigen <= 0 || vm.ImporteDestino <= 0) return BadRequest("Importes deben ser mayores a 0.");

            var dto = new CajasTransfEntreCuenta
            {
                IdCuentaOrigen = vm.IdCuentaOrigen,
                ImporteOrigen = vm.ImporteOrigen,
                IdCuentaDestino = vm.IdCuentaDestino,
                ImporteDestino = vm.ImporteDestino,
                NotaInterna = vm.NotaInterna
            };

            var (ok, id) = await _svc.Crear(dto, vm.Fecha, vm.IdSucursal, "Transferencia entre cuentas");
            return Ok(new { valor = ok, id });
        }

        [HttpGet]
        public async Task<IActionResult> PorCaja(int idCaja)
        {
            var tr = await _svc.ObtenerPorCajaId(idCaja);
            if (tr == null) return NotFound();

            // Traigo ambas cajas para fecha/concepto/cuentas
            var cajasIds = new int[] { tr.IdCajaOrigen ?? 0, tr.IdCajaDestino ?? 0 }.Where(x => x > 0).ToArray();
            var cajas = await _db.Cajas
                .Where(c => cajasIds.Contains(c.Id))
                .Include(c => c.IdCuentaNavigation)
                .AsNoTracking().ToListAsync();

            var cajaOrigen = cajas.FirstOrDefault(c => c.Id == tr.IdCajaOrigen);
            var cajaDestino = cajas.FirstOrDefault(c => c.Id == tr.IdCajaDestino);

            var vm = new VMTransferenciaCaja
            {
                Id = tr.Id,
                IdCajaOrigen = tr.IdCajaOrigen ?? 0,
                IdCajaDestino = tr.IdCajaDestino ?? 0,
                Fecha = cajaOrigen?.Fecha ?? cajaDestino?.Fecha ?? DateTime.Today,

                IdCuentaOrigen = tr.IdCuentaOrigen,
                CuentaOrigenNombre = cajaOrigen?.IdCuentaNavigation?.Nombre ?? tr.IdCuentaOrigenNavigation?.Nombre ?? "",
                ImporteOrigen = tr.ImporteOrigen,
                ConceptoOrigen = cajaOrigen?.Concepto ?? "Transferencia a cuenta destino",

                IdCuentaDestino = tr.IdCuentaDestino,
                CuentaDestinoNombre = cajaDestino?.IdCuentaNavigation?.Nombre ?? tr.IdCuentaDestinoNavigation?.Nombre ?? "",
                ImporteDestino = tr.ImporteDestino,
                ConceptoDestino = cajaDestino?.Concepto ?? "Transferencia desde cuenta origen",

                NotaInterna = tr.NotaInterna
            };

            return Ok(vm);
        }

        [HttpPut]
        public async Task<IActionResult> Actualizar([FromBody] VMTransferenciaCaja vm)
        {
            if (vm == null) return BadRequest("Modelo inválido.");
            if (vm.Id <= 0) return BadRequest("Id de transferencia inválido.");
            if (vm.IdCuentaOrigen <= 0 || vm.IdCuentaDestino <= 0) return BadRequest("Cuentas inválidas.");
            if (vm.IdCuentaOrigen == vm.IdCuentaDestino) return BadRequest("Origen y destino no pueden ser la misma cuenta.");
            if (vm.ImporteOrigen <= 0 || vm.ImporteDestino <= 0) return BadRequest("Importes deben ser mayores a 0.");

            // fallbacks de concepto (por si vienen vacíos desde el front)
            var conceptoO = string.IsNullOrWhiteSpace(vm.ConceptoOrigen) ? "Transferencia entre cuentas" : vm.ConceptoOrigen!;
            var conceptoD = string.IsNullOrWhiteSpace(vm.ConceptoDestino) ? "Transferencia entre cuentas" : vm.ConceptoDestino!;

            var ok = await _svc.ActualizarAtomico(
                transferenciaId: vm.Id,
                fecha: vm.Fecha,
                idCuentaOrigen: vm.IdCuentaOrigen,
                importeOrigen: vm.ImporteOrigen,
                idCuentaDestino: vm.IdCuentaDestino,
                importeDestino: vm.ImporteDestino,
                conceptoOrigen: conceptoO,
                conceptoDestino: conceptoD,
                nota: vm.NotaInterna
            );

            if (!ok) return NotFound("Transferencia no encontrada.");
            return Ok(new { valor = true });
        }


        // GET: /TransferenciasCajas/Historial?idCuentaOrigen=1&idCuentaDestino=2
        [HttpGet]
        public async Task<IActionResult> Historial(int? idCuentaOrigen, int? idCuentaDestino)
        {
            var ts = await _svc.Historial();

            if (idCuentaOrigen.HasValue && idCuentaDestino.HasValue)
                ts = ts.Where(t => t.IdCuentaOrigen == idCuentaOrigen.Value &&
                                   t.IdCuentaDestino == idCuentaDestino.Value)
                       .ToList();

            // Traer fechas de las cajas (sirve para ordenar/mostrar)
            var idsCajas = ts.SelectMany(t => new[] { t.IdCajaOrigen, t.IdCajaDestino })
                             .Where(x => x.HasValue).Select(x => x!.Value).Distinct().ToArray();

            var cajas = await _db.Cajas
                .Where(c => idsCajas.Contains(c.Id))
                .Include(c => c.IdCuentaNavigation)
                .AsNoTracking()
                .ToListAsync();

            var dic = cajas.ToDictionary(c => c.Id);

            var lista = ts.Select(t =>
            {
                dic.TryGetValue(t.IdCajaOrigen ?? 0, out var co);
                dic.TryGetValue(t.IdCajaDestino ?? 0, out var cd);

                return new VMTransferenciaHist
                {
                    Id = t.Id,
                    Fecha = co?.Fecha ?? cd?.Fecha ?? DateTime.MinValue,
                    CuentaOrigen = t.IdCuentaOrigenNavigation?.Nombre ?? co?.IdCuentaNavigation?.Nombre ?? "",
                    ImporteOrigen = t.ImporteOrigen,
                    CuentaDestino = t.IdCuentaDestinoNavigation?.Nombre ?? cd?.IdCuentaNavigation?.Nombre ?? "",
                    ImporteDestino = t.ImporteDestino,
                    NotaInterna = t.NotaInterna
                };
            })
            .OrderByDescending(x => x.Fecha)
            .ThenByDescending(x => x.Id)
            .ToList();

            return Ok(lista);
        }

        [HttpDelete]
        public async Task<IActionResult> Eliminar(int id)
        {
            var ok = await _svc.Eliminar(id);
            return Ok(new { valor = ok });
        }
    }
}
