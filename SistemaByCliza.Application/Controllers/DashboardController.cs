using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace SistemaByCliza.Controllers
{
    [Authorize]
    public class DashboardController : Controller
    {

        [AllowAnonymous]
        public IActionResult Index()
        {
            return View();
        }
    }
}