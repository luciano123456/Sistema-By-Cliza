// File: Application/Controllers/InventarioController.cs
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SistemaByCliza.Application.Models.ViewModels;
using SistemaByCliza.BLL.Service;
using SistemaByCliza.Models;

namespace SistemaByCliza.Application.Controllers
{
	[Authorize]
	public class InventarioController : Controller
	{
		private readonly IInventarioService _srv;
		public InventarioController(IInventarioService srv) => _srv = srv;

		[AllowAnonymous]
		public IActionResult Index() => View();

		// ======================= Existencias =======================
		[HttpGet]
		public async Task<IActionResult> Existencias(int? idSucursal, int? idProducto, int? idVariante, string? texto)
		{
			var data = await _srv.ListarExistencias(idSucursal, idProducto, idVariante, texto);

			static string VarName(ProductosVariante? pv) =>
				$"{pv?.IdColorNavigation?.IdColorNavigation?.Nombre ?? ""} / {pv?.IdTalleNavigation?.IdTalleNavigation?.Nombre ?? ""}".Trim();

			var list = data.Select(i => new VMInventarioExistencia
			{
				IdSucursal = i.IdSucursal,
				Sucursal = i.IdSucursalNavigation?.Nombre ?? "",
				IdProducto = i.IdProducto,
				Producto = i.IdProductoNavigation?.Descripcion ?? $"Producto {i.IdProducto}",
				IdProductoVariante = (i.IdProductoVariante == 0 ? null : i.IdProductoVariante),
				Variante = (i.IdProductoVariante == 0 ? "" : VarName(i.IdProductoVarianteNavigation)),
				Cantidad = i.Cantidad
			}).ToList();

			return Ok(list);
		}

		// ======================= Movimientos =======================
		// ⚠️ AHORA admite 'flat=1' para devolver lista "plana" con saldo por fila (para DataTables).
		[HttpGet]
		public async Task<IActionResult> Movimientos(
			int? idSucursal, int? idProducto, int? idVariante,
			DateTime? desde, DateTime? hasta, string? texto, bool flat = false)
		{
			var (lista, stockAnterior) = await _srv.ListarMovimientos(idSucursal, idProducto, idVariante, desde, hasta, texto);

			if (flat)
			{
				// Orden cronológico para calcular saldo correctamente
				var ordenado = lista.OrderBy(m => m.Fecha).ThenBy(m => m.Id).ToList();
				var saldo = stockAnterior;
				var plano = new List<VMInventarioMovPlano>(ordenado.Count);

				foreach (var m in ordenado)
				{
					var e = m.Entrada;
					var s = m.Salida;
					saldo += (e - s);

					plano.Add(new VMInventarioMovPlano
					{
						Id = m.Id,
						Fecha = m.Fecha,
						Tipo = m.TipoMov ?? "",
						Concepto = m.Concepto ?? "",
						Entrada = e,
						Salida = s,
						Saldo = saldo,
						Producto = m.IdInventarioNavigation.IdProductoNavigation.Descripcion,
						Talle = m.IdInventarioNavigation.IdProductoVarianteNavigation.IdTalleNavigation.IdTalleNavigation.Nombre,
						Color = m.IdInventarioNavigation.IdProductoVarianteNavigation.IdColorNavigation.IdColorNavigation.Nombre
					});
				}

				// Lo devolvemos DESC por fecha (más reciente primero), que es como lo ve la grilla.
				plano = plano.OrderByDescending(p => p.Fecha).ThenByDescending(p => p.Id).ToList();
				return Ok(plano);
			}

			// Respuesta original (se mantiene para compatibilidad)
			var vm = new VMInventarioMovList
			{
				StockAnterior = stockAnterior,
				Movimientos = lista.Select(m => new VMInventarioMov
				{
					Id = m.Id,
					Fecha = m.Fecha,
					TipoMov = m.TipoMov ?? "",
					IdMov = m.IdMov,
					Concepto = m.Concepto ?? "",
					Entrada = m.Entrada,
					Salida = m.Salida,
					IdSucursal = m.IdSucursal,
					Sucursal = m.IdSucursalNavigation?.Nombre ?? "",
					Producto = m.IdInventarioNavigation.IdProductoNavigation.Descripcion,
					Talle = m.IdInventarioNavigation.IdProductoVarianteNavigation.IdTalleNavigation.IdTalleNavigation.Nombre,
					Color = m.IdInventarioNavigation.IdProductoVarianteNavigation.IdColorNavigation.IdColorNavigation.Nombre
				}).ToList()
			};

			return Ok(vm);
		}

		// ======================= Ajuste MANUAL (back original) =======================
		[HttpPost]
		public async Task<IActionResult> Ajuste([FromBody] VMAjusteInventario vm)
		{
			var ok = await _srv.AjusteManual(
				vm.IdSucursal,
				vm.IdProducto,
				vm.IdProductoVariante,
				vm.Fecha,
				vm.Concepto,
				vm.Tipo,
				vm.Cantidad
			);

			return Ok(new { valor = ok });
		}

		// ======================= NUEVO: RegistrarMovimiento (para front) =======================
		// POST /Inventario/RegistrarMovimiento
		// Acepta payload simple con variantes opcionales (distribuye y crea N movimientos)
		[HttpPost]
		[Route("Inventario/RegistrarMovimiento")]
		public async Task<IActionResult> RegistrarMovimiento([FromBody] VMAjusteInventarioFront vm)
		{
			if (vm is null || vm.IdSucursal <= 0 || vm.IdProducto <= 0 || string.IsNullOrWhiteSpace(vm.Tipo))
				return BadRequest(new { ok = false, mensaje = "Parámetros inválidos." });

			// Si hay variantes, las aplicamos una por una; si no, usamos Cantidad a nivel item.
			if (vm.Variantes != null && vm.Variantes.Count > 0)
			{
				foreach (var v in vm.Variantes)
				{
					if (v.IdProductoVariante <= 0 || v.Cantidad <= 0)
						continue;

					var okVar = await _srv.AjusteManual(
						vm.IdSucursal,
						vm.IdProducto,
						v.IdProductoVariante,
						vm.Fecha,
						vm.Nota ?? $"AJUSTE MANUAL ({vm.Tipo})",
						vm.Tipo,
						v.Cantidad
					);

					if (!okVar) return Ok(new { valor = false, mensaje = "No se pudo registrar el ajuste para una variante." });
				}

				return Ok(new { valor = true });
			}
			else
			{
				var cantidad = vm.Cantidad ?? 0m;
				if (cantidad <= 0m) return BadRequest(new { ok = false, mensaje = "Cantidad inválida." });

				var ok = await _srv.AjusteManual(
					vm.IdSucursal,
					vm.IdProducto,
					null,
					vm.Fecha,
					vm.Nota ?? $"AJUSTE MANUAL ({vm.Tipo})",
					vm.Tipo,
					cantidad
				);

				return Ok(new { valor = ok });
			}
		}

		// ======================= Transferencias =======================
		[HttpGet]
		public async Task<IActionResult> ObtenerTransferencia(int id)
		{
			var t = await _srv.ObtenerTransferencia(id);
			if (t is null) return NotFound();

			static string VarName(ProductosVariante? pv) =>
				$"{pv?.IdColorNavigation?.IdColorNavigation?.Nombre ?? ""} / {pv?.IdTalleNavigation?.IdTalleNavigation?.Nombre ?? ""}".Trim();

			var vm = new VMInvTransferencia
			{
				Id = t.Id,
				IdSucursalOrigen = t.IdSucursalOrigen,
				IdSucursalDestino = t.IdSucursalDestino,
				Origen = t.IdSucursalOrigenNavigation?.Nombre ?? "",
				Destino = t.IdSucursalDestinoNavigation?.Nombre ?? "",
				Fecha = t.Fecha,
				Notas = t.Notas,
				Productos = (t.InventarioTransfSucursalesProductos ?? new List<InventarioTransfSucursalesProducto>())
					.Select(p => new VMInvTransfProducto
					{
						Id = p.Id,
						IdProducto = p.IdProducto,
						Producto = p.IdProductoNavigation?.Descripcion ?? $"Producto {p.IdProducto}",
						Variantes = (p.InventarioTransfSucursalesProductosVariantes ?? new List<InventarioTransfSucursalesProductosVariante>())
							.Select(v => new VMInvTransfVariante
							{
								Id = v.Id,
								IdProducto = v.IdProducto,
								IdProductoVariante = v.IdProductoVariante,
								Variante = VarName(v.IdProductoVarianteNavigation),
								Cantidad = v.Cantidad
							}).ToList()
					}).ToList()
			};

			return Ok(vm);
		}

		[HttpPost]
		public async Task<IActionResult> CrearTransferencia([FromBody] VMInvTransferencia vm)
		{
			var (cab, prods, vars) = MapTransf(vm);
			var ok = await _srv.CrearTransferencia(cab, prods, vars);
			return Ok(new { valor = ok });
		}

		[HttpPut]
		public async Task<IActionResult> ActualizarTransferencia([FromBody] VMInvTransferencia vm)
		{
			var (cab, prods, vars) = MapTransf(vm);
			var ok = await _srv.ActualizarTransferencia(cab, prods, vars);
			return Ok(new { valor = ok });
		}

		[HttpDelete]
		public async Task<IActionResult> EliminarTransferencia(int id)
		{
			var ok = await _srv.EliminarTransferencia(id);
			return Ok(new { valor = ok });
		}

		[HttpGet]
		public async Task<IActionResult> HistorialTransferencias(int? idOrigen, int? idDestino, DateTime? desde, DateTime? hasta, string? texto)
		{
			var list = await _srv.HistorialTransferencias(idOrigen, idDestino, desde, hasta, texto);

			var vm = list.Select(t => new VMInvTransferencia
			{
				Id = t.Id,
				IdSucursalOrigen = t.IdSucursalOrigen,
				IdSucursalDestino = t.IdSucursalDestino,
				Origen = t.IdSucursalOrigenNavigation?.Nombre ?? "",
				Destino = t.IdSucursalDestinoNavigation?.Nombre ?? "",
				Fecha = t.Fecha,
				Notas = t.Notas
				// detalle no necesario en historial
			}).ToList();

			return Ok(vm);
		}

		// ======================= NUEVO: Transferir (para front) =======================
		// POST /Inventario/Transferir  (atajo: un producto + variantes)
		[HttpPost]
		[Route("Inventario/Transferir")]
		public async Task<IActionResult> Transferir([FromBody] VMTransferFront vm)
		{
			if (vm is null || vm.IdSucursalOrigen <= 0 || vm.IdSucursalDestino <= 0 || vm.IdSucursalDestino == vm.IdSucursalOrigen || vm.IdProducto <= 0)
				return BadRequest(new { ok = false, mensaje = "Parámetros inválidos." });

			if (vm.Variantes == null || vm.Variantes.Count == 0)
				return BadRequest(new { ok = false, mensaje = "Debes informar variantes con cantidades." });

			var cab = new InventarioTransfSucursal
			{
				Id = 0,
				IdSucursalOrigen = vm.IdSucursalOrigen,
				IdSucursalDestino = vm.IdSucursalDestino,
				Fecha = vm.Fecha,
				Notas = vm.Nota
			};

			var prod = new InventarioTransfSucursalesProducto
			{
				Id = 0,
				IdProducto = vm.IdProducto
				// IdTransfSucursal lo setea repo
			};

			var vars = vm.Variantes.Select(v => new InventarioTransfSucursalesProductosVariante
			{
				Id = 0,
				IdProducto = vm.IdProducto,
				IdProductoVariante = v.IdProductoVariante,
				Cantidad = v.Cantidad
				// IdTransfSucursalProducto lo setea repo
			}).ToList();

			// El repositorio espera listas
			var ok = await _srv.CrearTransferencia(
				cab,
				new List<InventarioTransfSucursalesProducto> { prod },
				vars
			);

			return Ok(new { valor = ok });
		}

		// POST /Inventario/IngresoDesdeOC
		[HttpPost]
		[Route("Inventario/IngresoDesdeOC")]
		public async Task<IActionResult> IngresoDesdeOC([FromBody] VMIngresoDesdeOC vm)
		{
			if (vm is null || vm.IdSucursal <= 0 || vm.IdOrdenCorte <= 0 || vm.Variantes is null)
				return BadRequest(new { ok = false, mensaje = "Parámetros inválidos." });

			// Mapear VM -> tuplas (el service no usa ViewModels)
			var lineas = vm.Variantes
				.Where(l => l.IdProducto > 0 && l.IdProductoVariante > 0 && l.Cantidad > 0)
				.Select(l => (l.IdProducto, l.IdProductoVariante, l.Cantidad));

			var ok = await _srv.IngresarStockDesdeOC(vm.IdSucursal, vm.IdOrdenCorte, vm.Fecha, vm.Nota, lineas);
			if (!ok) return Ok(new { valor = false, mensaje = "La OC ya fue ingresada o no hay líneas válidas." });
			return Ok(new { valor = true });
		}

		// POST /Inventario/RevertirIngresoOC?idSucursal=1&idOrdenCorte=123
		[HttpPost]
		[Route("Inventario/RevertirIngresoOC")]
		public async Task<IActionResult> RevertirIngresoOC(int idSucursal, int idOrdenCorte)
		{
			if (idSucursal <= 0 || idOrdenCorte <= 0)
				return BadRequest(new { ok = false, mensaje = "Parámetros inválidos." });

			var ok = await _srv.RevertirIngresoDesdeOC(idSucursal, idOrdenCorte);
			return Ok(new { valor = ok });
		}

		// --------- mappers privados (VM -> entidades dominio) ---------
		private static (InventarioTransfSucursal cab,
						List<InventarioTransfSucursalesProducto> prods,
						List<InventarioTransfSucursalesProductosVariante> vars)
			MapTransf(VMInvTransferencia vm)
		{
			var cab = new InventarioTransfSucursal
			{
				Id = vm.Id,
				IdSucursalOrigen = vm.IdSucursalOrigen,
				IdSucursalDestino = vm.IdSucursalDestino,
				Fecha = vm.Fecha,
				Notas = vm.Notas
			};

			var prods = new List<InventarioTransfSucursalesProducto>();
			var vars = new List<InventarioTransfSucursalesProductosVariante>();

			foreach (var p in vm.Productos ?? new())
			{
				prods.Add(new InventarioTransfSucursalesProducto
				{
					Id = p.Id,
					IdTransfSucursal = vm.Id,
					IdProducto = p.IdProducto
				});

				foreach (var v in p.Variantes ?? new())
				{
					vars.Add(new InventarioTransfSucursalesProductosVariante
					{
						Id = v.Id,
						IdProducto = v.IdProducto,
						IdProductoVariante = v.IdProductoVariante,
						Cantidad = v.Cantidad
						// IdTransfSucursalProducto lo resuelve el repo
					});
				}
			}

			return (cab, prods, vars);
		}

        // ======================= ÓRDENES DE CORTE (para ingreso de stock) =======================

        // 1) OC disponibles (no ingresadas) para Select2
        [HttpGet]
        [Route("Inventario/OC/Disponibles")]
        public async Task<IActionResult> OCDisponibles(string? q, int? top)
        {
            var list = await _srv.ListarOCDisponibles(q, top);
            var res = list.Select(oc => new
            {
                id = oc.Id,
                text = $"OC #{oc.Id} • {oc.FechaInicio:yyyy-MM-dd}" +
                       (oc.IdEstadoNavigation != null ? $" • {oc.IdEstadoNavigation.Nombre}" : "")
            });
            return Ok(res);
        }



        // 2) Variantes de la OC (líneas a ingresar)
        [HttpGet]
        [Route("Inventario/OC/Variantes")]
        public async Task<IActionResult> VariantesPorOC(int idOrdenCorte)
        {
            var list = await _srv.VariantesPorOCConProducto(idOrdenCorte);
            var vm = list.Select(x => new
            {
                x.IdProducto,
                IdProductoVariante = x.IdProductoVariante,
                x.Producto,          // << agregado
                Variante = x.Variante
            });
            return Ok(vm);
        }

        // 3) OC con ingreso (para revertir) por sucursal
        [HttpGet]
        [Route("Inventario/OC/ConIngreso")]
        public async Task<IActionResult> OCConIngreso(int idSucursal, string? q, int? top)
        {
            if (idSucursal <= 0) return Ok(Array.Empty<object>());

            var list = await _srv.ListarOCConIngresoPorSucursal(idSucursal, q, top);

            var res = list.Select(oc => new
            {
                id = oc.Id,
                text = $"OC #{oc.Id} • {oc.FechaInicio:yyyy-MM-dd}" +
                       (oc.IdEstadoNavigation != null ? $" • {oc.IdEstadoNavigation.Nombre}" : "")
            });

            return Ok(res);
        }

        // ======================= NUEVO: TransferirMulti (varios productos) =======================
        // POST /Inventario/TransferirMulti
        [HttpPost]
        [Route("Inventario/TransferirMulti")]
        public async Task<IActionResult> TransferirMulti([FromBody] VMTransferFrontMulti vm)
        {
            if (vm is null ||
                vm.IdSucursalOrigen <= 0 ||
                vm.IdSucursalDestino <= 0 ||
                vm.IdSucursalDestino == vm.IdSucursalOrigen ||
                vm.Productos is null || vm.Productos.Count == 0)
                return BadRequest(new { ok = false, mensaje = "Parámetros inválidos." });

            // Debe haber al menos una variante con cantidad > 0
            var tieneLineas = vm.Productos.Any(p =>
                p.IdProducto > 0 &&
                p.Variantes != null &&
                p.Variantes.Any(v => v.IdProductoVariante > 0 && v.Cantidad > 0));

            if (!tieneLineas)
                return BadRequest(new { ok = false, mensaje = "Debes informar productos con variantes y cantidades." });

            var cab = new InventarioTransfSucursal
            {
                Id = 0,
                IdSucursalOrigen = vm.IdSucursalOrigen,
                IdSucursalDestino = vm.IdSucursalDestino,
                Fecha = vm.Fecha,
                Notas = vm.Nota
            };

            // Productos (una fila por producto)
            var prods = vm.Productos
                .Where(p => p.IdProducto > 0 && p.Variantes != null && p.Variantes.Any(v => v.Cantidad > 0))
                .Select(p => new InventarioTransfSucursalesProducto
                {
                    Id = 0,
                    IdProducto = p.IdProducto
                })
                .ToList();

            // Variantes (todas en una lista; tu repo las vincula al producto/cabecera)
            var vars = vm.Productos
                .Where(p => p.IdProducto > 0 && p.Variantes != null)
                .SelectMany(p => p.Variantes
                    .Where(v => v.IdProductoVariante > 0 && v.Cantidad > 0)
                    .Select(v => new InventarioTransfSucursalesProductosVariante
                    {
                        Id = 0,
                        IdProducto = p.IdProducto,
                        IdProductoVariante = v.IdProductoVariante,
                        Cantidad = v.Cantidad
                    }))
                .ToList();

            var ok = await _srv.CrearTransferencia(cab, prods, vars);
            return Ok(new { valor = ok });
        }




    }


}
