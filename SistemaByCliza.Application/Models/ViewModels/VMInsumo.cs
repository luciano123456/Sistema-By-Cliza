using SistemaByCliza.Models;

// /Application/Models/ViewModels/VMInsumo.cs
namespace SistemaByCliza.Application.Models.ViewModels
{
    public class VMInsumo
    {
        public int Id { get; set; }
        public string Codigo { get; set; } = string.Empty;
        public string Descripcion { get; set; } = string.Empty;
        public int IdCategoria { get; set; }
        public int IdProveedor { get; set; }
        public decimal CostoUnitario { get; set; }
    }
}
