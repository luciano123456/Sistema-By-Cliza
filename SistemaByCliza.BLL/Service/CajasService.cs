using SistemaByCliza.DAL.Repository;
using SistemaByCliza.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SistemaByCliza.BLL.Service
{
    public class CajasService : ICajasService
    {
        private readonly ICajasRepository<Caja> _repo;

        public CajasService(ICajasRepository<Caja> repo)
        {
            _repo = repo;
        }

        public Task<bool> Insertar(Caja model) => _repo.Insertar(model);
        public Task<bool> Actualizar(Caja model) => _repo.Actualizar(model);
        public Task<bool> Eliminar(int id) => _repo.Eliminar(id);
        public Task<Caja> Obtener(int id) => _repo.Obtener(id);
        public Task<IQueryable<Caja>> ObtenerTodos() => _repo.ObtenerTodos();

        public Task<(List<Caja> Lista, decimal SaldoAnterior)> ObtenerFiltradoConSaldoAnterior(
            DateTime? fechaDesde,
            DateTime? fechaHasta,
            int idSucursal,
            int idCuenta,
            string tipo,
            string concepto)
            => _repo.ObtenerFiltradoConSaldoAnterior(fechaDesde, fechaHasta, idSucursal, idCuenta, tipo, concepto);

        // 👉 Solo puentea al repositorio
        public Task<List<Caja>> ObtenerFiltrado(
            DateTime? fechaDesde,
            DateTime? fechaHasta,
            int idSucursal,
            int idCuenta,
            string tipo,
            string concepto)
            => _repo.ObtenerFiltrado(fechaDesde, fechaHasta, idSucursal, idCuenta, tipo, concepto);
    }
}
