const { getPool } = require('../config/database');
const sql = require('mssql');

// =============================================
// SERVICIO DE DATOS POLI-CAR DISTRIBUIDO
// Norte y Sur con datos replicados y fragmentados
// MIGRADO A VISTAS DISTRIBUIDAS
// =============================================

// =============================================
// FUNCIÓN DE DIAGNÓSTICO DTC
// =============================================

async function verificarEstadoDTC() {
  console.log('🔍 Verificando estado del DTC...');
  
  try {
    const pool = getPool('NORTE');
    if (!pool) {
      return { success: false, message: 'No hay conexión disponible' };
    }

    // Intentar una operación simple en la vista para probar DTC
    const testResult = await pool.request().query(`
      SELECT TOP 1 * FROM Vista_Empleado_Info_Completa
    `);
    
    console.log('✅ DTC funcional - Vista puede ser consultada');
    return {
      success: true,
      message: 'DTC está funcionando correctamente',
      data: { dtcActive: true, recordsFound: testResult.recordset.length }
    };
    
  } catch (error) {
    console.error('❌ Error verificando DTC:', {
      message: error.message,
      code: error.code,
      number: error.number
    });
    
    if (error.message && (
        error.message.includes('distributed transaction') || 
        error.message.includes('transaction manager') ||
        error.message.includes('MSDTC') ||
        error.code === 'EREQUEST' ||
        error.number === 8501 || 
        error.number === 8502 ||
        error.number === 7391
    )) {
      return {
        success: false,
        message: 'DTC no está funcionando correctamente',
        data: { dtcActive: false, error: error.message }
      };
    }
    
    return {
      success: false,
      message: `Error inesperado verificando DTC: ${error.message}`,
      data: { dtcActive: false, error: error.message }
    };
  }
}

// =============================================
// FUNCIONES PRINCIPALES
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

// =============================================
// FUNCIONES DE EMPLEADOS (FRAGMENTADOS) - MIGRADAS A VISTAS
// =============================================

// Obtener todos los empleados (MIGRADO A VISTA)
async function obtenerEmpleados() {
  try {
    const pool = getPool('NORTE');
    if (!pool) {
      return { success: false, message: 'No hay conexión disponible', data: [] };
    }
    
    console.log('👥 Obteniendo empleados desde vista distribuida...');
    const result = await pool.request().query("SELECT * FROM Vista_Empleado_Info_Completa ORDER BY nombre_empleado");
    console.log(`✅ ${result.recordset.length} empleados obtenidos desde vista`);
    
    return {
      success: true,
      message: `${result.recordset.length} empleados obtenidos exitosamente`,
      data: result.recordset
    };
  } catch (error) {
    console.error('❌ Error obteniendo empleados:', error);
    return {
      success: false,
      data: [],
      message: error.message
    };
  }
}

// Crear empleado (MIGRADO A VISTA)
async function crearEmpleado(empleadoData) {
  try {
    const pool = getPool('NORTE');
    if (!pool) throw new Error('No hay conexión disponible a NORTE');
    
    console.log('➕ Creando empleado en vista distribuida:', empleadoData);
    
    await pool.request()
      .input('cedula_empleado', sql.VarChar(10), empleadoData.cedula_empleado)
      .input('nombre_empleado', sql.VarChar(100), empleadoData.nombre_empleado)
      .input('sede_taller', sql.VarChar(20), empleadoData.sede_taller)
      .query(`
        SET XACT_ABORT ON;
        INSERT INTO Vista_Empleado_Info_Completa (cedula_empleado, sede_taller, nombre_empleado) 
        VALUES (@cedula_empleado, @sede_taller, @nombre_empleado);
      `);
    
    return { success: true, message: 'Empleado creado exitosamente', data: empleadoData };
  } catch (error) {
    console.error('❌ ERROR DETALLADO CREANDO EMPLEADO:', {
      message: error.message,
      code: error.code,
      number: error.number
    });
    
    if (error.message && (
        error.message.includes('distributed transaction') || 
        error.message.includes('transaction manager') ||
        error.message.includes('MSDTC') ||
        error.message.includes('nested transaction') ||
        error.code === 'EREQUEST'
    )) {
      return { success: false, message: 'Error de transacción distribuida (DTC desactivado)', data: null };
    }
    return { success: false, message: `Error creando empleado: ${error.message}`, data: null };
  }
}

// Actualizar empleado (MIGRADO A VISTA)
async function actualizarEmpleado(cedula, empleadoData) {
  try {
    const pool = getPool('NORTE');
    if (!pool) throw new Error('No hay conexión disponible a NORTE');
    
    console.log('✏️ Actualizando empleado en vista distribuida:', cedula);
    
    await pool.request()
      .input('cedula_empleado', sql.VarChar(10), cedula)
      .input('nombre_empleado', sql.VarChar(100), empleadoData.nombre_empleado)
      .input('sede_taller', sql.VarChar(20), empleadoData.sede_taller)
      .query(`
        SET XACT_ABORT ON;
        UPDATE Vista_Empleado_Info_Completa 
        SET nombre_empleado = @nombre_empleado, sede_taller = @sede_taller 
        WHERE cedula_empleado = @cedula_empleado;
      `);
    
    return { success: true, message: 'Empleado actualizado exitosamente', data: empleadoData };
  } catch (error) {
    if (error.message.includes('transaction manager')) {
      return { success: false, message: 'Error de transacción distribuida (DTC desactivado)', data: null };
    }
    return { success: false, message: error.message, data: null };
  }
}

// =============================================
// FUNCIONES DE VEHÍCULOS (REPLICADOS) - MIGRADAS A VISTA SI EXISTE
// =============================================

// Obtener todos los vehículos (MIGRADO A VISTA)
async function obtenerVehiculos() {
  try {
    const pool = getPool('NORTE');
    if (!pool) {
      return { success: false, message: 'No hay conexión disponible', data: [] };
    }
    
    console.log('🚗 Obteniendo vehículos desde vista...');
    const result = await pool.request().query(`
      SELECT 
        v.placa,
        v.cedula_cliente,
        c.nombre_cliente,
        c.apellido_cliente,
        v.marca,
        v.modelo,
        v.anio as año
      FROM Vehiculo v
      INNER JOIN Cliente c ON v.cedula_cliente = c.cedula_cliente
      ORDER BY v.marca, v.modelo
    `);
    
    console.log(`✅ ${result.recordset.length} vehículos obtenidos`);
    
    return {
      success: true,
      data: result.recordset,
      message: `${result.recordset.length} vehículos encontrados`
    };
  } catch (error) {
    console.error('❌ Error obteniendo vehículos:', error);
    return {
      success: false,
      data: [],
      message: error.message
    };
  }
}

// =============================================
// FUNCIONES DE REPUESTOS (FRAGMENTADOS) - MIGRADAS A VISTAS
// =============================================

// Obtener repuestos por sede (MIGRADO A VISTA)
async function obtenerRepuestosPorSede(sede) {
  try {
    const pool = getPool('NORTE');
    if (!pool) throw new Error('No hay conexión disponible a NORTE');
    
    console.log(`🔧 Obteniendo repuestos de sede ${sede} desde vista...`);
    const result = await pool.request()
      .input('sede', sql.VarChar(10), sede)
      .query("SELECT * FROM Vista_Repuesto_Completo WHERE sede_taller = @sede ORDER BY nombre_repuesto");
    
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

// Obtener todos los repuestos (MIGRADO A VISTA)
async function obtenerTodosRepuestos() {
  try {
    const pool = getPool('NORTE');
    if (!pool) {
      return { success: false, data: [], message: 'No hay conexión disponible' };
    }
    
    console.log('🔧 Obteniendo todos los repuestos desde vista...');
    const result = await pool.request().query("SELECT * FROM Vista_Repuesto_Completo ORDER BY nombre_repuesto");
    
    return {
      success: true,
      data: result.recordset,
      message: `${result.recordset.length} repuestos encontrados en total`
    };
  } catch (error) {
    console.error('Error obteniendo repuestos:', error);
    return {
      success: false,
      data: [],
      message: error.message
    };
  }
}

// Crear repuesto (MIGRADO A VISTA)
async function crearRepuesto(repuestoData) {
  try {
    const pool = getPool('NORTE');
    if (!pool) throw new Error('No hay conexión disponible a NORTE');
    
    console.log('➕ Creando repuesto en vista distribuida:', repuestoData);
    
    // Generar nuevo ID para el repuesto
    const nuevoId = (await pool.request()
      .query('SET XACT_ABORT ON; SELECT ISNULL(MAX(id_repuesto), 0) + 1 as nuevoId FROM Vista_Repuesto_Completo')).recordset[0].nuevoId;

    await pool.request()
      .input('id_repuesto', sql.Int, nuevoId)
      .input('sede_taller', sql.VarChar(20), repuestoData.sede_taller)
      .input('nombre_repuesto', sql.VarChar(100), repuestoData.nombre_repuesto)
      .input('descripcion_repuesto', sql.Text, repuestoData.descripcion_repuesto || null)
      .input('cantidad_repuesto', sql.Int, repuestoData.cantidad_repuesto || 0)
      .input('precio_unitario', sql.Numeric(9,2), parseFloat(repuestoData.precio_unitario || 0))
      .query(`
        SET XACT_ABORT ON;
        INSERT INTO Vista_Repuesto_Completo 
        (id_repuesto, sede_taller, nombre_repuesto, descripcion_repuesto, cantidad_repuesto, precio_unitario) 
        VALUES 
        (@id_repuesto, @sede_taller, @nombre_repuesto, @descripcion_repuesto, @cantidad_repuesto, @precio_unitario);
      `);
    
    return { 
      success: true, 
      message: 'Repuesto creado exitosamente', 
      data: { ...repuestoData, id_repuesto: nuevoId } 
    };
  } catch (error) {
    console.error('❌ ERROR DETALLADO CREANDO REPUESTO:', {
      message: error.message,
      code: error.code,
      number: error.number,
      state: error.state
    });
    
    if (error.message && (
        error.message.includes('distributed transaction') || 
        error.message.includes('transaction manager') ||
        error.message.includes('MSDTC') ||
        error.code === 'EREQUEST'
    )) {
      return { 
        success: false, 
        message: 'Error de transacción distribuida (DTC desactivado): No se puede crear repuesto en vista fragmentada.', 
        data: null 
      };
    }
    
    return { 
      success: false, 
      message: `Error creando repuesto: ${error.message || 'Error desconocido'}`, 
      data: null 
    };
  }
}

// Actualizar repuesto (MIGRADO A VISTA)
async function actualizarRepuesto(id, repuestoData) {
  try {
    const pool = getPool('NORTE');
    if (!pool) throw new Error('No hay conexión disponible a NORTE');
    
    console.log('✏️ Actualizando repuesto en vista distribuida:', id);
    
    await pool.request()
      .input('id_repuesto', sql.Int, parseInt(id))
      .input('sede_taller', sql.VarChar(20), repuestoData.sede_taller)
      .input('nombre_repuesto', sql.VarChar(100), repuestoData.nombre_repuesto)
      .input('descripcion_repuesto', sql.Text, repuestoData.descripcion_repuesto || null)
      .input('cantidad_repuesto', sql.Int, repuestoData.cantidad_repuesto || 0)
      .input('precio_unitario', sql.Numeric(9,2), parseFloat(repuestoData.precio_unitario || 0))
      .query(`
        SET XACT_ABORT ON;
        UPDATE Vista_Repuesto_Completo 
        SET sede_taller = @sede_taller,
            nombre_repuesto = @nombre_repuesto, 
            descripcion_repuesto = @descripcion_repuesto, 
            cantidad_repuesto = @cantidad_repuesto, 
            precio_unitario = @precio_unitario 
        WHERE id_repuesto = @id_repuesto;
      `);
    
    return { success: true, message: 'Repuesto actualizado exitosamente', data: repuestoData };
  } catch (error) {
    console.error('Error actualizando repuesto:', error);
    
    if (error.message && error.message.includes('transaction manager')) {
      return { success: false, message: 'Error de transacción distribuida (DTC desactivado)', data: null };
    }
    
    return { success: false, message: error.message, data: null };
  }
}

// Eliminar repuesto (MIGRADO A VISTA)
async function eliminarRepuesto(id) {
  try {
    const pool = getPool('NORTE');
    if (!pool) throw new Error('No hay conexión disponible a NORTE');
    
    console.log('🗑️ Eliminando repuesto en vista distribuida:', id);
    
    await pool.request()
      .input('id_repuesto', sql.Int, parseInt(id))
      .query(`
        SET XACT_ABORT ON;
        DELETE FROM Vista_Repuesto_Completo WHERE id_repuesto = @id_repuesto;
      `);
    
    return { success: true, message: 'Repuesto eliminado exitosamente', data: { id_repuesto: id } };
  } catch (error) {
    if (error.message.includes('transaction manager')) {
      return { success: false, message: 'Error de transacción distribuida (DTC desactivado)', data: null };
    }
    return { success: false, message: error.message, data: null };
  }
}

// =============================================
// FUNCIONES DE REPARACIONES (FRAGMENTADAS) - MIGRADAS A VISTAS
// =============================================

// Obtener reparaciones por sede (MIGRADO A VISTA)
async function obtenerReparacionesPorSede(sede) {
  try {
    const pool = getPool('NORTE');
    if (!pool) throw new Error('No hay conexión disponible a NORTE');
    
    console.log(`🔨 Obteniendo reparaciones de sede ${sede} desde vista...`);
    const result = await pool.request()
      .input('sede', sql.VarChar(10), sede)
      .query("SELECT * FROM Vista_Reparacion_Completa WHERE sede_taller = @sede ORDER BY fecha_reparacion DESC");
    
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

// Obtener todas las reparaciones (MIGRADO A VISTA)
async function obtenerTodasReparaciones() {
  try {
    const pool = getPool('NORTE');
    if (!pool) {
      return { success: false, data: [], message: 'No hay conexión disponible' };
    }
    
    console.log('🔨 Obteniendo todas las reparaciones desde vista...');
    const result = await pool.request().query("SELECT * FROM Vista_Reparacion_Completa ORDER BY fecha_reparacion DESC");
    
    return {
      success: true,
      data: result.recordset,
      message: `${result.recordset.length} reparaciones encontradas`
    };
  } catch (error) {
    console.error('Error obteniendo reparaciones:', error);
    return {
      success: false,
      data: [],
      message: error.message
    };
  }
}

// Actualizar reparación (MIGRADO A VISTA)
async function actualizarReparacion(idReparacion, reparacionData) {
  try {
    const sede = reparacionData.sede_taller?.toUpperCase() || 'NORTE';
    const pool = getPool(sede);
    if (!pool) {
      return { success: false, message: 'No hay conexión disponible a ' + sede, data: null };
    }
    
    console.log('✏️ Actualizando reparación', idReparacion, 'en vista distribuida');
    
    const result = await pool.request()
      .input('id_reparacion', sql.Int, parseInt(idReparacion))
      .input('placa', sql.NVarChar(10), reparacionData.placa || reparacionData.placa_vehiculo)
      .input('fecha_reparacion', sql.Date, reparacionData.fecha_reparacion || reparacionData.fecha_inicio)
      .input('descripcion', sql.Text, reparacionData.descripcion || reparacionData.descripcion_problema)
      .input('precio_total', sql.Numeric(9,2), parseFloat(reparacionData.precio_total))
      .query(`
        SET XACT_ABORT ON;
        UPDATE Vista_Reparacion_Completa 
        SET placa = @placa, 
            fecha_reparacion = @fecha_reparacion, 
            descripcion = @descripcion, 
            precio_total = @precio_total 
        WHERE id_reparacion = @id_reparacion;
      `);
    
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
}

// Crear nueva reparación con repuestos (MIGRADO A VISTA)
async function crearReparacion(reparacionData) {
  try {
    const sede = reparacionData.sede_taller?.toUpperCase() || 'NORTE';
    const pool = getPool(sede);
    if (!pool) throw new Error(`No hay conexión disponible a ${sede}`);
    
    console.log(`➕ Creando reparación en vista distribuida ${sede}:`, JSON.stringify(reparacionData, null, 2));
    
    // Generar ID de reparación automáticamente desde la vista
    const idResult = await pool.request().query("SET XACT_ABORT ON; SELECT ISNULL(MAX(id_reparacion), 0) + 1 as nuevo_id FROM Vista_Reparacion_Completa");
    const nuevoId = idResult.recordset[0].nuevo_id.toString();
    
    console.log(`🆔 Nuevo ID de reparación: ${nuevoId}`);
    
    // Procesar fecha - convertir de DD/MM/YYYY a formato ISO si es necesario
    let fechaReparacion = reparacionData.fecha_fin || reparacionData.fecha_reparacion;
    if (fechaReparacion) {
      // Si la fecha viene en formato DD/MM/YYYY, convertirla
      if (typeof fechaReparacion === 'string' && fechaReparacion.includes('/')) {
        const [dia, mes, año] = fechaReparacion.split('/');
        fechaReparacion = new Date(`${año}-${mes}-${dia}`);
        console.log(`📅 Fecha convertida: ${fechaReparacion.toISOString()}`);
      } else if (typeof fechaReparacion === 'string') {
        fechaReparacion = new Date(fechaReparacion);
      }
    } else {
      fechaReparacion = new Date();
    }
    
    await pool.request()
      .input('id_reparacion', sql.Int, parseInt(nuevoId))
      .input('placa', sql.NVarChar(10), reparacionData.placa_vehiculo || reparacionData.placa)
      .input('sede_taller', sql.NVarChar(20), reparacionData.sede_taller)
      .input('fecha_reparacion', sql.Date, fechaReparacion)
      .input('descripcion', sql.Text, reparacionData.descripcion_problema || reparacionData.descripcion)
      .input('precio_total', sql.Numeric(9,2), parseFloat(reparacionData.precio_total || 0))
      .query(`
        SET XACT_ABORT ON;
        INSERT INTO Vista_Reparacion_Completa
        (id_reparacion, placa, sede_taller, fecha_reparacion, descripcion, precio_total)
        VALUES 
        (@id_reparacion, @placa, @sede_taller, @fecha_reparacion, @descripcion, @precio_total);
      `);
    
    console.log(`✅ Reparación principal creada exitosamente`);
    
    // Insertar repuestos si existen en la vista de detalle
    if (reparacionData.repuestos && reparacionData.repuestos.length > 0) {
      console.log(`🔧 Procesando ${reparacionData.repuestos.length} repuestos:`, reparacionData.repuestos);
      
      for (const repuesto of reparacionData.repuestos) {
        console.log(`📦 Insertando repuesto:`, {
          id_reparacion: nuevoId,
          id_repuesto: repuesto.id_repuesto,
          cantidad_usada: repuesto.cantidad || repuesto.cantidad_usada || 1,
          sede_taller: reparacionData.sede_taller
        });
        
        await pool.request()
          .input('id_reparacion', sql.Int, parseInt(nuevoId))
          .input('id_repuesto', sql.Int, parseInt(repuesto.id_repuesto))
          .input('cantidad_usada', sql.Int, repuesto.cantidad || repuesto.cantidad_usada || 1)
          .input('sede_taller', sql.VarChar(20), reparacionData.sede_taller)
          .query(`
            SET XACT_ABORT ON;
            INSERT INTO Vista_ReparacionDetalle_Completo
            (id_reparacion, id_repuesto, cantidad_usada, sede_taller)
            VALUES (@id_reparacion, @id_repuesto, @cantidad_usada, @sede_taller);
          `);
      }
      console.log(`✅ Todos los repuestos insertados correctamente`);
    } else {
      console.log(`⚠️ No hay repuestos para insertar`);
    }
    
    return {
      success: true,
      data: { ...reparacionData, id_reparacion: nuevoId },
      message: `Reparación ${nuevoId} creada exitosamente`
    };
  } catch (error) {
    console.error('❌ ERROR DETALLADO CREANDO REPARACIÓN:', {
      message: error.message,
      code: error.code,
      number: error.number,
      state: error.state,
      procedure: error.procedure,
      lineNumber: error.lineNumber,
      stack: error.stack
    });
    
    // Detectar errores específicos de transacción distribuida
    if (error.message && (
        error.message.includes('distributed transaction') || 
        error.message.includes('transaction manager') ||
        error.message.includes('MSDTC') ||
        error.number === 8501 || 
        error.number === 8502 ||
        error.number === 7391 ||
        error.number === 7395
    )) {
      console.log('🔍 Error identificado como problema de DTC');
      return {
        success: false,
        message: 'Error de transacción distribuida (DTC desactivado): No se puede crear reparación en vista fragmentada. Active el DTC para usar vistas distribuidas.',
        data: null,
        dtcError: true,
        errorDetails: {
          code: error.code,
          number: error.number,
          message: error.message
        }
      };
    }

    // Detectar errores de FOREIGN KEY (placa no existe)
    if (error.number === 547 && error.message.includes('FK__Reparacio__placa')) {
      console.log('🔍 Error identificado como placa inexistente');
      return {
        success: false,
        message: `La placa '${reparacionData.placa_vehiculo || reparacionData.placa}' no existe en la base de datos. Debe registrar el vehículo primero antes de crear una reparación.`,
        data: null,
        errorDetails: {
          code: error.code,
          number: error.number,
          message: error.message,
          errorType: 'FOREIGN_KEY_VIOLATION'
        }
      };
    }

    return {
      success: false,
      message: `Error creando reparación: ${error.message || 'Error desconocido'}`,
      data: null,
      errorDetails: {
        code: error.code,
        number: error.number,
        state: error.state,
        procedure: error.procedure,
        lineNumber: error.lineNumber,
        originalMessage: error.message
      }
    };
  }
}

// Obtener repuestos de reparación con información completa (MIGRADO A VISTA)
async function obtenerRepuestosDeReparacion(idReparacion) {
  try {
    const pool = getPool('NORTE');
    if (!pool) {
      return { success: false, data: [], message: 'No hay conexión disponible' };
    }
    
    console.log(`🔧 Obteniendo repuestos de reparación ${idReparacion} desde vista con información completa...`);
    
    // Query simplificada - primero verificar qué columnas existen
    const result = await pool.request()
      .input('id_reparacion', sql.Int, parseInt(idReparacion))
      .query(`
        SELECT 
          rd.id_reparacion,
          rd.id_repuesto,
          rd.cantidad_usada,
          r.nombre_repuesto,
          r.descripcion_repuesto,
          r.precio_unitario,
          (rd.cantidad_usada * r.precio_unitario) as subtotal
        FROM Vista_ReparacionDetalle_Completo rd
        INNER JOIN Vista_Repuesto_Completo r ON rd.id_repuesto = r.id_repuesto
        WHERE rd.id_reparacion = @id_reparacion
        ORDER BY r.nombre_repuesto
      `);
    
    console.log(`📊 ${result.recordset.length} repuestos encontrados con información completa`);
    
    return {
      success: true,
      data: result.recordset,
      message: `${result.recordset.length} repuestos encontrados para la reparación ${idReparacion}`
    };
  } catch (error) {
    console.error('Error obteniendo repuestos de reparación:', error);
    return {
      success: false,
      data: [],
      message: error.message
    };
  }
}

// Eliminar reparación completa (ELIMINAR DE TABLAS FÍSICAS - NO VISTAS)
async function eliminarReparacion(idReparacion) {
  try {
    console.log(`🗑️ Eliminando reparación ${idReparacion} desde tablas físicas...`);
    
    const sedes = ['NORTE', 'SUR'];
    let eliminacionExitosa = false;
    let detallesEliminados = 0;
    let reparacionEliminada = false;
    
    // Eliminar de todas las sedes (tanto detalles como reparación principal)
    for (const sede of sedes) {
      const pool = getPool(sede);
      if (!pool) {
        console.log(`⚠️ No hay conexión a sede ${sede}`);
        continue;
      }
      
      try {
        console.log(`🔍 Eliminando en sede ${sede}...`);
        
        // Nombres de tablas según la sede
        const tablaDetalle = sede === 'NORTE' ? 'Reparacion_detalle_norte' : 'Reparacion_detalle_sur';
        const tablaReparacion = sede === 'NORTE' ? 'Reparacion_norte' : 'Reparacion_sur';
        
        // Eliminar detalles de repuestos primero
        const detalleResult = await pool.request()
          .input('id_reparacion', sql.Int, parseInt(idReparacion))
          .query(`DELETE FROM ${tablaDetalle} WHERE id_reparacion = @id_reparacion;`);
        
        if (detalleResult.rowsAffected[0] > 0) {
          detallesEliminados += detalleResult.rowsAffected[0];
          console.log(`✅ ${detalleResult.rowsAffected[0]} detalles eliminados en ${sede}`);
        }
        
        // Eliminar reparación principal
        const reparacionResult = await pool.request()
          .input('id_reparacion', sql.Int, parseInt(idReparacion))
          .query(`DELETE FROM ${tablaReparacion} WHERE id_reparacion = @id_reparacion;`);
        
        if (reparacionResult.rowsAffected[0] > 0) {
          reparacionEliminada = true;
          eliminacionExitosa = true;
          console.log(`✅ Reparación eliminada en sede ${sede}`);
        }
        
      } catch (sedeError) {
        console.error(`❌ Error en sede ${sede}:`, sedeError.message);
        // Continuar con la siguiente sede aunque una falle
      }
    }
    
    if (!eliminacionExitosa) {
      return {
        success: false,
        message: `La reparación ${idReparacion} no fue encontrada en ninguna sede`
      };
    }
    
    console.log(`✅ Eliminación completada: ${detallesEliminados} detalles, reparación: ${reparacionEliminada ? 'SÍ' : 'NO'}`);
    
    return {
      success: true,
      message: `Reparación ${idReparacion} eliminada exitosamente (${detallesEliminados} detalles de repuestos eliminados)`
    };
  } catch (error) {
    console.error('❌ ERROR DETALLADO ELIMINANDO REPARACIÓN:', {
      message: error.message,
      code: error.code,
      number: error.number,
      state: error.state
    });
    
    return {
      success: false,
      message: `Error eliminando reparación: ${error.message}`
    };
  }
}

// =============================================
// FUNCIONES DE ELIMINACIÓN COMBINADA (REPLICADO + FRAGMENTADO)
// =============================================

// Eliminar empleado (Replicado: Empleado_nomina + Fragmentado: Empleado_informacion - VISTA)
async function eliminarEmpleado(cedula) {
  try {
    const sedes = ['NORTE', 'SUR'];
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
          .query(`
            SET XACT_ABORT ON;
            DELETE FROM Vista_Empleado_Info_Completa WHERE cedula_empleado = @cedula_empleado;
          `);
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

// =============================================
// FUNCIONES DE NÓMINA DE EMPLEADOS (REPLICADOS) - SIN CAMBIOS
// =============================================

// Obtener empleados nómina (Replicado - tomar solo de una sede)
async function obtenerEmpleadosNomina() {
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
        
        console.log(`💰 Obteniendo nómina desde ${sede} (datos replicados)...`);
        
        const result = await pool.request().query(`
          SELECT 
            n.cedula_empleado,
            n.fecha_comienzo,
            n.salario,
            e.nombre_empleado,
            e.sede_taller
          FROM Empleado_nomina n
          LEFT JOIN Vista_Empleado_Info_Completa e ON n.cedula_empleado = e.cedula_empleado
          ORDER BY n.cedula_empleado
        `);
        
        const nomina = result.recordset;
        console.log(`✅ ${nomina.length} registros de nómina obtenidos desde ${sede}`);
        
        return {
          success: true,
          data: nomina,
          message: `${nomina.length} registros de nómina encontrados`
        };
        
      } catch (error) {
        console.error(`❌ Error obteniendo nómina de ${sede}:`, error.message);
        // Continúa con la siguiente sede si una falla
      }
    }
    
    // Si llega aquí, no pudo conectar a ninguna sede
    return {
      success: false,
      data: [],
      message: 'No se pudo conectar a ninguna sede para obtener nómina'
    };
    
  } catch (error) {
    console.error('❌ Error general obteniendo nómina:', error);
    return {
      success: false,
      data: [],
      message: error.message
    };
  }
}

// Crear empleado completo (información fragmentada + nómina replicada)
async function crearEmpleadoCompleto(empleadoData) {
  try {
    const { cedula_empleado, nombre_empleado, sede_taller, fecha_inicio, salario } = empleadoData;
    
    console.log('➕ Creando empleado completo:', empleadoData);
    
    // 1. Crear en vista de empleados (información fragmentada)
    try {
      const resultadoInfo = await crearEmpleado({
        cedula_empleado,
        nombre_empleado,
        sede_taller
      });
      
      if (!resultadoInfo.success) {
        // Si falla por DTC, mostrar error específico
        if (resultadoInfo.message.includes('transaction manager') || resultadoInfo.message.includes('nested transaction') || resultadoInfo.message.includes('OLE DB')) {
          return {
            success: false,
            message: 'Error de transacción distribuida (DTC desactivado): No se puede crear empleado en vista fragmentada. Active el DTC para usar vistas distribuidas.',
            data: null
          };
        }
        return {
          success: false,
          message: 'Error creando información del empleado: ' + resultadoInfo.message,
          data: null
        };
      }
    } catch (error) {
      // Capturar errores de DTC/OLE DB
      if (error.message.includes('transaction manager') || error.message.includes('nested transaction') || error.message.includes('OLE DB')) {
        return {
          success: false,
          message: 'Error de transacción distribuida (DTC desactivado): No se puede crear empleado en vista fragmentada. Active el DTC para usar vistas distribuidas.',
          data: null
        };
      }
      throw error;
    }
    
    // 2. Crear en nómina (replicada en ambas sedes)
    const sedes = ['NORTE', 'SUR'];
    let resultadosNomina = [];
    
    for (const sede of sedes) {
      const pool = getPool(sede);
      if (pool) {
        try {
          await pool.request()
            .input('cedula_empleado', sql.VarChar(10), cedula_empleado)
            .input('fecha_comienzo', sql.Date, fecha_inicio || new Date())
            .input('salario', sql.Numeric(9,2), parseFloat(salario || 0))
            .query(`
              INSERT INTO Empleado_nomina (cedula_empleado, fecha_comienzo, salario)
              VALUES (@cedula_empleado, @fecha_comienzo, @salario)
            `);
          resultadosNomina.push(`${sede}: OK`);
        } catch (error) {
          resultadosNomina.push(`${sede}: Error - ${error.message}`);
        }
      } else {
        resultadosNomina.push(`${sede}: Sin conexión`);
      }
    }
    
    return {
      success: true,
      message: 'Empleado completo creado exitosamente',
      data: { 
        cedula_empleado,
        informacion: 'OK (Vista fragmentada)',
        nomina: resultadosNomina
      }
    };
    
  } catch (error) {
    console.error('❌ ERROR DETALLADO CREANDO EMPLEADO COMPLETO:', {
      message: error.message,
      code: error.code,
      number: error.number,
      state: error.state,
      procedure: error.procedure,
      lineNumber: error.lineNumber,
      stack: error.stack
    });
    
    // Capturar errores específicos de DTC con más precisión
    if (error.message && (
        error.message.includes('distributed transaction') || 
        error.message.includes('transaction manager') ||
        error.message.includes('MSDTC') ||
        error.message.includes('nested transaction') || 
        error.message.includes('OLE DB') ||
        error.code === 'EREQUEST' ||
        error.number === 8501 || 
        error.number === 8502 ||
        error.number === 7391
    )) {
      console.log('🔍 Error identificado como problema de DTC en empleado');
      return {
        success: false,
        message: 'Error de transacción distribuida (DTC desactivado): No se puede crear empleado en vista fragmentada. Active el DTC para usar vistas distribuidas.',
        data: null,
        dtcError: true,
        errorDetails: {
          code: error.code,
          number: error.number,
          message: error.message
        }
      };
    }
    
    return {
      success: false,
      message: `Error creando empleado completo: ${error.message || 'Error desconocido'}`,
      data: null,
      errorDetails: {
        code: error.code,
        number: error.number,
        state: error.state,
        procedure: error.procedure,
        lineNumber: error.lineNumber,
        originalMessage: error.message
      }
    };
  }
}

// =============================================
// EXPORTAR TODAS LAS FUNCIONES
// =============================================

module.exports = {
  // Función de diagnóstico
  verificarEstadoDTC,
  
  // Clientes (replicados - sin cambios)
  obtenerClientes,
  crearCliente,
  
  // Empleados (fragmentados - migrados a vistas)
  obtenerEmpleados,
  crearEmpleado,
  crearEmpleadoCompleto,
  actualizarEmpleado,
  eliminarEmpleado,
  
  // Vehículos (replicados - sin cambios por ahora)
  obtenerVehiculos,
  
  // Nómina de empleados (replicados - sin cambios)
  obtenerEmpleadosNomina,
  
  // Repuestos (fragmentados - migrados a vistas)
  obtenerRepuestosPorSede,
  obtenerTodosRepuestos,
  crearRepuesto,
  actualizarRepuesto,
  eliminarRepuesto,
  
  // Reparaciones (fragmentadas - migradas a vistas)
  obtenerReparacionesPorSede,
  obtenerTodasReparaciones,
  crearReparacion,
  actualizarReparacion,
  eliminarReparacion,
  obtenerRepuestosDeReparacion
};
