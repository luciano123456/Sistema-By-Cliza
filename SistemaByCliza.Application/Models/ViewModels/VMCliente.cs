using SistemaByCliza.Models;

namespace SistemaByCliza.Application.Models.ViewModels
{
    public class VMCliente
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

        public string? CodigoPostal { get; set; }

        public int IdListaPrecio { get; set; }

        public int? IdTransporte { get; set; }

        public string? DireccionEntrega { get; set; }

        public string? Referencias { get; set; }

        public virtual ICollection<ClientesCobro> ClientesCobros { get; set; } = new List<ClientesCobro>();

        public virtual ICollection<ClientesCuentaCorriente> ClientesCuentaCorrientes { get; set; } = new List<ClientesCuentaCorriente>();

        public virtual CondicionesIva? IdCondicionIvaNavigation { get; set; }

        public virtual ListasPrecio IdListaPrecioNavigation { get; set; } = null!;

        public virtual Provincia? IdProvinciaNavigation { get; set; }

        public virtual ICollection<Venta> Venta { get; set; } = new List<Venta>();

        // Opcionales de navegación (solo lectura en lista)
        public string? CondicionIva { get; set; }
        public string? Provincia { get; set; }
        public string? ListaPrecio { get; set; }
        public string? TransporteNombre { get; set; }
        public string? TransporteDireccion { get; set; }
    }
}
