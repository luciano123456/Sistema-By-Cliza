using System;
using System.Collections.Generic;
using System.Diagnostics.Contracts;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static Microsoft.EntityFrameworkCore.DbLoggerCategory;
using SistemaByCliza.DAL.DataContext;
using SistemaByCliza.Models;
using Microsoft.EntityFrameworkCore;

namespace SistemaByCliza.DAL.Repository
{
    public class LoginRepository : ILoginRepository<User>
    {

        private readonly SistemaByClizaContext _dbcontext;

        public LoginRepository(SistemaByClizaContext context)
        {
            _dbcontext = context;
        }

        public async Task<User> Login(string username, string password)
        {
            var user = await _dbcontext.Usuarios
                .Include(x => x.IdRolNavigation) // 🔥 TRAE EL UsuariosRol
                .FirstOrDefaultAsync(x => x.Usuario == username);

            return user;
        }

        public async Task<bool> Logout()
        {
            return true;
        }

    }
}
