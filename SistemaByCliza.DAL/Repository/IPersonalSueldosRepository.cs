// SistemaByCliza.DAL/Repository/IPersonalSueldosRepository.cs
using SistemaByCliza.Models;

namespace SistemaByCliza.DAL.Repository
{
    public interface IPersonalSueldosRepository<TEntity> where TEntity : class
    {
        // Sueldos
        Task<bool> Insertar(PersonalSueldo model);
        Task<bool> Actualizar(PersonalSueldo model);
        Task<bool> Eliminar(int id);
        Task<PersonalSueldo?> Obtener(int id);
        Task<IQueryable<PersonalSueldo>> ObtenerTodos();

        // >>> NUEVO: listado con filtros
        Task<List<PersonalSueldo>> Listar(
            DateTime? fechaDesde,
            DateTime? fechaHasta,
            int? idPersonal,
            string? estado,
            string? concepto
        );

        // Pagos ...
        Task<bool> InsertarPago(PersonalSueldosPago pago);
        Task<bool> ActualizarPago(PersonalSueldosPago pago);
        Task<bool> EliminarPago(int idPago);
        Task<PersonalSueldosPago?> ObtenerPago(int idPago);
        Task<List<PersonalSueldosPago>> ObtenerPagosPorSueldo(int idSueldo);

        // Upserts (si ya los usás)
        Task<bool> InsertarConPagos(PersonalSueldo sueldo, IEnumerable<PersonalSueldosPago> pagos);
        Task<bool> ActualizarConPagos(PersonalSueldo sueldo, IEnumerable<PersonalSueldosPago> pagos);
    }
}
