namespace SistemaByCliza.Application.Models.ViewModels
{
    public class VMTransporte
    {
        public int Id { get; set; }
        public string Nombre { get; set; } = string.Empty;
        public string? Direccion { get; set; }
        public string? Telefono { get; set; }
        public string? Email { get; set; }
        public string? Notas { get; set; }
        public bool Activo { get; set; } = true;
    }
}
