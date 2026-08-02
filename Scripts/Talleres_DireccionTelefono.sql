/*
  Talleres: Direccion y Telefono (para remito de orden de corte)
  Ejecutar contra Sistema_ByCliza
*/

IF COL_LENGTH('dbo.Talleres', 'Direccion') IS NULL
BEGIN
    ALTER TABLE dbo.Talleres ADD Direccion NVARCHAR(250) NULL;
END
GO

IF COL_LENGTH('dbo.Talleres', 'Telefono') IS NULL
BEGIN
    ALTER TABLE dbo.Talleres ADD Telefono NVARCHAR(50) NULL;
END
GO
