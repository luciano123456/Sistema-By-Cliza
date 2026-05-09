using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace SistemaByCliza.Application.Extensions
{
    public static class ClaimsPrincipalExtensions
    {
        public static int? GetUserId(this ClaimsPrincipal user)
        {
            var id = user?.FindFirst("Id")?.Value;
            if (int.TryParse(id, out var val)) return val;
            return null;
        }

        public static int? GetRolId(this ClaimsPrincipal user)
        {
            var rid = user?.FindFirst("UsuariosRol")?.Value;
            if (int.TryParse(rid, out var val)) return val;
            return null;
        }

        public static string? GetUserName(this ClaimsPrincipal user)
        {
            // En tu token pusiste Sub = Usuario
            return user?.FindFirst(ClaimTypes.NameIdentifier)?.Value
                   ?? user?.FindFirst(JwtRegisteredClaimNames.Sub)?.Value
                   ?? user?.Identity?.Name;
        }
    }
}
