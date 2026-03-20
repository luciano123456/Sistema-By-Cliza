using System;
using System.Collections.Generic;

namespace SistemaByCliza.Models;

public partial class OrdenesCorteInsumo
{
    public int Id { get; set; }

    public int IdCorte { get; set; }

    public int IdInsumo { get; set; }

    public int Cantidad { get; set; }

    public virtual OrdenesCorte IdCorteNavigation { get; set; } = null!;

    public virtual Insumo IdInsumoNavigation { get; set; } = null!;
}
