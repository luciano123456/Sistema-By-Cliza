using System;
using System.Collections.Generic;

namespace SistemaByCliza.Models;

public partial class Venta
{
    public int Id { get; set; }

    public int IdSucursal { get; set; }

    public int IdListaPrecio { get; set; }

    public int? IdEstado { get; set; }

    public int IdCliente { get; set; }

    public int? IdCuentaCorriente { get; set; }

    public DateTime Fecha { get; set; }

    public decimal Subtotal { get; set; }

    public decimal Descuentos { get; set; }

    public decimal TotalIva { get; set; }

    public decimal ImporteTotal { get; set; }

    public string? NotaInterna { get; set; }
    public string? Estado { get; set; }

    public string? NotaCliente { get; set; }

    public int? IdUsuarioRegistra { get; set; }

    public DateTime? FechaRegistra { get; set; }

    public int? IdUsuarioModifica { get; set; }

    public DateTime? FechaModifica { get; set; }

    public virtual Cliente IdClienteNavigation { get; set; } = null!;

    public virtual ListasPrecio IdListaPrecioNavigation { get; set; } = null!;

    public virtual Sucursal IdSucursalNavigation { get; set; } = null!;

    public virtual User? IdUsuarioModificaNavigation { get; set; }

    public virtual User? IdUsuarioRegistraNavigation { get; set; }

    public virtual ICollection<VentasProducto> VentasProductos { get; set; } = new List<VentasProducto>();
}
