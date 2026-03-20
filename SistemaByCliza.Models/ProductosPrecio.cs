using System;
using System.Collections.Generic;

namespace SistemaByCliza.Models;

public partial class ProductosPrecio
{
    public int Id { get; set; }

    public int? IdListaPrecio { get; set; }

    public int? IdProducto { get; set; }

    public decimal? PrecioUnitario { get; set; }

    public virtual ListasPrecio? IdListaPrecioNavigation { get; set; }

    public virtual Producto? IdProductoNavigation { get; set; }
}
