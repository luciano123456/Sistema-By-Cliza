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

    public int? IdUsuarioRegistra { get; set; }

    public DateTime? FechaRegistra { get; set; }

    public int? IdUsuarioModifica { get; set; }

    public DateTime? FechaModifica { get; set; }

    public virtual Compra? IdCompraNavigation { get; set; }

    public virtual User? IdUsuarioModificaNavigation { get; set; }

    public virtual User? IdUsuarioRegistraNavigation { get; set; }
}
