using System;
using System.Collections.Generic;

namespace SistemaByCliza.Models;

public partial class Taller
{
    public int Id { get; set; }

    public string Nombre { get; set; } = null!;

    public int DiasEntrega { get; set; }

    public virtual ICollection<OrdenesCorteEtapa> OrdenesCorteEtapas { get; set; } = new List<OrdenesCorteEtapa>();

    public virtual ICollection<TalleresCuentaCorriente> TalleresCuentaCorrientes { get; set; } = new List<TalleresCuentaCorriente>();

    public virtual ICollection<TalleresPago> TalleresPagos { get; set; } = new List<TalleresPago>();
}
