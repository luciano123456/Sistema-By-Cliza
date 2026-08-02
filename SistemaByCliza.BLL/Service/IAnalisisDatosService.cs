using SistemaByCliza.Models.Analisis;

namespace SistemaByCliza.BLL.Service;

public interface IAnalisisDatosService
{
    Task<AnalisisVentasResumen> ObtenerReporteVentas(AnalisisFiltro filtro);
    Task<AnalisisInventarioResumen> ObtenerReporteInventario(AnalisisFiltro filtro);
    Task<AnalisisFinancieroResumen> ObtenerReporteFinanciero(AnalisisFiltro filtro);
    Task<AnalisisGastosResumen> ObtenerReporteGastos(AnalisisFiltro filtro);
    Task<AnalisisProduccionResumen> ObtenerReporteProduccion(AnalisisFiltro filtro);
}
