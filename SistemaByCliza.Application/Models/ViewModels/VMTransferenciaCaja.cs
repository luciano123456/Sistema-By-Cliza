// Application/Models/ViewModels/VMTransferenciaCaja.cs
namespace SistemaByCliza.Application.Models.ViewModels
{
    public class VMTransferenciaCaja
    {
        public int IdSucursal { get; set; }
        public DateTime Fecha { get; set; }

        public int IdCuentaOrigen { get; set; }
        public decimal ImporteOrigen { get; set; }

        public int IdCuentaDestino { get; set; }
        public decimal ImporteDestino { get; set; }  // igual al origen si misma moneda

        public string? NotaInterna { get; set; }

        public int Id { get; set; }                 // Id transferencia
        public int IdCajaOrigen { get; set; }
        public int IdCajaDestino { get; set; }

        public string CuentaOrigenNombre { get; set; }
        public string ConceptoOrigen { get; set; }

        public string CuentaDestinoNombre { get; set; }
        public string ConceptoDestino { get; set; }

    }

    public class VMTransferenciaHist
    {
        public int Id { get; set; }
        public DateTime Fecha { get; set; }
        public string CuentaOrigen { get; set; } = "";
        public decimal ImporteOrigen { get; set; }
        public string CuentaDestino { get; set; } = "";
        public decimal ImporteDestino { get; set; }
        public string? NotaInterna { get; set; }
    }
}
