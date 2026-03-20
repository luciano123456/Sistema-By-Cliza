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

    public virtual Inventario IdInventarioNavigation { get; set; } = null!;

    public virtual Sucursal IdSucursalNavigation { get; set; } = null!;
}
