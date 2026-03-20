using System;
using System.Collections.Generic;

namespace SistemaByCliza.Models;

public partial class User
{
    public int Id { get; set; }

    public string? Usuario { get; set; }

    public string? Nombre { get; set; }

    public string? Apellido { get; set; }

    public string? Dni { get; set; }

    public string Telefono { get; set; } = null!;

    public string Direccion { get; set; } = null!;

    public int IdRol { get; set; }

    public string Contrasena { get; set; } = null!;

    public int IdEstado { get; set; }

    public int? ModoVendedor { get; set; }

    public string? Correo { get; set; }

    public string? CodigoRecuperacion { get; set; }

    public virtual EstadosUsuario IdEstadoNavigation { get; set; } = null!;

    public virtual Rol IdRolNavigation { get; set; } = null!;

    public virtual ICollection<UsuariosSucursal> UsuariosSucursales { get; set; } = new List<UsuariosSucursal>();
}
