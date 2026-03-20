using System;
using System.Collections.Generic;

namespace SistemaByCliza.Models;

public partial class InventarioIngresosOrdenesCorteProductosVariante
{
    public int Id { get; set; }

    public int IdIngresoProducto { get; set; }

    public int IdProducto { get; set; }

    public int IdVariante { get; set; }

    public int Cantidad { get; set; }

    public virtual InventarioIngresosOrdenesCorteProducto IdIngresoProductoNavigation { get; set; } = null!;

    public virtual Producto IdProductoNavigation { get; set; } = null!;

    public virtual ProductosVariante IdVarianteNavigation { get; set; } = null!;
}
