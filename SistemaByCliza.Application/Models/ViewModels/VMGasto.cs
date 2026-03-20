using SistemaByCliza.Models;

namespace SistemaByCliza.Application.Models.ViewModels
{
    public class VMGasto
    {
        public int Id { get; set; }

        public int IdSucursal { get; set; }

        public int IdCategoria { get; set; }


        public DateTime Fecha { get; set; }

        public string Concepto { get; set; } = null!;

        public int IdCuenta { get; set; }

        public decimal Importe { get; set; }
        public string Sucursal { get; set; }
        public string Cuenta { get; set; }
        public string Categoria { get; set; }


        public virtual GastosCategoria IdCategoriaNavigation { get; set; } = null!;

        public virtual Cuenta IdCuentaNavigation { get; set; } = null!;

        public virtual Sucursal IdSucursalNavigation { get; set; } = null!;
    }
}
