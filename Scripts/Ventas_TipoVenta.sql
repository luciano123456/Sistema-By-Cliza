-- Agrega TipoVenta a Ventas (Fisico | Online). Default: Fisico
IF COL_LENGTH('dbo.Ventas', 'TipoVenta') IS NULL
BEGIN
    ALTER TABLE dbo.Ventas
    ADD TipoVenta varchar(20) NOT NULL
        CONSTRAINT DF_Ventas_TipoVenta DEFAULT ('Fisico');
END
GO
