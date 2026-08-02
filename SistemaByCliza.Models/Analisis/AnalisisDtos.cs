namespace SistemaByCliza.Models.Analisis;

public class AnalisisFiltro
{
    public DateTime? FechaDesde { get; set; }
    public DateTime? FechaHasta { get; set; }
    public int IdSucursal { get; set; } = -1;
    /// <summary>Fisico | Online — filtra ventas por tipo de venta.</summary>
    public string? TipoVenta { get; set; }
    public int DiasSinMovimiento { get; set; } = 90;
}

public class AnalisisItemCantidad
{
    public string Clave { get; set; } = "";
    public string Etiqueta { get; set; } = "";
    public decimal Cantidad { get; set; }
    public decimal Importe { get; set; }
    public int CantidadVentas { get; set; }
}

public class AnalisisVendedorItem
{
    public int IdVendedor { get; set; }
    public string Vendedor { get; set; } = "";
    public int CantidadCierres { get; set; }
    public decimal ImporteTotal { get; set; }
    public decimal TicketPromedio { get; set; }
}

public class AnalisisProvinciaItem
{
    public int? IdProvincia { get; set; }
    public string Provincia { get; set; } = "";
    public string Localidad { get; set; } = "";
    public int CantidadClientes { get; set; }
    public int CantidadVentas { get; set; }
    public decimal ImporteTotal { get; set; }
    public bool ConPresencia { get; set; }
}

public class AnalisisInventarioItem
{
    public int IdProducto { get; set; }
    public int IdProductoVariante { get; set; }
    public string Producto { get; set; } = "";
    public string Talle { get; set; } = "";
    public string Color { get; set; } = "";
    public string Sucursal { get; set; } = "";
    public decimal Stock { get; set; }
    public decimal CantidadVendida { get; set; }
    public DateTime? UltimoMovimiento { get; set; }
    public int DiasSinMovimiento { get; set; }
    public decimal ValorInversion { get; set; }
    public decimal ValorVenta { get; set; }
    public string Clasificacion { get; set; } = "";
}

public class AnalisisInventarioResumen
{
    public decimal StockTotalUnidades { get; set; }
    public decimal ValorInversionTotal { get; set; }
    public decimal ValorVentaTotal { get; set; }
    public decimal ValorInversionParado { get; set; }
    public decimal ValorVentaParado { get; set; }
    public int ItemsSinMovimiento { get; set; }
    public int ItemsPocoMovimiento { get; set; }
    public int ItemsAltoMovimiento { get; set; }
    public List<AnalisisInventarioItem> Items { get; set; } = new();
}

public class AnalisisGananciaPrendaItem
{
    public int IdProducto { get; set; }
    public string Producto { get; set; } = "";
    public decimal CantidadVendida { get; set; }
    public decimal PrecioVentaPromedio { get; set; }
    public decimal CostoEstimadoUnitario { get; set; }
    public decimal GananciaUnitaria { get; set; }
    public decimal GananciaTotal { get; set; }
    public decimal MargenPorcentaje { get; set; }
}

public class AnalisisPuntoEquilibrioMes
{
    public int Anio { get; set; }
    public int Mes { get; set; }
    public string Periodo { get; set; } = "";
    public decimal VentasImporte { get; set; }
    public decimal GastosImporte { get; set; }
    public decimal CostoProduccion { get; set; }
    public decimal UnidadesVendidas { get; set; }
    public decimal MargenUnitarioPromedio { get; set; }
    public decimal UnidadesPuntoEquilibrio { get; set; }
    public decimal Resultado { get; set; }
    public bool EnGanancia { get; set; }
}

public class AnalisisFinancieroResumen
{
    public decimal VentasTotal { get; set; }
    public decimal GastosTotal { get; set; }
    public decimal CostoProduccionTotal { get; set; }
    public decimal ResultadoTotal { get; set; }
    public decimal UnidadesVendidas { get; set; }
    public decimal MargenUnitarioPromedio { get; set; }
    public List<AnalisisGananciaPrendaItem> PorPrenda { get; set; } = new();
    public List<AnalisisPuntoEquilibrioMes> PorMes { get; set; } = new();
}

public class AnalisisGastoItem
{
    public string Categoria { get; set; } = "";
    public string Sucursal { get; set; } = "";
    public string Concepto { get; set; } = "";
    public decimal Importe { get; set; }
    public int Cantidad { get; set; }
    public DateTime? Fecha { get; set; }
}

public class AnalisisGastosResumen
{
    public decimal Total { get; set; }
    public int Cantidad { get; set; }
    public List<AnalisisGastoItem> PorCategoria { get; set; } = new();
    public List<AnalisisGastoItem> PorSucursal { get; set; } = new();
    public List<AnalisisGastoItem> Detalle { get; set; } = new();
}

public class AnalisisProduccionProductoItem
{
    public int IdProducto { get; set; }
    public string Producto { get; set; } = "";
    public decimal CantidadFabricada { get; set; }
    public decimal CantidadPerdida { get; set; }
    public decimal PorcentajePerdida { get; set; }
}

public class AnalisisTallerProductividadItem
{
    public int IdTaller { get; set; }
    public string Taller { get; set; } = "";
    public int CantidadEtapas { get; set; }
    public decimal CantidadProducir { get; set; }
    public decimal CantidadProducida { get; set; }
    public decimal Diferencias { get; set; }
    public decimal ProductividadPorcentaje { get; set; }
    public decimal ImporteTotal { get; set; }
}

public class AnalisisProduccionResumen
{
    public decimal CantidadAProducir { get; set; }
    public decimal CantidadProducida { get; set; }
    public decimal CantidadFinalReal { get; set; }
    public decimal PerdidasTotales { get; set; }
    public List<AnalisisProduccionProductoItem> PorProducto { get; set; } = new();
    public List<AnalisisTallerProductividadItem> PorTaller { get; set; } = new();
}

public class AnalisisVentasResumen
{
    public int CantidadVentas { get; set; }
    public decimal ImporteTotal { get; set; }
    public decimal UnidadesVendidas { get; set; }
    public List<AnalisisItemCantidad> PorProducto { get; set; } = new();
    public List<AnalisisItemCantidad> PorTalle { get; set; } = new();
    public List<AnalisisItemCantidad> PorColor { get; set; } = new();
    public List<AnalisisItemCantidad> PorCanal { get; set; } = new();
    public List<AnalisisItemCantidad> PorSucursal { get; set; } = new();
    public List<AnalisisVendedorItem> PorVendedor { get; set; } = new();
    public List<AnalisisProvinciaItem> PorProvincia { get; set; } = new();
    public List<AnalisisProvinciaItem> PorLocalidad { get; set; } = new();
    public List<AnalisisProvinciaItem> ProvinciasSinPresencia { get; set; } = new();
}
