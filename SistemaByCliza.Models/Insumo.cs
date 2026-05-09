using System;
using System.Collections.Generic;

namespace SistemaByCliza.Models;

public partial class Insumo
{
    public int Id { get; set; }

    public string Codigo { get; set; } = null!;

    public string Descripcion { get; set; } = null!;

    public int IdCategoria { get; set; }

    public int IdProveedor { get; set; }

    public decimal CostoUnitario { get; set; }

    public int? IdUsuarioRegistra { get; set; }

    public DateTime? FechaRegistra { get; set; }

    public int? IdUsuarioModifica { get; set; }

    public DateTime? FechaModifica { get; set; }

    public virtual InsumosCategoria IdCategoriaNavigation { get; set; } = null!;

    public virtual Proveedor IdProveedorNavigation { get; set; } = null!;

    public virtual User? IdUsuarioModificaNavigation { get; set; }

    public virtual User? IdUsuarioRegistraNavigation { get; set; }

    public virtual ICollection<OrdenesCorteInsumo> OrdenesCorteInsumos { get; set; } = new List<OrdenesCorteInsumo>();
}
