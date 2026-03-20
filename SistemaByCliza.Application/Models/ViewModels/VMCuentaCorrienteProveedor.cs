// SistemaByCliza.Application/Models/ViewModels/VMCuentasCorrientesProveedor.cs
namespace SistemaByCliza.Application.Models.ViewModels
{
    public class VMCuentasCorrientesProveedor
    {
        public int Id { get; set; }
        public string Nombre { get; set; } = "";
        public decimal? Saldo { get; set; }
    }
}

// SistemaByCliza.Application/Models/ViewModels/VMCuentasCorrientesPagoProveedorUpsert.cs
namespace SistemaByCliza.Application.Models.ViewModels
{
    public class VMCuentasCorrientesPagoProveedorUpsert
    {
        public int Id { get; set; }
        public int IdProveedor { get; set; }
        public DateTime Fecha { get; set; }
        public string? Concepto { get; set; }
        public decimal Importe { get; set; }
        public int? IdCuentaCaja { get; set; } // para impacto en Caja (EGRESO)
    }
}
