const express = require('express');
const router = express.Router();
const dataService = require('../services/dataService');

// =============================================
// RUTAS DE API POLI-CAR NUEVO
// Usando bases de datos existentes
// =============================================

// =============================================
// RUTA GENERAL DE ESTADO
// =============================================
router.get('/status', async (req, res) => {
  try {
    const { getConnectionStatus } = require('../config/database');
    const status = getConnectionStatus();
    
    res.json({
      success: true,
      message: 'POLI-CAR Nuevo - Estado del sistema',
      data: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error obteniendo estado del sistema',
      error: error.message
    });
  }
});

// =============================================
// RUTAS DE CLIENTES (REPLICADAS)
// =============================================

// GET - Obtener todos los clientes
router.get('/clientes', async (req, res) => {
  try {
    const result = await dataService.obtenerClientes();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error obteniendo clientes',
      error: error.message,
      data: []
    });
  }
});

// POST - Crear nuevo cliente
router.post('/clientes', async (req, res) => {
  try {
    const result = await dataService.crearCliente(req.body);
    const status = result.success ? 201 : 400;
    res.status(status).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creando cliente',
      error: error.message,
      data: null
    });
  }
});

// =============================================
// RUTAS DE VEHÍCULOS (REPLICADAS)
// =============================================

// GET - Obtener todos los vehículos
router.get('/vehiculos', async (req, res) => {
  try {
    const result = await dataService.obtenerVehiculos();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error obteniendo vehículos',
      error: error.message,
      data: []
    });
  }
});

// POST - Crear nuevo vehículo
router.post('/vehiculos', async (req, res) => {
  try {
    const result = await dataService.crearVehiculo(req.body);
    const status = result.success ? 201 : 400;
    res.status(status).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creando vehículo',
      error: error.message,
      data: null
    });
  }
});

// =============================================
// RUTAS DE EMPLEADOS (FRAGMENTACIÓN HORIZONTAL + VERTICAL)
// =============================================

// GET - Obtener todos los empleados
router.get('/empleados', async (req, res) => {
  try {
    const result = await dataService.obtenerEmpleados();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error obteniendo empleados',
      error: error.message,
      data: []
    });
  }
});

// GET - Obtener nómina global (alias para empleados completos)
router.get('/empleados/nomina', async (req, res) => {
  try {
    const result = await dataService.obtenerNominaCompleta();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error obteniendo nómina global',
      error: error.message,
      data: []
    });
  }
});

// PUT - Actualizar datos de nómina
router.put('/empleados/nomina/:cedula', async (req, res) => {
  try {
    const result = await dataService.actualizarNomina(req.params.cedula, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error actualizando nómina',
      error: error.message
    });
  }
});

// GET - Obtener empleados por sede
router.get('/empleados/sede/:sede', async (req, res) => {
  try {
    const sede = req.params.sede;
    const result = await dataService.obtenerEmpleadosPorSede(sede);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Error obteniendo empleados de sede ${req.params.sede}`,
      error: error.message,
      data: []
    });
  }
});

// POST - Crear nuevo empleado
router.post('/empleados', async (req, res) => {
  try {
    const result = await dataService.crearEmpleado(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creando empleado',
      error: error.message,
      data: null
    });
  }
});

// PUT - Actualizar empleado
router.put('/empleados/:cedula', async (req, res) => {
  try {
    const result = await dataService.actualizarEmpleado(req.params.cedula, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error actualizando empleado',
      error: error.message,
      data: null
    });
  }
});

// DELETE - Eliminar empleado
router.delete('/empleados/:cedula', async (req, res) => {
  try {
    const result = await dataService.eliminarEmpleado(req.params.cedula);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error eliminando empleado',
      error: error.message,
      data: null
    });
  }
});

// POST - Crear empleado completo (información + nómina)
router.post('/empleados/completo', async (req, res) => {
  try {
    console.log('📥 Creando empleado completo:', req.body);
    const result = await dataService.crearEmpleadoCompleto(req.body);
    res.json(result);
  } catch (error) {
    console.error('❌ Error en ruta empleado completo:', error);
    res.status(500).json({
      success: false,
      message: 'Error creando empleado completo',
      error: error.message,
      data: null
    });
  }
});

// PUT - Actualizar empleado completo (información + nómina)
router.put('/empleados/completo/:cedula', async (req, res) => {
  try {
    console.log('🔄 Actualizando empleado completo:', req.params.cedula, req.body);
    
    // Mapear los nombres de campos del frontend al formato del backend
    const empleadoData = {
      cedula_empleado: req.body.cedula_empleado,
      nombre_empleado: req.body.nombre_empleado,
      sede_taller: req.body.sede_taller,
      fecha_comienzo: req.body.fecha_inicio, // Mapear fecha_inicio a fecha_comienzo
      salario: req.body.salario
    };
    
    const result = await dataService.actualizarEmpleado(req.params.cedula, empleadoData);
    res.json(result);
  } catch (error) {
    console.error('❌ Error en ruta actualizar empleado completo:', error);
    res.status(500).json({
      success: false,
      message: 'Error actualizando empleado completo',
      error: error.message,
      data: null
    });
  }
});

// =============================================
// RUTAS DE REPUESTOS (FRAGMENTACIÓN HORIZONTAL)
// =============================================

// GET - Obtener todos los repuestos
router.get('/repuestos', async (req, res) => {
  try {
    const result = await dataService.obtenerTodosRepuestos();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error obteniendo repuestos',
      error: error.message,
      data: []
    });
  }
});

// GET - Obtener repuestos por sede
router.get('/repuestos/sede/:sede', async (req, res) => {
  try {
    const sede = req.params.sede;
    const result = await dataService.obtenerRepuestosPorSede(sede);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Error obteniendo repuestos de sede ${req.params.sede}`,
      error: error.message,
      data: []
    });
  }
});

// POST - Crear repuesto
router.post('/repuestos', async (req, res) => {
  try {
    const result = await dataService.crearRepuesto(req.body);
    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creando repuesto',
      error: error.message
    });
  }
});

// PUT - Actualizar repuesto
router.put('/repuestos/:id', async (req, res) => {
  try {
    const result = await dataService.actualizarRepuesto(req.params.id, req.body);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error actualizando repuesto',
      error: error.message
    });
  }
});

// DELETE - Eliminar repuesto
router.delete('/repuestos/:id/:sede', async (req, res) => {
  try {
    const result = await dataService.eliminarRepuesto(req.params.id, req.params.sede);
    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error eliminando repuesto',
      error: error.message
    });
  }
});

// =============================================
// RUTAS DE REPARACIONES (FRAGMENTACIÓN HORIZONTAL)
// =============================================

// GET - Obtener todas las reparaciones
router.get('/reparaciones', async (req, res) => {
  try {
    const result = await dataService.obtenerTodasReparaciones();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error obteniendo reparaciones',
      error: error.message,
      data: []
    });
  }
});

// GET - Obtener reparaciones por sede
router.get('/reparaciones/sede/:sede', async (req, res) => {
  try {
    const sede = req.params.sede;
    const result = await dataService.obtenerReparacionesPorSede(sede);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Error obteniendo reparaciones de sede ${req.params.sede}`,
      error: error.message,
      data: []
    });
  }
});

// POST - Crear nueva reparación
router.post('/reparaciones', async (req, res) => {
  try {
    const result = await dataService.crearReparacionSimple(req.body);
    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creando reparación',
      error: error.message
    });
  }
});

// PUT - Actualizar reparación
router.put('/reparaciones/:id', async (req, res) => {
  try {
    const result = await dataService.actualizarReparacion(req.params.id, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error actualizando reparación',
      error: error.message
    });
  }
});

// DELETE - Eliminar reparación
router.delete('/reparaciones/:id', async (req, res) => {
  try {
    const result = await dataService.eliminarReparacion(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error eliminando reparación',
      error: error.message
    });
  }
});

// GET - Obtener repuestos utilizados en una reparación
router.get('/reparaciones/:id/repuestos', async (req, res) => {
  try {
    const result = await dataService.obtenerRepuestosDeReparacion(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error obteniendo repuestos de la reparación',
      error: error.message,
      data: []
    });
  }
});

// GET - Obtener repuestos utilizados en una reparación
router.get('/reparaciones/:id/repuestos', async (req, res) => {
  try {
    const result = await dataService.obtenerRepuestosDeReparacion(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error obteniendo repuestos de la reparación',
      error: error.message,
      data: []
    });
  }
});

// =============================================
// RUTAS DE CONSULTAS ESPECIALES
// =============================================

// GET - Resumen por sedes
router.get('/resumen-sedes', async (req, res) => {
  try {
    const result = await dataService.obtenerResumenPorSedes();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error obteniendo resumen por sedes',
      error: error.message,
      data: []
    });
  }
});

// GET - Estadísticas generales
router.get('/estadisticas', async (req, res) => {
  try {
    const result = await dataService.obtenerEstadisticas();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error obteniendo estadísticas',
      error: error.message,
      data: {}
    });
  }
});

// =============================================
// RUTAS DE DIAGNÓSTICO
// =============================================

// GET - Prueba de conectividad por sede
router.get('/diagnostico/:sede', async (req, res) => {
  try {
    const sede = req.params.sede.toUpperCase();
    const { getPool, connectionStatus } = require('../config/database');
    
    const pool = getPool(sede);
    const isConnected = connectionStatus[sede.toLowerCase()];
    
    if (!pool || !isConnected) {
      return res.status(503).json({
        success: false,
        message: `No hay conexión disponible a sede ${sede}`,
        data: {
          sede,
          connected: false,
          timestamp: new Date().toISOString()
        }
      });
    }
    
    // Hacer una consulta simple para verificar conectividad
    let testQuery = '';
    switch (sede) {
      case 'CENTRAL':
        testQuery = 'SELECT COUNT(*) as total FROM Cliente';
        break;
      case 'NORTE':
        testQuery = 'SELECT COUNT(*) as total FROM Empleado_informacion_Norte';
        break;
      case 'SUR':
        testQuery = 'SELECT COUNT(*) as total FROM Empleado_informacion';
        break;
      default:
        testQuery = 'SELECT GETDATE() as timestamp';
    }
    
    const result = await pool.request().query(testQuery);
    
    res.json({
      success: true,
      message: `Conexión a sede ${sede} funcionando correctamente`,
      data: {
        sede,
        connected: true,
        testResult: result.recordset[0],
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Error diagnosticando sede ${req.params.sede}`,
      error: error.message,
      data: {
        sede: req.params.sede.toUpperCase(),
        connected: false,
        timestamp: new Date().toISOString()
      }
    });
  }
});

// =============================================
// RUTAS CRUD ADICIONALES
// =============================================

// PUT - Actualizar cliente
router.put('/clientes/:cedula', async (req, res) => {
  try {
    const result = await dataService.actualizarCliente(req.params.cedula, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error actualizando cliente',
      error: error.message
    });
  }
});

// DELETE - Eliminar cliente
router.delete('/clientes/:cedula', async (req, res) => {
  try {
    const result = await dataService.eliminarCliente(req.params.cedula);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error eliminando cliente',
      error: error.message
    });
  }
});

// PUT - Actualizar vehículo
router.put('/vehiculos/:placa', async (req, res) => {
  try {
    const result = await dataService.actualizarVehiculo(req.params.placa, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error actualizando vehículo',
      error: error.message
    });
  }
});

// DELETE - Eliminar vehículo
router.delete('/vehiculos/:placa', async (req, res) => {
  try {
    const result = await dataService.eliminarVehiculo(req.params.placa);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error eliminando vehículo',
      error: error.message
    });
  }
});

// GET - Estadísticas generales
router.get('/estadisticas', async (req, res) => {
  try {
    const result = await dataService.obtenerEstadisticas();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error obteniendo estadísticas',
      error: error.message,
      data: { clientes: 0, vehiculos: 0, empleados: 0, reparaciones: 0 }
    });
  }
});

module.exports = router;
