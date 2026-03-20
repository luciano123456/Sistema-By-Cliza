// SistemaByCliza.Application.Models.ViewModels/VMCuentasCorrientes.cs
namespace SistemaByCliza.Application.Models.ViewModels
{
    public class VMCuentasCorrientesCliente
    {
        public int Id { get; set; }
        public string? Nombre { get; set; }
        public decimal? Saldo { get; set; }
    }

    public class VMCuentasCorrientesMovimiento
    {
        public int Id { get; set; }
        public int IdCliente { get; set; }
        public int? IdSucursal { get; set; }
        public string Sucursal { get; set; } = "";
        public DateTime Fecha { get; set; }

        // "VENTA" | "COBRO" (para UI)
        public string? TipoMov { get; set; }

        // En CC manual: IdMov = Id de Caja
        public int IdMov { get; set; }

        public string? Concepto { get; set; }
        public decimal Debe { get; set; }
        public decimal Haber { get; set; }

        // Para edición de cobro manual: cuenta de caja asociada (si la hay)
        public int? IdCuentaCaja { get; set; }

        // Se calcula en front con SaldoAnterior
        public decimal SaldoAcumulado { get; set; }
    }

    // Upsert para COBRO CC (manual)
    public class VMCuentasCorrientesCobroUpsert
    {
        public int Id { get; set; }                 // 0 = insertar
        public int IdCliente { get; set; }
        public int? IdSucursal { get; set; }
        public DateTime Fecha { get; set; }
        public decimal Importe { get; set; }
        public int? IdCuentaCaja { get; set; }
        public string? Concepto { get; set; }
    }
}
