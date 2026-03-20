using System;
using System.Collections.Generic;

namespace SistemaByCliza.Models;

public partial class TalleresCuentaCorriente
{
    public int Id { get; set; }

    public int IdTaller { get; set; }

    public DateTime Fecha { get; set; }

    public string TipoMov { get; set; } = null!;

    public int IdMov { get; set; }

    public string Concepto { get; set; } = null!;

    public decimal Debe { get; set; }

    public decimal Haber { get; set; }

    public virtual Taller IdTallerNavigation { get; set; } = null!;
}
