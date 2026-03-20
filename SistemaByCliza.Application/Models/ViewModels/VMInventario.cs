// File: Application/Models/ViewModels/InventarioVMs.cs
using System;
using System.Collections.Generic;

namespace SistemaByCliza.Application.Models.ViewModels
{
    // ===== Existencias =====
    public class VMInventarioExistencia
    {
        public int IdSucursal { get; set; }
        public string Sucursal { get; set; } = "";
        public int IdProducto { get; set; }
        public string Producto { get; set; } = "";
        public int? IdProductoVariante { get; set; }   // null cuando no aplica
        public string Variante { get; set; } = "";     // "Color / Talle"
        public decimal Cantidad { get; set; }
    }

    // ===== Movimientos =====
    public class VMInventarioMov
    {
        public int Id { get; set; }
        public DateTime Fecha { get; set; }
        public string TipoMov { get; set; } = "";   // AJUSTE / TRANSFERENCIA / etc.
        public int? IdMov { get; set; }             // Id de la entidad de negocio (transf, etc.)
        public string Concepto { get; set; } = "";
        public decimal Entrada { get; set; }
        public decimal Salida { get; set; }
        public int IdSucursal { get; set; }
        public string Sucursal { get; set; } = "";
        public string Producto { get; set; } = "";
        public string Talle { get; set; } = "";
        public string Color { get; set; } = "";
    }

    public class VMInventarioMovList
    {
        public decimal StockAnterior { get; set; }
        public List<VMInventarioMov> Movimientos { get; set; } = new();
    }

    // ===== Ajuste manual =====
    public class VMAjusteInventario
    {
        public int IdSucursal { get; set; }
        public int IdProducto { get; set; }
        public int? IdProductoVariante { get; set; }
        public DateTime Fecha { get; set; }
        public string Tipo { get; set; } = "AJUSTE"; // etiqueta del tipo de movimiento
        public decimal Cantidad { get; set; }        // +entrada / -salida
        public string? Concepto { get; set; }
    }

    // ===== Variantes simples (para combos) =====
    public class VMVarianteSimple
    {
        public int Id { get; set; }
        public string Nombre { get; set; } = "";     // "Color / Talle"
    }

    // ===== Transferencias entre Sucursales =====
    public class VMInvTransferencia
    {
        public int Id { get; set; }                  // 0 si es nueva
        public int IdSucursalOrigen { get; set; }
        public int IdSucursalDestino { get; set; }
        public string Origen { get; set; } = "";
        public string Destino { get; set; } = "";
        public DateTime Fecha { get; set; }
        public string? Notas { get; set; }
        public List<VMInvTransfProducto> Productos { get; set; } = new();
    }

    public class VMInvTransfProducto
    {
        public int Id { get; set; }                  // 0 si es nuevo
        public int IdProducto { get; set; }
        public string Producto { get; set; } = "";
        public List<VMInvTransfVariante> Variantes { get; set; } = new();
    }

    public class VMInvTransfVariante
    {
        public int Id { get; set; }                  // 0 si es nueva
        public int IdProducto { get; set; }
        public int IdProductoVariante { get; set; }
        public string Variante { get; set; } = "";   // "Color / Talle"
        public decimal Cantidad { get; set; }
    }

    // Ajuste/Movimiento simple que pide el front (con variantes opcionales)
    public class VMAjusteInventarioFront
    {
        public DateTime Fecha { get; set; }
        public int IdSucursal { get; set; }
        public string Tipo { get; set; } = "";         // ENTRADA | SALIDA | AJUSTE
        public int IdProducto { get; set; }
        public decimal? Cantidad { get; set; }         // opcional si viene Variantes
        public string? Nota { get; set; }
        public List<VMAjusteVarianteFront> Variantes { get; set; } = new();
    }
    public class VMAjusteVarianteFront
    {
        public int IdProductoVariante { get; set; }
        public decimal Cantidad { get; set; }
    }

    // Transferencia rápida (un solo producto con variantes)
    public class VMTransferFront
    {
        public DateTime Fecha { get; set; }
        public int IdSucursalOrigen { get; set; }
        public int IdSucursalDestino { get; set; }
        public int IdProducto { get; set; }
        public string? Nota { get; set; }
        public List<VMTransferVarFront> Variantes { get; set; } = new();
    }
    public class VMTransferVarFront
    {
        public int IdProductoVariante { get; set; }
        public decimal Cantidad { get; set; }
    }

    // Movimiento “plano” para DataTable
    public class VMInventarioMovPlano
    {
        public int Id { get; set; }
        public DateTime Fecha { get; set; }
        public string Tipo { get; set; } = "";
        public string Producto { get; set; } = "";
        public string Talle { get; set; } = "";
        public string Color { get; set; } = "";
        public string Concepto { get; set; } = "";
        public decimal Entrada { get; set; }
        public decimal Salida { get; set; }
        public decimal Saldo { get; set; }            // calculado
        public string Sucursal { get; set; } = "";
    }

    // VM para seleccionar OC y sus variantes
    public class VMOCVariante
    {
        public int IdProducto { get; set; }
        public int IdProductoVariante { get; set; }
        public string Variante { get; set; } = "";
    }

    public class VMIngresoDesdeOC
    {
        public int IdSucursal { get; set; }
        public int IdOrdenCorte { get; set; }
        public DateTime Fecha { get; set; }
        public string? Nota { get; set; }
        // Cantidades a ingresar por variante (el usuario las tipea)
        public List<VMOCLinea> Variantes { get; set; } = new();
    }
    public class VMOCLinea
    {
        public int IdProducto { get; set; }
        public int IdProductoVariante { get; set; }
        public int Cantidad { get; set; } // entero
    }


    public class VMIngresoDesdeOP
    {
        public int IdSucursal { get; set; }
        public int IdOrdenCompra { get; set; }
        public DateTime Fecha { get; set; }
        public string? Nota { get; set; }
        public List<VMIngresoLinea> Variantes { get; set; } = new();
    }

    public class VMIngresoLinea
    {
        public int IdProducto { get; set; }
        public int IdProductoVariante { get; set; }
        public int Cantidad { get; set; }
    }

}
