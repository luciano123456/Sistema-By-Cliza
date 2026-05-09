using System;
using System.Collections.Generic;

namespace SistemaByCliza.Models;

public partial class UsuariosModulosGrupo
{
    public int Id { get; set; }

    public string? Nombre { get; set; }

    public int? Activo { get; set; }

    public virtual ICollection<UsuariosModulo> UsuariosModulos { get; set; } = new List<UsuariosModulo>();
}
