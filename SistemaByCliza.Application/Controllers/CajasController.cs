using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SistemaByCliza.Application.Models.ViewModels;
using SistemaByCliza.BLL.Service;
using SistemaByCliza.Models;

namespace SistemaByCliza.Application.Controllers
{
    [Authorize]
    public class CajasController : Controller
    {
        private readonly ICajasService _CajaService;

        public CajasController(ICajasService CajaService) => _CajaService = CajaService;

        [AllowAnonymous]
        public IActionResult Index() => View();

        private static bool EsTransferenciaPorConcepto(string? concepto) =>
            !string.IsNullOrWhiteSpace(concepto) &&
            concepto.IndexOf("Transferencia", StringComparison.OrdinalIgnoreCase) >= 0;

        // Helper: a partir de TipoMov + Importe retorna (Ingreso, Egreso)
        private static (decimal ingreso, decimal egreso) PartirImporte(string? tipoMov, decimal? importeDelFront, decimal ingresoVm, decimal egresoVm)
        {
            var tipo = (tipoMov ?? "").Trim();
            var importe = (importeDelFront ?? 0m);

            // Back-compat: si no vino Importe, usamos los campos viejos
            if (importe <= 0)
                importe = tipo.Equals("Ingreso", StringComparison.OrdinalIgnoreCase) ? ingresoVm : egresoVm;

            if (importe < 0) importe = Math.Abs(importe); // por las dudas

            if (tipo.Equals("Ingreso", StringComparison.OrdinalIgnoreCase))
                return (importe, 0m);

            // default: Egreso
            return (0m, importe);
        }



        [HttpGet]
        public async Task<IActionResult> Lista(
     DateTime? FechaDesde = null,
     DateTime? FechaHasta = null,
     int IdSucursal = -1,
     int IdCuenta = -1,
     string Tipo = "TODOS",
     string Concepto = ""
 )
        {
            try
            {
                var (cajas, saldoAnterior) =
                    await _CajaService.ObtenerFiltradoConSaldoAnterior(
                        FechaDesde, FechaHasta, IdSucursal, IdCuenta, Tipo, Concepto
                    );

                // 1️⃣ ORDEN CONTABLE REAL
                var cajasOrdenadas = cajas
                    .OrderBy(c => c.Fecha)
                    .ThenBy(c => c.Id)
                    .ToList();

                decimal saldoCorriente = saldoAnterior;
                var movimientos = new List<VMCaja>();

                // 2️⃣ SALDO ACUMULADO CORRECTO
                foreach (var c in cajasOrdenadas)
                {
                    saldoCorriente += (c.Ingreso - c.Egreso);

                    movimientos.Add(new VMCaja
                    {
                        Id = c.Id,
                        IdSucursal = c.IdSucursal ?? -1,
                        IdCuenta = c.IdCuenta,
                        Fecha = c.Fecha,
                        TipoMov = c.TipoMov,
                        IdMov = c.IdMov,
                        Concepto = c.Concepto,

                        Ingreso = c.Ingreso,
                        Egreso = c.Egreso,
                        Importe = c.Ingreso > 0 ? c.Ingreso : c.Egreso,

                        Saldo = saldoCorriente,

                        Cuenta = c.IdCuentaNavigation?.Nombre ?? "",
                        Sucursal = c.IdSucursalNavigation?.Nombre ?? "",

                        EsTransferencia =
                            (c.Concepto ?? "").IndexOf(
                                "Transferencia",
                                StringComparison.OrdinalIgnoreCase
                            ) >= 0,

                        PuedeEliminar =
                            c.IdMov == null ||
                            (c.Concepto ?? "").Contains(
                                "Transferencia",
                                StringComparison.OrdinalIgnoreCase
                            )
                    });
                }

                // ❌ NO REORDENAR ACÁ
                // El orden contable es el único válido para el saldo

                return Ok(new
                {
                    SaldoAnterior = saldoAnterior,
                    Movimientos = movimientos
                });
            }
            catch
            {
                return BadRequest(
                    "Ha ocurrido un error al mostrar la lista de movimientos de caja."
                );
            }
        }


        // POST: /Cajas/Insertar
        [HttpPost]
        public async Task<IActionResult> Insertar([FromBody] VMCaja model)
        {
            if (model is null) return BadRequest("Modelo inválido.");
            if (string.IsNullOrWhiteSpace(model.TipoMov)) return BadRequest("Tipo de movimiento requerido.");

            var (ing, egr) = PartirImporte(model.TipoMov, model.Importe, model.Ingreso, model.Egreso);
            if (ing <= 0 && egr <= 0) return BadRequest("El importe debe ser mayor a 0.");

            var entidad = new Caja
            {
                IdSucursal = model.IdSucursal,
                IdCuenta = model.IdCuenta,
                Fecha = model.Fecha,
                TipoMov = model.TipoMov,          // "Ingreso" | "Egreso"
                IdMov = model.IdMov,
                Concepto = model.Concepto,
                Ingreso = ing,
                Egreso = egr
            };

            var ok = await _CajaService.Insertar(entidad);
            return Ok(new { valor = ok });
        }

        // PUT: /Cajas/Actualizar
        [HttpPut]
        public async Task<IActionResult> Actualizar([FromBody] VMCaja model)
        {
            if (model == null || model.Id <= 0) return BadRequest("Modelo inválido.");
            if (string.IsNullOrWhiteSpace(model.TipoMov)) return BadRequest("Tipo de movimiento requerido.");

            var (ing, egr) = PartirImporte(model.TipoMov, model.Importe, model.Ingreso, model.Egreso);
            if (ing <= 0 && egr <= 0) return BadRequest("El importe debe ser mayor a 0.");

            // Entidad “plana” (sin navegaciones) para evitar pisar FKs
            var entidad = new Caja
            {
                Id = model.Id,
                IdSucursal = model.IdSucursal,
                IdCuenta = model.IdCuenta,
                Fecha = model.Fecha,
                TipoMov = model.TipoMov,
                IdMov = model.IdMov,
                Concepto = model.Concepto,
                Ingreso = ing,
                Egreso = egr
            };

            var ok = await _CajaService.Actualizar(entidad);
            return Ok(new { valor = ok });
        }

        // DELETE: /Cajas/Eliminar?id=123
        [HttpDelete]
        public async Task<IActionResult> Eliminar(int id)
        {
            if (id <= 0) return BadRequest(new { mensaje = "Id inválido" });

            var caja = await _CajaService.Obtener(id);
            if (caja == null) return NotFound(new { mensaje = "Movimiento no encontrado" });

            if (EsTransferenciaPorConcepto(caja.Concepto))
                return BadRequest(new { mensaje = "Este movimiento pertenece a una transferencia. Eliminá la transferencia desde su modal." });

            var ok = await _CajaService.Eliminar(id);
            return Ok(new { valor = ok });
        }

        // GET: /Cajas/EditarInfo?id=123
        [HttpGet]
        public async Task<IActionResult> EditarInfo(int id)
        {
            if (id <= 0) return BadRequest(new { mensaje = "Id inválido" });

            var c = await _CajaService.Obtener(id);
            if (c == null) return NotFound();

            var esTransf = EsTransferenciaPorConcepto(c.Concepto);
            var puedeEliminar = c.IdMov == null;

            var vm = new VMCaja
            {
                Id = c.Id,
                IdSucursal = (int)c.IdSucursal,
                IdCuenta = c.IdCuenta,
                Fecha = c.Fecha,
                TipoMov = c.TipoMov,
                IdMov = c.IdMov,
                Concepto = c.Concepto,
                Ingreso = c.Ingreso,
                Egreso = c.Egreso,
                Importe = c.Ingreso > 0 ? c.Ingreso : c.Egreso, // 👈 para el input único en el modal

                Cuenta = c.IdCuentaNavigation?.Nombre,
                Sucursal = c.IdSucursalNavigation?.Nombre,
                EsTransferencia = esTransf,
                PuedeEliminar = puedeEliminar
            };

            return Ok(vm);
        }

        public IActionResult Privacy() => View();
    }
}
