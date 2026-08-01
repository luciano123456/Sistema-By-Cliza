using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SistemaByCliza.BLL.Service;
using SistemaByCliza.Models.Analisis;

namespace SistemaByCliza.Application.Controllers;

[Authorize]
public class AnalisisDatosController : Controller
{
    private readonly IAnalisisDatosService _service;

    public AnalisisDatosController(IAnalisisDatosService service)
    {
        _service = service;
    }

    [AllowAnonymous]
    public IActionResult Index() => View();

    private static AnalisisFiltro BuildFiltro(
        DateTime? fechaDesde,
        DateTime? fechaHasta,
        int idSucursal,
        string? tipoVenta,
        int diasSinMovimiento = 90)
    {
        string? tv = null;
        if (!string.IsNullOrWhiteSpace(tipoVenta))
        {
            tv = string.Equals(tipoVenta.Trim(), "Online", StringComparison.OrdinalIgnoreCase)
                ? "Online"
                : "Fisico";
        }

        return new AnalisisFiltro
        {
            FechaDesde = fechaDesde,
            FechaHasta = fechaHasta,
            IdSucursal = idSucursal,
            TipoVenta = tv,
            DiasSinMovimiento = diasSinMovimiento <= 0 ? 90 : diasSinMovimiento
        };
    }

    [HttpGet]
    public async Task<IActionResult> Ventas(
        DateTime? fechaDesde = null,
        DateTime? fechaHasta = null,
        int idSucursal = -1,
        string? tipoVenta = null)
    {
        var data = await _service.ObtenerReporteVentas(BuildFiltro(fechaDesde, fechaHasta, idSucursal, tipoVenta));
        return Ok(data);
    }

    [HttpGet]
    public async Task<IActionResult> Inventario(
        DateTime? fechaDesde = null,
        DateTime? fechaHasta = null,
        int idSucursal = -1,
        string? tipoVenta = null,
        int diasSinMovimiento = 90)
    {
        var data = await _service.ObtenerReporteInventario(
            BuildFiltro(fechaDesde, fechaHasta, idSucursal, tipoVenta, diasSinMovimiento));
        return Ok(data);
    }

    [HttpGet]
    public async Task<IActionResult> Financiero(
        DateTime? fechaDesde = null,
        DateTime? fechaHasta = null,
        int idSucursal = -1,
        string? tipoVenta = null)
    {
        var data = await _service.ObtenerReporteFinanciero(BuildFiltro(fechaDesde, fechaHasta, idSucursal, tipoVenta));
        return Ok(data);
    }

    [HttpGet]
    public async Task<IActionResult> Gastos(
        DateTime? fechaDesde = null,
        DateTime? fechaHasta = null,
        int idSucursal = -1,
        string? tipoVenta = null)
    {
        var data = await _service.ObtenerReporteGastos(BuildFiltro(fechaDesde, fechaHasta, idSucursal, tipoVenta));
        return Ok(data);
    }

    [HttpGet]
    public async Task<IActionResult> Produccion(
        DateTime? fechaDesde = null,
        DateTime? fechaHasta = null,
        int idSucursal = -1,
        string? tipoVenta = null)
    {
        var data = await _service.ObtenerReporteProduccion(BuildFiltro(fechaDesde, fechaHasta, idSucursal, tipoVenta));
        return Ok(data);
    }
}
