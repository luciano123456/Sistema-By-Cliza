using SistemaByCliza.DAL.Repository;
using SistemaByCliza.Models.Analisis;

namespace SistemaByCliza.BLL.Service;

public class AnalisisDatosService : IAnalisisDatosService
{
    private readonly IAnalisisDatosRepository _repo;

    public AnalisisDatosService(IAnalisisDatosRepository repo)
    {
        _repo = repo;
    }

    public Task<AnalisisVentasResumen> ObtenerReporteVentas(AnalisisFiltro filtro)
        => _repo.ObtenerReporteVentas(filtro);

    public Task<AnalisisInventarioResumen> ObtenerReporteInventario(AnalisisFiltro filtro)
        => _repo.ObtenerReporteInventario(filtro);

    public Task<AnalisisFinancieroResumen> ObtenerReporteFinanciero(AnalisisFiltro filtro)
        => _repo.ObtenerReporteFinanciero(filtro);

    public Task<AnalisisGastosResumen> ObtenerReporteGastos(AnalisisFiltro filtro)
        => _repo.ObtenerReporteGastos(filtro);

    public Task<AnalisisProduccionResumen> ObtenerReporteProduccion(AnalisisFiltro filtro)
        => _repo.ObtenerReporteProduccion(filtro);
}
