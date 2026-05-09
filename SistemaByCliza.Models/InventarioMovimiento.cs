using System;
using System.Collections.Generic;

namespace SistemaByCliza.Models;

public partial class InventarioMovimiento
{
    public int Id { get; set; }

    public int IdInventario { get; set; }

    public int IdSucursal { get; set; }

    public DateTime Fecha { get; set; }

    public string TipoMov { get; set; } = null!;

    public int IdMov { get; set; }

    public string Concepto { get; set; } = null!;

    public decimal Entrada { get; set; }

    public decimal Salida { get; set; }

    public int? IdUsuarioRegistra { get; set; }

    public DateTime? FechaRegistra { get; set; }

    public int? IdUsuarioModifica { get; set; }

    public DateTime? FechaModifica { get; set; }

    public virtual Inventario IdInventarioNavigation { get; set; } = null!;

    public virtual Sucursal IdSucursalNavigation { get; set; } = null!;

    public virtual User? IdUsuarioModificaNavigation { get; set; }

    public virtual User? IdUsuarioRegistraNavigation { get; set; }
}
