using System;
using System.Collections.Generic;

namespace SistemaByCliza.Models;

public partial class OrdenesCorteEtapasEstado
{
    public int Id { get; set; }

    public string Nombre { get; set; } = null!;

    public virtual ICollection<OrdenesCorteEtapa> OrdenesCorteEtapas { get; set; } = new List<OrdenesCorteEtapa>();
}
