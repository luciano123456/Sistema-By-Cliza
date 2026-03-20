using System;
using System.Collections.Generic;

namespace SistemaByCliza.Models;

public partial class Personal
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

    public virtual Banco? IdBancoNavigation { get; set; }

    public virtual CondicionesIva? IdCondicionIvaNavigation { get; set; }

    public virtual Provincia? IdProvinciaNavigation { get; set; }

    public virtual PersonalPuesto? IdPuestoNavigation { get; set; }

    public virtual Sucursal IdSucursalNavigation { get; set; } = null!;

    public virtual ICollection<PersonalSueldo> PersonalSueldos { get; set; } = new List<PersonalSueldo>();

    public virtual ICollection<Venta> Venta { get; set; } = new List<Venta>();
}
