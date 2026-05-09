// SistemaByCliza.Application/Models/ViewModels/VMVentas.cs
using System;
using System.Collections.Generic;

namespace SistemaByCliza.Application.Models.ViewModels
{
    public class VMVenta
    {
        public int Id { get; set; }
        public int IdSucursal { get; set; }
        public int IdVendedor { get; set; }
        public int IdListaPrecio { get; set; }
        public int IdCliente { get; set; }
        public int? IdCuentaCorriente { get; set; }

        public DateTime Fecha { get; set; }
        public decimal Subtotal { get; set; }
        public decimal Descuentos { get; set; }
        public decimal TotalIva { get; set; }
        public decimal ImporteTotal { get; set; }

        public string? NotaInterna { get; set; }
        public string? NotaCliente { get; set; }
        public string? Estado { get; set; }

        public string Cliente { get; set; } = "";
        public string Vendedor { get; set; } = "";
        public string Sucursal { get; set; } = "";

        public List<VMVentaProducto> Productos { get; set; } = new();
        public List<VMClienteCobro> Pagos { get; set; } = new(); // pagos aplicados a esta venta
    }

    public class VMVentaProducto
    {
        public int Id { get; set; }
        public int IdProducto { get; set; }
        public string Producto { get; set; } = "";

        public decimal PrecioUnitario { get; set; }
        public decimal PorcDescuento { get; set; }
        public decimal DescuentoUnit { get; set; }
        public decimal DescuentoTotal { get; set; }
        public decimal PrecioUnitCdesc { get; set; }

        public decimal PorcIva { get; set; }
        public decimal IvaUnit { get; set; }
        public decimal IvaTotal { get; set; }
        public decimal PrecioUnitFinal { get; set; }

        public decimal Cantidad { get; set; }
        public decimal Subtotal { get; set; }

        public List<VMVentaProductoVariante> Variantes { get; set; } = new();
    }

    public class VMVentaProductoVariante
    {
        public int Id { get; set; }
        public int IdProducto { get; set; }
        public int IdProductoVariante { get; set; }
        public string Variante { get; set; } = ""; // (Color/Talle)
        public string Talle { get; set; } = ""; // (Color/Talle)
        public string Color { get; set; } = ""; // (Color/Talle)
        public decimal Cantidad { get; set; }
    }

    public class VMClienteCobro
    {
        public int Id { get; set; }
        public int IdCuenta { get; set; }
        public string Cuenta { get; set; } = "";
        public DateTime Fecha { get; set; }
        public decimal Importe { get; set; }
        public string? NotaInterna { get; set; }
    }
}
