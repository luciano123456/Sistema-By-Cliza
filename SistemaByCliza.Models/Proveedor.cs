using System;
using System.Collections.Generic;

namespace SistemaByCliza.Models;

public partial class Proveedor
{
    public int Id { get; set; }

    public string? Nombre { get; set; }

    public int? IdUsuarioRegistra { get; set; }

    public DateTime? FechaRegistra { get; set; }

    public int? IdUsuarioModifica { get; set; }

    public DateTime? FechaModifica { get; set; }

    public virtual ICollection<Compra> Compras { get; set; } = new List<Compra>();

    public virtual User? IdUsuarioModificaNavigation { get; set; }

    public virtual User? IdUsuarioRegistraNavigation { get; set; }

    public virtual ICollection<Insumo> Insumos { get; set; } = new List<Insumo>();

    public virtual ICollection<ProveedoresCuentaCorriente> ProveedoresCuentaCorrientes { get; set; } = new List<ProveedoresCuentaCorriente>();
}
