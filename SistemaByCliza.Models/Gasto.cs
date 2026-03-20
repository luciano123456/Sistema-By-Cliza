using System;
using System.Collections.Generic;

namespace SistemaByCliza.Models;

public partial class Gasto
{
    public int Id { get; set; }

    public int IdSucursal { get; set; }

    public int IdCategoria { get; set; }

    public int? IdCaja { get; set; }

    public DateTime Fecha { get; set; }

    public string Concepto { get; set; } = null!;

    public int IdCuenta { get; set; }

    public decimal Importe { get; set; }

    public virtual GastosCategoria IdCategoriaNavigation { get; set; } = null!;

    public virtual Cuenta IdCuentaNavigation { get; set; } = null!;

    public virtual Sucursal IdSucursalNavigation { get; set; } = null!;
}
