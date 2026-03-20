using System;
using System.Collections.Generic;

namespace SistemaByCliza.Models;

public partial class ListasPrecio
{
    public int Id { get; set; }

    public string? Nombre { get; set; }

    public virtual ICollection<Cliente> Clientes { get; set; } = new List<Cliente>();

    public virtual ICollection<ProductosPrecio> ProductosPrecios { get; set; } = new List<ProductosPrecio>();

    public virtual ICollection<Venta> Venta { get; set; } = new List<Venta>();
}
