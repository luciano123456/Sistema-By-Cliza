using System;
using System.Collections.Generic;

namespace SistemaByCliza.Application.Models.ViewModels
{
    public class VMOrdenCorte
    {
        public int Id { get; set; }
        public int IdPersonal { get; set; }
        public int IdEstado { get; set; }

        public DateTime FechaInicio { get; set; }
        public DateTime? FechaFinalizacion { get; set; }

        public decimal CantidadProducir { get; set; }
        public decimal? CantidadProducidas { get; set; }
        public decimal? DiferenciaCorte { get; set; }
        public decimal? CantidadFinalReal { get; set; }
        public decimal? DiferenciaFinalReal { get; set; }
        public decimal? LargoTizada { get; set; }
        public decimal? AnchoTizada { get; set; }
        public decimal? CantidadCapas { get; set; }
        public DateTime? HoraInicioCorte { get; set; }
        public DateTime? HoraFinCorte { get; set; }

        public string Estado { get; set; } = "";

        public List<VMOrdenCorteProducto> Productos { get; set; } = new();
        public List<VMOrdenCorteInsumo> Insumos { get; set; } = new();
        public List<VMOrdenCorteEtapa> Etapas { get; set; } = new();
    }

    public class VMOrdenCorteProducto
    {
        public int Id { get; set; }
        public int IdProducto { get; set; }
        public int Cantidad { get; set; }
        public string Producto { get; set; } = "";
        public List<VMOrdenCorteProductoVariante> Variantes { get; set; } = new();
    }

    public class VMOrdenCorteProductoVariante
    {
        public int Id { get; set; }
        public int IdProducto { get; set; }
        public int IdProductoVariante { get; set; }
        public int Cantidad { get; set; }
        public string Color { get; set; } = "";
        public string Talle { get; set; } = "";
    }

    public class VMOrdenCorteInsumo
    {
        public int Id { get; set; }
        public int IdInsumo { get; set; }
        public int Cantidad { get; set; }
        public string Insumo { get; set; } = "";
    }

    public class VMOrdenCorteEtapa
    {
        public int Id { get; set; }
        public int IdTaller { get; set; }
        public DateTime FechaEntrada { get; set; }
        public DateTime FechaSalidaAproximada { get; set; }
        public DateTime? FechaSalidaReal { get; set; }
        public int? DiasReales { get; set; }
        public decimal CantidadProducir { get; set; }
        public decimal CantidadProducidas { get; set; }
        public decimal Diferencias { get; set; }
        public decimal? ImporteTotal { get; set; }
        public int IdEstado { get; set; }
        public string? NotaInterna { get; set; }
        public string? Estado { get; set; }

        // lectura opcional
        public string Taller { get; set; } = "";
        public string EstadoEtapa { get; set; } = "";
    }
}
