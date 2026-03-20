using SistemaByCliza.DAL.Repository;
using SistemaByCliza.Models;

namespace SistemaByCliza.BLL.Service
{
    public class PersonalSueldosService : IPersonalSueldosService
    {
        private readonly IPersonalSueldosRepository<PersonalSueldo> _repo;
        public PersonalSueldosService(IPersonalSueldosRepository<PersonalSueldo> repo) { _repo = repo; }

        // Validaciones de negocio básicas
        private static void ValidarSueldo(PersonalSueldo s)
        {
            if (s.Importe <= 0) throw new ArgumentException("El importe del sueldo debe ser mayor a 0.");
            if (string.IsNullOrWhiteSpace(s.Concepto)) throw new ArgumentException("El concepto es obligatorio.");
            if (s.IdPersonal <= 0) throw new ArgumentException("Debe seleccionar un personal.");
        }

        public Task<List<PersonalSueldo>> Listar(DateTime? fechaDesde, DateTime? fechaHasta, int? idPersonal, string? estado, string? concepto)
         => _repo.Listar(fechaDesde, fechaHasta, idPersonal, estado, concepto);

        private static void ValidarPago(PersonalSueldosPago p)
        {
            if (p.Importe <= 0) throw new ArgumentException("El importe del pago debe ser mayor a 0.");
        }

        // -------- Sueldos (cabecera) --------
        public Task<bool> Insertar(PersonalSueldo model) { ValidarSueldo(model); return _repo.Insertar(model); }
        public Task<bool> Actualizar(PersonalSueldo model) { ValidarSueldo(model); return _repo.Actualizar(model); }
        public Task<bool> Eliminar(int id) => _repo.Eliminar(id);
        public Task<PersonalSueldo?> Obtener(int id) => _repo.Obtener(id);
        public Task<IQueryable<PersonalSueldo>> ObtenerTodos() => _repo.ObtenerTodos();

        // -------- Pagos unitarios (opcionales) --------
        public async Task<bool> InsertarPago(PersonalSueldosPago pago)
        {
            ValidarPago(pago);
            var sueldo = await _repo.Obtener(pago.IdSueldo) ?? throw new InvalidOperationException("Sueldo no encontrado.");
            if (pago.Importe > (sueldo.Saldo)) throw new InvalidOperationException("El pago no puede superar el saldo.");
            return await _repo.InsertarPago(pago);
        }

        public async Task<bool> ActualizarPago(PersonalSueldosPago pago)
        {
            ValidarPago(pago);
            var sueldo = await _repo.Obtener(pago.IdSueldo) ?? throw new InvalidOperationException("Sueldo no encontrado.");
            var pagos = await _repo.ObtenerPagosPorSueldo(pago.IdSueldo);
            var abonadoSinEste = pagos.Where(x => x.Id != pago.Id).Sum(x => x.Importe);
            if (abonadoSinEste + pago.Importe > sueldo.Importe)
                throw new InvalidOperationException("La suma de pagos supera el importe del sueldo.");
            return await _repo.ActualizarPago(pago);
        }

        public Task<bool> EliminarPago(int idPago) => _repo.EliminarPago(idPago);
        public Task<PersonalSueldosPago?> ObtenerPago(int idPago) => _repo.ObtenerPago(idPago);
        public Task<List<PersonalSueldosPago>> ObtenerPagosPorSueldo(int idSueldo) => _repo.ObtenerPagosPorSueldo(idSueldo);

        // -------- NUEVO: Upsert transaccional con pagos --------
        public async Task<bool> InsertarConPagos(PersonalSueldo sueldo, IEnumerable<PersonalSueldosPago> pagos)
        {
            ValidarSueldo(sueldo);
            foreach (var p in pagos) ValidarPago(p);

            // Validación de que la suma de pagos no exceda el importe
            var totalPagos = pagos.Sum(x => x.Importe);
            if (totalPagos > sueldo.Importe)
                throw new InvalidOperationException("La suma de pagos no puede superar el importe del sueldo.");

            return await _repo.InsertarConPagos(sueldo, pagos);
        }

        public async Task<bool> ActualizarConPagos(PersonalSueldo sueldo, IEnumerable<PersonalSueldosPago> pagos)
        {
            ValidarSueldo(sueldo);
            foreach (var p in pagos) ValidarPago(p);

            var totalPagos = pagos.Sum(x => x.Importe);
            if (totalPagos > sueldo.Importe)
                throw new InvalidOperationException("La suma de pagos no puede superar el importe del sueldo.");

            return await _repo.ActualizarConPagos(sueldo, pagos);
        }
    }
}
