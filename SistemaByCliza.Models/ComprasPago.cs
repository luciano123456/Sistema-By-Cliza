using System;
using System.Collections.Generic;

namespace SistemaByCliza.Models;

public partial class ComprasPago
{
    public int Id { get; set; }

    public int IdProveedor { get; set; }

    public int? IdCompra { get; set; }

    public int? IdCuentaCorriente { get; set; }

    public int? IdCaja { get; set; }

    public DateTime Fecha { get; set; }

    public int IdCuenta { get; set; }

    public string Concepto { get; set; } = null!;

    public decimal Importe { get; set; }

    public string NotaInterna { get; set; } = null!;

    public virtual Compra? IdCompraNavigation { get; set; }
}
