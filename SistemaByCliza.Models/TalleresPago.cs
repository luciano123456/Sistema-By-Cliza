using System;
using System.Collections.Generic;

namespace SistemaByCliza.Models;

public partial class TalleresPago
{
    public int Id { get; set; }

    public int IdTaller { get; set; }

    public int? IdCuentaCorriente { get; set; }

    public int? IdCaja { get; set; }

    public DateTime Fecha { get; set; }

    public int IdCuenta { get; set; }

    public string Concepto { get; set; } = null!;

    public decimal Importe { get; set; }

    public string NotaInterna { get; set; } = null!;

    public virtual Cuenta IdCuentaNavigation { get; set; } = null!;

    public virtual Taller IdTallerNavigation { get; set; } = null!;
}
