using Microsoft.EntityFrameworkCore;
using SistemaByCliza.DAL.DataContext;
using SistemaByCliza.Models;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace SistemaByCliza.DAL.Repository
{
    public class ProductosRepository : IProductosRepository<Producto>
    {
        private readonly SistemaByClizaContext _dbcontext;

        public ProductosRepository(SistemaByClizaContext context)
        {
            _dbcontext = context;
        }

        public async Task<bool> Eliminar(int id)
        {
            var model = _dbcontext.Productos.First(c => c.Id == id);
            _dbcontext.Productos.Remove(model);
            await _dbcontext.SaveChangesAsync();
            return true;
        }

        public async Task<Producto> Obtener(int id)
        {
            return await _dbcontext.Productos
                .Include(p => p.ProductosTalles).ThenInclude(pt => pt.IdTalleNavigation)
                .Include(p => p.ProductosColores).ThenInclude(pc => pc.IdColorNavigation)
                .Include(p => p.ProductosVariantes)
                .Include(p => p.ProductosPrecios)
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == id);
        }

        public async Task<IQueryable<Producto>> ObtenerTodos()
        {
            IQueryable<Producto> query = _dbcontext.Productos;
            return await Task.FromResult(query);
        }

        // -------- Insertar / Actualizar (firma original: sigue funcionando) --------

        public Task<bool> Insertar(Producto model, IEnumerable<int> idTallesCat, IEnumerable<int> idColores, bool generarVariantes)
            => Insertar(model, idTallesCat, idColores, generarVariantes, null);

        public Task<bool> Actualizar(Producto model, IEnumerable<int> idTallesCat, IEnumerable<int> idColores, bool generarVariantes)
            => Actualizar(model, idTallesCat, idColores, generarVariantes, null);

        // -------- Overloads con precios por lista (nueva funcionalidad) --------

        public async Task<bool> Insertar(Producto model, IEnumerable<int> idTallesCat, IEnumerable<int> idColores, bool generarVariantes, IDictionary<int, decimal> preciosPorLista)
        {
            using var tx = await _dbcontext.Database.BeginTransactionAsync();

            _dbcontext.Productos.Add(model);
            await _dbcontext.SaveChangesAsync();

            var linkTalles = await SyncProductoTalles(model.Id, idTallesCat);
            var linkColores = await SyncProductoColores(model.Id, idColores);

            if (generarVariantes)
                await SyncVariantes(model.Id, linkTalles.Select(t => t.Id), linkColores.Select(c => c.Id));
            else
                await CleanOrphanVariantes(model.Id);

            if (preciosPorLista != null)
                await SyncProductoPrecios(model.Id, preciosPorLista);

            await tx.CommitAsync();
            return true;
        }

        public async Task<bool> Actualizar(Producto model, IEnumerable<int> idTallesCat, IEnumerable<int> idColores, bool generarVariantes, IDictionary<int, decimal> preciosPorLista)
        {
            using var tx = await _dbcontext.Database.BeginTransactionAsync();

            _dbcontext.Productos.Update(model);
            await _dbcontext.SaveChangesAsync();

            var linkTalles = await SyncProductoTalles(model.Id, idTallesCat);
            var linkColores = await SyncProductoColores(model.Id, idColores);

            if (generarVariantes)
                await SyncVariantes(model.Id, linkTalles.Select(t => t.Id), linkColores.Select(c => c.Id));
            else
                await CleanOrphanVariantes(model.Id);

            if (preciosPorLista != null)
                await SyncProductoPrecios(model.Id, preciosPorLista);

            await tx.CommitAsync();
            return true;
        }

        // ======================== Helpers ========================

        private async Task<List<ProductosTalle>> SyncProductoTalles(int idProducto, IEnumerable<int> idsProductosCategoriasTalle)
        {
            var deseados = idsProductosCategoriasTalle?.Distinct().ToHashSet() ?? new HashSet<int>();

            var actuales = await _dbcontext.ProductosTalles
                .Where(pt => pt.IdProducto == idProducto)
                .ToListAsync();

            var actualesSet = actuales.Select(a => a.IdTalle).ToHashSet();

            var aInsertar = deseados.Except(actualesSet)
                .Select(idTalleCat => new ProductosTalle { IdProducto = idProducto, IdTalle = idTalleCat })
                .ToList();

            if (aInsertar.Count > 0)
            {
                _dbcontext.ProductosTalles.AddRange(aInsertar);
                await _dbcontext.SaveChangesAsync();
                actuales.AddRange(aInsertar);
            }

            var idsPuenteABorrar = actuales
                .Where(a => !deseados.Contains(a.IdTalle))
                .Select(a => a.Id)
                .ToList();

            if (idsPuenteABorrar.Count > 0)
            {
                var variantesABorrar = await _dbcontext.ProductosVariantes
                    .Where(v => v.IdProducto == idProducto && idsPuenteABorrar.Contains(v.IdTalle))
                    .ToListAsync();

                if (variantesABorrar.Count > 0)
                    _dbcontext.ProductosVariantes.RemoveRange(variantesABorrar);

                var rowsABorrar = actuales.Where(a => idsPuenteABorrar.Contains(a.Id)).ToList();
                _dbcontext.ProductosTalles.RemoveRange(rowsABorrar);
                await _dbcontext.SaveChangesAsync();

                actuales = actuales.Where(a => !idsPuenteABorrar.Contains(a.Id)).ToList();
            }

            return actuales;
        }

        private async Task<List<ProductosColor>> SyncProductoColores(int idProducto, IEnumerable<int> idsColor)
        {
            var deseados = idsColor?.Distinct().ToHashSet() ?? new HashSet<int>();

            var actuales = await _dbcontext.ProductosColores
                .Where(pc => pc.IdProducto == idProducto)
                .ToListAsync();

            var actualesSet = actuales.Select(a => a.IdColor).ToHashSet();

            var aInsertar = deseados.Except(actualesSet)
                .Select(idColor => new ProductosColor { IdProducto = idProducto, IdColor = idColor })
                .ToList();

            if (aInsertar.Count > 0)
            {
                _dbcontext.ProductosColores.AddRange(aInsertar);
                await _dbcontext.SaveChangesAsync();
                actuales.AddRange(aInsertar);
            }

            var idsPuenteABorrar = actuales
                .Where(a => !deseados.Contains(a.IdColor))
                .Select(a => a.Id)
                .ToList();

            if (idsPuenteABorrar.Count > 0)
            {
                var variantesABorrar = await _dbcontext.ProductosVariantes
                    .Where(v => v.IdProducto == idProducto && idsPuenteABorrar.Contains(v.IdColor))
                    .ToListAsync();

                if (variantesABorrar.Count > 0)
                    _dbcontext.ProductosVariantes.RemoveRange(variantesABorrar);

                var rowsABorrar = actuales.Where(a => idsPuenteABorrar.Contains(a.Id)).ToList();
                _dbcontext.ProductosColores.RemoveRange(rowsABorrar);
                await _dbcontext.SaveChangesAsync();

                actuales = actuales.Where(a => !idsPuenteABorrar.Contains(a.Id)).ToList();
            }

            return actuales;
        }

        private async Task SyncVariantes(int idProducto, IEnumerable<int> idsPuenteTalles, IEnumerable<int> idsPuenteColores)
        {
            var talles = (idsPuenteTalles ?? Enumerable.Empty<int>()).Distinct().ToArray();
            var colores = (idsPuenteColores ?? Enumerable.Empty<int>()).Distinct().ToArray();

            var setDeseado = (from t in talles from c in colores select (t, c)).ToHashSet();

            var actuales = await _dbcontext.ProductosVariantes
                .Where(v => v.IdProducto == idProducto)
                .Select(v => new { v.Id, v.IdTalle, v.IdColor })
                .ToListAsync();

            var setActual = actuales.Select(a => (a.IdTalle, a.IdColor)).ToHashSet();

            var aInsertar = setDeseado.Except(setActual)
                .Select(pair => new ProductosVariante { IdProducto = idProducto, IdTalle = pair.Item1, IdColor = pair.Item2 })
                .ToList();

            if (aInsertar.Count > 0)
                _dbcontext.ProductosVariantes.AddRange(aInsertar);

            var paresABorrar = setActual.Except(setDeseado);
            var idsABorrar = actuales
                .Where(a => paresABorrar.Contains((a.IdTalle, a.IdColor)))
                .Select(a => a.Id)
                .ToList();

            if (idsABorrar.Count > 0)
                _dbcontext.ProductosVariantes.RemoveRange(idsABorrar.Select(id => new ProductosVariante { Id = id }));

            if (aInsertar.Count > 0 || idsABorrar.Count > 0)
                await _dbcontext.SaveChangesAsync();
        }

        private async Task CleanOrphanVariantes(int idProducto)
        {
            var idsTallePuente = await _dbcontext.ProductosTalles
                .Where(t => t.IdProducto == idProducto)
                .Select(t => t.Id)
                .ToListAsync();

            var idsColorPuente = await _dbcontext.ProductosColores
                .Where(c => c.IdProducto == idProducto)
                .Select(c => c.Id)
                .ToListAsync();

            var orphans = await _dbcontext.ProductosVariantes
                .Where(v => v.IdProducto == idProducto &&
                            (!idsTallePuente.Contains(v.IdTalle) || !idsColorPuente.Contains(v.IdColor)))
                .ToListAsync();

            if (orphans.Count > 0)
            {
                _dbcontext.ProductosVariantes.RemoveRange(orphans);
                await _dbcontext.SaveChangesAsync();
            }
        }

        private async Task SyncProductoPrecios(int idProducto, IDictionary<int, decimal> preciosDeseados)
        {
            var actuales = await _dbcontext.ProductosPrecios
                .Where(x => x.IdProducto == idProducto)
                .ToListAsync();

            var porListaActual = actuales.ToDictionary(x => x.IdListaPrecio, x => x);

            foreach (var kv in preciosDeseados)
            {
                var idLista = kv.Key;
                var precio = kv.Value;

                if (porListaActual.TryGetValue(idLista, out var row))
                {
                    if (row.PrecioUnitario != precio)
                    {
                        row.PrecioUnitario = precio;
                        _dbcontext.ProductosPrecios.Update(row);
                    }
                }
                else
                {
                    _dbcontext.ProductosPrecios.Add(new ProductosPrecio
                    {
                        IdProducto = idProducto,
                        IdListaPrecio = idLista,
                        PrecioUnitario = precio
                    });
                }
            }

            // Borro los que ya no están en preciosDeseados
            var idsDeseados = preciosDeseados.Keys.ToHashSet();
            var aBorrar = actuales
                .Where(a => !idsDeseados.Contains((int)a.IdListaPrecio))
                .ToList();

            if (aBorrar.Count > 0)
                _dbcontext.ProductosPrecios.RemoveRange(aBorrar);

            await _dbcontext.SaveChangesAsync();
        }

    }
}
