using System;
using System.Collections.Generic;

namespace SistemaByCliza.Models;

public partial class Compra
{
    public int Id { get; set; }

    public int? IdCuentaCorriente { get; set; }

    public int IdProveedor { get; set; }

    public DateTime Fecha { get; set; }

    public decimal Subtotal { get; set; }

    public decimal Descuentos { get; set; }

    public decimal TotalIva { get; set; }

    public decimal ImporteTotal { get; set; }

    public string NotaInterna { get; set; } = null!;

    public virtual ICollection<ComprasInsumo> ComprasInsumos { get; set; } = new List<ComprasInsumo>();

    public virtual ICollection<ComprasPago> ComprasPagos { get; set; } = new List<ComprasPago>();

    public virtual Proveedor IdProveedorNavigation { get; set; } = null!;
}
