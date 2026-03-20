using System;
using System.Collections.Generic;

namespace SistemaByCliza.Models;

public partial class PersonalSueldo
{
    public int Id { get; set; }

    public int IdPersonal { get; set; }

    public DateTime Fecha { get; set; }

    public string Concepto { get; set; } = null!;

    public decimal Importe { get; set; }

    public decimal ImporteAbonado { get; set; }

    public decimal Saldo { get; set; }

    public string? NotaInterna { get; set; }

    public virtual Personal IdPersonalNavigation { get; set; } = null!;

    public virtual ICollection<PersonalSueldosPago> PersonalSueldosPagos { get; set; } = new List<PersonalSueldosPago>();
}
