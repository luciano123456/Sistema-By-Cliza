using System;
using System.Collections.Generic;

namespace SistemaByCliza.Models;

public partial class User
{
    public int Id { get; set; }

    public string? Usuario { get; set; }

    public string? Nombre { get; set; }

    public string? Apellido { get; set; }

    public string? Dni { get; set; }

    public string Telefono { get; set; } = null!;

    public string Direccion { get; set; } = null!;

    public int IdRol { get; set; }

    public string Contrasena { get; set; } = null!;

    public int IdEstado { get; set; }

    public int? ModoVendedor { get; set; }

    public string? Correo { get; set; }

    public string? CodigoRecuperacion { get; set; }

    public virtual ICollection<Caja> CajaIdUsuarioModificaNavigations { get; set; } = new List<Caja>();

    public virtual ICollection<Caja> CajaIdUsuarioRegistraNavigations { get; set; } = new List<Caja>();

    public virtual ICollection<CajasTransfEntreCuenta> CajasTransfEntreCuentaIdUsuarioModificaNavigations { get; set; } = new List<CajasTransfEntreCuenta>();

    public virtual ICollection<CajasTransfEntreCuenta> CajasTransfEntreCuentaIdUsuarioRegistraNavigations { get; set; } = new List<CajasTransfEntreCuenta>();

    public virtual ICollection<Cliente> ClienteIdUsuarioModificaNavigations { get; set; } = new List<Cliente>();

    public virtual ICollection<Cliente> ClienteIdUsuarioRegistraNavigations { get; set; } = new List<Cliente>();

    public virtual ICollection<ClientesCobro> ClientesCobroIdUsuarioModificaNavigations { get; set; } = new List<ClientesCobro>();

    public virtual ICollection<ClientesCobro> ClientesCobroIdUsuarioRegistraNavigations { get; set; } = new List<ClientesCobro>();

    public virtual ICollection<ClientesCuentaCorriente> ClientesCuentaCorrienteIdUsuarioModificaNavigations { get; set; } = new List<ClientesCuentaCorriente>();

    public virtual ICollection<ClientesCuentaCorriente> ClientesCuentaCorrienteIdUsuarioRegistraNavigations { get; set; } = new List<ClientesCuentaCorriente>();

    public virtual ICollection<Compra> CompraIdUsuarioModificaNavigations { get; set; } = new List<Compra>();

    public virtual ICollection<Compra> CompraIdUsuarioRegistraNavigations { get; set; } = new List<Compra>();

    public virtual ICollection<ComprasInsumo> ComprasInsumoIdUsuarioModificaNavigations { get; set; } = new List<ComprasInsumo>();

    public virtual ICollection<ComprasInsumo> ComprasInsumoIdUsuarioRegistraNavigations { get; set; } = new List<ComprasInsumo>();

    public virtual ICollection<ComprasPago> ComprasPagoIdUsuarioModificaNavigations { get; set; } = new List<ComprasPago>();

    public virtual ICollection<ComprasPago> ComprasPagoIdUsuarioRegistraNavigations { get; set; } = new List<ComprasPago>();

    public virtual ICollection<Gasto> GastoIdUsuarioModificaNavigations { get; set; } = new List<Gasto>();

    public virtual ICollection<Gasto> GastoIdUsuarioRegistraNavigations { get; set; } = new List<Gasto>();

    public virtual EstadosUsuario IdEstadoNavigation { get; set; } = null!;

    public virtual UsuariosRol IdRolNavigation { get; set; } = null!;

    public virtual ICollection<Insumo> InsumoIdUsuarioModificaNavigations { get; set; } = new List<Insumo>();

    public virtual ICollection<Insumo> InsumoIdUsuarioRegistraNavigations { get; set; } = new List<Insumo>();

    public virtual ICollection<InsumosInventarioMovimiento> InsumosInventarioMovimientoIdUsuarioModificaNavigations { get; set; } = new List<InsumosInventarioMovimiento>();

    public virtual ICollection<InsumosInventarioMovimiento> InsumosInventarioMovimientoIdUsuarioRegistraNavigations { get; set; } = new List<InsumosInventarioMovimiento>();

    public virtual ICollection<InventarioIngresosOrdenesCorte> InventarioIngresosOrdenesCorteIdUsuarioModificaNavigations { get; set; } = new List<InventarioIngresosOrdenesCorte>();

    public virtual ICollection<InventarioIngresosOrdenesCorte> InventarioIngresosOrdenesCorteIdUsuarioRegistraNavigations { get; set; } = new List<InventarioIngresosOrdenesCorte>();

    public virtual ICollection<InventarioMovimiento> InventarioMovimientoIdUsuarioModificaNavigations { get; set; } = new List<InventarioMovimiento>();

    public virtual ICollection<InventarioMovimiento> InventarioMovimientoIdUsuarioRegistraNavigations { get; set; } = new List<InventarioMovimiento>();

    public virtual ICollection<InventarioTransfSucursal> InventarioTransfSucursaleIdUsuarioModificaNavigations { get; set; } = new List<InventarioTransfSucursal>();

    public virtual ICollection<InventarioTransfSucursal> InventarioTransfSucursaleIdUsuarioRegistraNavigations { get; set; } = new List<InventarioTransfSucursal>();

    public virtual ICollection<OrdenesCorte> OrdenesCorteIdUsuarioModificaNavigations { get; set; } = new List<OrdenesCorte>();

    public virtual ICollection<OrdenesCorte> OrdenesCorteIdUsuarioRegistraNavigations { get; set; } = new List<OrdenesCorte>();

    public virtual ICollection<OrdenesCorteInsumo> OrdenesCorteInsumoIdUsuarioModificaNavigations { get; set; } = new List<OrdenesCorteInsumo>();

    public virtual ICollection<OrdenesCorteInsumo> OrdenesCorteInsumoIdUsuarioRegistraNavigations { get; set; } = new List<OrdenesCorteInsumo>();

    public virtual ICollection<OrdenesCorteProducto> OrdenesCorteProductoIdUsuarioModificaNavigations { get; set; } = new List<OrdenesCorteProducto>();

    public virtual ICollection<OrdenesCorteProducto> OrdenesCorteProductoIdUsuarioRegistraNavigations { get; set; } = new List<OrdenesCorteProducto>();

    public virtual ICollection<Personal> PersonalIdUsuarioModificaNavigations { get; set; } = new List<Personal>();

    public virtual ICollection<Personal> PersonalIdUsuarioRegistraNavigations { get; set; } = new List<Personal>();

    public virtual ICollection<PersonalSueldo> PersonalSueldoIdUsuarioModificaNavigations { get; set; } = new List<PersonalSueldo>();

    public virtual ICollection<PersonalSueldo> PersonalSueldoIdUsuarioRegistraNavigations { get; set; } = new List<PersonalSueldo>();

    public virtual ICollection<PersonalSueldosPago> PersonalSueldosPagoIdUsuarioModificaNavigations { get; set; } = new List<PersonalSueldosPago>();

    public virtual ICollection<PersonalSueldosPago> PersonalSueldosPagoIdUsuarioRegistraNavigations { get; set; } = new List<PersonalSueldosPago>();

    public virtual ICollection<Producto> ProductoIdUsuarioModificaNavigations { get; set; } = new List<Producto>();

    public virtual ICollection<Producto> ProductoIdUsuarioRegistraNavigations { get; set; } = new List<Producto>();

    public virtual ICollection<Proveedor> ProveedoreIdUsuarioModificaNavigations { get; set; } = new List<Proveedor>();

    public virtual ICollection<Proveedor> ProveedoreIdUsuarioRegistraNavigations { get; set; } = new List<Proveedor>();

    public virtual ICollection<ProveedoresCuentaCorriente> ProveedoresCuentaCorrienteIdUsuarioModificaNavigations { get; set; } = new List<ProveedoresCuentaCorriente>();

    public virtual ICollection<ProveedoresCuentaCorriente> ProveedoresCuentaCorrienteIdUsuarioRegistraNavigations { get; set; } = new List<ProveedoresCuentaCorriente>();

    public virtual ICollection<Taller> TallereIdUsuarioModificaNavigations { get; set; } = new List<Taller>();

    public virtual ICollection<Taller> TallereIdUsuarioRegistraNavigations { get; set; } = new List<Taller>();

    public virtual ICollection<TalleresCuentaCorriente> TalleresCuentaCorrienteIdUsuarioModificaNavigations { get; set; } = new List<TalleresCuentaCorriente>();

    public virtual ICollection<TalleresCuentaCorriente> TalleresCuentaCorrienteIdUsuarioRegistraNavigations { get; set; } = new List<TalleresCuentaCorriente>();

    public virtual ICollection<TalleresPago> TalleresPagoIdUsuarioModificaNavigations { get; set; } = new List<TalleresPago>();

    public virtual ICollection<TalleresPago> TalleresPagoIdUsuarioRegistraNavigations { get; set; } = new List<TalleresPago>();

    public virtual ICollection<UsuariosPermisosUsuario> UsuariosPermisosUsuarioIdUsuarioModificaNavigations { get; set; } = new List<UsuariosPermisosUsuario>();

    public virtual ICollection<UsuariosPermisosUsuario> UsuariosPermisosUsuarioIdUsuarioNavigations { get; set; } = new List<UsuariosPermisosUsuario>();

    public virtual ICollection<UsuariosPermisosUsuario> UsuariosPermisosUsuarioIdUsuarioRegistraNavigations { get; set; } = new List<UsuariosPermisosUsuario>();

    public virtual ICollection<UsuariosSucursal> UsuariosSucursales { get; set; } = new List<UsuariosSucursal>();

    public virtual ICollection<Venta> VentaIdUsuarioModificaNavigations { get; set; } = new List<Venta>();

    public virtual ICollection<Venta> VentaIdUsuarioRegistraNavigations { get; set; } = new List<Venta>();
}
