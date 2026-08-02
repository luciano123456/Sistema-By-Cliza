/*

  Remito para transporte — esquema

  Ejecutar contra Sistema_ByCliza

  Idempotente: se puede volver a ejecutar si falló a mitad.

*/



SET NOCOUNT ON;



/* ========== Transportes ========== */

IF OBJECT_ID(N'dbo.Transportes', N'U') IS NULL

BEGIN

    CREATE TABLE dbo.Transportes (

        Id            INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Transportes PRIMARY KEY,

        Nombre        NVARCHAR(200) NOT NULL,

        Direccion     NVARCHAR(250) NULL,

        Telefono      NVARCHAR(50) NULL,

        Email         NVARCHAR(100) NULL,

        Notas         NVARCHAR(500) NULL,

        Activo        BIT NOT NULL CONSTRAINT DF_Transportes_Activo DEFAULT (1)

    );

END

GO



/* Si la tabla ya existía sin alguna columna, la agregamos */

IF OBJECT_ID(N'dbo.Transportes', N'U') IS NOT NULL

BEGIN

    IF COL_LENGTH('dbo.Transportes', 'Direccion') IS NULL

        ALTER TABLE dbo.Transportes ADD Direccion NVARCHAR(250) NULL;



    IF COL_LENGTH('dbo.Transportes', 'Telefono') IS NULL

        ALTER TABLE dbo.Transportes ADD Telefono NVARCHAR(50) NULL;



    IF COL_LENGTH('dbo.Transportes', 'Email') IS NULL

        ALTER TABLE dbo.Transportes ADD Email NVARCHAR(100) NULL;



    IF COL_LENGTH('dbo.Transportes', 'Notas') IS NULL

        ALTER TABLE dbo.Transportes ADD Notas NVARCHAR(500) NULL;



    IF COL_LENGTH('dbo.Transportes', 'Activo') IS NULL

        ALTER TABLE dbo.Transportes ADD Activo BIT NOT NULL CONSTRAINT DF_Transportes_Activo DEFAULT (1);



    IF COL_LENGTH('dbo.Transportes', 'Nombre') IS NULL

        ALTER TABLE dbo.Transportes ADD Nombre NVARCHAR(200) NOT NULL CONSTRAINT DF_Transportes_Nombre DEFAULT (N'');

END

GO



IF OBJECT_ID(N'dbo.Transportes', N'U') IS NOT NULL

   AND COL_LENGTH('dbo.Transportes', 'Direccion') IS NOT NULL

   AND NOT EXISTS (SELECT 1 FROM dbo.Transportes WHERE Nombre = N'LLEVAR')

BEGIN

    INSERT INTO dbo.Transportes (Nombre, Direccion, Telefono, Email, Notas, Activo)

    VALUES (N'LLEVAR', NULL, NULL, NULL, N'Entrega a mano / retiro local', 1);

END

GO



/* ========== Clientes ========== */

IF COL_LENGTH('dbo.Clientes', 'IdTransporte') IS NULL

BEGIN

    ALTER TABLE dbo.Clientes ADD IdTransporte INT NULL;

END

GO



IF COL_LENGTH('dbo.Clientes', 'DireccionEntrega') IS NULL

BEGIN

    ALTER TABLE dbo.Clientes ADD DireccionEntrega NVARCHAR(250) NULL;

END

GO



IF OBJECT_ID(N'dbo.Transportes', N'U') IS NOT NULL

   AND COL_LENGTH('dbo.Clientes', 'IdTransporte') IS NOT NULL

   AND NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Clientes_Transportes')

BEGIN

    ALTER TABLE dbo.Clientes

        ADD CONSTRAINT FK_Clientes_Transportes

        FOREIGN KEY (IdTransporte) REFERENCES dbo.Transportes(Id);

END

GO



/* ========== Ventas ========== */

IF COL_LENGTH('dbo.Ventas', 'IdTransporte') IS NULL

BEGIN

    ALTER TABLE dbo.Ventas ADD IdTransporte INT NULL;

END

GO



IF COL_LENGTH('dbo.Ventas', 'CantidadBultos') IS NULL

BEGIN

    ALTER TABLE dbo.Ventas ADD CantidadBultos INT NULL;

END

GO



IF COL_LENGTH('dbo.Ventas', 'CantidadPrendas') IS NULL

BEGIN

    ALTER TABLE dbo.Ventas ADD CantidadPrendas INT NULL;

END

GO



IF OBJECT_ID(N'dbo.Transportes', N'U') IS NOT NULL

   AND COL_LENGTH('dbo.Ventas', 'IdTransporte') IS NOT NULL

   AND NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Ventas_Transportes')

BEGIN

    ALTER TABLE dbo.Ventas

        ADD CONSTRAINT FK_Ventas_Transportes

        FOREIGN KEY (IdTransporte) REFERENCES dbo.Transportes(Id);

END

GO



/* ========== Módulo / permisos ========== */

IF NOT EXISTS (SELECT 1 FROM dbo.Usuarios_Modulos WHERE Codigo = N'Transportes')

BEGIN

    DECLARE @grupo INT = (

        SELECT TOP 1 IdGrupo

        FROM dbo.Usuarios_Modulos

        WHERE Codigo IN (N'Clientes', N'Proveedores')

        ORDER BY CASE WHEN Codigo = N'Clientes' THEN 0 ELSE 1 END

    );

    IF @grupo IS NULL

        SET @grupo = (SELECT TOP 1 Id FROM dbo.Usuarios_Modulos_Grupos ORDER BY Id);



    DECLARE @orden INT = ISNULL((SELECT MAX(Orden) + 1 FROM dbo.Usuarios_Modulos), 1);



    INSERT INTO dbo.Usuarios_Modulos (Nombre, Codigo, IdGrupo, Orden, Activo)

    VALUES (N'Transportes', N'Transportes', @grupo, @orden, 1);

END

GO



DECLARE @IdModulo INT = (SELECT TOP 1 Id FROM dbo.Usuarios_Modulos WHERE Codigo = N'Transportes');

DECLARE @IdRolAdmin INT = 1;



IF @IdModulo IS NOT NULL

BEGIN

    INSERT INTO dbo.Usuarios_RolesPermisos (IdRol, IdModulo, IdPermiso, Activo, FechaRegistra)

    SELECT @IdRolAdmin, @IdModulo, p.Id, 1, GETDATE()

    FROM dbo.Usuarios_Permisos p

    WHERE p.Activo = 1 AND p.IdModulo IS NULL

      AND NOT EXISTS (

            SELECT 1 FROM dbo.Usuarios_RolesPermisos rp

            WHERE rp.IdRol = @IdRolAdmin AND rp.IdModulo = @IdModulo AND rp.IdPermiso = p.Id

      );



    INSERT INTO dbo.Usuarios_PermisosUsuario (IdUsuario, IdModulo, IdPermiso, Activo, FechaRegistra)

    SELECT u.Id, @IdModulo, p.Id, 1, GETDATE()

    FROM dbo.Usuarios u

    CROSS JOIN dbo.Usuarios_Permisos p

    WHERE u.IdRol = @IdRolAdmin

      AND p.Activo = 1

      AND p.IdModulo IS NULL

      AND NOT EXISTS (

            SELECT 1 FROM dbo.Usuarios_PermisosUsuario upu

            WHERE upu.IdUsuario = u.Id AND upu.IdModulo = @IdModulo AND upu.IdPermiso = p.Id

      );

END

GO

