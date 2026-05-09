// SistemaByCliza.BLL/Service/VentasService.cs
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using SistemaByCliza.DAL.Repository;
using SistemaByCliza.Models;

namespace SistemaByCliza.BLL.Service
{
    public class VentasService : IVentasService
    {
        private readonly IVentasRepository<Venta> _repo;

        public VentasService(IVentasRepository<Venta> repo)
        {
            _repo = repo;
        }

        // --------- Listado / Obtener ----------
        public Task<List<Venta>> Listar(DateTime? desde, DateTime? hasta, int? idCliente, int? idVendedor, int? idSucursal, string? estado, string? texto,
            int? restringirUsuarioRegistraId,
            IReadOnlyList<int>? idsSucursalesPermitidas)
            => _repo.Listar(desde, hasta, idCliente, idVendedor, idSucursal, estado, texto, restringirUsuarioRegistraId, idsSucursalesPermitidas);

        public Task<Venta?> Obtener(int id)
            => _repo.Obtener(id);

        public Task<List<VentasProducto>> ObtenerItemsPorVenta(int idVenta)
            => _repo.ObtenerItemsPorVenta(idVenta);

        public Task<List<ClientesCobro>> ObtenerPagosPorVenta(int idVenta)
            => _repo.ObtenerPagosPorVenta(idVenta);

        // --------- Upserts transaccionales ----------
        public Task<bool> InsertarConDetallesYPagos(
            Venta venta,
            IEnumerable<VentasProducto> items,
            IEnumerable<VentasProductosVariante> variantes,
            IEnumerable<ClientesCobro> pagos)
            => _repo.InsertarConDetallesYPagos(venta, items, variantes, pagos);

        public Task<bool> ActualizarConDetallesYPagos(
            Venta venta,
            IEnumerable<VentasProducto> items,
            IEnumerable<VentasProductosVariante> variantes,
            IEnumerable<ClientesCobro> pagos)
            => _repo.ActualizarConDetallesYPagos(venta, items, variantes, pagos);

        public Task<bool> Eliminar(int id)
            => _repo.Eliminar(id);

        // --------- Auxiliares ----------
        public Task<decimal?> ObtenerPrecioPorLista(int idProducto, int idListaPrecio)
            => _repo.ObtenerPrecioPorLista(idProducto, idListaPrecio);

        public Task<List<ProductosVariante>> ObtenerVariantesPorProducto(int idProducto)
            => _repo.ObtenerVariantesPorProducto(idProducto);

        public Task<List<string>> ListarEstadosDistintos()
            => _repo.ListarEstadosDistintos();
    }
}
