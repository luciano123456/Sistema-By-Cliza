using System;
using System.Collections.Generic;

namespace SistemaByCliza.Models;

public partial class InventarioIngresosOrdenesCorteProducto
{
    public int Id { get; set; }

    public int IdIngreso { get; set; }

    public int IdProducto { get; set; }

    public decimal Cantidad { get; set; }

    public virtual InventarioIngresosOrdenesCorte IdIngresoNavigation { get; set; } = null!;

    public virtual ICollection<InventarioIngresosOrdenesCorteProductosVariante> InventarioIngresosOrdenesCorteProductosVariantes { get; set; } = new List<InventarioIngresosOrdenesCorteProductosVariante>();
}
