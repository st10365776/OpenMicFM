const sql = require('mssql');

const config = {
  server: process.env.SQL_SERVER,
  port: Number(process.env.SQL_PORT || 1433),
  database: process.env.SQL_DATABASE,
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  options: {
    encrypt: true,
    trustServerCertificate: false
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  },
  connectionTimeout: 30000,
  requestTimeout: 30000
};

let pool;

function getPool() {
  if (!config.server || !config.database || !config.user || !config.password) {
    throw new Error('Set SQL_SERVER, SQL_DATABASE, SQL_USER, and SQL_PASSWORD before starting the API.');
  }

  if (!pool) pool = new sql.ConnectionPool(config).connect();
  return pool;
}

function prepareRequest(executor, query, values = []) {
  const request = executor.request();

  values.forEach((value, index) => {
    const name = `p${index + 1}`;
    const parameter = Array.isArray(value) ? JSON.stringify(value) : value;
    if (parameter === null || parameter === undefined) {
      request.input(name, sql.NVarChar(sql.MAX), null);
    } else {
      request.input(name, parameter);
    }
  });

  return request.query(query);
}

async function query(queryText, values = []) {
  const connection = await getPool();
  return prepareRequest(connection, queryText, values);
}

async function transaction(callback) {
  const connection = await getPool();
  const tx = new sql.Transaction(connection);
  await tx.begin();

  try {
    const result = await callback({
      query: (queryText, values) => prepareRequest(tx, queryText, values)
    });
    await tx.commit();
    return result;
  } catch (error) {
    await tx.rollback();
    throw error;
  }
}

async function initialize() {
  await query(`
    IF OBJECT_ID(N'dbo.admin_users', N'U') IS NULL
    BEGIN
      CREATE TABLE dbo.admin_users (
        id INT IDENTITY(1,1) PRIMARY KEY,
        email NVARCHAR(254) NOT NULL UNIQUE,
        password_hash NVARCHAR(255) NOT NULL,
        full_name NVARCHAR(120) NOT NULL,
        initials NVARCHAR(12) NOT NULL,
        role NVARCHAR(50) NOT NULL,
        created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME()
      );
    END;

    IF OBJECT_ID(N'dbo.listeners', N'U') IS NULL
    BEGIN
      CREATE TABLE dbo.listeners (
        id INT IDENTITY(1,1) PRIMARY KEY,
        full_name NVARCHAR(120) NOT NULL,
        email NVARCHAR(254) NOT NULL UNIQUE,
        password_hash NVARCHAR(255) NOT NULL,
        created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME()
      );
    END;

    IF OBJECT_ID(N'dbo.shows', N'U') IS NULL
    BEGIN
      CREATE TABLE dbo.shows (
        id INT IDENTITY(1,1) PRIMARY KEY,
        day_of_week NVARCHAR(3) NOT NULL,
        days_of_week NVARCHAR(MAX) NOT NULL DEFAULT N'[]',
        show_dates NVARCHAR(MAX) NOT NULL DEFAULT N'[]',
        start_time TIME(0) NOT NULL,
        end_time TIME(0) NOT NULL,
        start_date DATE NULL,
        end_date DATE NULL,
        name NVARCHAR(200) NOT NULL,
        title NVARCHAR(200) NOT NULL DEFAULT N'',
        description NVARCHAR(MAX) NOT NULL DEFAULT N'',
        image NVARCHAR(2048) NOT NULL DEFAULT N'',
        presenter NVARCHAR(200) NOT NULL,
        initials NVARCHAR(12) NOT NULL,
        tone NVARCHAR(30) NOT NULL,
        created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        updated_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME()
      );
    END;

    IF OBJECT_ID(N'dbo.songs', N'U') IS NULL
    BEGIN
      CREATE TABLE dbo.songs (
        id INT IDENTITY(1,1) PRIMARY KEY,
        rank INT NOT NULL,
        title NVARCHAR(200) NOT NULL,
        artist NVARCHAR(200) NOT NULL,
        plays INT NOT NULL DEFAULT 0,
        image NVARCHAR(2048) NOT NULL DEFAULT N'',
        visible BIT NOT NULL DEFAULT 1,
        created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        updated_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME()
      );
    END;

    IF OBJECT_ID(N'dbo.posts', N'U') IS NULL
    BEGIN
      CREATE TABLE dbo.posts (
        id INT IDENTITY(1,1) PRIMARY KEY,
        type NVARCHAR(50) NOT NULL,
        title NVARCHAR(300) NOT NULL,
        slug NVARCHAR(300) NOT NULL UNIQUE,
        excerpt NVARCHAR(MAX) NULL,
        body NVARCHAR(MAX) NULL,
        image NVARCHAR(2048) NOT NULL DEFAULT N'',
        status NVARCHAR(30) NOT NULL,
        author_id INT NULL,
        published_at DATETIME2(3) NULL,
        created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        updated_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME()
      );
    END;

    IF OBJECT_ID(N'dbo.contact_messages', N'U') IS NULL
    BEGIN
      CREATE TABLE dbo.contact_messages (
        id INT IDENTITY(1,1) PRIMARY KEY,
        name NVARCHAR(120) NOT NULL,
        email NVARCHAR(254) NOT NULL,
        message NVARCHAR(MAX) NOT NULL,
        created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME()
      );
    END;

    IF OBJECT_ID(N'dbo.admin_activity', N'U') IS NULL
    BEGIN
      CREATE TABLE dbo.admin_activity (
        id INT IDENTITY(1,1) PRIMARY KEY,
        activity_type NVARCHAR(80) NOT NULL,
        title NVARCHAR(300) NOT NULL,
        description NVARCHAR(MAX) NOT NULL DEFAULT N'',
        category NVARCHAR(80) NOT NULL,
        icon NVARCHAR(30) NOT NULL DEFAULT N'blue',
        actor_name NVARCHAR(200) NOT NULL,
        created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME()
      );
    END;

    IF OBJECT_ID(N'dbo.dashboard_metrics', N'U') IS NULL
    BEGIN
      CREATE TABLE dbo.dashboard_metrics (
        metric_key NVARCHAR(80) PRIMARY KEY,
        metric_value NVARCHAR(120) NOT NULL,
        change_value NVARCHAR(80) NOT NULL DEFAULT N'',
        change_text NVARCHAR(200) NOT NULL DEFAULT N''
      );
    END;
  `);
}

async function close() {
  if (pool) {
    const connection = await pool;
    await connection.close();
    pool = null;
  }
}

module.exports = { close, initialize, query, transaction };
