-- Seed módulo Análisis de datos + canal de sucursal
-- Ejecutar en Sistema_ByCliza (local y servidor)

IF COL_LENGTH('Sucursales', 'TipoCanal') IS NULL
BEGIN
    ALTER TABLE Sucursales
    ADD TipoCanal varchar(50) NOT NULL
        CONSTRAINT DF_Sucursales_TipoCanal DEFAULT ('TiendaFisica');
END
GO

IF NOT EXISTS (SELECT 1 FROM Usuarios_Modulos WHERE Codigo = 'AnalisisDatos')
BEGIN
    INSERT INTO Usuarios_Modulos (Nombre, Codigo, IdGrupo, Orden, Activo)
    VALUES (N'Análisis de datos', 'AnalisisDatos', 8, 20, 1);
END
GO

DECLARE @IdModulo int = (SELECT TOP 1 Id FROM Usuarios_Modulos WHERE Codigo = 'AnalisisDatos');
DECLARE @IdRolAdmin int = 1;

INSERT INTO Usuarios_RolesPermisos (IdRol, IdModulo, IdPermiso, Activo, FechaRegistra)
SELECT @IdRolAdmin, @IdModulo, p.Id, 1, GETDATE()
FROM Usuarios_Permisos p
WHERE p.Activo = 1 AND p.IdModulo IS NULL
  AND NOT EXISTS (
        SELECT 1 FROM Usuarios_RolesPermisos rp
        WHERE rp.IdRol = @IdRolAdmin AND rp.IdModulo = @IdModulo AND rp.IdPermiso = p.Id
  );

INSERT INTO Usuarios_PermisosUsuario (IdUsuario, IdModulo, IdPermiso, Activo, FechaRegistra)
SELECT u.Id, @IdModulo, p.Id, 1, GETDATE()
FROM Usuarios u
CROSS JOIN Usuarios_Permisos p
WHERE u.IdRol = @IdRolAdmin
  AND p.Activo = 1
  AND p.IdModulo IS NULL
  AND NOT EXISTS (
        SELECT 1 FROM Usuarios_PermisosUsuario upu
        WHERE upu.IdUsuario = u.Id AND upu.IdModulo = @IdModulo AND upu.IdPermiso = p.Id
  );
GO
