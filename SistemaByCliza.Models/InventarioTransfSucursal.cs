using System;
using System.Collections.Generic;

namespace SistemaByCliza.Models;

public partial class InventarioTransfSucursal
{
    public int Id { get; set; }

    public int IdSucursalOrigen { get; set; }

    public int IdSucursalDestino { get; set; }

    public DateTime Fecha { get; set; }

    public string? Notas { get; set; }

    public int? IdUsuarioRegistra { get; set; }

    public DateTime? FechaRegistra { get; set; }

    public int? IdUsuarioModifica { get; set; }

    public DateTime? FechaModifica { get; set; }

    public virtual Sucursal IdSucursalDestinoNavigation { get; set; } = null!;

    public virtual Sucursal IdSucursalOrigenNavigation { get; set; } = null!;

    public virtual User? IdUsuarioModificaNavigation { get; set; }

    public virtual User? IdUsuarioRegistraNavigation { get; set; }

    public virtual ICollection<InventarioTransfSucursalesProducto> InventarioTransfSucursalesProductos { get; set; } = new List<InventarioTransfSucursalesProducto>();
}
