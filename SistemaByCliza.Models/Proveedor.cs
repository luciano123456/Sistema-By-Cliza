using System;
using System.Collections.Generic;

namespace SistemaByCliza.Models;

public partial class Proveedor
{
    public int Id { get; set; }

    public string? Nombre { get; set; }

    public virtual ICollection<Compra> Compras { get; set; } = new List<Compra>();

    public virtual ICollection<Insumo> Insumos { get; set; } = new List<Insumo>();

    public virtual ICollection<ProveedoresCuentaCorriente> ProveedoresCuentaCorrientes { get; set; } = new List<ProveedoresCuentaCorriente>();
}
