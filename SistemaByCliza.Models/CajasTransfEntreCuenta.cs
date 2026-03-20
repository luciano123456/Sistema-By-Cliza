using System;
using System.Collections.Generic;

namespace SistemaByCliza.Models;

public partial class CajasTransfEntreCuenta
{
    public int Id { get; set; }

    public int? IdCajaOrigen { get; set; }

    public int? IdCajaDestino { get; set; }

    public int IdCuentaOrigen { get; set; }

    public decimal ImporteOrigen { get; set; }

    public int IdCuentaDestino { get; set; }

    public decimal ImporteDestino { get; set; }

    public string? NotaInterna { get; set; }

    public virtual Cuenta IdCuentaDestinoNavigation { get; set; } = null!;

    public virtual Cuenta IdCuentaOrigenNavigation { get; set; } = null!;
}
