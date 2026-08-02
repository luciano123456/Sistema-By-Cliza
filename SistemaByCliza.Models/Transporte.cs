using System.Collections.Generic;

namespace SistemaByCliza.Models;

public partial class Transporte
{
    public int Id { get; set; }

    public string Nombre { get; set; } = null!;

    public string? Direccion { get; set; }

    public string? Telefono { get; set; }

    public string? Email { get; set; }

    public string? Notas { get; set; }

    public bool Activo { get; set; } = true;

    public virtual ICollection<Cliente> Clientes { get; set; } = new List<Cliente>();

    public virtual ICollection<Venta> Ventas { get; set; } = new List<Venta>();
}
