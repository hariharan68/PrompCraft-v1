
-- Run once in SSMS / Azure Data Studio, connected to  localhost\SQLEXPRESS
IF DB_ID('PromptCraft') IS NULL
BEGIN
    CREATE DATABASE PromptCraft;
END
GO


--Full Detaild MSSQL DB Query is in Docs find there  