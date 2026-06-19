/* =====================================================================
   PromptCraft — Schema.  Run inside the PromptCraft database.
   PKs: BIGINT IDENTITY.  Timestamps: DATETIME2(3) UTC via SYSUTCDATETIME().
   ===================================================================== */
USE PromptCraft;
GO

/* ---------- 1. Users ---------- */
IF OBJECT_ID(N'dbo.Users', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Users
    (
        Id            BIGINT        IDENTITY(1,1) NOT NULL,
        Email         NVARCHAR(256) NOT NULL,
        PasswordHash  NVARCHAR(255) NOT NULL,            -- bcrypt hash
        FullName      NVARCHAR(256) NULL,
        IsActive      BIT           NOT NULL CONSTRAINT DF_Users_IsActive  DEFAULT (1),
        CreatedAt     DATETIME2(3)  NOT NULL CONSTRAINT DF_Users_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedAt     DATETIME2(3)  NULL,
        CONSTRAINT PK_Users PRIMARY KEY (Id)
    );
END
GO

/* ---------- 2. RefreshTokens ---------- */
IF OBJECT_ID(N'dbo.RefreshTokens', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.RefreshTokens
    (
        Id                   BIGINT        IDENTITY(1,1) NOT NULL,
        UserId               BIGINT        NOT NULL,
        TokenHash            NVARCHAR(255) NOT NULL,      -- SHA-256 of the raw token (never store raw)
        ExpiresAt            DATETIME2(3)  NOT NULL,
        Revoked              BIT           NOT NULL CONSTRAINT DF_RefreshTokens_Revoked   DEFAULT (0),
        ReplacedByTokenHash  NVARCHAR(255) NULL,          -- rotation chain → reuse detection
        UserAgent            NVARCHAR(512) NULL,
        IpAddress            NVARCHAR(45)  NULL,          -- IPv6 max length
        CreatedAt            DATETIME2(3)  NOT NULL CONSTRAINT DF_RefreshTokens_CreatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_RefreshTokens PRIMARY KEY (Id),
        CONSTRAINT FK_RefreshTokens_Users FOREIGN KEY (UserId)
            REFERENCES dbo.Users (Id) ON DELETE CASCADE
    );
END
GO

/* ---------- 3. Templates ---------- */
IF OBJECT_ID(N'dbo.Templates', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Templates
    (
        Id            BIGINT        IDENTITY(1,1) NOT NULL,
        Name          NVARCHAR(200) NOT NULL,
        Domain        NVARCHAR(50)  NOT NULL,
        Body          NVARCHAR(MAX) NOT NULL,            -- contains {{variables}}
        VariablesJson NVARCHAR(MAX) NOT NULL,            -- JSON array of variable defs
        IsSystem      BIT           NOT NULL CONSTRAINT DF_Templates_IsSystem  DEFAULT (1),
        CreatedBy     BIGINT        NULL,                -- NULL = system template
        CreatedAt     DATETIME2(3)  NOT NULL CONSTRAINT DF_Templates_CreatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_Templates PRIMARY KEY (Id),
        CONSTRAINT FK_Templates_Users FOREIGN KEY (CreatedBy)
            REFERENCES dbo.Users (Id) ON DELETE SET NULL,
        CONSTRAINT CK_Templates_VariablesJson CHECK (ISJSON(VariablesJson) = 1)
    );
END
GO

/* ---------- 4. Prompts ---------- */
IF OBJECT_ID(N'dbo.Prompts', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Prompts
    (
        Id          BIGINT        IDENTITY(1,1) NOT NULL,
        UserId      BIGINT        NOT NULL,
        TemplateId  BIGINT        NULL,
        Title       NVARCHAR(200) NULL,
        Content     NVARCHAR(MAX) NOT NULL,
        Domain      NVARCHAR(50)  NULL,
        Mode        NVARCHAR(20)  NOT NULL,
        IsFavorite  BIT           NOT NULL CONSTRAINT DF_Prompts_IsFavorite DEFAULT (0),
        CreatedAt   DATETIME2(3)  NOT NULL CONSTRAINT DF_Prompts_CreatedAt  DEFAULT (SYSUTCDATETIME()),
        UpdatedAt   DATETIME2(3)  NULL,
        CONSTRAINT PK_Prompts PRIMARY KEY (Id),
        CONSTRAINT FK_Prompts_Users FOREIGN KEY (UserId)
            REFERENCES dbo.Users (Id) ON DELETE CASCADE,
        CONSTRAINT FK_Prompts_Templates FOREIGN KEY (TemplateId)
            REFERENCES dbo.Templates (Id),   -- ON DELETE NO ACTION (deliberate, see note)
        CONSTRAINT CK_Prompts_Mode CHECK (Mode IN (N'template', N'ai', N'library'))
    );
END
GO




--Indexing Indexes (including the filtered ones)


-- Unique email (login lookup)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_Users_Email' AND object_id=OBJECT_ID(N'dbo.Users'))
    CREATE UNIQUE NONCLUSTERED INDEX UX_Users_Email ON dbo.Users (Email);

-- Unique token hash
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_RefreshTokens_TokenHash' AND object_id=OBJECT_ID(N'dbo.RefreshTokens'))
    CREATE UNIQUE NONCLUSTERED INDEX UX_RefreshTokens_TokenHash ON dbo.RefreshTokens (TokenHash);

-- All tokens for a user
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_RefreshTokens_UserId' AND object_id=OBJECT_ID(N'dbo.RefreshTokens'))
    CREATE NONCLUSTERED INDEX IX_RefreshTokens_UserId ON dbo.RefreshTokens (UserId);

-- FILTERED: active (non-revoked) tokens by expiry — used by validation + nightly purge
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_RefreshTokens_Active_ExpiresAt' AND object_id=OBJECT_ID(N'dbo.RefreshTokens'))
    CREATE NONCLUSTERED INDEX IX_RefreshTokens_Active_ExpiresAt
        ON dbo.RefreshTokens (ExpiresAt) WHERE Revoked = 0;

-- User history, newest first
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_Prompts_UserId_CreatedAt' AND object_id=OBJECT_ID(N'dbo.Prompts'))
    CREATE NONCLUSTERED INDEX IX_Prompts_UserId_CreatedAt
        ON dbo.Prompts (UserId, CreatedAt DESC);

-- FILTERED: favorites only
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_Prompts_Favorites' AND object_id=OBJECT_ID(N'dbo.Prompts'))
    CREATE NONCLUSTERED INDEX IX_Prompts_Favorites
        ON dbo.Prompts (UserId) WHERE IsFavorite = 1;

-- Templates by domain (library browsing)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_Templates_Domain' AND object_id=OBJECT_ID(N'dbo.Templates'))
    CREATE NONCLUSTERED INDEX IX_Templates_Domain ON dbo.Templates (Domain);
GO





--Seed system templates (idempotent)

IF NOT EXISTS (SELECT 1 FROM dbo.Templates WHERE Name = N'Refactor + Tests')
INSERT INTO dbo.Templates (Name, Domain, Body, VariablesJson, IsSystem, CreatedBy)
VALUES
(N'Refactor + Tests', N'coding',
 N'You are an expert {{language}} engineer. Refactor the following code for readability, performance, and idiomatic style, then add {{test_framework}} unit tests covering the main paths and edge cases.

Constraints: {{constraints}}

Code:
{{code}}

Return the refactored code first, then the tests.',
 N'[
   {"name":"language","label":"Programming language","type":"text","required":true},
   {"name":"test_framework","label":"Test framework","type":"text","required":true},
   {"name":"constraints","label":"Constraints / style guide","type":"textarea","required":false},
   {"name":"code","label":"Code to refactor","type":"textarea","required":true}
 ]', 1, NULL);

IF NOT EXISTS (SELECT 1 FROM dbo.Templates WHERE Name = N'Social Post')
INSERT INTO dbo.Templates (Name, Domain, Body, VariablesJson, IsSystem, CreatedBy)
VALUES
(N'Social Post', N'writing',
 N'Write a {{tone}} {{platform}} post promoting {{topic}} for this audience: {{audience}}. Keep it under {{max_length}} characters, end with a clear call to action, and suggest {{hashtag_count}} relevant hashtags.',
 N'[
   {"name":"tone","label":"Tone","type":"text","required":true},
   {"name":"platform","label":"Platform","type":"text","required":true},
   {"name":"topic","label":"Topic / product","type":"text","required":true},
   {"name":"audience","label":"Target audience","type":"text","required":true},
   {"name":"max_length","label":"Max characters","type":"number","required":false},
   {"name":"hashtag_count","label":"How many hashtags","type":"number","required":false}
 ]', 1, NULL);

IF NOT EXISTS (SELECT 1 FROM dbo.Templates WHERE Name = N'SQL From Question')
INSERT INTO dbo.Templates (Name, Domain, Body, VariablesJson, IsSystem, CreatedBy)
VALUES
(N'SQL From Question', N'data',
 N'You are a senior data analyst. Given this database schema:
{{schema}}

Write a single {{dialect}} SQL query that answers the question: "{{question}}".
Then explain in one or two sentences what the query does. Optimize for correctness and readability.',
 N'[
   {"name":"schema","label":"Schema (tables & columns)","type":"textarea","required":true},
   {"name":"dialect","label":"SQL dialect","type":"text","required":true},
   {"name":"question","label":"Question to answer","type":"textarea","required":true}
 ]', 1, NULL);
GO


--check
SELECT name AS [table] FROM sys.tables ORDER BY name;                       -- expect: Prompts, RefreshTokens, Templates, Users
SELECT Id, Name, Domain, IsSystem FROM dbo.Templates ORDER BY Id;           -- expect: 3 seeded rows
SELECT t.name AS [table], i.name AS [index], i.is_unique, i.has_filter      -- expect: 8 named indexes, 2 filtered
FROM sys.indexes i JOIN sys.tables t ON t.object_id = i.object_id
WHERE i.name IS NOT NULL
ORDER BY t.name, i.name;
GO