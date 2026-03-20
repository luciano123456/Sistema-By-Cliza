using System;
using System.Collections.Generic;

namespace SistemaByCliza.Models;

public partial class Inventario
{
    public int Id { get; set; }

    public int IdSucursal { get; set; }

    public int IdProducto { get; set; }

    public int IdProductoVariante { get; set; }

    public decimal Cantidad { get; set; }

    public virtual Producto IdProductoNavigation { get; set; } = null!;

    public virtual ProductosVariante IdProductoVarianteNavigation { get; set; } = null!;

    public virtual Sucursal IdSucursalNavigation { get; set; } = null!;

    public virtual ICollection<InventarioMovimiento> InventarioMovimientos { get; set; } = new List<InventarioMovimiento>();
}
