using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SistemaByCliza.Application.Models.ViewModels;
using SistemaByCliza.BLL.Service;
using SistemaByCliza.Models;
using System.Linq;

namespace SistemaByCliza.Application.Controllers
{
    [Authorize]
    public class OrdenesCorteController : Controller
    {
        private readonly IOrdenesCorteService _srv;
        public OrdenesCorteController(IOrdenesCorteService srv) { _srv = srv; }

        [AllowAnonymous]
        public IActionResult Index() => View();

        [AllowAnonymous]
        public IActionResult NuevoModif(int? id)
        {
            if (id.HasValue) ViewBag.Data = id.Value;
            return View();
        }

        // -------- Listado ----------
        [HttpGet]
        public async Task<IActionResult> Lista(DateTime? fechaDesde, DateTime? fechaHasta, int? idEstado, string? texto)
        {
            var data = await _srv.Listar(fechaDesde, fechaHasta, idEstado, texto);

            var vm = data.Select(o => new VMOrdenCorte
            {
                Id = o.Id,
                IdPersonal = o.IdPersonal,
                IdEstado = o.IdEstado,
                FechaInicio = o.FechaInicio,
                FechaFinalizacion = o.FechaFinalizacion,
                CantidadProducir = o.CantidadProducir,
                CantidadProducidas = o.CantidadProducidas,
                DiferenciaCorte = o.DiferenciaCorte,
                CantidadFinalReal = o.CantidadFinalReal,
                DiferenciaFinalReal = o.DiferenciaFinalReal,
                LargoTizada = o.LargoTizada,
                AnchoTizada = o.AnchoTizada,
                CantidadCapas = o.CantidadCapas,
                HoraInicioCorte = o.HoraInicioCorte,
                HoraFinCorte = o.HoraFinCorte,
                Estado = o.IdEstadoNavigation?.Nombre ?? ""
            }).ToList();

            return Ok(vm);
        }

        // -------- Obtener (para edición) ----------
        [HttpGet]
        public async Task<IActionResult> EditarInfo(int id)
        {
            var o = await _srv.Obtener(id);
            if (o is null) return NotFound();

            var etapas = await _srv.ObtenerEtapasPorOrden(id);

            // helpers locales para leer nombres con fallback (directo o doble hop)
            static string GetColorNombre(OrdenCorteProductosVariante v) =>
                v?.IdProductoVarianteNavigation?.IdColorNavigation?.IdColorNavigation?.Nombre
                ?? v?.IdProductoVarianteNavigation?.IdColorNavigation.IdColorNavigation.Nombre
                ?? "";

            static string GetTalleNombre(OrdenCorteProductosVariante v) =>
                v?.IdProductoVarianteNavigation?.IdTalleNavigation?.IdTalleNavigation?.Nombre
                ?? v?.IdProductoVarianteNavigation?.IdTalleNavigation.IdTalleNavigation.Nombre
                ?? "";

            var vm = new VMOrdenCorte
            {
                Id = o.Id,
                IdPersonal = o.IdPersonal,
                IdEstado = o.IdEstado,
                FechaInicio = o.FechaInicio,
                FechaFinalizacion = o.FechaFinalizacion,
                CantidadProducir = o.CantidadProducir,
                CantidadProducidas = o.CantidadProducidas,
                DiferenciaCorte = o.DiferenciaCorte,
                CantidadFinalReal = o.CantidadFinalReal,
                DiferenciaFinalReal = o.DiferenciaFinalReal,
                LargoTizada = o.LargoTizada,
                AnchoTizada = o.AnchoTizada,
                CantidadCapas = o.CantidadCapas,
                HoraInicioCorte = o.HoraInicioCorte,
                HoraFinCorte = o.HoraFinCorte,
                Estado = o.IdEstadoNavigation?.Nombre ?? "",

                Productos = (o.OrdenesCorteProductos ?? new List<OrdenesCorteProducto>())
                    .Select(p => new VMOrdenCorteProducto
                    {
                        Id = p.Id,
                        IdProducto = p.IdProducto,
                        Cantidad = p.Cantidad,

                        // Nombre del producto: lo tomo de cualquier variante (todas apuntan al mismo producto)
                        Producto = p.OrdenCorteProductosVariantes?
                                      .Select(v => v.IdProductoNavigation?.Descripcion)
                                      .FirstOrDefault() ?? "",

                        Variantes = (p.OrdenCorteProductosVariantes ?? new List<OrdenCorteProductosVariante>())
                            .Select(v => new VMOrdenCorteProductoVariante
                            {
                                Id = v.Id,
                                IdProducto = v.IdProducto,
                                IdProductoVariante = v.IdProductoVariante,
                                Cantidad = v.Cantidad,
                                Color = GetColorNombre(v),
                                Talle = GetTalleNombre(v)
                            })
                            .ToList()
                    })
                    .ToList(),

                Insumos = (o.OrdenesCorteInsumos ?? new List<OrdenesCorteInsumo>())
                    .Select(i => new VMOrdenCorteInsumo
                    {
                        Id = i.Id,
                        IdInsumo = i.IdInsumo,
                        Cantidad = i.Cantidad,
                        Insumo = i.IdInsumoNavigation?.Descripcion ?? ""
                    })
                    .ToList(),

                Etapas = etapas.Select(e => new VMOrdenCorteEtapa
                {
                    Id = e.Id,
                    IdTaller = e.IdTaller,
                    FechaEntrada = e.FechaEntrada,
                    FechaSalidaAproximada = e.FechaSalidaAproximada,
                    FechaSalidaReal = e.FechaSalidaReal,
                    DiasReales = e.DiasReales,
                    CantidadProducir = e.CantidadProducir,
                    CantidadProducidas = e.CantidadProducidas,
                    Diferencias = e.Diferencias,
                    IdEstado = e.IdEstado,
                    NotaInterna = e.NotaInterna,
                    Taller = e.IdTallerNavigation?.Nombre ?? "",
                    Estado = e.IdEstadoNavigation?.Nombre ?? "",
                    ImporteTotal = e.ImporteTotal ?? 0
                }).ToList()
            };

            return Ok(vm);
        }

        // --------- Insertar ----------
        [HttpPost]
        public async Task<IActionResult> Insertar([FromBody] VMOrdenCorte vm)
        {
            var orden = MapOrden(vm);
            var productos = MapProductos(vm.Productos);
            var insumos = MapInsumos(vm);
            var etapas = MapEtapas(vm);

            var ok = await _srv.InsertarConDetalles(orden, productos, insumos, etapas);
            return Ok(new { valor = ok, id = ok ? orden.Id : 0 });
        }

        // --------- Actualizar ----------
        [HttpPut]
        public async Task<IActionResult> Actualizar([FromBody] VMOrdenCorte vm)
        {
            var orden = MapOrden(vm);
            var productos = MapProductos(vm.Productos);
            var insumos = MapInsumos(vm);
            var etapas = MapEtapas(vm);

            var ok = await _srv.ActualizarConDetalles(orden, productos, insumos, etapas);
            return Ok(new { valor = ok });
        }

        // --------- Eliminar ----------
        [HttpDelete]
        public async Task<IActionResult> Eliminar(int id)
        {
            var ok = await _srv.Eliminar(id);
            return Ok(new { valor = ok });
        }

        // --------- Catálogo estados ----------
        [HttpGet]
        public async Task<IActionResult> Estados()
        {
            var list = await _srv.ObtenerEstados();
            return Ok(list.Select(e => new { e.Id, e.Nombre }));
        }

        // ---------- mappers privados ----------
        private static OrdenesCorte MapOrden(VMOrdenCorte vm) => new OrdenesCorte
        {
            Id = vm.Id,
            IdPersonal = vm.IdPersonal,
            IdEstado = vm.IdEstado,
            FechaInicio = vm.FechaInicio,
            FechaFinalizacion = vm.FechaFinalizacion,
            CantidadProducir = vm.CantidadProducir,
            CantidadProducidas = vm.CantidadProducidas,
            DiferenciaCorte = vm.DiferenciaCorte,
            CantidadFinalReal = vm.CantidadFinalReal,
            DiferenciaFinalReal = vm.DiferenciaFinalReal,
            LargoTizada = vm.LargoTizada,
            AnchoTizada = vm.AnchoTizada,
            CantidadCapas = vm.CantidadCapas,
            HoraInicioCorte = vm.HoraInicioCorte,
            HoraFinCorte = vm.HoraFinCorte
        };

        private static List<OrdenesCorteProducto> MapProductos(List<VMOrdenCorteProducto> vms)
        {
            var list = new List<OrdenesCorteProducto>();
            foreach (var vm in vms ?? new())
            {
                var p = new OrdenesCorteProducto
                {
                    Id = vm.Id,
                    IdProducto = vm.IdProducto,
                    Cantidad = vm.Cantidad,
                    OrdenCorteProductosVariantes = new List<OrdenCorteProductosVariante>()
                };
                foreach (var v in vm.Variantes ?? new())
                {
                    p.OrdenCorteProductosVariantes.Add(new OrdenCorteProductosVariante
                    {
                        Id = v.Id,
                        IdProducto = v.IdProducto,
                        IdProductoVariante = v.IdProductoVariante,
                        Cantidad = v.Cantidad
                    });
                }
                list.Add(p);
            }
            return list;
        }

        private static List<OrdenesCorteInsumo> MapInsumos(VMOrdenCorte vm)
        {
            var list = new List<OrdenesCorteInsumo>();
            foreach (var i in vm.Insumos ?? new())
            {
                list.Add(new OrdenesCorteInsumo
                {
                    Id = i.Id,
                    IdInsumo = i.IdInsumo,
                    Cantidad = i.Cantidad
                });
            }
            return list;
        }

        private static List<OrdenesCorteEtapa> MapEtapas(VMOrdenCorte vm)
        {
            var list = new List<OrdenesCorteEtapa>();
            foreach (var e in vm.Etapas ?? new())
            {
                list.Add(new OrdenesCorteEtapa
                {
                    Id = e.Id,
                    IdTaller = e.IdTaller,
                    FechaEntrada = e.FechaEntrada,
                    FechaSalidaAproximada = e.FechaSalidaAproximada, 
                    FechaSalidaReal = e.FechaSalidaReal,
                    DiasReales = e.DiasReales,
                    CantidadProducir = e.CantidadProducir,
                    CantidadProducidas = e.CantidadProducidas,
                    Diferencias = e.Diferencias,
                    IdEstado = e.IdEstado,
                    NotaInterna = e.NotaInterna,
                    ImporteTotal = e.ImporteTotal
                    // IdCorte se setea en el repo cuando ya sabemos el Id de la orden
                });
            }
            return list;
        }
    }





}
