const { getPool } = require('../config/database');
const sql = require('mssql');

// =============================================
// SERVICIO DE DATOS POLI-CAR DISTRIBUIDO
// Norte y Sur con datos replicados y fragmentados
// =============================================

// =============================================
// FUNCIONES DE CLIENTES (REPLICADOS EN AMBAS SEDES)
// =============================================

// Obtener todos los clientes (Replicado - tomar solo de una sede)
async function obtenerClientes() {
  try {
    // Para datos replicados, solo necesitamos consultar una sede
    const sedes = ['NORTE', 'SUR'];
    
    for (const sede of sedes) {
      try {
        const pool = getPool(sede);
        if (!pool) {
          console.log(`⚠️ No hay conexión disponible a ${sede}, intentando siguiente...`);
          continue;
        }
        
        console.log(`👥 Obteniendo clientes desde ${sede} (datos replicados)...`);
        
        const result = await pool.request().query(`
          SELECT 
            cedula_cliente,
            nombre_cliente,
            apellido_cliente,
            zona
          FROM Cliente
          ORDER BY nombre_cliente
        `);
        
        const clientes = result.recordset;
        console.log(`✅ ${clientes.length} clientes obtenidos desde ${sede}`);
        
        return {
          success: true,
          data: clientes,
          message: `${clientes.length} clientes encontrados`
        };
        
      } catch (error) {
        console.error(`❌ Error obteniendo clientes de ${sede}:`, error.message);
        // Continúa con la siguiente sede si una falla
      }
    }
    
    // Si llega aquí, no pudo conectar a ninguna sede
    return {
      success: false,
      data: [],
      message: 'No se pudo conectar a ninguna sede para obtener clientes'
    };
    
  } catch (error) {
    console.error('❌ Error general obteniendo clientes:', error);
    return {
      success: false,
      data: [],
      message: error.message
    };
  }
}

// Crear cliente (Replicado en Norte y Sur)
async function crearCliente(clienteData) {
  try {
    const { cedula_cliente, nombre_cliente, apellido_cliente, zona } = clienteData;
    
    const sedes = ['NORTE', 'SUR'];
    let resultados = [];
    
    for (const sede of sedes) {
      const pool = getPool(sede);
      if (pool) {
        try {
          await pool.request()
            .input('cedula_cliente', sql.VarChar(10), cedula_cliente)
            .input('nombre_cliente', sql.VarChar(50), nombre_cliente)
            .input('apellido_cliente', sql.VarChar(50), apellido_cliente)
            .input('zona', sql.VarChar(50), zona)
            .query(`
              INSERT INTO Cliente (cedula_cliente, nombre_cliente, apellido_cliente, zona)
              VALUES (@cedula_cliente, @nombre_cliente, @apellido_cliente, @zona)
            `);
          resultados.push(`${sede}: OK`);
        } catch (error) {
          resultados.push(`${sede}: Error - ${error.message}`);
        }
      } else {
        resultados.push(`${sede}: Sin conexión`);
      }
    }
    
    return {
      success: true,
      message: 'Cliente creado con replicación',
      data: { cedula_cliente, replicacion: resultados }
    };
  } catch (error) {
    console.error('Error creando cliente:', error);
    return {
      success: false,
      message: error.message,
      data: null
    };
  }
}

// Actualizar reparación
async function actualizarReparacion(idReparacion, reparacionData) {
  try {
    const sede = reparacionData.sede_taller?.toUpperCase() || 'NORTE';
    const pool = getPool(sede);
    if (!pool) {
      return { success: false, message: 'No hay conexión disponible a ' + sede, data: null };
    }
    console.log('Actualizando reparación', idReparacion, 'en', sede, reparacionData);
    try {
      const result = await pool.request()
        .input('id_reparacion', sql.Int, parseInt(idReparacion))
        .input('placa', sql.NVarChar(10), reparacionData.placa || reparacionData.placa_vehiculo)
        .input('fecha_reparacion', sql.Date, reparacionData.fecha_reparacion || reparacionData.fecha_inicio)
        .input('descripcion', sql.NVarChar(255), reparacionData.descripcion || reparacionData.descripcion_problema)
        .input('precio_total', sql.Decimal(10,2), parseFloat(reparacionData.precio_total))
        .query("UPDATE Vista_Reparacion_Completa SET placa = @placa, fecha_reparacion = @fecha_reparacion, descripcion = @descripcion, precio_total = @precio_total WHERE id_reparacion = @id_reparacion");
      return {
        success: true,
        data: reparacionData,
        message: 'Reparación ' + idReparacion + ' actualizada exitosamente'
      };
    } catch (error) {
      if (error.message && error.message.includes('transaction manager')) {
        return {
          success: false,
          message: 'Error de transacción distribuida (DTC desactivado)',
          data: null
        };
      }
      return {
        success: false,
        message: error.message,
        data: null
      };
    }
  } catch (error) {
    console.error('Error actualizando reparación:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

// Crear nueva reparación con repuestos
async function crearReparacion(reparacionData) {
  try {
    const sede = reparacionData.sede_taller?.toUpperCase() || 'NORTE';
    const pool = getPool(sede);
    if (!pool) throw new Error(`No hay conexión disponible a ${sede}`);
    
    console.log(`➕ Creando reparación en ${sede}:`, reparacionData);
    
    // Usar la vista global para reparaciones
    // Generar ID de reparación automáticamente desde la vista
    const idResult = await pool.request().query(`SELECT ISNULL(MAX(id_reparacion), 0) + 1 as nuevo_id FROM Vista_Reparacion_Completa`);
    const nuevoId = idResult.recordset[0].nuevo_id.toString();
    try {
      await pool.request()
        .input('id_reparacion', sql.Int, parseInt(nuevoId))
        .input('placa', sql.NVarChar(10), reparacionData.placa_vehiculo || reparacionData.placa)
        .input('sede_taller', sql.NVarChar(10), reparacionData.sede_taller)
        .input('fecha_reparacion', sql.Date, reparacionData.fecha_fin || reparacionData.fecha_reparacion || new Date())
        .input('descripcion', sql.NVarChar(255), reparacionData.descripcion_problema || reparacionData.descripcion)
        .input('precio_total', sql.Decimal(10,2), reparacionData.precio_total || 0)
        .query(`
          INSERT INTO Vista_Reparacion_Completa
          (id_reparacion, placa, sede_taller, fecha_reparacion, descripcion, precio_total)
          VALUES 
          (@id_reparacion, @placa, @sede_taller, @fecha_reparacion, @descripcion, @precio_total)
        `);
      // Insertar repuestos si existen en la vista de detalle
      if (reparacionData.repuestos && reparacionData.repuestos.length > 0) {
        for (const repuesto of reparacionData.repuestos) {
          await pool.request()
            .input('id_reparacion', sql.Int, parseInt(nuevoId))
            .input('id_repuesto', sql.Int, repuesto.id_repuesto)
            .input('cantidad_usada', sql.Int, repuesto.cantidad || repuesto.cantidad_usada || 1)
            .query(`
              INSERT INTO Vista_ReparacionDetalle_Completo
              (id_reparacion, id_repuesto, cantidad_usada)
              VALUES (@id_reparacion, @id_repuesto, @cantidad_usada)
            `);
        }
      }
      return {
        success: true,
        data: { ...reparacionData, id_reparacion: nuevoId },
        message: `Reparación ${nuevoId} creada exitosamente`
      };
    } catch (error) {
      if (error.message.includes('transaction manager')) {
        return {
          success: false,
          message: 'Error de transacción distribuida (DTC desactivado)',
          data: null
        };
      }
      return {
        success: false,
        message: error.message,
        data: null
      };
    }
  } catch (error) {
    console.error('Error creando reparación:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

// Eliminar empleado (Replicado: Empleado_nomina + Fragmentado: Empleado_informacion)
async function eliminarEmpleado(cedula) {
  try {
    const sedes = ['NORTE', 'SUR']; // Fixed: moved this before the try block
    const resultados = {};
    
    console.log('🗑️ Eliminando empleado:', cedula);
    
    // 1. Eliminar en la vista global de empleados (fragmentado)
    try {
      const pool = getPool('NORTE');
      if (!pool) {
        resultados[`info_vista`] = { success: false, error: 'Sin conexión' };
      } else {
        await pool.request()
          .input('cedula_empleado', sql.VarChar(10), cedula)
          .query(`DELETE FROM Vista_Empleado_Info_Completa WHERE cedula_empleado = @cedula_empleado`);
        resultados[`info_vista`] = { success: true };
      }
    } catch (error) {
      if (error.message.includes('transaction manager')) {
        resultados[`info_vista`] = { success: false, error: 'Error de transacción distribuida (DTC desactivado)' };
      } else {
        resultados[`info_vista`] = { success: false, error: error.message };
      }
    }
    
    // 2. Eliminar de Empleado_nomina (REPLICADO en ambas sedes) - después
    for (const sede of sedes) {
      try {
        const pool = getPool(sede);
        if (!pool) {
          console.log(`⚠️ No hay conexión disponible a ${sede}`);
          resultados[`nomina_${sede}`] = { success: false, error: 'Sin conexión' };
          continue;
        }
        
        console.log(`🗑️ Eliminando nómina de ${sede}...`);
        
        await pool.request()
          .input('cedula_empleado', sql.VarChar(10), cedula)
          .query(`DELETE FROM Empleado_nomina WHERE cedula_empleado = @cedula_empleado`);
        
        resultados[`nomina_${sede}`] = { success: true };
        console.log(`✅ Nómina eliminada de ${sede}`);
        
      } catch (error) {
        console.error(`❌ Error eliminando nómina de ${sede}:`, error.message);
        resultados[`nomina_${sede}`] = { success: false, error: error.message };
      }
    }
    
    const operacionesExitosas = Object.values(resultados).filter(r => r.success).length;
    const mensaje = operacionesExitosas > 0 
      ? `Empleado eliminado - ${operacionesExitosas} operaciones exitosas`
      : 'Error: No se pudo eliminar el empleado';
    
    return {
      success: operacionesExitosas > 0,
      message: mensaje,
      data: { cedula_empleado: cedula },
      detalles: resultados
    };
    
  } catch (error) {
    console.error('❌ Error general eliminando empleado:', error);
    return {
      success: false,
      message: error.message,
      data: null
    };
  }
}

// Fixed remaining functions with syntax errors
async function obtenerRepuestosPorSede(sede) {
  try {
    const pool = getPool('NORTE');
    if (!pool) throw new Error(`No hay conexión disponible a NORTE`);
    const result = await pool.request()
      .input('sede', sql.VarChar(10), sede)
      .query(`SELECT * FROM Vista_Repuesto_Completo WHERE sede_taller = @sede ORDER BY nombre_repuesto`);
    return {
      success: true,
      data: result.recordset,
      message: `${result.recordset.length} repuestos encontrados en sede ${sede.toUpperCase()}`
    };
  } catch (error) {
    console.error(`Error obteniendo repuestos de sede ${sede}:`, error);
    return {
      success: false,
      data: [],
      message: error.message
    };
  }
}

async function obtenerReparacionesPorSede(sede) {
  try {
    const pool = getPool('NORTE');
    if (!pool) throw new Error(`No hay conexión disponible a NORTE`);
    const result = await pool.request()
      .input('sede', sql.VarChar(10), sede)
      .query(`SELECT * FROM Vista_Reparacion_Completa WHERE sede_taller = @sede ORDER BY fecha_reparacion DESC`);
    return {
      success: true,
      data: result.recordset,
      message: `${result.recordset.length} reparaciones encontradas en sede ${sede.toUpperCase()}`
    };
  } catch (error) {
    console.error(`Error obteniendo reparaciones de sede ${sede}:`, error);
    return {
      success: false,
      data: [],
      message: error.message
    };
  }
}

// Obtener todos los empleados (fragmentado)
async function obtenerEmpleados() {
  // Usar solo la vista global
  const pool = getPool('NORTE');
  if (!pool) {
    return { success: false, message: 'No hay conexión disponible', data: [] };
  }
  const result = await pool.request().query("SELECT * FROM Vista_Empleado_Info_Completa ORDER BY nombre_empleado");
  return {
    success: true,
    message: `${result.recordset.length} empleados obtenidos exitosamente`,
    data: result.recordset
  };
}
