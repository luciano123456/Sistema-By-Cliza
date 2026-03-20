using System;
using System.Collections.Generic;

namespace SistemaByCliza.Models;

public partial class ProductosTalle
{
    public int Id { get; set; }

    public int IdProducto { get; set; }

    public int IdTalle { get; set; }

    public virtual Producto IdProductoNavigation { get; set; } = null!;

    public virtual ProductosCategoriasTalle IdTalleNavigation { get; set; } = null!;

    public virtual ICollection<ProductosVariante> ProductosVariantes { get; set; } = new List<ProductosVariante>();
}
