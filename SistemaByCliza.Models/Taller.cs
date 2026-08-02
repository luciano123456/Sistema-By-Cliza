using System;
using System.Collections.Generic;

namespace SistemaByCliza.Models;

public partial class Taller
{
    public int Id { get; set; }

    public string Nombre { get; set; } = null!;

    public string? Direccion { get; set; }

    public string? Telefono { get; set; }

    public int DiasEntrega { get; set; }

    public int? IdUsuarioRegistra { get; set; }

    public DateTime? FechaRegistra { get; set; }

    public int? IdUsuarioModifica { get; set; }

    public DateTime? FechaModifica { get; set; }

    public virtual User? IdUsuarioModificaNavigation { get; set; }

    public virtual User? IdUsuarioRegistraNavigation { get; set; }

    public virtual ICollection<OrdenesCorteEtapa> OrdenesCorteEtapas { get; set; } = new List<OrdenesCorteEtapa>();

    public virtual ICollection<TalleresCuentaCorriente> TalleresCuentaCorrientes { get; set; } = new List<TalleresCuentaCorriente>();

    public virtual ICollection<TalleresPago> TalleresPagos { get; set; } = new List<TalleresPago>();
}
