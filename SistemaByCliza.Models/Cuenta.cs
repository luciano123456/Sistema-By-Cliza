using System;
using System.Collections.Generic;

namespace SistemaByCliza.Models;

public partial class Cuenta
{
    public int Id { get; set; }

    public string Nombre { get; set; } = null!;

    public virtual ICollection<Caja> Cajas { get; set; } = new List<Caja>();

    public virtual ICollection<CajasTransfEntreCuenta> CajasTransfEntreCuentaIdCuentaDestinoNavigations { get; set; } = new List<CajasTransfEntreCuenta>();

    public virtual ICollection<CajasTransfEntreCuenta> CajasTransfEntreCuentaIdCuentaOrigenNavigations { get; set; } = new List<CajasTransfEntreCuenta>();

    public virtual ICollection<ClientesCobro> ClientesCobros { get; set; } = new List<ClientesCobro>();

    public virtual ICollection<Gasto> Gastos { get; set; } = new List<Gasto>();

    public virtual ICollection<PersonalSueldosPago> PersonalSueldosPagos { get; set; } = new List<PersonalSueldosPago>();

    public virtual ICollection<TalleresPago> TalleresPagos { get; set; } = new List<TalleresPago>();
}
