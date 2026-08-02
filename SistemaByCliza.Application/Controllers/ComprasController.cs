// SistemaByCliza.Application/Controllers/ComprasController.cs
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SistemaByCliza.Application.Models.ViewModels;
using SistemaByCliza.BLL.Service;
using SistemaByCliza.Models;

namespace SistemaByCliza.Application.Controllers
{
    [Authorize]
    public class ComprasController : Controller
    {
        private readonly IComprasService _srv;
        public ComprasController(IComprasService srv) { _srv = srv; }

        [AllowAnonymous]
        public IActionResult Index() => View();

        [AllowAnonymous]
        public IActionResult NuevoModif(int? id)
        {
            if (id.HasValue) ViewBag.Data = id.Value;
            return View();
        }

        // -------- Listado con filtros --------
        [HttpGet]
        public async Task<IActionResult> Lista(DateTime? fechaDesde, DateTime? fechaHasta, int? idProveedor, string? estado, string? texto)
        {
            var data = await _srv.Listar(fechaDesde, fechaHasta, idProveedor, estado, texto);
            var vm = data.Select(c => new VMCompra
            {
                Id = c.Id,
                IdProveedor = c.IdProveedor,
                IdCuentaCorriente = c.IdCuentaCorriente,
                Fecha = c.Fecha,
                Subtotal = c.Subtotal,
                Descuentos = c.Descuentos,
                TotalIva = c.TotalIva,
                ImporteTotal = c.ImporteTotal,
                NotaInterna = c.NotaInterna,
                Proveedor = c.IdProveedorNavigation?.Nombre ?? ""
            }).ToList();

            return Ok(vm);
        }

        // -------- Cargar compra + detalles + pagos --------
        [HttpGet]
        public async Task<IActionResult> EditarInfo(int id)
        {
            var c = await _srv.Obtener(id);
            if (c is null) return NotFound();

            var items = await _srv.ObtenerItemsPorCompra(id);
            var pagos = await _srv.ObtenerPagosPorCompra(id);

            var vm = new VMCompra
            {
                Id = c.Id,
                IdProveedor = c.IdProveedor,
                IdCuentaCorriente = c.IdCuentaCorriente,
                Fecha = c.Fecha,
                Subtotal = c.Subtotal,
                Descuentos = c.Descuentos,
                TotalIva = c.TotalIva,
                ImporteTotal = c.ImporteTotal,
                NotaInterna = c.NotaInterna,
                Proveedor = c.IdProveedorNavigation?.Nombre ?? "",

                Insumos = items.Select(i => new VMCompraInsumo
                {
                    Id = i.Id,
                    CostoUnitario = i.CostoUnitario,
                    PorcDescuento = i.PorcDescuento,
                    DescuentoUnit = i.DescuentoUnit,
                    DescuentoTotal = i.DescuentoTotal,
                    CostoUnitCdesc = i.CostoUnitCdesc,
                    PorcIva = i.PorcIva,
                    IvaUnit = i.IvaUnit,
                    IvaTotal = i.IvaTotal,
                    CostoUnitFinal = i.CostoUnitFinal,
                    Cantidad = i.Cantidad,
                    Subtotal = i.Subtotal
                }).ToList(),

                Pagos = pagos.Select(p => new VMCompraPago
                {
                    Id = p.Id,
                    IdCuenta = p.IdCuenta,
                    Fecha = p.Fecha,
                    Concepto = p.Concepto,
                    Importe = p.Importe,
                    NotaInterna = p.NotaInterna
                }).ToList()
            };

            return Ok(vm);
        }

        // -------- UPSERT --------
        [HttpPost]
        public async Task<IActionResult> Insertar([FromBody] VMCompra vm)
        {
            if (vm is null) return BadRequest();

            var compra = MapCompra(vm);
            var items = MapItems(vm, keepIds: false);
            var pagos = MapPagos(vm, compra, keepIds: false);

            var ok = await _srv.InsertarConDetallesYPagos(compra, items, pagos);
            return Ok(new { valor = ok, id = ok ? compra.Id : 0 });
        }

        [HttpPut]
        public async Task<IActionResult> Actualizar([FromBody] VMCompra vm)
        {
            if (vm is null || vm.Id <= 0) return BadRequest();

            var compra = MapCompra(vm);
            var items = MapItems(vm, keepIds: true);
            var pagos = MapPagos(vm, compra, keepIds: true);

            var ok = await _srv.ActualizarConDetallesYPagos(compra, items, pagos);
            return Ok(new { valor = ok });
        }

        [HttpDelete]
        public async Task<IActionResult> Eliminar(int id)
        {
            var ok = await _srv.Eliminar(id);
            return Ok(new { valor = ok });
        }

        // --------- mappers privados ---------
        private static Compra MapCompra(VMCompra vm) => new Compra
        {
            Id = vm.Id,
            IdProveedor = vm.IdProveedor,
            IdCuentaCorriente = vm.IdCuentaCorriente,
            Fecha = vm.Fecha,
            Subtotal = vm.Subtotal,
            Descuentos = vm.Descuentos,
            TotalIva = vm.TotalIva,
            ImporteTotal = vm.ImporteTotal,
            NotaInterna = vm.NotaInterna ?? string.Empty
        };

        private static List<ComprasInsumo> MapItems(VMCompra vm, bool keepIds = false)
        {
            var list = new List<ComprasInsumo>();
            foreach (var it in vm.Insumos ?? new())
            {
                list.Add(new ComprasInsumo
                {
                    Id = keepIds ? it.Id : 0,
                    IdCompra = vm.Id, // el repo lo reasigna cuando se inserta
                    CostoUnitario = it.CostoUnitario,
                    PorcDescuento = it.PorcDescuento,
                    DescuentoUnit = it.DescuentoUnit,
                    DescuentoTotal = it.DescuentoTotal,
                    CostoUnitCdesc = it.CostoUnitCdesc,
                    PorcIva = it.PorcIva,
                    IvaUnit = it.IvaUnit,
                    IvaTotal = it.IvaTotal,
                    CostoUnitFinal = it.CostoUnitFinal,
                    Cantidad = it.Cantidad,
                    Subtotal = it.Subtotal
                });
            }
            return list;
        }

        private static List<ComprasPago> MapPagos(VMCompra vm, Compra compra, bool keepIds = false)
        {
            var list = new List<ComprasPago>();
            foreach (var p in vm.Pagos ?? new())
            {
                list.Add(new ComprasPago
                {
                    Id = keepIds ? p.Id : 0,
                    IdProveedor = compra.IdProveedor,
                    IdCompra = compra.Id,
                    IdCuentaCorriente = compra.IdCuentaCorriente,
                    IdCaja = null, // si luego registrás en caja, setealo en service/repo
                    Fecha = p.Fecha,
                    IdCuenta = p.IdCuenta,
                    Concepto = string.IsNullOrWhiteSpace(p.Concepto) ? "PAGO COMPRA" : p.Concepto!,
                    Importe = p.Importe,
                    NotaInterna = p.NotaInterna ?? string.Empty
                });
            }
            return list;
        }
    }
}
