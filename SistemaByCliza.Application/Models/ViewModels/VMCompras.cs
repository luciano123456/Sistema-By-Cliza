// SistemaByCliza.Application/Models/ViewModels/VMCompra.cs
using System;
using System.Collections.Generic;

namespace SistemaByCliza.Application.Models.ViewModels
{
    public class VMCompra
    {
        public int Id { get; set; }
        public int IdProveedor { get; set; }
        public int? IdCuentaCorriente { get; set; }
        public DateTime Fecha { get; set; }
        public decimal Subtotal { get; set; }
        public decimal Descuentos { get; set; }
        public decimal TotalIva { get; set; }
        public decimal ImporteTotal { get; set; }
        public string? NotaInterna { get; set; }

        // presentacionales
        public string Proveedor { get; set; } = "";

        // detalles
        public List<VMCompraInsumo>? Insumos { get; set; }
        public List<VMCompraPago>? Pagos { get; set; }
    }

    public class VMCompraInsumo
    {
        public int Id { get; set; }
        public int IdInsumo { get; set; }               // <-- clave del insumo
        public string? Insumo { get; set; }             // texto para la grilla
        public decimal CostoUnitario { get; set; }
        public decimal PorcDescuento { get; set; }
        public decimal DescuentoUnit { get; set; }
        public decimal DescuentoTotal { get; set; }
        public decimal CostoUnitCdesc { get; set; }
        public decimal PorcIva { get; set; }
        public decimal IvaUnit { get; set; }
        public decimal IvaTotal { get; set; }
        public decimal CostoUnitFinal { get; set; }
        public decimal Cantidad { get; set; }
        public decimal Subtotal { get; set; }
    }

    public class VMCompraPago
    {
        public int Id { get; set; }
        public DateTime Fecha { get; set; }
        public int IdCuenta { get; set; }
        public string? Cuenta { get; set; }
        public string? Concepto { get; set; }
        public decimal Importe { get; set; }
        public string? NotaInterna { get; set; }
    }
}
