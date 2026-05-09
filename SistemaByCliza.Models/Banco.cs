using System;
using System.Collections.Generic;

namespace SistemaByCliza.Models;

public partial class Banco
{
    public int Id { get; set; }

    public string Nombre { get; set; } = null!;

    public virtual ICollection<Personal> Personal { get; set; } = new List<Personal>();
}
