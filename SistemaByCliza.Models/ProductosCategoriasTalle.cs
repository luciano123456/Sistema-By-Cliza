using System;
using System.Collections.Generic;

namespace SistemaByCliza.Models;

public partial class ProductosCategoriasTalle
{
    public int Id { get; set; }

    public int IdCategoria { get; set; }

    public string Nombre { get; set; } = null!;

    public virtual ProductosCategoria IdCategoriaNavigation { get; set; } = null!;

    public virtual ICollection<ProductosTalle> ProductosTalles { get; set; } = new List<ProductosTalle>();
}
