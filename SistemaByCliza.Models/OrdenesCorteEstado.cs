using System;
using System.Collections.Generic;

namespace SistemaByCliza.Models;

public partial class OrdenesCorteEstado
{
    public int Id { get; set; }

    public string Nombre { get; set; } = null!;

    public virtual ICollection<OrdenesCorte> OrdenesCortes { get; set; } = new List<OrdenesCorte>();
}
