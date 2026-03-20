using System;
using System.Collections.Generic;

namespace SistemaByCliza.Models;

public partial class ProductosCategoria
{
    public int Id { get; set; }

    public string? Nombre { get; set; }

    public virtual ICollection<Producto> Productos { get; set; } = new List<Producto>();

    public virtual ICollection<ProductosCategoriasTalle> ProductosCategoriasTalles { get; set; } = new List<ProductosCategoriasTalle>();
}
