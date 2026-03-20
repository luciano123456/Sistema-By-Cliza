using System;
using System.Collections.Generic;

namespace SistemaByCliza.Models;

public partial class VentasProductosVariante
{
    public int Id { get; set; }

    public int IdVentaProducto { get; set; }

    public int IdProducto { get; set; }

    public int IdProductoVariante { get; set; }

    public decimal Cantidad { get; set; }

    public virtual Producto IdProductoNavigation { get; set; } = null!;

    public virtual ProductosVariante IdProductoVarianteNavigation { get; set; } = null!;

    public virtual VentasProducto IdVentaProductoNavigation { get; set; } = null!;
}
