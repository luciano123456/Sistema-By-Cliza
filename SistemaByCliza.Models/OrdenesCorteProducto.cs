using System;
using System.Collections.Generic;

namespace SistemaByCliza.Models;

public partial class OrdenesCorteProducto
{
    public int Id { get; set; }

    public int IdOrdenCorte { get; set; }

    public int IdProducto { get; set; }

    public int Cantidad { get; set; }

    public int? IdUsuarioRegistra { get; set; }

    public DateTime? FechaRegistra { get; set; }

    public int? IdUsuarioModifica { get; set; }

    public DateTime? FechaModifica { get; set; }

    public virtual OrdenesCorte IdOrdenCorteNavigation { get; set; } = null!;

    public virtual User? IdUsuarioModificaNavigation { get; set; }

    public virtual User? IdUsuarioRegistraNavigation { get; set; }

    public virtual ICollection<OrdenCorteProductosVariante> OrdenCorteProductosVariantes { get; set; } = new List<OrdenCorteProductosVariante>();
}
