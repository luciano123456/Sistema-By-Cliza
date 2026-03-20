using System;
using System.Collections.Generic;

namespace SistemaByCliza.Models;

public partial class PersonalPuesto
{
    public int Id { get; set; }

    public string Nombre { get; set; } = null!;

    public virtual ICollection<Personal> Personals { get; set; } = new List<Personal>();
}
