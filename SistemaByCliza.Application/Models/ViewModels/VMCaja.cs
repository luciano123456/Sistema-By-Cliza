using SistemaByCliza.Models;

namespace SistemaByCliza.Application.Models.ViewModels
{
    public class VMCaja
    {
        public int Id { get; set; }
        public int IdSucursal { get; set; }
        public int IdCuenta { get; set; }
        public DateTime Fecha { get; set; }
        public string TipoMov { get; set; } = ""; // "Ingreso" o "Egreso"
        public int? IdMov { get; set; }
        public string? Concepto { get; set; }

        // Persistidos
        public decimal Ingreso { get; set; }
        public decimal Egreso { get; set; }

        // 👇 Nuevo: lo usa el front. No se persiste directo.
        public decimal? Importe { get; set; }

        // Solo lectura (para la grilla / modal)
        public string? Cuenta { get; set; }
        public string? Sucursal { get; set; }
        public bool EsTransferencia { get; set; }
        public bool PuedeEliminar { get; set; }

        public decimal SaldoAnterior { get; set; }
    }
}
