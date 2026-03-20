using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using SistemaByCliza.Models;

namespace SistemaByCliza.BLL.Service
{
    public interface ICajasService
    {
        Task<bool> Insertar(Caja model);
        Task<bool> Actualizar(Caja model);
        Task<bool> Eliminar(int id);
        Task<Caja> Obtener(int id);
        Task<IQueryable<Caja>> ObtenerTodos();

        Task<(List<Caja> Lista, decimal SaldoAnterior)> ObtenerFiltradoConSaldoAnterior(
         DateTime? fechaDesde,
         DateTime? fechaHasta,
         int idSucursal,
         int idCuenta,
         string tipo,
         string concepto);


        // 👉 Nuevo: puente al repo
        Task<List<Caja>> ObtenerFiltrado(
            DateTime? fechaDesde,
            DateTime? fechaHasta,
            int idSucursal,
            int idCuenta,
            string tipo,
            string concepto
        );
    }
}
