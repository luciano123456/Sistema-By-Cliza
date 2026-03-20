using System;
using System.Collections.Generic;

namespace SistemaByCliza.Models;

public partial class InventarioTransfSucursalesProductosVariante
{
    public int Id { get; set; }

    public int IdTransfSucursalProducto { get; set; }

    public int IdProducto { get; set; }

    public int IdProductoVariante { get; set; }

    public decimal Cantidad { get; set; }

    public virtual Producto IdProductoNavigation { get; set; } = null!;

    public virtual ProductosVariante IdProductoVarianteNavigation { get; set; } = null!;

    public virtual InventarioTransfSucursalesProducto IdTransfSucursalProductoNavigation { get; set; } = null!;
}
