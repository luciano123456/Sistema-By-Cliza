using System;
using System.Collections.Generic;

namespace SistemaByCliza.Models;

public partial class ClientesCuentaCorriente
{
    public int Id { get; set; }

    public int IdSucursal { get; set; }

    public int IdCliente { get; set; }

    public DateTime Fecha { get; set; }

    public string TipoMov { get; set; } = null!;

    public int IdMov { get; set; }

    public string Concepto { get; set; } = null!;

    public decimal Debe { get; set; }

    public decimal Haber { get; set; }

    public virtual Cliente IdClienteNavigation { get; set; } = null!;

    public virtual Sucursal IdSucursalNavigation { get; set; } = null!;
}
