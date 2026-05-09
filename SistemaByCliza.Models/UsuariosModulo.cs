using System;
using System.Collections.Generic;

namespace SistemaByCliza.Models;

public partial class UsuariosModulo
{
    public int Id { get; set; }

    public string Nombre { get; set; } = null!;

    public string Codigo { get; set; } = null!;

    public int? IdGrupo { get; set; }

    public int Orden { get; set; }

    public bool? Activo { get; set; }

    public virtual UsuariosModulosGrupo? IdGrupoNavigation { get; set; }

    public virtual ICollection<UsuariosPermiso> UsuariosPermisos { get; set; } = new List<UsuariosPermiso>();

    public virtual ICollection<UsuariosPermisosUsuario> UsuariosPermisosUsuarios { get; set; } = new List<UsuariosPermisosUsuario>();

    public virtual ICollection<UsuariosRolesPermiso> UsuariosRolesPermisos { get; set; } = new List<UsuariosRolesPermiso>();
}
