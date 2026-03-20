using System;
using System.Collections.Generic;

namespace SistemaByCliza.Models;

public partial class VentasProducto
{
    public int Id { get; set; }

    public int IdVenta { get; set; }

    public int IdProducto { get; set; }

    public decimal PrecioUnitario { get; set; }

    public decimal PorcDescuento { get; set; }

    public decimal DescuentoUnit { get; set; }

    public decimal DescuentoTotal { get; set; }

    public decimal PrecioUnitCdesc { get; set; }

    public decimal PorcIva { get; set; }

    public decimal IvaUnit { get; set; }

    public decimal IvaTotal { get; set; }

    public decimal PrecioUnitFinal { get; set; }

    public decimal Cantidad { get; set; }

    public decimal Subtotal { get; set; }

    public virtual Producto IdProductoNavigation { get; set; } = null!;

    public virtual Venta IdVentaNavigation { get; set; } = null!;

    public virtual ICollection<VentasProductosVariante> VentasProductosVariantes { get; set; } = new List<VentasProductosVariante>();
}
