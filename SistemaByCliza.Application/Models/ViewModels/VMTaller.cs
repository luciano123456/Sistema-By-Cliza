// /Application/Models/ViewModels/VMProveedor.cs
namespace SistemaByCliza.Application.Models.ViewModels
{
    public class VMTaller
    {
        public int Id { get; set; }
        public string Nombre { get; set; } = string.Empty;
        public string? Direccion { get; set; }
        public string? Telefono { get; set; }
        public int DiasEntrega { get; set; }
    }
}
