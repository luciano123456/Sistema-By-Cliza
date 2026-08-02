namespace SistemaByCliza.Application.Configuration
{
    public class RemitoEmpresaSettings
    {
        public const string SectionName = "RemitoEmpresa";

        public string RazonSocial { get; set; } = "";
        public string RazonSocialLinea2 { get; set; } = "";
        public string DomicilioLinea1 { get; set; } = "";
        public string DomicilioLinea2 { get; set; } = "";
        public string DomicilioLinea3 { get; set; } = "";
        public string Domicilio { get; set; } = "";
        public string Cuit { get; set; } = "";
        public string CondicionIva { get; set; } = "";
        public string Telefonos { get; set; } = "";
        public string TelefonoLocal { get; set; } = "";
    }
}
