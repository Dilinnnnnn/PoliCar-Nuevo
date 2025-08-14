const sql = require('mssql');

// =============================================
// CONFIGURACIÓN POLI-CAR DISTRIBUIDO
// Solo nodos Norte y Sur
// =============================================

const dbConfig = {
  // Sede Norte (IP remota)
  norte: {
    user: 'sa',
    password: 'P@ssw0rd',
    server: '26.154.21.115',
    port: 1433,
    database: 'PoliCarSedeNorte',
    options: {
      encrypt: false,
      trustServerCertificate: true,
      enableArithAbort: true,
      connectTimeout: 30000,
      requestTimeout: 30000
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000
    }
  },

  // Sede Sur (IP remota)
  sur: {
    user: 'sa',
    password: 'P@ssw0rd',
    server: '26.91.154.235',
    port: 1433,
    database: 'PoliCarSedeSur',
    options: {
      encrypt: false,
      trustServerCertificate: true,
      enableArithAbort: true,
      connectTimeout: 30000,
      requestTimeout: 30000
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000
    }
  }
};

// Pools de conexión
let pools = {
  norte: null,
  sur: null
};

// Estado de conexiones
let connectionStatus = {
  norte: false,
  sur: false
};

// =============================================
// FUNCIONES DE CONEXIÓN
// =============================================

async function initializeConnections() {
  console.log('🔄 Inicializando conexiones a bases POLI-CAR distribuidas...');
  
  // Conectar a Norte
  try {
    pools.norte = await new sql.ConnectionPool(dbConfig.norte).connect();
    connectionStatus.norte = true;
    console.log('✅ Conectado a Norte: PoliCarSedeNorte');
  } catch (error) {
    console.log('❌ Error conectando a Norte:', error.message);
    connectionStatus.norte = false;
  }

  // Conectar a Norte
  try {
    pools.norte = await new sql.ConnectionPool(dbConfig.norte).connect();
    connectionStatus.norte = true;
    console.log('✅ Conectado a Norte: PoliCarSedeNorte');
  } catch (error) {
    console.log('❌ Error conectando a Norte:', error.message);
    connectionStatus.norte = false;
  }

  // Conectar a Sur
  try {
    pools.sur = await new sql.ConnectionPool(dbConfig.sur).connect();
    connectionStatus.sur = true;
    console.log('✅ Conectado a Sur: PoliCarSedeSur');
  } catch (error) {
    console.log('❌ Error conectando a Sur:', error.message);
    connectionStatus.sur = false;
  }

  console.log('🎯 Inicialización de conexiones completada');
  return connectionStatus;
}

// Obtener pool de conexión
function getPool(sede) {
  const sedes = {
    'NORTE': pools.norte,
    'SUR': pools.sur
  };
  
  return sedes[sede.toUpperCase()] || null;
}

// Cerrar todas las conexiones
async function closeAllConnections() {
  console.log('🔌 Cerrando conexiones...');
  
  if (pools.norte) {
    await pools.norte.close();
    console.log('✅ Conexión Norte cerrada');
  }
  
  if (pools.sur) {
    await pools.sur.close();
    console.log('✅ Conexión Sur cerrada');
  }
}

// Obtener estado de conexiones
function getConnectionStatus() {
  return {
    connections: connectionStatus,
    message: 'POLI-CAR Sistema Distribuido - Estado actual',
    timestamp: new Date().toISOString(),
    summary: {
      total: 2,
      connected: Object.values(connectionStatus).filter(Boolean).length,
      disconnected: Object.values(connectionStatus).filter(status => !status).length
    }
  };
}

module.exports = {
  dbConfig,
  initializeConnections,
  getPool,
  closeAllConnections,
  getConnectionStatus,
  pools,
  connectionStatus
};
