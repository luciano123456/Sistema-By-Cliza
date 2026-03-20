using System;
using System.Collections.Generic;

namespace SistemaByCliza.Models;

public partial class ProductosVariante
{
    public int Id { get; set; }

    public int IdProducto { get; set; }

    public int IdTalle { get; set; }

    public int IdColor { get; set; }

    public virtual ProductosColor IdColorNavigation { get; set; } = null!;

    public virtual Producto IdProductoNavigation { get; set; } = null!;

    public virtual ProductosTalle IdTalleNavigation { get; set; } = null!;

    public virtual ICollection<InventarioIngresosOrdenesCorteProductosVariante> InventarioIngresosOrdenesCorteProductosVariantes { get; set; } = new List<InventarioIngresosOrdenesCorteProductosVariante>();

    public virtual ICollection<InventarioTransfSucursalesProductosVariante> InventarioTransfSucursalesProductosVariantes { get; set; } = new List<InventarioTransfSucursalesProductosVariante>();

    public virtual ICollection<Inventario> Inventarios { get; set; } = new List<Inventario>();

    public virtual ICollection<OrdenCorteProductosVariante> OrdenCorteProductosVariantes { get; set; } = new List<OrdenCorteProductosVariante>();

    public virtual ICollection<VentasProductosVariante> VentasProductosVariantes { get; set; } = new List<VentasProductosVariante>();
}
