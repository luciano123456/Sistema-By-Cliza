using System;
using System.Collections.Generic;

namespace SistemaByCliza.Models;

public partial class InsumosInventarioMovimiento
{
    public int Id { get; set; }

    public int IdInventario { get; set; }

    public DateTime Fecha { get; set; }

    public string TipoMov { get; set; } = null!;

    public int? IdMov { get; set; }

    public string Concepto { get; set; } = null!;

    public int Entrada { get; set; }

    public int Salida { get; set; }

    public int? IdUsuarioRegistra { get; set; }

    public DateTime? FechaRegistra { get; set; }

    public int? IdUsuarioModifica { get; set; }

    public DateTime? FechaModifica { get; set; }

    public virtual InsumosInventario IdInventarioNavigation { get; set; } = null!;

    public virtual User? IdUsuarioModificaNavigation { get; set; }

    public virtual User? IdUsuarioRegistraNavigation { get; set; }
}
