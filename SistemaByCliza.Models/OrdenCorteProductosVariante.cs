using System;
using System.Collections.Generic;

namespace SistemaByCliza.Models;

public partial class OrdenCorteProductosVariante
{
    public int Id { get; set; }

    public int IdOrdenCorteProducto { get; set; }

    public int IdProducto { get; set; }

    public int IdProductoVariante { get; set; }

    public int Cantidad { get; set; }

    public virtual OrdenesCorteProducto IdOrdenCorteProductoNavigation { get; set; } = null!;

    public virtual Producto IdProductoNavigation { get; set; } = null!;

    public virtual ProductosVariante IdProductoVarianteNavigation { get; set; } = null!;
}
