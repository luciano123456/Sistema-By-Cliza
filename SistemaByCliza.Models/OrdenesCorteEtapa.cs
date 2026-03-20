using System;
using System.Collections.Generic;

namespace SistemaByCliza.Models;

public partial class OrdenesCorteEtapa
{
    public int Id { get; set; }

    public int IdTaller { get; set; }

    public int IdCorte { get; set; }

    public DateTime FechaEntrada { get; set; }

    public DateTime FechaSalidaAproximada { get; set; }

    public DateTime? FechaSalidaReal { get; set; }

    public int? DiasReales { get; set; }

    public decimal CantidadProducir { get; set; }

    public decimal CantidadProducidas { get; set; }

    public decimal Diferencias { get; set; }

    public int IdEstado { get; set; }

    public string? NotaInterna { get; set; }

    public decimal? ImporteTotal { get; set; }

    public virtual OrdenesCorte IdCorteNavigation { get; set; } = null!;

    public virtual OrdenesCorteEtapasEstado IdEstadoNavigation { get; set; } = null!;

    public virtual Taller IdTallerNavigation { get; set; } = null!;
}
