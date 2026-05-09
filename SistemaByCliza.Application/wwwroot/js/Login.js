$(document).ready(function () {
    const $btnIngresar = $("#btnIngresar");
    const labelHtml = $btnIngresar.find(".btn-ingresar-label").length
        ? $btnIngresar.html()
        : '<span class="btn-ingresar-label">Ingresar</span>';
    let loginEnCurso = false;

    function setLoginLoading(activo) {
        if (!$btnIngresar.length) return;
        $btnIngresar.prop("disabled", activo);
        $("#username, #password, #rememberMe").prop("disabled", activo);
        if (activo) {
            $btnIngresar.html(
                '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>' +
                '<span>Ingresando...</span>'
            );
        } else {
            $btnIngresar.html(labelHtml);
        }
    }

    // Verificar si el usuario tiene credenciales guardadas
    if (localStorage.getItem('rememberMe') === 'true') {
        // Si el checkbox estaba seleccionado la última vez
        $("#username").val(localStorage.getItem('username'));
        $("#password").val(localStorage.getItem('password'));
        $("#rememberMe").prop('checked', true);
        $("#checkIcon").removeClass("d-none"); // Mostrar el ícono verde de check
    }

    $("#username, #password").on("keydown", function (e) {
        if (e.key !== "Enter") return;
        e.preventDefault();
        if (loginEnCurso) return;
        $("#loginForm").trigger("submit");
    });

    // Al enviar el formulario
    $("#loginForm").on("submit", function (event) {
        event.preventDefault(); // Evitar el envío tradicional del formulario
        if (loginEnCurso) return;
        loginEnCurso = true;
        setLoginLoading(true);

        var username = $("#username").val(); // Obtener el nombre de usuario
        var password = $("#password").val(); // Obtener la contraseña
        var token = $('input[name="__RequestVerificationToken"]').val(); // Obtener token CSRF
        var rememberMe = $("#rememberMe").prop('checked'); // Obtener el estado del checkbox

        // Crear el objeto de datos para enviar
        var data = {
            Usuario: username,
            Contrasena: password,
            __RequestVerificationToken: token // Enviar el token CSRF
        };

        fetch(loginUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'RequestVerificationToken': token
            },
            body: JSON.stringify(data)
        })
            .then(async function (response) {
                let payload = {};
                try {
                    const text = await response.text();
                    if (text) payload = JSON.parse(text);
                } catch (e) {
                    console.error(e);
                }

                if (!response.ok) {
                    loginEnCurso = false;
                    setLoginLoading(false);
                    var msg =
                        (payload && payload.message) ||
                        (response.status === 401
                            ? "No se pudo iniciar sesión."
                            : "No se pudo iniciar sesión. Intentá de nuevo.");
                    $("#errorMessage").text(msg);
                    $("#diverrorMessage").removeClass("d-none");
                    setTimeout(function () {
                        $("#diverrorMessage").addClass("d-none");
                    }, 4000);
                    return null;
                }

                return payload;
            })
            .then(function (data) {
                if (!data) return;

                if (data.success) {
                    localStorage.setItem("JwtToken", data.token);
                    if (rememberMe) {
                        localStorage.setItem('username', username);
                        localStorage.setItem('password', password);
                        localStorage.setItem('rememberMe', true);
                        $("#checkIcon").removeClass("d-none");
                    } else {
                        localStorage.removeItem('username');
                        localStorage.removeItem('password');
                        localStorage.removeItem('rememberMe');
                        $("#checkIcon").addClass("d-none");
                    }

                    localStorage.setItem('userSession', JSON.stringify(data.user));
                    window.location.href = 'Dashboard';
                } else {
                    loginEnCurso = false;
                    setLoginLoading(false);
                    $("#errorMessage").text(data.message || "No se pudo iniciar sesión.");
                    $("#diverrorMessage").removeClass("d-none");

                    setTimeout(function () {
                        $("#diverrorMessage").addClass("d-none");
                    }, 4000);
                }
            })
            .catch(function (error) {
                console.error(error);
                loginEnCurso = false;
                setLoginLoading(false);
                $("#errorMessage").text("No se pudo conectar con el servidor. Verificá tu conexión e intentá de nuevo.");
                $("#diverrorMessage").removeClass("d-none");
            });
    });

    // Al cambiar el estado del checkbox, mostrar u ocultar el ícono
    $("#rememberMe").on("change", function () {
        var username = $("#username").val(); // Obtener el nombre de usuario
        var password = $("#password").val(); // Obtener la contraseña
        if ($(this).prop('checked')) {
            $("#checkIcon").removeClass("d-none"); // Mostrar el ícono verde de check
            localStorage.setItem('username', username);
            localStorage.setItem('password', password);
            localStorage.setItem('rememberMe', true);
        } else {
            $("#checkIcon").addClass("d-none"); // Ocultar el ícono de check
            localStorage.removeItem('username');
            localStorage.removeItem('password');
            localStorage.removeItem('rememberMe');
        }
    });
});
