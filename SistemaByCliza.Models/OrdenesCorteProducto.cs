using System;
using System.Collections.Generic;

namespace SistemaByCliza.Models;

public partial class OrdenesCorteProducto
{
    public int Id { get; set; }

    public int IdOrdenCorte { get; set; }

    public int IdProducto { get; set; }

    public int Cantidad { get; set; }

    public virtual OrdenesCorte IdOrdenCorteNavigation { get; set; } = null!;

    public virtual ICollection<OrdenCorteProductosVariante> OrdenCorteProductosVariantes { get; set; } = new List<OrdenCorteProductosVariante>();
}
