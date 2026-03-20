using SistemaByCliza.Models;

namespace SistemaByCliza.Application.Models.ViewModels
{
    public class VMProducto
    {
        public int Id { get; set; }
        public string Descripcion { get; set; } = "";
        public int IdCategoria { get; set; }
        public decimal PrecioUnitario { get; set; }

        // ÚNICO origen de verdad:
        public List<int> IdTalles { get; set; } = new();   // IDs de ProductosCategoriasTalle
        public List<int> IdColores { get; set; } = new();  // IDs de Color

        public bool GenerarVariantes { get; set; } = true;

        public virtual ProductosCategoria IdCategoriaNavigation { get; set; } = null!;

        public virtual ICollection<InventarioTransfSucursalesProducto> InventarioTransfSucursalesProductos { get; set; } = new List<InventarioTransfSucursalesProducto>();

        public virtual ICollection<InventarioTransfSucursalesProductosVariante> InventarioTransfSucursalesProductosVariantes { get; set; } = new List<InventarioTransfSucursalesProductosVariante>();

        public virtual ICollection<Inventario> Inventarios { get; set; } = new List<Inventario>();

        public virtual ICollection<ProductosColor> ProductosColores { get; set; } = new List<ProductosColor>();

        public virtual ICollection<ProductosPrecio> ProductosPrecios { get; set; } = new List<ProductosPrecio>();

        public virtual ICollection<ProductosTalle> ProductosTalles { get; set; } = new List<ProductosTalle>();

        public virtual ICollection<ProductosVariante> ProductosVariantes { get; set; } = new List<ProductosVariante>();

        public virtual ICollection<VentasProducto> VentasProductos { get; set; } = new List<VentasProducto>();

        public virtual ICollection<VentasProductosVariante> VentasProductosVariantes { get; set; } = new List<VentasProductosVariante>();

        public List<VMProductoPrecio> PreciosPorLista { get; set; } = new();
    }
}

public sealed class VMProductoPrecio
{
    public int IdListaPrecio { get; set; }
    public decimal? PrecioUnitario { get; set; }
}