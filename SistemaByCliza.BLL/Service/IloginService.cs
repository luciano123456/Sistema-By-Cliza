using SistemaByCliza.Models;
using System.Net.Http;

namespace SistemaByCliza.BLL.Service
{
    public interface ILoginService
    {
        Task<User> Login(string username, string password);

        Task<bool> Logout();
    }
}
