using System;
using System.Collections.Generic;

namespace SistemaByCliza.Models;

public partial class Color
{
    public int Id { get; set; }

    public string Nombre { get; set; } = null!;

    public virtual ICollection<ProductosColor> ProductosColores { get; set; } = new List<ProductosColor>();
}
