using System;
using System.Collections.Generic;

namespace SistemaByCliza.Models;

public partial class PersonalSueldosPago
{
    public int Id { get; set; }

    public int? IdCaja { get; set; }

    public int IdSueldo { get; set; }

    public DateTime Fecha { get; set; }

    public int IdCuenta { get; set; }

    public decimal Importe { get; set; }

    public string? NotaInterna { get; set; }

    public virtual Cuenta IdCuentaNavigation { get; set; } = null!;

    public virtual PersonalSueldo IdSueldoNavigation { get; set; } = null!;
}
