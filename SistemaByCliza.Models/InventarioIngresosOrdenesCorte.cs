using System;
using System.Collections.Generic;

namespace SistemaByCliza.Models;

public partial class InventarioIngresosOrdenesCorte
{
    public int Id { get; set; }

    public int IdSucursal { get; set; }

    public int IdOrdenCorte { get; set; }

    public DateTime Fecha { get; set; }

    public decimal CantidadTotal { get; set; }

    public string? NotaInterna { get; set; }

    public virtual OrdenesCorte IdOrdenCorteNavigation { get; set; } = null!;

    public virtual Sucursal IdSucursalNavigation { get; set; } = null!;

    public virtual ICollection<InventarioIngresosOrdenesCorteProducto> InventarioIngresosOrdenesCorteProductos { get; set; } = new List<InventarioIngresosOrdenesCorteProducto>();
}
