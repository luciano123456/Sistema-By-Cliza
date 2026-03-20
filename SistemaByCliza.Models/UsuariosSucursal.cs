using System;
using System.Collections.Generic;

namespace SistemaByCliza.Models;

public partial class UsuariosSucursal
{
    public int Id { get; set; }

    public int IdUsuario { get; set; }

    public int IdSucursal { get; set; }

    public virtual Sucursal IdSucursalNavigation { get; set; } = null!;

    public virtual User IdUsuarioNavigation { get; set; } = null!;
}
