const sql = require('mssql');

// =============================================
// CONFIGURACIÓN ALTERNATIVA POLI-CAR NUEVO
// Múltiples opciones de autenticación
// =============================================

// OPCIÓN 1: Configuración actual (como está)
const dbConfigOriginal = {
  central: {
    server: 'localhost',
    database: 'PoliCarCentral',
    options: {
      encrypt: false,
      trustServerCertificate: true,
      enableArithAbort: true
    },
    authentication: {
      type: 'ntlm',
      options: {
        domain: '',
        userName: '',
        password: ''
      }
    }
  },
  norte: {
    server: '26.154.21.115\\SQLEXPRESS',
    database: 'PoliCarSedeNorte',
    user: 'sa',
    password: '123456'
  },
  sur: {
    server: '26.91.154.235\\SQLEXPRESS',
    database: 'PoliCarSedeSur',
    user: 'sa',
    password: '123456'
  }
};

// OPCIÓN 2: Central con usuario SQL Server
const dbConfigSQLAuth = {
  central: {
    server: 'localhost',
    database: 'PoliCarCentral',
    user: 'sa',
    password: 'tu_contraseña_aqui', // CAMBIAR POR TU CONTRASEÑA
    options: {
      encrypt: false,
      trustServerCertificate: true,
      enableArithAbort: true
    }
  },
  norte: {
    server: '26.154.21.115\\SQLEXPRESS',
    database: 'PoliCarSedeNorte',
    user: 'sa',
    password: '123456'
  },
  sur: {
    server: '26.91.154.235\\SQLEXPRESS',
    database: 'PoliCarSedeSur',
    user: 'sa',
    password: '123456'
  }
};

// OPCIÓN 3: Sin instancia \SQLEXPRESS
const dbConfigSinInstancia = {
  central: {
    server: 'localhost',
    database: 'PoliCarCentral',
    user: 'sa',
    password: 'tu_contraseña_aqui', // CAMBIAR POR TU CONTRASEÑA
    options: {
      encrypt: false,
      trustServerCertificate: true,
      enableArithAbort: true
    }
  },
  norte: {
    server: '26.154.21.115',  // SIN \SQLEXPRESS
    database: 'PoliCarSedeNorte',
    user: 'sa',
    password: '123456'
  },
  sur: {
    server: '26.91.154.235',   // SIN \SQLEXPRESS
    database: 'PoliCarSedeSur',
    user: 'sa',
    password: '123456'
  }
};

// OPCIÓN 4: Puerto específico
const dbConfigConPuerto = {
  central: {
    server: 'localhost',
    port: 1433,
    database: 'PoliCarCentral',
    user: 'sa',
    password: 'tu_contraseña_aqui', // CAMBIAR POR TU CONTRASEÑA
    options: {
      encrypt: false,
      trustServerCertificate: true,
      enableArithAbort: true
    }
  },
  norte: {
    server: '26.154.21.115',
    port: 1433,  // O el puerto que uses
    database: 'PoliCarSedeNorte',
    user: 'sa',
    password: '123456'
  },
  sur: {
    server: '26.91.154.235',
    port: 1433,   // O el puerto que uses
    database: 'PoliCarSedeSur',
    user: 'sa',
    password: '123456'
  }
};

// =============================================
// SELECCIONA LA CONFIGURACIÓN A USAR
// =============================================

// CAMBIAR AQUÍ: Descomenta la configuración que quieras probar
const dbConfig = dbConfigOriginal;        // Opción 1: Configuración actual
// const dbConfig = dbConfigSQLAuth;      // Opción 2: Central con SQL Auth
// const dbConfig = dbConfigSinInstancia; // Opción 3: Sin instancia SQLEXPRESS
// const dbConfig = dbConfigConPuerto;    // Opción 4: Con puerto específico

// Agregar configuraciones comunes a todas las opciones
Object.keys(dbConfig).forEach(sede => {
  dbConfig[sede] = {
    ...dbConfig[sede],
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000
    },
    requestTimeout: 60000,
    connectionTimeout: 15000,
    options: {
      ...dbConfig[sede].options,
      encrypt: false,
      trustServerCertificate: true,
      enableArithAbort: true
    }
  };
});

// Pools de conexión
let pools = {
  central: null,
  norte: null,
  sur: null
};

// Estado de conexiones
let connectionStatus = {
  central: false,
  norte: false,
  sur: false
};

// =============================================
// FUNCIONES DE CONEXIÓN
// =============================================

async function initializeConnections() {
  console.log('🔄 Conectando a bases POLI-CAR existentes...');
  console.log('📋 Configuración seleccionada:');
  console.log(`   Central: ${dbConfig.central.server} - Base: ${dbConfig.central.database}`);
  console.log(`   Norte:   ${dbConfig.norte.server} - Base: ${dbConfig.norte.database}`);
  console.log(`   Sur:     ${dbConfig.sur.server} - Base: ${dbConfig.sur.database}`);
  console.log('');
  
  // Conectar a Central
  try {
    console.log('🔄 Intentando conectar a Central...');
    if (dbConfig.central.authentication) {
      // Windows Authentication
      pools.central = await sql.connect(dbConfig.central);
    } else {
      // SQL Server Authentication
      pools.central = new sql.ConnectionPool(dbConfig.central);
      await pools.central.connect();
    }
    connectionStatus.central = true;
    console.log('✅ Conectado a Central: PoliCarCentral');
  } catch (error) {
    console.log('❌ Error conectando a Central:', error.message);
    console.log('💡 Intenta: Cambiar a SQL Server Authentication en config/database_alternativo.js');
    connectionStatus.central = false;
  }

  // Conectar a Norte
  try {
    console.log('🔄 Intentando conectar a Norte...');
    pools.norte = new sql.ConnectionPool(dbConfig.norte);
    await pools.norte.connect();
    connectionStatus.norte = true;
    console.log('✅ Conectado a Norte: PoliCarSedeNorte');
  } catch (error) {
    console.log('❌ Error conectando a Norte:', error.message);
    if (error.message.includes('Port for SQLEXPRESS not found')) {
      console.log('💡 Intenta: Usar configuración sin \\SQLEXPRESS o con puerto específico');
    }
    connectionStatus.norte = false;
  }

  // Conectar a Sur
  try {
    console.log('🔄 Intentando conectar a Sur...');
    pools.sur = new sql.ConnectionPool(dbConfig.sur);
    await pools.sur.connect();
    connectionStatus.sur = true;
    console.log('✅ Conectado a Sur: PoliCarSedeSur');
  } catch (error) {
    console.log('❌ Error conectando a Sur:', error.message);
    if (error.message.includes('Port for SQLEXPRESS not found')) {
      console.log('💡 Intenta: Usar configuración sin \\SQLEXPRESS o con puerto específico');
    }
    connectionStatus.sur = false;
  }

  console.log('🎯 Conexión a bases existentes completada');
  return connectionStatus;
}

// Obtener pool de conexión
function getPool(sede) {
  const sedes = {
    'CENTRAL': pools.central,
    'NORTE': pools.norte,
    'SUR': pools.sur
  };
  
  return sedes[sede.toUpperCase()] || null;
}

// Cerrar todas las conexiones
async function closeAllConnections() {
  console.log('🔌 Cerrando conexiones...');
  
  try {
    if (pools.central) {
      await pools.central.close();
      console.log('✅ Central cerrada');
    }
  } catch (error) {
    console.log('⚠️  Error cerrando Central:', error.message);
  }
  
  try {
    if (pools.norte) {
      await pools.norte.close();
      console.log('✅ Norte cerrada');
    }
  } catch (error) {
    console.log('⚠️  Error cerrando Norte:', error.message);
  }
  
  try {
    if (pools.sur) {
      await pools.sur.close();
      console.log('✅ Sur cerrada');
    }
  } catch (error) {
    console.log('⚠️  Error cerrando Sur:', error.message);
  }
  
  console.log('👋 Proceso de cierre completado');
}

// Obtener estado de conexiones
function getConnectionStatus() {
  return {
    status: 'OK',
    timestamp: new Date().toISOString(),
    connections: {
      central: connectionStatus.central,
      norte: connectionStatus.norte,
      sur: connectionStatus.sur
    },
    totalConnected: Object.values(connectionStatus).filter(Boolean).length,
    databases: {
      central: 'PoliCarCentral (Replicación completa + Datos centralizados)',
      norte: 'PoliCarSedeNorte (Fragmentación horizontal NORTE)',
      sur: 'PoliCarSedeSur (Fragmentación horizontal SUR)'
    },
    configuration: 'database_alternativo.js - Múltiples opciones disponibles',
    features: [
      'Fragmentación Horizontal por Sede (Empleados, Repuestos, Reparaciones)',
      'Fragmentación Vertical de Empleados (Información vs Nómina)',
      'Replicación Completa (Clientes, Vehículos, Talleres)',
      'Arquitectura Distribuida con Linked Servers'
    ]
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
