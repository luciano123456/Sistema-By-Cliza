document.addEventListener("DOMContentLoaded", async function () {
    var userSession = JSON.parse(localStorage.getItem('userSession'));

    // Configura el estado del switch
    if (userSession) {
        var userFullName = userSession.Nombre + ' ' + userSession.Apellido;
        $("#userName").html('<i class="fa fa-user"></i> ' + userFullName);

     
    }

    // Manejo del menú desplegable del usuario
    var userMenuToggle = document.getElementById('navbarDropdown');
    var userMenu = document.getElementById('userMenu');

    userMenuToggle.addEventListener('click', function (event) {
        event.preventDefault();

        // Alterna el menú del usuario
        var isExpanded = userMenuToggle.getAttribute('aria-expanded') === 'true';
        userMenuToggle.setAttribute('aria-expanded', !isExpanded);
        userMenu.classList.toggle('show');
    });

    // Cierra el menú del usuario si se hace clic fuera de él
    document.addEventListener('click', function (event) {
        var isUserMenu = event.target.closest('#userMenu');
        var isUserToggle = event.target.closest('#navbarDropdown');

        if (!isUserMenu && !isUserToggle) {
            userMenu.classList.remove('show');
            userMenuToggle.setAttribute('aria-expanded', 'false');
        }
    });

    // Cierra otros menús desplegables al interactuar fuera del navbar
    document.addEventListener('click', function (event) {
        var isDropdownToggle = event.target.closest('.dropdown-toggle');
        var isDropdownMenu = event.target.closest('.dropdown-menu');

        if (!isDropdownToggle && !isDropdownMenu) {
            document.querySelectorAll('.dropdown-menu.show').forEach(function (dropdownMenu) {
                if (dropdownMenu !== userMenu) { // No cerrar el menú de usuario
                    dropdownMenu.classList.remove('show');
                    var dropdownToggle = dropdownMenu.previousElementSibling;
                    if (dropdownToggle) {
                        dropdownToggle.setAttribute('aria-expanded', 'false');
                    }
                }
            });
        }
    });
});

async function obtenerDataUser(id) {
    const url = `/Usuarios/Obtener?id=${id}`;
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        throw new Error(`Error al obtener usuario: ${response.statusText}`);
    }

    return await response.json();
}


function abrirConfiguracionUser() {
    window.location.href = '/Usuarios/Configuracion';
}
