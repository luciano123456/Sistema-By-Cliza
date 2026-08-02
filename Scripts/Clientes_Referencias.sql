/*
  Clientes: campo Referencias (para remito fábrica)
  Ejecutar contra Sistema_ByCliza
*/

IF COL_LENGTH('dbo.Clientes', 'Referencias') IS NULL
BEGIN
    ALTER TABLE dbo.Clientes ADD Referencias NVARCHAR(250) NULL;
END
GO
