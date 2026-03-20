using Microsoft.EntityFrameworkCore;
using SistemaByCliza.BLL.Service;
using SistemaByCliza.DAL.DataContext;
using SistemaByCliza.DAL.Repository;
using SistemaByCliza.Models;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc.Authorization;
using Microsoft.Extensions.FileProviders;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllersWithViews();


builder.Services.AddDbContext<SistemaByClizaContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("SistemaDB")));


// Agregar Razor Pages
builder.Services.AddRazorPages().AddRazorRuntimeCompilation();

// Registrar repositorios y servicios
builder.Services.AddScoped<IUsuariosRepository<User>, UsuariosRepository>();
builder.Services.AddScoped<IUsuariosService, UsuariosService>();

builder.Services.AddScoped<IEstadosUsuariosRepository<EstadosUsuario>, EstadosUsuariosRepository>();
builder.Services.AddScoped<IEstadosUsuariosService, EstadosUsuariosService>();

builder.Services.AddScoped<IRolesRepository<Rol>, RolesRepository>();
builder.Services.AddScoped<IRolesService, RolesService>();

builder.Services.AddScoped<ILoginRepository<User>, LoginRepository>();
builder.Services.AddScoped<ILoginService, LoginService>();

builder.Services.AddScoped<IProvinciasRepository<Provincia>, ProvinciasRepository>();
builder.Services.AddScoped<IProvinciasService, ProvinciasService>();

builder.Services.AddScoped<ICondicionesIVARepository<CondicionesIva>, CondicionesIVARepository>();
builder.Services.AddScoped<ICondicionesIVAService, CondicionesIVAService>();

builder.Services.AddScoped<IClientesRepository<Cliente>, ClientesRepository>();
builder.Services.AddScoped<IClientesService, ClientesService>();

builder.Services.AddScoped<IListaPreciosRepository<ListasPrecio>, ListaPreciosRepository>();
builder.Services.AddScoped<IListasPreciosService, ListasPreciosService>();

builder.Services.AddScoped<IBancosRepository<Banco>, BancosRepository>();
builder.Services.AddScoped<IBancosService, BancosService>();

builder.Services.AddScoped<ISucursalesRepository<Sucursal>, SucursalesRepository>();
builder.Services.AddScoped<ISucursalesService, SucursalesService>();

builder.Services.AddScoped<ICuentasRepository<Cuenta>, CuentasRepository>();
builder.Services.AddScoped<ICuentasService, CuentasService>();

builder.Services.AddScoped<IColoresRepository<Color>, ColoresRepository>();
builder.Services.AddScoped<IColoresService, ColoresService>();

builder.Services.AddScoped<IPersonalSueldosRepository<PersonalSueldo>, PersonalSueldosRepository>();
builder.Services.AddScoped<IPersonalSueldosService, PersonalSueldosService>();

builder.Services.AddScoped<IPersonalPuestosRepository<PersonalPuesto>, PersonalPuestosRepository>();
builder.Services.AddScoped<IPersonalPuestosService, PersonalPuestosService>();

builder.Services.AddScoped<IGastosCategoriasRepository<GastosCategoria>, GastosCategoriasRepository>();
builder.Services.AddScoped<IGastosCategoriasService, GastosCategoriasService>();

builder.Services.AddScoped<IPersonalRepository<Personal>, PersonalRepository>();
builder.Services.AddScoped<IPersonalService, PersonalService>();

builder.Services.AddScoped<IProductosCategoriaRepository<ProductosCategoria>, ProductosCategoriaRepository>();
builder.Services.AddScoped<IProductosCategoriaService, ProductosCategoriaService>();

builder.Services.AddScoped<IProductosCategoriasTalleRepository<ProductosCategoriasTalle>, ProductosCategoriasTalleRepository>();
builder.Services.AddScoped<IProductosCategoriasTalleService, ProductosCategoriasTalleService>();


builder.Services.AddScoped<IProductosRepository<Producto>, ProductosRepository>();
builder.Services.AddScoped<IProductosService, ProductosService>();


builder.Services.AddScoped<ICajasRepository<Caja>, CajasRepository>();
builder.Services.AddScoped<ICajasService, CajasService>();

builder.Services.AddScoped<ITransferenciasCajasRepository, TransferenciasCajasRepository>();
builder.Services.AddScoped<ITransferenciasCajasService, TransferenciasCajasService>();

builder.Services.AddScoped<IGastosRepository<Gasto>, GastosRepository>();
builder.Services.AddScoped<IGastosService, GastosService>();

builder.Services.AddScoped<IVentasRepository<Venta>, VentasRepository>();
builder.Services.AddScoped<IVentasService, VentasService>();

builder.Services.AddScoped<ICuentasCorrientesRepository<ClientesCuentaCorriente>, CuentasCorrientesRepository>();
builder.Services.AddScoped<ICuentasCorrientesService, CuentasCorrientesService>();

builder.Services.AddScoped<IInventarioRepository<Inventario>, InventarioRepository>();
builder.Services.AddScoped<IInventarioService, InventarioService>();


builder.Services.AddScoped<IInsumosCategoriaRepository<InsumosCategoria>, InsumosCategoriaRepository>();
builder.Services.AddScoped<IInsumosCategoriaService, InsumosCategoriaService>();

builder.Services.AddScoped<IInsumosRepository<Insumo>, InsumosRepository>();
builder.Services.AddScoped<IInsumosService, InsumosService>();

builder.Services.AddScoped<IProveedoresService, ProveedoresService>();
builder.Services.AddScoped<IProveedoresRepository<Proveedor>, ProveedoresRepository>();

builder.Services.AddScoped<IComprasRepository<Compra>, ComprasRepository>();
builder.Services.AddScoped<IComprasService, ComprasService>();

builder.Services.AddScoped<ICuentasCorrientesProvRepository<ProveedoresCuentaCorriente>, CuentasCorrientesProvRepository>();
builder.Services.AddScoped<ICuentasCorrientesProvService, CuentasCorrientesProvService>();

builder.Services.AddScoped<IOrdenesCorteEstadosRepository<OrdenesCorteEstado>, OrdenesCorteEstadosRepository>();
builder.Services.AddScoped<IOrdenesCorteEstadosService, OrdenesCorteEstadosService>();


builder.Services.AddScoped<IOrdenesCorteEtapasEstadosRepository<OrdenesCorteEtapasEstado>, OrdenesCorteEtapasEstadosRepository>();
builder.Services.AddScoped<IOrdenesCorteEtapasEstadosService, OrdenesCorteEtapasEstadosService>();

builder.Services.AddScoped<IOrdenesCorteRepository, OrdenesCorteRepository>();
builder.Services.AddScoped<IOrdenesCorteService, OrdenesCorteService>();

builder.Services.AddScoped<ITalleresService, TalleresService>();
builder.Services.AddScoped<ITalleresRepository<Taller>, TalleresRepository>();

builder.Services.AddScoped<ICuentasCorrientesTallRepository<TalleresCuentaCorriente>, CuentasCorrientesTallRepository>();
builder.Services.AddScoped<ICuentasCorrientesTallService, CuentasCorrientesTallService>();




builder.Services.AddControllersWithViews()
    .AddJsonOptions(o =>
    {
        o.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
        o.JsonSerializerOptions.PropertyNamingPolicy = null;
    });



builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["JwtSettings:Issuer"],
            ValidAudience = builder.Configuration["JwtSettings:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["JwtSettings:SecretKey"]))
        };
    });

// Definir el esquema de autenticación predeterminado
builder.Services.AddAuthorization(options =>
{
    options.DefaultPolicy = new AuthorizationPolicyBuilder()
        .AddAuthenticationSchemes(JwtBearerDefaults.AuthenticationScheme)
        .RequireAuthenticatedUser()
        .Build();
});



var app = builder.Build();

// Configurar el pipeline de middleware
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Clientes/Error");
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();

app.UseRouting();

app.UseAuthentication();
app.UseAuthorization();


app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Login}/{action=Index}/{id?}");

// Asegúrate de que las rutas de login estén excluidas del middleware de autenticación
app.MapControllerRoute(
    name: "login",
    pattern: "Login/{action=Index}",
    defaults: new { controller = "Login", action = "Index" });
app.Run();
