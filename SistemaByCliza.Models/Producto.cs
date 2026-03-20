using System;
using System.Collections.Generic;

namespace SistemaByCliza.Models;

public partial class Producto
{
    public int Id { get; set; }

    public string Descripcion { get; set; } = null!;

    public int IdCategoria { get; set; }

    public decimal PrecioUnitario { get; set; }

    public virtual ProductosCategoria IdCategoriaNavigation { get; set; } = null!;

    public virtual ICollection<InventarioIngresosOrdenesCorteProductosVariante> InventarioIngresosOrdenesCorteProductosVariantes { get; set; } = new List<InventarioIngresosOrdenesCorteProductosVariante>();

    public virtual ICollection<InventarioTransfSucursalesProducto> InventarioTransfSucursalesProductos { get; set; } = new List<InventarioTransfSucursalesProducto>();

    public virtual ICollection<InventarioTransfSucursalesProductosVariante> InventarioTransfSucursalesProductosVariantes { get; set; } = new List<InventarioTransfSucursalesProductosVariante>();

    public virtual ICollection<Inventario> Inventarios { get; set; } = new List<Inventario>();

    public virtual ICollection<OrdenCorteProductosVariante> OrdenCorteProductosVariantes { get; set; } = new List<OrdenCorteProductosVariante>();

    public virtual ICollection<ProductosColor> ProductosColores { get; set; } = new List<ProductosColor>();

    public virtual ICollection<ProductosPrecio> ProductosPrecios { get; set; } = new List<ProductosPrecio>();

    public virtual ICollection<ProductosTalle> ProductosTalles { get; set; } = new List<ProductosTalle>();

    public virtual ICollection<ProductosVariante> ProductosVariantes { get; set; } = new List<ProductosVariante>();

    public virtual ICollection<VentasProducto> VentasProductos { get; set; } = new List<VentasProducto>();

    public virtual ICollection<VentasProductosVariante> VentasProductosVariantes { get; set; } = new List<VentasProductosVariante>();
}
