// SistemaByCliza.Application/Models/ViewModels/VMSueldos.cs
using System;

namespace SistemaByCliza.Application.Models.ViewModels
{
    public class VMPersonalSueldo
    {
        public int Id { get; set; }
        public int IdPersonal { get; set; }
        public string Personal { get; set; } = "";
        public DateTime Fecha { get; set; }
        public string Concepto { get; set; } = null!;
        public decimal Importe { get; set; }
        public decimal ImporteAbonado { get; set; }
        public decimal Saldo { get; set; }
        public string? NotaInterna { get; set; }

        // 👇 Necesario para recibir y devolver también la lista de pagos
        public List<VMPersonalSueldosPago> Pagos { get; set; } = new();
    }

    public class VMPersonalSueldosPago
    {
        public int Id { get; set; }
        public int IdSueldo { get; set; }   // puede venir vacío en insertar
        public DateTime Fecha { get; set; }
        public int IdCuenta { get; set; }
        public string Cuenta { get; set; } = "";
        public decimal Importe { get; set; }
        public string? NotaInterna { get; set; }
    }
}