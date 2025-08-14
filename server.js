const express = require('express');
const cors = require('cors');
const path = require('path');
const { initializeConnections, closeAllConnections } = require('./config/database');

// =============================================
// SERVIDOR POLI-CAR NUEVO
// Conectando a bases de datos existentes
// =============================================

const app = express();
const PORT = process.env.PORT || 3000;

// =============================================
// MIDDLEWARE
// =============================================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// =============================================
// RUTAS DE API
// =============================================
const apiRoutes = require('./routes/apiRoutes');
const diagnosticoRoutes = require('./routes/diagnosticoRoutes');

app.use('/api', apiRoutes);
app.use('/api', diagnosticoRoutes);

// =============================================
// RUTA PRINCIPAL
// =============================================
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>POLI-CAR Nuevo - Sistema Distribuido</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
          .container { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 20px; margin-bottom: 30px; }
          .section { margin: 20px 0; padding: 15px; background: #ecf0f1; border-radius: 5px; }
          .endpoint { background: #34495e; color: white; padding: 8px 12px; border-radius: 4px; font-family: monospace; margin: 5px 0; display: inline-block; }
          .status-ok { color: #27ae60; font-weight: bold; }
          .architecture { background: #e8f5e8; border-left: 4px solid #27ae60; padding: 15px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚗 POLI-CAR Nuevo - Sistema Distribuido</h1>
            <p><span class="status-ok">✅ Conectado a bases existentes</span></p>
          </div>
          
          <div class="architecture">
            <h3>📊 Arquitectura Implementada</h3>
            <ul>
              <li><strong>PoliCarCentral:</strong> Base centralizada con replicación completa</li>
              <li><strong>PoliCarSedeNorte:</strong> Fragmentación horizontal NORTE</li>
              <li><strong>PoliCarSedeSur:</strong> Fragmentación horizontal SUR</li>
            </ul>
          </div>
          
          <div class="section">
            <h3>🔗 Endpoints Disponibles</h3>
            <div class="endpoint">GET /api/status</div> - Estado del sistema<br>
            <div class="endpoint">GET /api/clientes</div> - Todos los clientes<br>
            <div class="endpoint">GET /api/vehiculos</div> - Todos los vehículos<br>
            <div class="endpoint">GET /api/empleados</div> - Todos los empleados<br>
            <div class="endpoint">GET /api/empleados/sede/:sede</div> - Empleados por sede<br>
            <div class="endpoint">GET /api/repuestos</div> - Todos los repuestos<br>
            <div class="endpoint">GET /api/repuestos/sede/:sede</div> - Repuestos por sede<br>
            <div class="endpoint">GET /api/reparaciones</div> - Todas las reparaciones<br>
            <div class="endpoint">GET /api/reparaciones/sede/:sede</div> - Reparaciones por sede<br>
            <div class="endpoint">GET /api/resumen-sedes</div> - Resumen por sedes<br>
            <div class="endpoint">GET /api/estadisticas</div> - Estadísticas generales<br>
            <div class="endpoint">GET /api/diagnostico/:sede</div> - Diagnóstico por sede
          </div>
          
          <div class="section">
            <h3>🎯 Sedes Disponibles</h3>
            <p><strong>CENTRAL:</strong> localhost - PoliCarCentral</p>
            <p><strong>NORTE:</strong> 26.154.21.115 - PoliCarSedeNorte</p>
            <p><strong>SUR:</strong> 26.91.154.235 - PoliCarSedeSur</p>
          </div>
          
          <div class="section">
            <h3>🧪 Pruebas Rápidas</h3>
            <a href="/api/status" target="_blank">Estado del Sistema</a><br>
            <a href="/api/clientes" target="_blank">Ver Clientes</a><br>
            <a href="/api/vehiculos" target="_blank">Ver Vehículos</a><br>
            <a href="/api/estadisticas" target="_blank">Ver Estadísticas</a><br>
            <a href="/api/diagnostico/central" target="_blank">Diagnostico Central</a><br>
            <a href="/api/diagnostico/norte" target="_blank">Diagnostico Norte</a><br>
            <a href="/api/diagnostico/sur" target="_blank">Diagnostico Sur</a>
          </div>
        </div>
      </body>
    </html>
  `);
});

// =============================================
// INICIALIZACIÓN DEL SERVIDOR
// =============================================
async function startServer() {
  try {
    console.log('🚀 Iniciando POLI-CAR Nuevo...');
    
    // Inicializar conexiones a bases existentes
    const connectionStatus = await initializeConnections();
    
    // Mostrar estado de conexiones
    console.log('\n📊 Estado de conexiones:');
    console.log(`   Central: ${connectionStatus.central ? '✅ Conectada' : '❌ Desconectada'}`);
    console.log(`   Norte:   ${connectionStatus.norte ? '✅ Conectada' : '❌ Desconectada'}`);
    console.log(`   Sur:     ${connectionStatus.sur ? '✅ Conectada' : '❌ Desconectada'}`);
    
    // Iniciar servidor HTTP
    app.listen(PORT, () => {
      console.log(`\n🌐 Servidor ejecutándose en:`);
      console.log(`   📍 http://localhost:${PORT}`);
      console.log(`   📍 http://localhost:${PORT}/api/status`);
      console.log(`\n🎯 POLI-CAR Nuevo listo para usar bases existentes!`);
    });
    
  } catch (error) {
    console.error('❌ Error iniciando servidor:', error);
    process.exit(1);
  }
}

// =============================================
// MANEJO DE CIERRE GRACEFUL
// =============================================
process.on('SIGINT', async () => {
  console.log('\n🛑 Cerrando POLI-CAR Nuevo...');
  await closeAllConnections();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Terminando POLI-CAR Nuevo...');
  await closeAllConnections();
  process.exit(0);
});

// Iniciar el servidor
startServer();
