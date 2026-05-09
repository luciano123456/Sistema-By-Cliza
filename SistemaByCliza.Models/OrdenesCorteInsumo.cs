using System;
using System.Collections.Generic;

namespace SistemaByCliza.Models;

public partial class OrdenesCorteInsumo
{
    public int Id { get; set; }

    public int IdCorte { get; set; }

    public int? IdMovInventario { get; set; }

    public int IdInsumo { get; set; }

    public int Cantidad { get; set; }

    public int? IdUsuarioRegistra { get; set; }

    public DateTime? FechaRegistra { get; set; }

    public int? IdUsuarioModifica { get; set; }

    public DateTime? FechaModifica { get; set; }

    public virtual OrdenesCorte IdCorteNavigation { get; set; } = null!;

    public virtual Insumo IdInsumoNavigation { get; set; } = null!;

    public virtual User? IdUsuarioModificaNavigation { get; set; }

    public virtual User? IdUsuarioRegistraNavigation { get; set; }
}
