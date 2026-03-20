// SistemaByCliza.Application/Controllers/VentasController.cs
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SistemaByCliza.Application.Models.ViewModels;
using SistemaByCliza.BLL.Service;
using SistemaByCliza.Models;

namespace SistemaByCliza.Application.Controllers
{
    [Authorize]
    public class VentasController : Controller
    {
        private readonly IVentasService _srv;
        public VentasController(IVentasService srv) { _srv = srv; }

        [AllowAnonymous]
        public IActionResult Index() => View();

        [AllowAnonymous]
        public IActionResult NuevoModif(int? id)
        {
            if (id.HasValue) ViewBag.Data = id.Value;
            return View();
        }

        [HttpGet]
        public async Task<IActionResult> Lista(DateTime? fechaDesde, DateTime? fechaHasta, int? idCliente, int? idVendedor, string? estado, string? texto)
        {
            var data = await _srv.Listar(fechaDesde, fechaHasta, idCliente, idVendedor, estado, texto);
            var vm = data.Select(v => new VMVenta
            {
                Id = v.Id,
                IdSucursal = v.IdSucursal,
                IdCliente = v.IdCliente,
                IdVendedor = v.IdVendedor,
                IdListaPrecio = v.IdListaPrecio,
                IdCuentaCorriente = v.IdCuentaCorriente,
                Fecha = v.Fecha,
                Subtotal = v.Subtotal,
                Descuentos = v.Descuentos,
                TotalIva = v.TotalIva,
                ImporteTotal = v.ImporteTotal,
                Cliente = v.IdClienteNavigation?.Nombre ?? "",
                Vendedor = v.IdVendedorNavigation?.Nombre ?? "",
                Sucursal = v.IdSucursalNavigation?.Nombre ?? ""
            }).ToList();
            return Ok(vm);
        }

        [HttpGet]
        public async Task<IActionResult> EditarInfo(int id)
        {
            var v = await _srv.Obtener(id);
            if (v is null) return NotFound();

            var items = await _srv.ObtenerItemsPorVenta(id);
            var pagos = await _srv.ObtenerPagosPorVenta(id);

            var vm = new VMVenta
            {
                Id = v.Id,
                IdSucursal = v.IdSucursal,
                IdVendedor = v.IdVendedor,
                IdListaPrecio = v.IdListaPrecio,
                IdCliente = v.IdCliente,
                IdCuentaCorriente = v.IdCuentaCorriente,
                Fecha = v.Fecha,
                Subtotal = v.Subtotal,
                Descuentos = v.Descuentos,
                TotalIva = v.TotalIva,
                ImporteTotal = v.ImporteTotal,
                NotaInterna = v.NotaInterna,
                NotaCliente = v.NotaCliente,
                Cliente = v.IdClienteNavigation?.Nombre ?? "",
                Vendedor = v.IdVendedorNavigation?.Nombre ?? "",
                Productos = items.Select(i => new VMVentaProducto
                {
                    Id = i.Id,
                    IdProducto = i.IdProducto,
                    Producto = i.IdProductoNavigation?.Descripcion ?? "",
                    PrecioUnitario = i.PrecioUnitario,
                    PorcDescuento = i.PorcDescuento,
                    DescuentoUnit = i.DescuentoUnit,
                    DescuentoTotal = i.DescuentoTotal,
                    PrecioUnitCdesc = i.PrecioUnitCdesc,
                    PorcIva = i.PorcIva,
                    IvaUnit = i.IvaUnit,
                    IvaTotal = i.IvaTotal,
                    PrecioUnitFinal = i.PrecioUnitFinal,
                    Cantidad = i.Cantidad,
                    Subtotal = i.Subtotal,
                    Variantes = i.VentasProductosVariantes.Select(vr => new VMVentaProductoVariante
                    {
                        Id = vr.Id,
                        IdProducto = vr.IdProducto,
                        IdProductoVariante = vr.IdProductoVariante,
                        Variante = $"{vr.IdProductoVarianteNavigation?.IdColorNavigation?.IdColorNavigation.Nombre} / {vr.IdProductoVarianteNavigation?.IdTalleNavigation?.IdTalleNavigation.Nombre}",
                        Cantidad = vr.Cantidad
                    }).ToList()
                }).ToList(),
                Pagos = pagos.Select(p => new VMClienteCobro
                {
                    Id = p.Id,
                    IdCuenta = p.IdCuenta,
                    Cuenta = p.IdCuentaNavigation?.Nombre ?? "",
                    Fecha = p.Fecha,
                    Importe = p.Importe,
                    NotaInterna = p.NotaInterna
                }).ToList()
            };

            return Ok(vm);
        }

        // UPSERT
        [HttpPost]
        public async Task<IActionResult> Insertar([FromBody] VMVenta vm)
        {
          
            var venta = MapVenta(vm);
            var (items, variantes) = MapItems(vm);
            var pagos = MapPagos(vm, venta);
            var ok = await _srv.InsertarConDetallesYPagos(venta, items, variantes, pagos);
            return Ok(new { valor = ok });
        }

        [HttpPut]
        public async Task<IActionResult> Actualizar([FromBody] VMVenta vm)
        {
         
            var venta = MapVenta(vm);
            var (items, variantes) = MapItems(vm);
            var pagos = MapPagos(vm, venta, keepIds: true);
            var ok = await _srv.ActualizarConDetallesYPagos(venta, items, variantes, pagos);
            return Ok(new { valor = ok });
        }

        [HttpDelete]
        public async Task<IActionResult> Eliminar(int id)
        {
            var ok = await _srv.Eliminar(id);
            return Ok(new { valor = ok });
        }

        [HttpGet]
        [ProducesResponseType(typeof(Dictionary<string, object>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(Dictionary<string, object>), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(Dictionary<string, object>), StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> ProductoInfoVenta(int idProducto, int idListaPrecio)
        {
            if (idProducto <= 0 || idListaPrecio <= 0)
            {
                return BadRequest(new Dictionary<string, object>
                {
                    ["ok"] = false,
                    ["error"] = "Parámetros inválidos.",
                    ["idProducto"] = idProducto,
                    ["idListaPrecio"] = idListaPrecio
                });
            }

            try
            {
                // Llamadas existentes, en paralelo
                var precioTask = _srv.ObtenerPrecioPorLista(idProducto, idListaPrecio);
                var variantesTask = _srv.ObtenerVariantesPorProducto(idProducto);

                await Task.WhenAll(precioTask, variantesTask);

                var precio = precioTask.Result ?? 0m;
                var variantesSrc = variantesTask.Result ?? Enumerable.Empty<ProductosVariante>();

                // Proyección segura para el front
                var variantes = variantesSrc.Select(v => new
                {
                    v.Id,
                    v.IdProducto,
                    ColorId = v.IdColorNavigation?.IdColor ?? v.IdColor,
                    Color = v.IdColorNavigation?.IdColorNavigation?.Nombre ?? string.Empty,
                    TalleId = v.IdTalleNavigation?.IdTalle ?? v.IdTalle,
                    Talle = v.IdTalleNavigation?.IdTalleNavigation?.Nombre ?? string.Empty,
                    Nombre = $"{v.IdColorNavigation?.IdColorNavigation?.Nombre ?? "-"} / {v.IdTalleNavigation?.IdTalleNavigation?.Nombre ?? "-"}"
                }).ToList();

                // Diccionario de salida
                var dict = new Dictionary<string, object>
                {
                    ["ok"] = true,
                    ["idProducto"] = idProducto,
                    ["idListaPrecio"] = idListaPrecio,
                    ["precio"] = precio,
                    ["countVariantes"] = variantes.Count,
                    ["variantes"] = variantes
                };

                return Ok(dict);
            }
            catch (Exception ex)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, new Dictionary<string, object>
                {
                    ["ok"] = false,
                    ["error"] = "Error interno obteniendo información del producto.",
                    ["detail"] = ex.Message,
                    ["idProducto"] = idProducto,
                    ["idListaPrecio"] = idListaPrecio
                });
            }
        }

        // -------- Aux endpoints para el front --------
        [HttpGet]
        public async Task<IActionResult> VariantesPorProducto(int idProducto)
        {
            var list = await _srv.ObtenerVariantesPorProducto(idProducto);
            return Ok(list.Select(v => new
            {
                v.Id,
                v.IdProducto,
                Color = v.IdColorNavigation?.IdColorNavigation.Nombre ?? "",
                Talle = v.IdTalleNavigation?.IdTalleNavigation.Nombre ?? "",
                Nombre = $"{v.IdColorNavigation?.IdColorNavigation.Nombre} / {v.IdTalleNavigation.IdTalleNavigation.Nombre}"
            }).ToList());
        }

        [HttpGet]
        public async Task<IActionResult> PrecioPorLista(int idProducto, int idListaPrecio)
        {
            var precio = await _srv.ObtenerPrecioPorLista(idProducto, idListaPrecio);
            return Ok(new { precio = precio ?? 0m });
        }

        // --------- mappers privados ---------
        private static Venta MapVenta(VMVenta vm) => new Venta
        {
            Id = vm.Id,
            IdSucursal = vm.IdSucursal,
            IdVendedor = vm.IdVendedor,
            IdListaPrecio = vm.IdListaPrecio,
            IdCliente = vm.IdCliente,
            IdCuentaCorriente = vm.IdCuentaCorriente,
            Fecha = vm.Fecha,
            Subtotal = vm.Subtotal,
            Descuentos = vm.Descuentos,
            TotalIva = vm.TotalIva,
            ImporteTotal = vm.ImporteTotal,
            NotaInterna = vm.NotaInterna,
            NotaCliente = vm.NotaCliente
        };

        private static (List<VentasProducto> items, List<VentasProductosVariante> vars) MapItems(VMVenta vm)
        {
            var items = new List<VentasProducto>();
            var vars = new List<VentasProductosVariante>();

            foreach (var it in vm.Productos ?? new())
            {
                items.Add(new VentasProducto
                {
                    Id = it.Id,
                    IdProducto = it.IdProducto,
                    PrecioUnitario = it.PrecioUnitario,
                    PorcDescuento = it.PorcDescuento,
                    DescuentoUnit = it.DescuentoUnit,
                    DescuentoTotal = it.DescuentoTotal,
                    PrecioUnitCdesc = it.PrecioUnitCdesc,
                    PorcIva = it.PorcIva,
                    IvaUnit = it.IvaUnit,
                    IvaTotal = it.IvaTotal,
                    PrecioUnitFinal = it.PrecioUnitFinal,
                    Cantidad = it.Cantidad,
                    Subtotal = it.Subtotal
                });

                foreach (var v in it.Variantes ?? new())
                {
                    vars.Add(new VentasProductosVariante
                    {
                        Id = v.Id,
                        IdVentaProducto = it.Id, // para el repo; si es nuevo, empareja por temporal en add
                        IdProducto = v.IdProducto,
                        IdProductoVariante = v.IdProductoVariante,
                        Cantidad = v.Cantidad
                    });
                }
            }

            return (items, vars);
        }

        private static List<ClientesCobro> MapPagos(VMVenta vm, Venta venta, bool keepIds = false)
        {
            var list = new List<ClientesCobro>();
            foreach (var p in vm.Pagos ?? new())
            {
                list.Add(new ClientesCobro
                {
                    Id = keepIds ? p.Id : 0,
                    IdSucursal = venta.IdSucursal,
                    IdCliente = venta.IdCliente,
                    IdVenta = venta.Id,
                    IdCuentaCorriente = venta.IdCuentaCorriente,
                    Fecha = p.Fecha,
                    IdCuenta = p.IdCuenta,
                    Importe = p.Importe,
                    NotaInterna = p.NotaInterna
                });
            }
            return list;
        }
    }
}
