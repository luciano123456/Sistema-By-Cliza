using System;
using System.Collections.Generic;

namespace SistemaByCliza.Models;

public partial class ComprasInsumo
{
    public int Id { get; set; }

    public int IdCompra { get; set; }

    public decimal CostoUnitario { get; set; }

    public decimal PorcDescuento { get; set; }

    public decimal DescuentoUnit { get; set; }

    public decimal DescuentoTotal { get; set; }

    public decimal CostoUnitCdesc { get; set; }

    public decimal PorcIva { get; set; }

    public decimal IvaUnit { get; set; }

    public decimal IvaTotal { get; set; }

    public decimal CostoUnitFinal { get; set; }

    public decimal Cantidad { get; set; }

    public decimal Subtotal { get; set; }

    public virtual Compra IdCompraNavigation { get; set; } = null!;
}
