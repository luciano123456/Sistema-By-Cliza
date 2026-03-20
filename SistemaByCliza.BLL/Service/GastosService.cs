using SistemaByCliza.DAL.Repository;
using SistemaByCliza.Models;

namespace SistemaByCliza.BLL.Service
{
    public class GastosService : IGastosService
    {

        private readonly IGastosRepository<Gasto> _contactRepo;

        public GastosService(IGastosRepository<Gasto> contactRepo)
        {
            _contactRepo = contactRepo;
        }
        public async Task<bool> Actualizar(Gasto model)
        {
            return await _contactRepo.Actualizar(model);
        }

        public async Task<bool> Eliminar(int id)
        {
            return await _contactRepo.Eliminar(id);
        }

        public async Task<bool> Insertar(Gasto model)
        {
            return await _contactRepo.Insertar(model);
        }

        public async Task<Gasto> Obtener(int id)
        {
            return await _contactRepo.Obtener(id);
        }


        public async Task<List<Gasto>> ObtenerTodos(DateTime? fechaDesde,
                                               DateTime? fechaHasta,
                                               int idSucursal,
                                               int idCuenta,
                                               int idCategoria,
                                               string concepto)
        {
            return await _contactRepo.ObtenerTodos(fechaDesde, fechaHasta, idSucursal, idCuenta, idCategoria, concepto);
        }



    }
}
