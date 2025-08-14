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
          ORDER BY apellido_cliente, nombre_cliente
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

// Crear cliente (replicar en ambas sedes)
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
// FUNCIONES DE VEHÍCULOS (REPLICADAS EN TODAS LAS SEDES)
// =============================================

// Obtener todos los vehículos (Replicado - tomar solo de una sede)
async function obtenerVehiculos() {
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
        
        console.log(`🚗 Obteniendo vehículos desde ${sede} (datos replicados)...`);
        
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
        
        const vehiculos = result.recordset;
        console.log(`✅ ${vehiculos.length} vehículos obtenidos desde ${sede}`);
        
        return {
          success: true,
          data: vehiculos,
          message: `${vehiculos.length} vehículos encontrados`
        };
        
      } catch (error) {
        console.error(`❌ Error obteniendo vehículos de ${sede}:`, error.message);
        // Continúa con la siguiente sede si una falla
      }
    }
    
    // Si llega aquí, no pudo conectar a ninguna sede
    return {
      success: false,
      data: [],
      message: 'No se pudo conectar a ninguna sede para obtener vehículos'
    };
    
  } catch (error) {
    console.error('❌ Error general obteniendo vehículos:', error);
    return {
      success: false,
      data: [],
      message: error.message
    };
  }
}

// Crear vehículo (Replicado en Norte y Sur)
async function crearVehiculo(vehiculoData) {
  try {
    const sedes = ['NORTE', 'SUR'];
    const { placa, cedula_cliente, marca, modelo, año } = vehiculoData;
    const resultados = {};
    
    console.log('🚗 Creando vehículo en ambas sedes:', vehiculoData);
    
    for (const sede of sedes) {
      try {
        const pool = getPool(sede);
        if (!pool) {
          console.log(`⚠️ No hay conexión disponible a ${sede}`);
          resultados[sede] = { success: false, error: 'Sin conexión' };
          continue;
        }
        
        console.log(`📝 Insertando vehículo en ${sede}...`);
        
        await pool.request()
          .input('placa', sql.VarChar(10), placa)
          .input('cedula_cliente', sql.VarChar(10), cedula_cliente)
          .input('marca', sql.VarChar(50), marca)
          .input('modelo', sql.VarChar(50), modelo)
          .input('anio', sql.Int, año)
          .query(`
            INSERT INTO Vehiculo (placa, cedula_cliente, marca, modelo, anio)
            VALUES (@placa, @cedula_cliente, @marca, @modelo, @anio)
          `);
        
        resultados[sede] = { success: true };
        console.log(`✅ Vehículo creado exitosamente en ${sede}`);
        
      } catch (error) {
        console.error(`❌ Error creando vehículo en ${sede}:`, error.message);
        resultados[sede] = { success: false, error: error.message };
      }
    }
    
    const sedesExitosas = Object.keys(resultados).filter(sede => resultados[sede].success);
    const mensaje = sedesExitosas.length > 0 
      ? `Vehículo creado en ${sedesExitosas.length} sede(s): ${sedesExitosas.join(', ')}`
      : 'Error: No se pudo crear el vehículo en ninguna sede';
    
    return {
      success: sedesExitosas.length > 0,
      data: vehiculoData,
      message: mensaje,
      detalles: resultados
    };
    
  } catch (error) {
    console.error('❌ Error general creando vehículo:', error);
    return {
      success: false,
      data: null,
      message: error.message
    };
  }
}

// =============================================
// FUNCIONES DE EMPLEADOS (FRAGMENTACIÓN HORIZONTAL + VERTICAL)
// =============================================

// Obtener todos los empleados (Replicado: Empleado_nomina + Fragmentado: Empleado_informacion)
async function obtenerEmpleados() {
  try {
    console.log('👥 Obteniendo todos los empleados del sistema...');
    const sedes = ['NORTE', 'SUR'];
    let todosEmpleados = [];
    
    for (const sede of sedes) {
      try {
        const pool = getPool(sede);
        if (!pool) {
          console.log(`⚠️ No hay conexión disponible a ${sede}`);
          continue;
        }
        
        console.log(`👥 Obteniendo empleados de ${sede}...`);
        
        // Usar nombres de tablas correctos para cada sede
        let query = '';
        if (sede === 'NORTE') {
          // En Norte: Solo información básica (fragmentación horizontal)
          query = `
            SELECT 
              cedula_empleado,
              nombre_empleado,
              sede_taller
            FROM Empleado_informacion_norte
            ORDER BY nombre_empleado
          `;
        } else {
          // En Sur: Solo información básica (fragmentación horizontal)
          query = `
            SELECT 
              cedula_empleado,
              nombre_empleado,
              sede_taller
            FROM Empleado_informacion_sur
            ORDER BY nombre_empleado
          `;
        }
        
        const result = await pool.request().query(query);
        
        const empleados = result.recordset.map(empleado => ({
          ...empleado,
          sede_taller: empleado.sede_taller || sede
        }));
        
        console.log(`✅ ${empleados.length} empleados obtenidos de ${sede}`);
        todosEmpleados = todosEmpleados.concat(empleados);
        
      } catch (error) {
        console.error(`❌ Error obteniendo empleados de ${sede}:`, error.message);
      }
    }
    
    console.log(`📊 Total empleados obtenidos: ${todosEmpleados.length}`);
    
    return {
      success: true,
      message: `${todosEmpleados.length} empleados obtenidos exitosamente`,
      data: todosEmpleados
    };
    
  } catch (error) {
    console.error('❌ Error en obtenerEmpleados:', error);
    return {
      success: false,
      message: 'Error obteniendo empleados',
      data: []
    };
  }
}

// =============================================
// FUNCIÓN PARA OBTENER NÓMINA COMPLETA (CON DATOS SALARIALES)
// =============================================
async function obtenerNominaCompleta() {
  try {
    console.log('💰 Obteniendo nómina completa del sistema...');
    const sedes = ['NORTE', 'SUR'];
    let nominaCompleta = [];
    
    for (const sede of sedes) {
      try {
        const pool = getPool(sede);
        if (!pool) {
          console.log(`⚠️ No hay conexión disponible a ${sede}`);
          continue;
        }
        
        console.log(`💰 Obteniendo nómina de ${sede}...`);
        
        let query = '';
        if (sede === 'NORTE') {
          // En Norte: JOIN entre información y nómina con cálculo de días trabajados
          query = `
            SELECT 
              ei.cedula_empleado,
              ei.nombre_empleado,
              ei.sede_taller,
              en.fecha_comienzo,
              en.salario,
              DATEDIFF(DAY, en.fecha_comienzo, GETDATE()) as dias_trabajados
            FROM Empleado_informacion_norte ei
            INNER JOIN Empleado_nomina en ON ei.cedula_empleado = en.cedula_empleado
            ORDER BY ei.nombre_empleado
          `;
        } else {
          // En Sur: JOIN entre información y nómina con cálculo de días trabajados
          query = `
            SELECT 
              ei.cedula_empleado,
              ei.nombre_empleado,
              ei.sede_taller,
              en.fecha_comienzo,
              en.salario,
              DATEDIFF(DAY, en.fecha_comienzo, GETDATE()) as dias_trabajados
            FROM Empleado_informacion_sur ei
            INNER JOIN Empleado_nomina en ON ei.cedula_empleado = en.cedula_empleado
            ORDER BY ei.nombre_empleado
          `;
        }
        
        const result = await pool.request().query(query);
        const empleadosNomina = result.recordset.map(empleado => ({
          ...empleado,
          sede_taller: empleado.sede_taller || sede
        }));
        
        console.log(`✅ ${empleadosNomina.length} empleados con nómina obtenidos de ${sede}`);
        nominaCompleta = nominaCompleta.concat(empleadosNomina);
        
      } catch (error) {
        console.error(`❌ Error obteniendo nómina de ${sede}:`, error.message);
      }
    }
    
    console.log(`📊 Total empleados en nómina: ${nominaCompleta.length}`);
    
    return {
      success: true,
      message: `${nominaCompleta.length} empleados con información salarial obtenidos`,
      data: nominaCompleta
    };
    
  } catch (error) {
    console.error('❌ Error en obtenerNominaCompleta:', error);
    return {
      success: false,
      message: 'Error obteniendo nómina completa',
      data: []
    };
  }
}

// Actualizar datos de nómina
async function actualizarNomina(cedula_empleado, nominaData) {
  try {
    const { fecha_comienzo, salario } = nominaData;
    
    console.log('💰 Actualizando nómina para empleado:', cedula_empleado, nominaData);
    
    const sedes = ['NORTE', 'SUR'];
    let actualizado = false;
    
    for (const sede of sedes) {
      try {
        const pool = getPool(sede);
        if (!pool) {
          console.log(`⚠️ No hay conexión disponible a ${sede}`);
          continue;
        }
        
        console.log(`💰 Actualizando nómina en ${sede}...`);
        
        const result = await pool.request()
          .input('cedula_empleado', sql.NVarChar(10), cedula_empleado)
          .input('fecha_comienzo', sql.DateTime, fecha_comienzo)
          .input('salario', sql.Decimal(10, 2), salario)
          .query(`
            UPDATE Empleado_nomina 
            SET fecha_comienzo = @fecha_comienzo,
                salario = @salario
            WHERE cedula_empleado = @cedula_empleado
          `);
        
        if (result.rowsAffected[0] > 0) {
          console.log(`✅ Nómina actualizada en ${sede}`);
          actualizado = true;
        }
        
      } catch (error) {
        console.error(`❌ Error actualizando nómina en ${sede}:`, error.message);
      }
    }
    
    if (actualizado) {
      return {
        success: true,
        message: 'Nómina actualizada correctamente'
      };
    } else {
      throw new Error('No se pudo actualizar la nómina en ninguna sede');
    }
    
  } catch (error) {
    console.error('❌ Error en actualizarNomina:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

// Crear empleado (Replicado: Empleado_nomina + Fragmentado: Empleado_informacion)
async function crearEmpleado(empleadoData) {
  try {
    const { cedula_empleado, sede_taller, nombre_empleado, fecha_comienzo, salario } = empleadoData;
    const resultados = {};
    
    console.log('👥 Creando empleado:', empleadoData);
    
    // 1. Insertar en Empleado_nomina (REPLICADO en ambas sedes)
    const sedes = ['NORTE', 'SUR'];
    for (const sede of sedes) {
      try {
        const pool = getPool(sede);
        if (!pool) {
          console.log(`⚠️ No hay conexión disponible a ${sede}`);
          resultados[`nomina_${sede}`] = { success: false, error: 'Sin conexión' };
          continue;
        }
        
        console.log(`📝 Insertando nómina en ${sede}...`);
        
        await pool.request()
          .input('cedula_empleado', sql.VarChar(10), cedula_empleado)
          .input('fecha_comienzo', sql.Date, fecha_comienzo)
          .input('salario', sql.Decimal(10, 2), salario)
          .query(`
            INSERT INTO Empleado_nomina (cedula_empleado, fecha_comienzo, salario)
            VALUES (@cedula_empleado, @fecha_comienzo, @salario)
          `);
        
        resultados[`nomina_${sede}`] = { success: true };
        console.log(`✅ Nómina creada en ${sede}`);
        
      } catch (error) {
        console.error(`❌ Error creando nómina en ${sede}:`, error.message);
        resultados[`nomina_${sede}`] = { success: false, error: error.message };
      }
    }
    
    // 2. Insertar en tabla específica de sede (FRAGMENTADO)
    const sedeEmpleado = sede_taller.toUpperCase();
    const tablaInfo = sedeEmpleado === 'NORTE' ? 'Empleado_informacion_Norte' : 'Empleado_informacion_sur';
    
    try {
      const pool = getPool(sedeEmpleado);
      if (!pool) {
        resultados[`info_${sedeEmpleado}`] = { success: false, error: 'Sin conexión' };
      } else {
        console.log(`📝 Insertando información en ${tablaInfo}...`);
        
        await pool.request()
          .input('cedula_empleado', sql.VarChar(10), cedula_empleado)
          .input('sede_taller', sql.VarChar(10), sede_taller)
          .input('nombre_empleado', sql.VarChar(100), nombre_empleado)
          .query(`
            INSERT INTO ${tablaInfo} (cedula_empleado, sede_taller, nombre_empleado)
            VALUES (@cedula_empleado, @sede_taller, @nombre_empleado)
          `);
        
        resultados[`info_${sedeEmpleado}`] = { success: true };
        console.log(`✅ Información creada en ${sedeEmpleado}`);
      }
    } catch (error) {
      console.error(`❌ Error creando información en ${sedeEmpleado}:`, error.message);
      resultados[`info_${sedeEmpleado}`] = { success: false, error: error.message };
    }
    
    const operacionesExitosas = Object.values(resultados).filter(r => r.success).length;
    const mensaje = operacionesExitosas > 0 
      ? `Empleado creado - ${operacionesExitosas} operaciones exitosas`
      : 'Error: No se pudo crear el empleado';
    
    return {
      success: operacionesExitosas > 0,
      data: empleadoData,
      message: mensaje,
      detalles: resultados
    };
    
  } catch (error) {
    console.error('❌ Error general creando empleado:', error);
    return {
      success: false,
      data: null,
      message: error.message
    };
  }
}

// Actualizar empleado (Replicado: Empleado_nomina + Fragmentado: Empleado_informacion)
async function actualizarEmpleado(cedula, empleadoData) {
  try {
    const { sede_taller, nombre_empleado, fecha_comienzo, salario } = empleadoData;
    const resultados = {};
    
    console.log('🔄 Actualizando empleado:', { cedula, ...empleadoData });
    
    // 1. Actualizar en Empleado_nomina (REPLICADO en ambas sedes)
    const sedes = ['NORTE', 'SUR'];
    for (const sede of sedes) {
      try {
        const pool = getPool(sede);
        if (!pool) {
          console.log(`⚠️ No hay conexión disponible a ${sede}`);
          resultados[`nomina_${sede}`] = { success: false, error: 'Sin conexión' };
          continue;
        }
        
        console.log(`📝 Actualizando nómina en ${sede}...`);
        
        await pool.request()
          .input('cedula_empleado', sql.VarChar(10), cedula)
          .input('fecha_comienzo', sql.Date, fecha_comienzo)
          .input('salario', sql.Decimal(10, 2), salario)
          .query(`
            UPDATE Empleado_nomina 
            SET fecha_comienzo = @fecha_comienzo, salario = @salario
            WHERE cedula_empleado = @cedula_empleado
          `);
        
        resultados[`nomina_${sede}`] = { success: true };
        console.log(`✅ Nómina actualizada en ${sede}`);
        
      } catch (error) {
        console.error(`❌ Error actualizando nómina en ${sede}:`, error.message);
        resultados[`nomina_${sede}`] = { success: false, error: error.message };
      }
    }
    
    // 2. Actualizar en tablas específicas de sede (FRAGMENTADO)
    // Primero intentar en ambas sedes (puede que el empleado haya cambiado de sede)
    for (const sedeActual of sedes) {
      const tablaInfo = sedeActual === 'NORTE' ? 'Empleado_informacion_Norte' : 'Empleado_informacion_sur';
      
      try {
        const pool = getPool(sedeActual);
        if (!pool) continue;
        
        console.log(`📝 Verificando/actualizando información en ${tablaInfo}...`);
        
        await pool.request()
          .input('cedula_empleado', sql.VarChar(10), cedula)
          .input('sede_taller', sql.VarChar(10), sede_taller)
          .input('nombre_empleado', sql.VarChar(100), nombre_empleado)
          .query(`
            UPDATE ${tablaInfo} 
            SET sede_taller = @sede_taller, nombre_empleado = @nombre_empleado
            WHERE cedula_empleado = @cedula_empleado
          `);
        
        resultados[`info_${sedeActual}`] = { success: true };
        console.log(`✅ Información actualizada en ${sedeActual}`);
        
      } catch (error) {
        console.error(`❌ Error actualizando información en ${sedeActual}:`, error.message);
        resultados[`info_${sedeActual}`] = { success: false, error: error.message };
      }
    }
    
    const operacionesExitosas = Object.values(resultados).filter(r => r.success).length;
    const mensaje = operacionesExitosas > 0 
      ? `Empleado actualizado - ${operacionesExitosas} operaciones exitosas`
      : 'Error: No se pudo actualizar el empleado';
    
    return {
      success: operacionesExitosas > 0,
      message: mensaje,
      data: { cedula_empleado: cedula },
      detalles: resultados
    };
    
  } catch (error) {
    console.error('❌ Error general actualizando empleado:', error);
    return {
      success: false,
      message: error.message,
      data: null
    };
  }
}

// Eliminar empleado (Replicado: Empleado_nomina + Fragmentado: Empleado_informacion)
async function eliminarEmpleado(cedula) {
  try {
    const resultados = {};
    
    console.log('🗑️ Eliminando empleado:', cedula);
    
    // 1. Eliminar de tablas específicas de sede (FRAGMENTADO) - primero
    const sedes = ['NORTE', 'SUR'];
    for (const sede of sedes) {
      const tablaInfo = sede === 'NORTE' ? 'Empleado_informacion_Norte' : 'Empleado_informacion_sur';
      
      try {
        const pool = getPool(sede);
        if (!pool) {
          console.log(`⚠️ No hay conexión disponible a ${sede}`);
          resultados[`info_${sede}`] = { success: false, error: 'Sin conexión' };
          continue;
        }
        
        console.log(`🗑️ Eliminando información de ${tablaInfo}...`);
        
        await pool.request()
          .input('cedula_empleado', sql.VarChar(10), cedula)
          .query(`DELETE FROM ${tablaInfo} WHERE cedula_empleado = @cedula_empleado`);
        
        resultados[`info_${sede}`] = { success: true };
        console.log(`✅ Información eliminada de ${sede}`);
        
      } catch (error) {
        console.error(`❌ Error eliminando información de ${sede}:`, error.message);
        resultados[`info_${sede}`] = { success: false, error: error.message };
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

// Obtener empleados por sede (CORREGIDO)
async function obtenerEmpleadosPorSede(sede) {
  try {
    console.log(`👷 Obteniendo empleados de sede ${sede.toUpperCase()}...`);
    
    let pool, query;
    
    if (sede.toUpperCase() === 'NORTE') {
      pool = getPool('NORTE');
      // Usar nombre de tabla correcto para Norte
      query = `
        SELECT 
          cedula_empleado,
          nombre_empleado,
          sede_taller
        FROM Empleado_informacion_norte
        ORDER BY nombre_empleado
      `;
    } else if (sede.toUpperCase() === 'SUR') {
      pool = getPool('SUR');
      query = `
        SELECT 
          cedula_empleado,
          nombre_empleado,
          sede_taller
        FROM Empleado_informacion_sur
        ORDER BY nombre_empleado
      `;
    }
    
    if (!pool) throw new Error(`No hay conexión disponible a ${sede}`);
    
    console.log(`🔍 Ejecutando consulta en ${sede.toUpperCase()}...`);
    const result = await pool.request().query(query);
    
    console.log(`✅ ${result.recordset.length} empleados encontrados en ${sede.toUpperCase()}`);
    
    return {
      success: true,
      data: result.recordset,
      message: `${result.recordset.length} empleados encontrados en sede ${sede.toUpperCase()}`
    };
  } catch (error) {
    console.error(`❌ Error obteniendo empleados de sede ${sede}:`, error.message);
    return {
      success: false,
      data: [],
      message: `Error: ${error.message}`
    };
  }
}

// Crear empleado completo (información en sede + nómina replicada)
async function crearEmpleadoCompleto(empleadoData) {
  try {
    const { cedula_empleado, nombre_empleado, sede_taller, fecha_inicio, salario } = empleadoData;
    
    console.log('🏗️ Creando empleado completo:', {
      cedula: cedula_empleado,
      nombre: nombre_empleado,
      sede: sede_taller,
      fecha: fecha_inicio,
      salario: salario
    });
    
    const sedeUpper = sede_taller.toUpperCase();
    
    // Validar sede
    if (!['NORTE', 'SUR'].includes(sedeUpper)) {
      throw new Error('Sede debe ser NORTE o SUR');
    }
    
    const pool = getPool(sedeUpper);
    if (!pool) throw new Error(`No hay conexión disponible a ${sedeUpper}`);
    
    // Verificar si el empleado ya existe en información
    const tablaInformacion = sedeUpper === 'NORTE' ? 'Empleado_informacion_Norte' : 'Empleado_informacion_sur';
    
    const existeInfo = await pool.request()
      .input('cedula_empleado', sql.NVarChar(10), cedula_empleado)
      .query(`SELECT COUNT(*) as count FROM ${tablaInformacion} WHERE cedula_empleado = @cedula_empleado`);
    
    if (existeInfo.recordset[0].count > 0) {
      return {
        success: false,
        message: `Error: Ya existe un empleado con cédula ${cedula_empleado} en sede ${sedeUpper}`,
        data: null
      };
    }
    
    // Verificar si ya existe en nómina
    const existeNomina = await pool.request()
      .input('cedula_empleado', sql.NVarChar(10), cedula_empleado)
      .query(`SELECT COUNT(*) as count FROM Empleado_nomina WHERE cedula_empleado = @cedula_empleado`);
    
    if (existeNomina.recordset[0].count > 0) {
      return {
        success: false,
        message: `Error: Ya existe un empleado con cédula ${cedula_empleado} en la nómina`,
        data: null
      };
    }
    
    console.log(`📝 Insertando en ${tablaInformacion} (sede: ${sedeUpper})`);
    
    // 1. Crear información del empleado (fragmentada por sede)
    await pool.request()
      .input('cedula_empleado', sql.NVarChar(10), cedula_empleado)
      .input('nombre_empleado', sql.NVarChar(100), nombre_empleado)
      .input('sede_taller', sql.NVarChar(20), sedeUpper)
      .query(`
        INSERT INTO ${tablaInformacion} (cedula_empleado, nombre_empleado, sede_taller)
        VALUES (@cedula_empleado, @nombre_empleado, @sede_taller)
      `);
    
    console.log('✅ Información del empleado insertada exitosamente');
    
    // 2. Crear nómina del empleado (replicada - se inserta en ambas sedes)
    const sedes = ['NORTE', 'SUR'];
    
    for (const sedeName of sedes) {
      const poolSede = getPool(sedeName);
      if (!poolSede) continue;
      
      try {
        await poolSede.request()
          .input('cedula_empleado', sql.NVarChar(10), cedula_empleado)
          .input('fecha_comienzo', sql.Date, fecha_inicio)
          .input('salario', sql.Decimal(10,2), salario)
          .query(`
            INSERT INTO Empleado_nomina (cedula_empleado, fecha_comienzo, salario)
            VALUES (@cedula_empleado, @fecha_comienzo, @salario)
          `);
        
        console.log(`✅ Nómina replicada en ${sedeName}`);
      } catch (error) {
        console.error(`⚠️ Error replicando nómina en ${sedeName}:`, error.message);
      }
    }
    
    return {
      success: true,
      message: `Empleado ${nombre_empleado} creado exitosamente en sede ${sedeUpper} con nómina replicada`,
      data: {
        cedula_empleado,
        nombre_empleado,
        sede_taller: sedeUpper,
        fecha_comienzo: fecha_inicio,
        salario
      }
    };
  } catch (error) {
    console.error('❌ Error creando empleado completo:', error);
    return {
      success: false,
      message: `Error: ${error.message}`,
      data: null
    };
  }
}

// =============================================
// FUNCIONES DE REPUESTOS (FRAGMENTACIÓN HORIZONTAL)
// =============================================

// Obtener repuestos por sede (corregido para mostrar datos reales)
async function obtenerRepuestosPorSede(sede) {
  try {
    let pool, query;
    
    if (sede.toUpperCase() === 'NORTE') {
      pool = getPool('NORTE');
      query = `
        SELECT 
          id_repuesto,
          'Norte' as sede_taller,
          COALESCE(nombre_repuesto, 'Repuesto ' + CAST(id_repuesto AS VARCHAR)) as nombre_repuesto,
          COALESCE(descripcion_repuesto, 'Descripción del repuesto') as descripcion_repuesto,
          COALESCE(cantidad_repuesto, 0) as cantidad_repuesto,
          COALESCE(precio_unitario, 0) as precio_unitario
        FROM Repuesto_norte
        ORDER BY nombre_repuesto
      `;
    } else if (sede.toUpperCase() === 'SUR') {
      pool = getPool('SUR');
      query = `
        SELECT 
          id_repuesto,
          'Sur' as sede_taller,
          COALESCE(nombre_repuesto, 'Repuesto ' + CAST(id_repuesto AS VARCHAR)) as nombre_repuesto,
          COALESCE(descripcion_repuesto, 'Descripción del repuesto') as descripcion_repuesto,
          COALESCE(cantidad_repuesto, 0) as cantidad_repuesto,
          COALESCE(precio_unitario, 0) as precio_unitario
        FROM Repuesto_sur
        ORDER BY nombre_repuesto
      `;
    }
    
    if (!pool) throw new Error(`No hay conexión disponible a ${sede}`);
    
    console.log(`🔧 Obteniendo repuestos de ${sede.toUpperCase()}...`);
    const result = await pool.request().query(query);
    
    console.log(`✅ ${result.recordset.length} repuestos obtenidos de ${sede.toUpperCase()}`);
    
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

// Obtener todos los repuestos (consulta distribuida)
async function obtenerTodosRepuestos() {
  try {
    console.log('🔧 Obteniendo repuestos de todas las sedes...');
    
    const sedes = ['NORTE', 'SUR'];
    let todosRepuestos = [];
    
    for (const sede of sedes) {
      try {
        const pool = getPool(sede);
        if (!pool) {
          console.log(`⚠️ No hay conexión disponible a ${sede}, intentando siguiente...`);
          continue;
        }
        
        console.log(`🔧 Obteniendo repuestos de ${sede}...`);
        
        // Construir nombre de tabla según la sede
        const tablaRepuesto = sede === 'NORTE' ? 'Repuesto_norte' : 'Repuesto_sur';
        
        const result = await pool.request().query(`
          SELECT 
            id_repuesto,
            sede_taller,
            nombre_repuesto,
            descripcion_repuesto,
            cantidad_repuesto,
            precio_unitario
          FROM ${tablaRepuesto}
          ORDER BY nombre_repuesto
        `);
        
        const repuestos = result.recordset;
        todosRepuestos = [...todosRepuestos, ...repuestos];
        console.log(`✅ ${repuestos.length} repuestos obtenidos de ${sede}`);
        
      } catch (error) {
        console.error(`❌ Error obteniendo repuestos de ${sede}:`, error.message);
      }
    }
    
    console.log(`🎯 Total repuestos obtenidos: ${todosRepuestos.length}`);
    
    return {
      success: true,
      data: todosRepuestos,
      message: `${todosRepuestos.length} repuestos encontrados en total`
    };
    
  } catch (error) {
    console.error('Error obteniendo todos los repuestos:', error);
    return {
      success: false,
      data: [],
      message: error.message
    };
  }
}

// Crear repuesto (FRAGMENTADO por sede)
async function crearRepuesto(repuestoData) {
  try {
    const { nombre_repuesto, descripcion_repuesto, sede_taller, cantidad_repuesto, precio_unitario } = repuestoData;
    
    console.log('🔧 Creando nuevo repuesto:', repuestoData);
    
    // Determinar la sede y tabla correspondiente
    const sedeUpper = sede_taller.toUpperCase();
    const tablaRepuesto = sedeUpper === 'NORTE' ? 'Repuesto_norte' : 'Repuesto_sur';
    
    const pool = getPool(sedeUpper);
    if (!pool) {
      throw new Error(`No hay conexión disponible a ${sedeUpper}`);
    }
    
    console.log(`🔧 Insertando repuesto en ${tablaRepuesto}...`);
    
    // Primero obtener el próximo ID disponible
    const maxIdResult = await pool.request()
      .query(`SELECT ISNULL(MAX(id_repuesto), 0) + 1 as nextId FROM ${tablaRepuesto}`);
    
    const nextId = maxIdResult.recordset[0].nextId;
    
    const result = await pool.request()
      .input('id_repuesto', sql.Int, nextId)
      .input('nombre_repuesto', sql.VarChar(100), nombre_repuesto)
      .input('descripcion_repuesto', sql.VarChar(255), descripcion_repuesto)
      .input('sede_taller', sql.VarChar(10), sede_taller)
      .input('cantidad_repuesto', sql.Int, cantidad_repuesto)
      .input('precio_unitario', sql.Decimal(10, 2), precio_unitario)
      .query(`
        INSERT INTO ${tablaRepuesto} (
          id_repuesto,
          nombre_repuesto, 
          descripcion_repuesto, 
          sede_taller, 
          cantidad_repuesto, 
          precio_unitario
        )
        VALUES (
          @id_repuesto,
          @nombre_repuesto, 
          @descripcion_repuesto, 
          @sede_taller, 
          @cantidad_repuesto, 
          @precio_unitario
        )
      `);
    
    console.log(`✅ Repuesto creado con ID: ${nextId} en ${sedeUpper}`);
    
    return {
      success: true,
      message: 'Repuesto creado correctamente',
      data: { id_repuesto: nextId }
    };
    
  } catch (error) {
    console.error('❌ Error creando repuesto:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

// Actualizar repuesto (FRAGMENTADO por sede)
async function actualizarRepuesto(idRepuesto, repuestoData) {
  try {
    const { nombre_repuesto, descripcion_repuesto, sede_taller, cantidad_repuesto, precio_unitario } = repuestoData;
    
    console.log('🔧 Actualizando repuesto:', idRepuesto, repuestoData);
    
    // Determinar la sede y tabla correspondiente
    const sedeUpper = sede_taller.toUpperCase();
    const tablaRepuesto = sedeUpper === 'NORTE' ? 'Repuesto_norte' : 'Repuesto_sur';
    
    const pool = getPool(sedeUpper);
    if (!pool) {
      throw new Error(`No hay conexión disponible a ${sedeUpper}`);
    }
    
    console.log(`🔧 Actualizando repuesto en ${tablaRepuesto}...`);
    
    const result = await pool.request()
      .input('id_repuesto', sql.Int, idRepuesto)
      .input('nombre_repuesto', sql.VarChar(100), nombre_repuesto)
      .input('descripcion_repuesto', sql.VarChar(255), descripcion_repuesto)
      .input('sede_taller', sql.VarChar(10), sede_taller)
      .input('cantidad_repuesto', sql.Int, cantidad_repuesto)
      .input('precio_unitario', sql.Decimal(10, 2), precio_unitario)
      .query(`
        UPDATE ${tablaRepuesto} 
        SET nombre_repuesto = @nombre_repuesto,
            descripcion_repuesto = @descripcion_repuesto,
            sede_taller = @sede_taller,
            cantidad_repuesto = @cantidad_repuesto,
            precio_unitario = @precio_unitario
        WHERE id_repuesto = @id_repuesto
      `);
    
    if (result.rowsAffected[0] > 0) {
      console.log(`✅ Repuesto actualizado en ${sedeUpper}`);
      return {
        success: true,
        message: 'Repuesto actualizado correctamente'
      };
    } else {
      throw new Error('Repuesto no encontrado');
    }
    
  } catch (error) {
    console.error('❌ Error actualizando repuesto:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

// Eliminar repuesto (FRAGMENTADO por sede)
async function eliminarRepuesto(idRepuesto, sede) {
  try {
    console.log('🗑️ Eliminando repuesto:', idRepuesto, 'de sede:', sede);
    
    // Determinar la sede y tabla correspondiente
    const sedeUpper = sede.toUpperCase();
    const tablaRepuesto = sedeUpper === 'NORTE' ? 'Repuesto_norte' : 'Repuesto_sur';
    
    const pool = getPool(sedeUpper);
    if (!pool) {
      throw new Error(`No hay conexión disponible a ${sedeUpper}`);
    }
    
    console.log(`🗑️ Eliminando repuesto de ${tablaRepuesto}...`);
    
    const result = await pool.request()
      .input('id_repuesto', sql.Int, idRepuesto)
      .query(`DELETE FROM ${tablaRepuesto} WHERE id_repuesto = @id_repuesto`);
    
    if (result.rowsAffected[0] > 0) {
      console.log(`✅ Repuesto eliminado de ${sedeUpper}`);
      return {
        success: true,
        message: 'Repuesto eliminado correctamente'
      };
    } else {
      throw new Error('Repuesto no encontrado');
    }
    
  } catch (error) {
    console.error('❌ Error eliminando repuesto:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

// =============================================
// FUNCIONES DE REPARACIONES (FRAGMENTACIÓN HORIZONTAL)
// =============================================

// Obtener reparaciones por sede (mejorado con datos reales)
async function obtenerReparacionesPorSede(sede) {
  try {
    let pool, query;
    
    if (sede.toUpperCase() === 'NORTE') {
      pool = getPool('NORTE');
      query = `
        SELECT 
          r.id_reparacion,
          r.placa,
          '' as cedula_cliente,
          '' as cedula_empleado,
          r.fecha_reparacion,
          r.descripcion,
          COALESCE(r.precio_total, 0) as precio_total,
          'NORTE' as sede_taller
        FROM Reparacion_norte r
        ORDER BY r.fecha_reparacion DESC
      `;
    } else if (sede.toUpperCase() === 'SUR') {
      pool = getPool('SUR');
      query = `
        SELECT 
          r.id_reparacion,
          r.placa,
          '' as cedula_cliente,
          '' as cedula_empleado,
          r.fecha_reparacion,
          r.descripcion,
          COALESCE(r.precio_total, 0) as precio_total,
          'SUR' as sede_taller
        FROM Reparacion_sur r
        ORDER BY r.fecha_reparacion DESC
      `;
    }
    
    if (!pool) throw new Error(`No hay conexión disponible a ${sede}`);
    
    console.log(`🛠️ Obteniendo reparaciones de ${sede.toUpperCase()}...`);
    const result = await pool.request().query(query);
    
    console.log(`✅ ${result.recordset.length} reparaciones obtenidas de ${sede.toUpperCase()}`);
    
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

// Obtener todas las reparaciones (consulta de ambas sedes)
async function obtenerTodasReparaciones() {
  try {
    console.log('🛠️ Obteniendo todas las reparaciones de ambas sedes...');
    
    let todasReparaciones = [];
    const sedes = ['NORTE', 'SUR'];
    
    for (const sede of sedes) {
      try {
        const pool = getPool(sede);
        if (!pool) {
          console.log(`⚠️ No hay conexión disponible a ${sede}, saltando...`);
          continue;
        }
        
        console.log(`🛠️ Obteniendo reparaciones de ${sede}...`);
        
        // Construir nombre de tabla según la sede
        const tablaReparacion = sede === 'NORTE' ? 'Reparacion_norte' : 'Reparacion_sur';
        
        const result = await pool.request().query(`
          SELECT 
            id_reparacion,
            placa,
            sede_taller,
            fecha_reparacion,
            descripcion,
            precio_total
          FROM ${tablaReparacion}
          ORDER BY fecha_reparacion DESC
        `);
        
        const reparaciones = result.recordset;
        todasReparaciones = [...todasReparaciones, ...reparaciones];
        console.log(`✅ ${reparaciones.length} reparaciones obtenidas de ${sede}`);
        
      } catch (error) {
        console.error(`❌ Error obteniendo reparaciones de ${sede}:`, error.message);
      }
    }
    
    console.log(`🎯 Total reparaciones obtenidas: ${todasReparaciones.length}`);
    
    return {
      success: true,
      data: todasReparaciones,
      message: `${todasReparaciones.length} reparaciones encontradas`
    };
  } catch (error) {
    console.error('Error obteniendo todas las reparaciones:', error);
    return {
      success: false,
      data: [],
      message: error.message
    };
  }
}

// Crear reparación simple (para formulario básico)
async function crearReparacionSimple(reparacionData) {
  try {
    const { placa, sede_taller, fecha_reparacion, descripcion, precio_total, repuestos } = reparacionData;
    const sede = sede_taller?.toUpperCase() || 'NORTE';
    
    console.log('🔧 Creando reparación simple:', reparacionData);
    
    const pool = getPool(sede);
    if (!pool) {
      throw new Error(`No hay conexión disponible a ${sede}`);
    }
    
    // Determinar tabla correcta
    const tablaReparacion = sede === 'NORTE' ? 'Reparacion_norte' : 'Reparacion_sur';
    
    // Obtener próximo ID
    const idResult = await pool.request().query(`
      SELECT ISNULL(MAX(CAST(id_reparacion AS INT)), 0) + 1 as nuevo_id
      FROM ${tablaReparacion}
    `);
    const nuevoId = idResult.recordset[0].nuevo_id;
    
    // Crear la reparación
    const result = await pool.request()
      .input('id_reparacion', sql.Int, nuevoId)
      .input('placa', sql.VarChar(10), placa)
      .input('sede_taller', sql.VarChar(10), sede_taller)
      .input('fecha_reparacion', sql.Date, fecha_reparacion)
      .input('descripcion', sql.VarChar(255), descripcion)
      .input('precio_total', sql.Decimal(10, 2), precio_total)
      .query(`
        INSERT INTO ${tablaReparacion} (
          id_reparacion, 
          placa, 
          sede_taller,
          fecha_reparacion, 
          descripcion, 
          precio_total
        )
        VALUES (
          @id_reparacion, 
          @placa, 
          @sede_taller,
          @fecha_reparacion, 
          @descripcion, 
          @precio_total
        )
      `);
    
    console.log(`✅ Reparación simple creada con ID: ${nuevoId} en ${sede}`);
    
    // Si hay repuestos, intentar crearlos en tabla de detalle (si existe)
    if (repuestos && repuestos.length > 0) {
      console.log(`🔧 Intentando guardar ${repuestos.length} repuestos para reparación ${nuevoId}`);
      
      const tablaDetalle = sede === 'NORTE' ? 'Reparacion_detalle_norte' : 'Reparacion_detalle_sur';
      
      try {
        for (const repuesto of repuestos) {
          await pool.request()
            .input('id_reparacion', sql.Int, nuevoId)
            .input('id_repuesto', sql.Int, repuesto.id_repuesto)
            .input('cantidad_usada', sql.Int, repuesto.cantidad)
            .query(`
              INSERT INTO ${tablaDetalle} (id_reparacion, id_repuesto, cantidad_usada)
              VALUES (@id_reparacion, @id_repuesto, @cantidad_usada)
            `);
        }
        console.log(`✅ ${repuestos.length} repuestos asociados a reparación ${nuevoId}`);
      } catch (detalleError) {
        console.log(`⚠️ Tabla de detalle no existe o error guardando repuestos: ${detalleError.message}`);
        console.log('ℹ️ Reparación creada sin detalle de repuestos');
      }
    }
    
    return {
      success: true,
      message: `Reparación creada correctamente${repuestos?.length ? ` con ${repuestos.length} repuestos` : ''}`,
      data: { id_reparacion: nuevoId }
    };
    
  } catch (error) {
    console.error('❌ Error creando reparación simple:', error);
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
    
    // Determinar las tablas correctas según la sede
    const tablaReparacion = sede === 'NORTE' ? 'Reparacion_norte' : 'Reparacion_sur';
    const tablaDetalle = sede === 'NORTE' ? 'Reparacion_detalle_norte' : 'Reparacion_detalle_sur';
    
    // Generar ID de reparación automáticamente
    const idResult = await pool.request().query(`
      SELECT ISNULL(MAX(CAST(id_reparacion AS INT)), 0) + 1 as nuevo_id
      FROM ${tablaReparacion}
    `);
    const nuevoId = idResult.recordset[0].nuevo_id.toString();
    
    // Comenzar transacción
    const transaction = pool.transaction();
    await transaction.begin();
    
    try {
      // Insertar reparación principal
      await transaction.request()
        .input('id_reparacion', sql.Int, parseInt(nuevoId))
        .input('placa', sql.NVarChar(10), reparacionData.placa_vehiculo || reparacionData.placa)
        .input('sede_taller', sql.NVarChar(10), reparacionData.sede_taller)
        .input('fecha_reparacion', sql.Date, reparacionData.fecha_fin || reparacionData.fecha_reparacion || new Date())
        .input('descripcion', sql.NVarChar(255), reparacionData.descripcion_problema || reparacionData.descripcion)
        .input('precio_total', sql.Decimal(10,2), reparacionData.precio_total || 0)
        .query(`
          INSERT INTO ${tablaReparacion}
          (id_reparacion, placa, sede_taller, fecha_reparacion, descripcion, precio_total)
          VALUES 
          (@id_reparacion, @placa, @sede_taller, @fecha_reparacion, @descripcion, @precio_total)
        `);
      
      // Insertar repuestos si existen
      if (reparacionData.repuestos && reparacionData.repuestos.length > 0) {
        for (const repuesto of reparacionData.repuestos) {
          // Insertar en tabla de detalle - solo los campos que existen
          await transaction.request()
            .input('id_reparacion', sql.Int, parseInt(nuevoId))
            .input('id_repuesto', sql.Int, repuesto.id_repuesto)
            .input('cantidad_usada', sql.Int, repuesto.cantidad || repuesto.cantidad_usada || 1)
            .query(`
              INSERT INTO ${tablaDetalle}
              (id_reparacion, id_repuesto, cantidad_usada)
              VALUES (@id_reparacion, @id_repuesto, @cantidad_usada)
            `);
          
          // Actualizar stock del repuesto
          await transaction.request()
            .input('id_repuesto', sql.Int, repuesto.id_repuesto)
            .input('cantidad', sql.Int, repuesto.cantidad || repuesto.cantidad_usada || 1)
            .query(`
              UPDATE ${sede === 'NORTE' ? 'Repuesto_norte' : 'Repuesto_sur'}
              SET cantidad_repuesto = cantidad_repuesto - @cantidad
              WHERE id_repuesto = @id_repuesto
            `);
        }
      }
      
      await transaction.commit();
      console.log(`✅ Reparación ${nuevoId} creada exitosamente en ${sede} con ${reparacionData.repuestos?.length || 0} repuestos`);
      
      return {
        success: true,
        data: { ...reparacionData, id_reparacion: nuevoId },
        message: `Reparación ${nuevoId} creada exitosamente en ${sede}`
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error creando reparación:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

// Actualizar reparación
async function actualizarReparacion(idReparacion, reparacionData) {
  try {
    const sede = reparacionData.sede_taller?.toUpperCase() || 'NORTE';
    const pool = getPool(sede);
    if (!pool) throw new Error(`No hay conexión disponible a ${sede}`);
    
    console.log(`✏️ Actualizando reparación ${idReparacion} en ${sede}:`, reparacionData);
    
    const tableName = sede === 'NORTE' ? 'Reparacion_norte' : 'Reparacion_sur';
    
    const result = await pool.request()
      .input('id_reparacion', sql.Int, parseInt(idReparacion))
      .input('placa', sql.NVarChar(10), reparacionData.placa || reparacionData.placa_vehiculo)
      .input('fecha_reparacion', sql.Date, reparacionData.fecha_reparacion || reparacionData.fecha_inicio)
      .input('descripcion', sql.NVarChar(255), reparacionData.descripcion || reparacionData.descripcion_problema)
      .input('precio_total', sql.Decimal(10,2), parseFloat(reparacionData.precio_total))
      .query(`
        UPDATE ${tableName} SET
          placa = @placa,
          fecha_reparacion = @fecha_reparacion,
          descripcion = @descripcion,
          precio_total = @precio_total
        WHERE id_reparacion = @id_reparacion
      `);
    
    console.log(`✅ Reparación ${idReparacion} actualizada exitosamente en ${sede}`);
    
    return {
      success: true,
      data: reparacionData,
      message: `Reparación ${idReparacion} actualizada exitosamente`
    };
  } catch (error) {
    console.error('Error actualizando reparación:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

// Eliminar reparación
async function eliminarReparacion(idReparacion) {
  try {
    console.log(`🗑️ Eliminando reparación ${idReparacion}...`);
    
    // Buscar en ambas sedes
    const sedes = ['NORTE', 'SUR'];
    
    for (const sede of sedes) {
      try {
        const pool = getPool(sede);
        if (!pool) continue;

        const tableName = sede === 'NORTE' ? 'Reparacion_norte' : 'Reparacion_sur';
        
        const result = await pool.request()
          .input('id_reparacion', sql.NVarChar(10), idReparacion)
          .query(`
            DELETE FROM ${tableName} 
            WHERE id_reparacion = @id_reparacion
          `);
        
        if (result.rowsAffected[0] > 0) {
          console.log(`✅ Reparación ${idReparacion} eliminada de ${sede}`);
          
          return {
            success: true,
            message: `Reparación ${idReparacion} eliminada exitosamente`
          };
        }
      } catch (error) {
        console.error(`❌ Error eliminando de ${sede}:`, error.message);
      }
    }
    
    throw new Error('Reparación no encontrada en ninguna sede');
    
  } catch (error) {
    console.error('Error eliminando reparación:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

// Obtener repuestos utilizados en una reparación específica
async function obtenerRepuestosDeReparacion(idReparacion) {
  try {
    console.log(`🔍 Buscando repuestos de la reparación ${idReparacion}...`);
    
    const sedes = ['NORTE', 'SUR'];
    let repuestos = [];
    
    for (const sede of sedes) {
      try {
        const pool = getPool(sede);
        if (!pool) continue;
        
        console.log(`🔍 Consultando repuestos en ${sede}...`);
        
        // Construir nombres de tablas según la sede
        const tablaDetalle = sede === 'NORTE' ? 'Reparacion_detalle_norte' : 'Reparacion_detalle_sur';
        const tablaRepuesto = sede === 'NORTE' ? 'Repuesto_norte' : 'Repuesto_sur';
        
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
              r.sede_taller
            FROM ${tablaDetalle} rd
            INNER JOIN ${tablaRepuesto} r ON rd.id_repuesto = r.id_repuesto
            WHERE rd.id_reparacion = @id_reparacion
          `);
        
        if (result.recordset.length > 0) {
          repuestos = result.recordset;
          console.log(`✅ Encontrados ${repuestos.length} repuestos en ${sede}`);
          break;
        }
        
      } catch (error) {
        console.error(`❌ Error consultando repuestos en ${sede}:`, error.message);
      }
    }
    
    return {
      success: true,
      data: repuestos,
      message: `${repuestos.length} repuestos encontrados para la reparación ${idReparacion}`
    };
    
  } catch (error) {
    console.error('Error obteniendo repuestos de reparación:', error);
    return {
      success: false,
      message: error.message,
      data: []
    };
  }
}

// =============================================
// FUNCIONES DE CONSULTAS ESPECIALES
// =============================================

// Resumen por sedes (COMPLETAMENTE CORREGIDO)
async function obtenerResumenPorSedes() {
  try {
    console.log('🏢 Obteniendo resumen de todas las sedes...');
    
    const resumenSedes = {};
    const sedes = [
      { nombre: 'NORTE', tablaClientes: 'Cliente', tablaVehiculos: 'Vehiculo', tablaEmpleados: 'Empleado', tablaRepuestos: 'Repuesto_norte', tablaReparaciones: 'Reparacion_norte' },
      { nombre: 'SUR', tablaClientes: 'Cliente', tablaVehiculos: 'Vehiculo', tablaEmpleados: 'Empleado', tablaRepuestos: 'Repuesto_sur', tablaReparaciones: 'Reparacion_sur' }
    ];
    
    for (const sedeConfig of sedes) {
      try {
        const pool = getPool(sedeConfig.nombre);
        if (!pool) {
          console.log(`⚠️ No hay conexión a ${sedeConfig.nombre}, saltando...`);
          continue;
        }
        
        console.log(`📊 Procesando resumen de ${sedeConfig.nombre}...`);
        
        // Obtener conteo de clientes (replicados, por eso usamos solo una sede)
        let clientesResult = { recordset: [{ total_clientes: 0 }] };
        let vehiculosResult = { recordset: [{ total_vehiculos: 0 }] };
        
        if (sedeConfig.nombre === 'NORTE') { // Solo contar clientes/vehículos desde una sede para evitar duplicados
          try {
            clientesResult = await pool.request().query(`SELECT COUNT(*) as total_clientes FROM ${sedeConfig.tablaClientes}`);
            vehiculosResult = await pool.request().query(`SELECT COUNT(*) as total_vehiculos FROM ${sedeConfig.tablaVehiculos}`);
          } catch (err) {
            console.warn(`⚠️ Error contando clientes/vehículos en ${sedeConfig.nombre}:`, err.message);
          }
        }
        
        // Obtener conteo de empleados por sede
        let empleadosResult = { recordset: [{ total_empleados: 0 }] };
        try {
          empleadosResult = await pool.request().query(`SELECT COUNT(*) as total_empleados FROM ${sedeConfig.tablaEmpleados}`);
        } catch (err) {
          console.warn(`⚠️ Error contando empleados en ${sedeConfig.nombre}:`, err.message);
        }
        
        // Obtener conteo de repuestos por sede
        let repuestosResult = { recordset: [{ total_repuestos: 0 }] };
        try {
          repuestosResult = await pool.request().query(`SELECT COUNT(*) as total_repuestos FROM ${sedeConfig.tablaRepuestos}`);
        } catch (err) {
          console.warn(`⚠️ Error contando repuestos en ${sedeConfig.nombre}:`, err.message);
        }
        
        // Obtener conteo de reparaciones y ingresos por sede
        let reparacionesResult = { recordset: [{ total_reparaciones: 0, ingresos_totales: 0 }] };
        try {
          reparacionesResult = await pool.request().query(`
            SELECT COUNT(*) as total_reparaciones, 
                   ISNULL(SUM(precio_total), 0) as ingresos_totales
            FROM ${sedeConfig.tablaReparaciones}
          `);
        } catch (err) {
          console.warn(`⚠️ Error contando reparaciones en ${sedeConfig.nombre}:`, err.message);
        }
        
        resumenSedes[sedeConfig.nombre] = {
          sede_taller: sedeConfig.nombre,
          nombre_taller: `Taller POLI-CAR ${sedeConfig.nombre}`,
          total_clientes: sedeConfig.nombre === 'NORTE' ? (clientesResult.recordset[0].total_clientes || 0) : 0,
          total_vehiculos: sedeConfig.nombre === 'NORTE' ? (vehiculosResult.recordset[0].total_vehiculos || 0) : 0,
          total_empleados: empleadosResult.recordset[0].total_empleados || 0,
          total_repuestos: repuestosResult.recordset[0].total_repuestos || 0,
          total_reparaciones: reparacionesResult.recordset[0].total_reparaciones || 0,
          ingresos_totales: parseFloat(reparacionesResult.recordset[0].ingresos_totales || 0)
        };
        
        console.log(`✅ Resumen de ${sedeConfig.nombre} obtenido:`, resumenSedes[sedeConfig.nombre]);
        
      } catch (error) {
        console.error(`❌ Error general obteniendo resumen de ${sedeConfig.nombre}:`, error.message);
        resumenSedes[sedeConfig.nombre] = {
          sede_taller: sedeConfig.nombre,
          nombre_taller: `Taller POLI-CAR ${sedeConfig.nombre}`,
          total_clientes: 0,
          total_vehiculos: 0,
          total_empleados: 0,
          total_repuestos: 0,
          total_reparaciones: 0,
          ingresos_totales: 0
        };
      }
    }
    
    // Calcular totales generales
    const resumen = Object.values(resumenSedes);
    const totales = {
      total_clientes: resumen.reduce((sum, sede) => sum + sede.total_clientes, 0),
      total_vehiculos: resumen.reduce((sum, sede) => sum + sede.total_vehiculos, 0),
      total_empleados: resumen.reduce((sum, sede) => sum + sede.total_empleados, 0),
      total_reparaciones: resumen.reduce((sum, sede) => sum + sede.total_reparaciones, 0)
    };
    
    console.log(`🎯 Resumen completo generado:`, totales);
    
    return {
      success: true,
      data: {
        resumen_por_sedes: resumen,
        totales: totales
      },
      message: 'Resumen obtenido exitosamente'
    };
  } catch (error) {
    console.error('❌ Error obteniendo resumen por sedes:', error);
    return {
      success: false,
      data: {
        resumen_por_sedes: [],
        totales: { total_clientes: 0, total_vehiculos: 0, total_empleados: 0, total_reparaciones: 0 }
      },
      message: error.message
    };
  }
}

// =============================================
// FUNCIONES DE ESTADÍSTICAS
// =============================================

async function obtenerEstadisticas() {
  try {
    const sedes = ['NORTE', 'SUR'];
    let estadisticasTotal = {
      total_clientes: 0,
      total_vehiculos: 0,
      total_empleados: 0,
      total_repuestos: 0,
      total_reparaciones: 0,
      ingresos_totales: 0,
      detalles_por_sede: {}
    };
    
    let datosReplicadosObtenidos = false;
    
    for (const sede of sedes) {
      try {
        const pool = getPool(sede);
        if (!pool) {
          console.log(`⚠️ No hay conexión disponible a ${sede}`);
          continue;
        }
        
        console.log(`📊 Obteniendo estadísticas de ${sede}...`);
        
        // Obtener estadísticas específicas por sede
        const tablaRepuesto = sede === 'NORTE' ? 'Repuesto_norte' : 'Repuesto_sur';
        const tablaReparacion = sede === 'NORTE' ? 'Reparacion_norte' : 'Reparacion_sur';
        const tablaEmpleadoInfo = sede === 'NORTE' ? 'Empleado_informacion_Norte' : 'Empleado_informacion_sur';
        
        const result = await pool.request().query(`
          SELECT 
            (SELECT COUNT(*) FROM Cliente) as clientes,
            (SELECT COUNT(*) FROM Vehiculo) as vehiculos,
            (SELECT COUNT(*) FROM Empleado_nomina) as empleados_nomina,
            (SELECT COUNT(*) FROM ${tablaEmpleadoInfo}) as empleados_info,
            (SELECT COUNT(*) FROM ${tablaRepuesto}) as repuestos,
            (SELECT COUNT(*) FROM ${tablaReparacion}) as reparaciones,
            (SELECT ISNULL(SUM(precio_total), 0) FROM ${tablaReparacion}) as ingresos
        `);
        
        const estadisticasSede = result.recordset[0];
        
        // Para datos replicados, solo tomar del primer nodo que responda
        if (!datosReplicadosObtenidos) {
          estadisticasTotal.total_clientes = estadisticasSede.clientes;
          estadisticasTotal.total_vehiculos = estadisticasSede.vehiculos;
          estadisticasTotal.total_empleados = estadisticasSede.empleados_nomina;
          datosReplicadosObtenidos = true;
          console.log(`✅ Datos replicados obtenidos de ${sede}: ${estadisticasSede.clientes} clientes, ${estadisticasSede.vehiculos} vehículos, ${estadisticasSede.empleados_nomina} empleados`);
        }
        
        // Para datos fragmentados, sumamos
        estadisticasTotal.total_repuestos += estadisticasSede.repuestos;
        estadisticasTotal.total_reparaciones += estadisticasSede.reparaciones;
        estadisticasTotal.ingresos_totales += estadisticasSede.ingresos;
        
        estadisticasTotal.detalles_por_sede[sede] = {
          clientes: estadisticasSede.clientes,
          vehiculos: estadisticasSede.vehiculos,
          empleados: estadisticasSede.empleados_info,
          repuestos: estadisticasSede.repuestos,
          reparaciones: estadisticasSede.reparaciones,
          ingresos: estadisticasSede.ingresos
        };
        
        console.log(`✅ Estadísticas de ${sede} obtenidas`);
        
      } catch (error) {
        console.error(`❌ Error obteniendo estadísticas de ${sede}:`, error.message);
        estadisticasTotal.detalles_por_sede[sede] = { error: error.message };
      }
    }
    
    console.log('📊 Estadísticas finales:', estadisticasTotal);
    
    return {
      success: true,
      data: estadisticasTotal,
      message: 'Estadísticas distribuidas obtenidas'
    };
    
  } catch (error) {
    console.error('❌ Error general obteniendo estadísticas:', error);
    return {
      success: false,
      data: {},
      message: error.message
    };
  }
}

// =============================================
// FUNCIONES CRUD ADICIONALES
// =============================================

// Actualizar cliente (Replicado en Norte y Sur)
async function actualizarCliente(cedula, clienteData) {
  try {
    const sedes = ['NORTE', 'SUR'];
    const { nombre_cliente, apellido_cliente, zona } = clienteData;
    const resultados = {};
    
    console.log('🔄 Actualizando cliente en ambas sedes:', { cedula, ...clienteData });
    
    for (const sede of sedes) {
      try {
        const pool = getPool(sede);
        if (!pool) {
          console.log(`⚠️ No hay conexión disponible a ${sede}`);
          resultados[sede] = { success: false, error: 'Sin conexión' };
          continue;
        }
        
        console.log(`📝 Actualizando cliente en ${sede}...`);
        
        await pool.request()
          .input('cedula', sql.VarChar(10), cedula)
          .input('nombre', sql.VarChar(50), nombre_cliente)
          .input('apellido', sql.VarChar(50), apellido_cliente)
          .input('zona', sql.VarChar(50), zona)
          .query(`
            UPDATE Cliente 
            SET nombre_cliente = @nombre, apellido_cliente = @apellido, zona = @zona
            WHERE cedula_cliente = @cedula
          `);
        
        resultados[sede] = { success: true };
        console.log(`✅ Cliente actualizado exitosamente en ${sede}`);
        
      } catch (error) {
        console.error(`❌ Error actualizando cliente en ${sede}:`, error.message);
        resultados[sede] = { success: false, error: error.message };
      }
    }
    
    const sedesExitosas = Object.keys(resultados).filter(sede => resultados[sede].success);
    const mensaje = sedesExitosas.length > 0 
      ? `Cliente actualizado en ${sedesExitosas.length} sede(s): ${sedesExitosas.join(', ')}`
      : 'Error: No se pudo actualizar el cliente en ninguna sede';
    
    return {
      success: sedesExitosas.length > 0,
      message: mensaje,
      data: { cedula_cliente: cedula },
      detalles: resultados
    };
    
  } catch (error) {
    console.error('❌ Error general actualizando cliente:', error);
    return {
      success: false,
      message: error.message,
      data: null
    };
  }
}

// Eliminar cliente (Replicado en Norte y Sur)
async function eliminarCliente(cedula) {
  try {
    const sedes = ['NORTE', 'SUR'];
    const resultados = {};
    
    console.log('🗑️ Eliminando cliente de ambas sedes:', cedula);
    
    for (const sede of sedes) {
      try {
        const pool = getPool(sede);
        if (!pool) {
          console.log(`⚠️ No hay conexión disponible a ${sede}`);
          resultados[sede] = { success: false, error: 'Sin conexión' };
          continue;
        }
        
        console.log(`🗑️ Eliminando cliente de ${sede}...`);
        
        await pool.request()
          .input('cedula', sql.VarChar(10), cedula)
          .query(`DELETE FROM Cliente WHERE cedula_cliente = @cedula`);
        
        resultados[sede] = { success: true };
        console.log(`✅ Cliente eliminado exitosamente de ${sede}`);
        
      } catch (error) {
        console.error(`❌ Error eliminando cliente de ${sede}:`, error.message);
        resultados[sede] = { success: false, error: error.message };
      }
    }
    
    const sedesExitosas = Object.keys(resultados).filter(sede => resultados[sede].success);
    const mensaje = sedesExitosas.length > 0 
      ? `Cliente eliminado de ${sedesExitosas.length} sede(s): ${sedesExitosas.join(', ')}`
      : 'Error: No se pudo eliminar el cliente de ninguna sede';
    
    return {
      success: sedesExitosas.length > 0,
      message: mensaje,
      data: { cedula_cliente: cedula },
      detalles: resultados
    };
    
  } catch (error) {
    console.error('❌ Error general eliminando cliente:', error);
    return {
      success: false,
      message: error.message,
      data: null
    };
  }
}

// Actualizar vehículo (Replicado en Norte y Sur)
async function actualizarVehiculo(placa, vehiculoData) {
  try {
    const sedes = ['NORTE', 'SUR'];
    const { cedula_cliente, marca, modelo, año } = vehiculoData;
    const resultados = {};
    
    console.log('🔄 Actualizando vehículo en ambas sedes:', { placa, ...vehiculoData });
    
    for (const sede of sedes) {
      try {
        const pool = getPool(sede);
        if (!pool) {
          console.log(`⚠️ No hay conexión disponible a ${sede}`);
          resultados[sede] = { success: false, error: 'Sin conexión' };
          continue;
        }
        
        console.log(`📝 Actualizando vehículo en ${sede}...`);
        
        await pool.request()
          .input('placa', sql.VarChar(10), placa)
          .input('cedula_cliente', sql.VarChar(10), cedula_cliente)
          .input('marca', sql.VarChar(50), marca)
          .input('modelo', sql.VarChar(50), modelo)
          .input('anio', sql.Int, año)
          .query(`
            UPDATE Vehiculo 
            SET cedula_cliente = @cedula_cliente, marca = @marca, modelo = @modelo, anio = @anio
            WHERE placa = @placa
          `);
        
        resultados[sede] = { success: true };
        console.log(`✅ Vehículo actualizado exitosamente en ${sede}`);
        
      } catch (error) {
        console.error(`❌ Error actualizando vehículo en ${sede}:`, error.message);
        resultados[sede] = { success: false, error: error.message };
      }
    }
    
    const sedesExitosas = Object.keys(resultados).filter(sede => resultados[sede].success);
    const mensaje = sedesExitosas.length > 0 
      ? `Vehículo actualizado en ${sedesExitosas.length} sede(s): ${sedesExitosas.join(', ')}`
      : 'Error: No se pudo actualizar el vehículo en ninguna sede';
    
    return {
      success: sedesExitosas.length > 0,
      message: mensaje,
      data: { placa },
      detalles: resultados
    };
    
  } catch (error) {
    console.error('❌ Error general actualizando vehículo:', error);
    return {
      success: false,
      message: error.message,
      data: null
    };
  }
}

// Eliminar vehículo (Replicado en Norte y Sur)
async function eliminarVehiculo(placa) {
  try {
    const sedes = ['NORTE', 'SUR'];
    const resultados = {};
    
    console.log('🗑️ Eliminando vehículo de ambas sedes:', placa);
    
    for (const sede of sedes) {
      try {
        const pool = getPool(sede);
        if (!pool) {
          console.log(`⚠️ No hay conexión disponible a ${sede}`);
          resultados[sede] = { success: false, error: 'Sin conexión' };
          continue;
        }
        
        console.log(`🗑️ Eliminando vehículo de ${sede}...`);
        
        await pool.request()
          .input('placa', sql.VarChar(10), placa)
          .query(`DELETE FROM Vehiculo WHERE placa = @placa`);
        
        resultados[sede] = { success: true };
        console.log(`✅ Vehículo eliminado exitosamente de ${sede}`);
        
      } catch (error) {
        console.error(`❌ Error eliminando vehículo de ${sede}:`, error.message);
        resultados[sede] = { success: false, error: error.message };
      }
    }
    
    const sedesExitosas = Object.keys(resultados).filter(sede => resultados[sede].success);
    const mensaje = sedesExitosas.length > 0 
      ? `Vehículo eliminado de ${sedesExitosas.length} sede(s): ${sedesExitosas.join(', ')}`
      : 'Error: No se pudo eliminar el vehículo de ninguna sede';
    
    return {
      success: sedesExitosas.length > 0,
      message: mensaje,
      data: { placa },
      detalles: resultados
    };
    
  } catch (error) {
    console.error('❌ Error general eliminando vehículo:', error);
    return {
      success: false,
      message: error.message,
      data: null
    };
  }
}

module.exports = {
  // Clientes
  obtenerClientes,
  crearCliente,
  actualizarCliente,
  eliminarCliente,
  
  // Vehículos
  obtenerVehiculos,
  crearVehiculo,
  actualizarVehiculo,
  eliminarVehiculo,
  
  // Empleados
  obtenerEmpleados,
  obtenerEmpleadosPorSede,
  obtenerNominaCompleta,
  obtenerNominaGlobal: obtenerEmpleados, // Alias para nómina global
  crearEmpleado,
  crearEmpleadoCompleto,
  actualizarEmpleado,
  actualizarNomina,
  eliminarEmpleado,
  
  // Repuestos
  obtenerRepuestosPorSede,
  obtenerTodosRepuestos,
  crearRepuesto,
  actualizarRepuesto,
  eliminarRepuesto,
  
  // Reparaciones
  obtenerReparacionesPorSede,
  obtenerTodasReparaciones,
  crearReparacion,
  crearReparacionSimple,
  actualizarReparacion,
  eliminarReparacion,
  obtenerRepuestosDeReparacion,
  
  // Consultas especiales
  obtenerResumenPorSedes,
  obtenerEstadisticas
};
