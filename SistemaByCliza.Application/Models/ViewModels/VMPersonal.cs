using SistemaByCliza.Models;

namespace SistemaByCliza.Application.Models.ViewModels
{
    public class VMPersonal
    {
        public int Id { get; set; }
        public string Nombre { get; set; } = null!;
        public string? Telefono { get; set; }
        public string? TelefonoAlternativo { get; set; }
        public string? Dni { get; set; }
        public string? Cuit { get; set; }
        public int? IdCondicionIva { get; set; }
        public string? Domicilio { get; set; }
        public int? IdProvincia { get; set; }
        public string? Localidad { get; set; }
        public string? Email { get; set; }

        // 🔹 Campos que faltaban
        public string? CodigoPostal { get; set; }
        public int? IdListaPrecio { get; set; }

        // 🔹 Campos "display" (no se guardan directo en tabla, pero útiles en API)
        public string? CondicionIva { get; set; }
        public string? Provincia { get; set; }
        public string? Banco { get; set; }
        public string? Puesto { get; set; }
        public string? Sucursal { get; set; }

        // Opcionales si querés mapear bancos / puestos / sueldos
        public int? IdBanco { get; set; }
        public string? BancoAlias { get; set; }
        public string? BancoCbu { get; set; }
        public int? IdPuesto { get; set; }
        public DateTime? FechaIngreso { get; set; }
        public DateTime? FechaRetiro { get; set; }
        public decimal? SueldoMensual { get; set; }
        public decimal? DiasLaborales { get; set; }
        public decimal? ValorDia { get; set; }
        public decimal? HsLaborales { get; set; }
        public decimal? ValorHora { get; set; }
        public int IdSucursal { get; set; }

        // 🔹 Navegaciones opcionales (si las usás en listas)
        public virtual CondicionesIva? IdCondicionIvaNavigation { get; set; }
        public virtual Banco? IdBancoNavigation { get; set; }
        public virtual Provincia? IdProvinciaNavigation { get; set; }
        public virtual PersonalPuesto? IdPuestoNavigation { get; set; }
        public virtual Sucursal IdSucursalNavigation { get; set; } = null!;
    }
}
