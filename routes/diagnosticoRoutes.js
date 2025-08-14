// =============================================
// ENDPOINT TEMPORAL DE DIAGNÓSTICO
// =============================================

const express = require('express');
const router = express.Router();
const { getPool } = require('../config/database');

// GET - Diagnóstico completo de bases de datos
router.get('/diagnostico', async (req, res) => {
    try {
        console.log('🔍 INICIANDO DIAGNÓSTICO COMPLETO');
        
        const diagnostico = {
            norte: await diagnosticarSede('NORTE'),
            sur: await diagnosticarSede('SUR')
        };
        
        res.json({
            success: true,
            message: 'Diagnóstico completado',
            data: diagnostico
        });
        
    } catch (error) {
        console.error('❌ Error en diagnóstico:', error);
        res.status(500).json({
            success: false,
            message: error.message,
            data: null
        });
    }
});

async function diagnosticarSede(sede) {
    console.log(`\n🏢 DIAGNÓSTICO SEDE ${sede}`);
    console.log('-'.repeat(40));
    
    const resultado = {
        sede: sede,
        tablas: [],
        empleados: {},
        repuestos: {},
        reparaciones: {}
    };
    
    try {
        const pool = getPool(sede);
        if (!pool) {
            console.log(`❌ No hay conexión a ${sede}`);
            return resultado;
        }
        
        // 1. Obtener todas las tablas
        const tablasResult = await pool.request().query(`
            SELECT TABLE_NAME
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_TYPE = 'BASE TABLE'
            ORDER BY TABLE_NAME
        `);
        
        resultado.tablas = tablasResult.recordset.map(t => t.TABLE_NAME);
        console.log(`📋 Tablas en ${sede}:`, resultado.tablas);
        
        // 2. Diagnosticar EMPLEADOS
        resultado.empleados = await diagnosticarEmpleados(pool, sede);
        
        // 3. Diagnosticar REPUESTOS
        resultado.repuestos = await diagnosticarRepuestos(pool, sede);
        
        // 4. Diagnosticar REPARACIONES
        resultado.reparaciones = await diagnosticarReparaciones(pool, sede);
        
        return resultado;
        
    } catch (error) {
        console.error(`❌ Error en ${sede}:`, error.message);
        return resultado;
    }
}

async function diagnosticarEmpleados(pool, sede) {
    const empleados = { tablas: [], estructuras: {}, datos: {} };
    
    // Buscar tablas de empleados
    const tablasEmpleados = await pool.request().query(`
        SELECT TABLE_NAME
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_NAME LIKE '%empleado%' OR TABLE_NAME LIKE '%Empleado%'
    `);
    
    empleados.tablas = tablasEmpleados.recordset.map(t => t.TABLE_NAME);
    console.log(`👥 Tablas de empleados en ${sede}:`, empleados.tablas);
    
    for (const tabla of empleados.tablas) {
        try {
            // Obtener estructura
            const estructura = await pool.request().query(`
                SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = '${tabla}'
                ORDER BY ORDINAL_POSITION
            `);
            
            empleados.estructuras[tabla] = estructura.recordset;
            
            // Obtener datos de muestra
            const datos = await pool.request().query(`SELECT TOP 5 * FROM [${tabla}]`);
            empleados.datos[tabla] = datos.recordset;
            
            console.log(`   📊 ${tabla}: ${datos.recordset.length} registros`);
            if (datos.recordset.length > 0) {
                console.log(`       Ejemplo: ${JSON.stringify(datos.recordset[0])}`);
            }
            
        } catch (error) {
            console.log(`   ❌ Error en tabla ${tabla}: ${error.message}`);
        }
    }
    
    return empleados;
}

async function diagnosticarRepuestos(pool, sede) {
    const repuestos = { tablas: [], estructuras: {}, datos: {} };
    
    // Buscar tablas de repuestos
    const tablasRepuestos = await pool.request().query(`
        SELECT TABLE_NAME
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_NAME LIKE '%repuesto%' OR TABLE_NAME LIKE '%Repuesto%'
    `);
    
    repuestos.tablas = tablasRepuestos.recordset.map(t => t.TABLE_NAME);
    console.log(`🔧 Tablas de repuestos en ${sede}:`, repuestos.tablas);
    
    for (const tabla of repuestos.tablas) {
        try {
            // Obtener estructura
            const estructura = await pool.request().query(`
                SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = '${tabla}'
                ORDER BY ORDINAL_POSITION
            `);
            
            repuestos.estructuras[tabla] = estructura.recordset;
            
            // Obtener datos de muestra
            const datos = await pool.request().query(`SELECT TOP 3 * FROM [${tabla}]`);
            repuestos.datos[tabla] = datos.recordset;
            
            console.log(`   📊 ${tabla}: ${datos.recordset.length} registros`);
            if (datos.recordset.length > 0) {
                console.log(`       Ejemplo: ${JSON.stringify(datos.recordset[0])}`);
            }
            
        } catch (error) {
            console.log(`   ❌ Error en tabla ${tabla}: ${error.message}`);
        }
    }
    
    return repuestos;
}

async function diagnosticarReparaciones(pool, sede) {
    const reparaciones = { tablas: [], estructuras: {}, datos: {} };
    
    // Buscar tablas de reparaciones
    const tablasReparaciones = await pool.request().query(`
        SELECT TABLE_NAME
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_NAME LIKE '%reparacion%' OR TABLE_NAME LIKE '%Reparacion%'
    `);
    
    reparaciones.tablas = tablasReparaciones.recordset.map(t => t.TABLE_NAME);
    console.log(`🔨 Tablas de reparaciones en ${sede}:`, reparaciones.tablas);
    
    for (const tabla of reparaciones.tablas) {
        try {
            // Obtener estructura
            const estructura = await pool.request().query(`
                SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = '${tabla}'
                ORDER BY ORDINAL_POSITION
            `);
            
            reparaciones.estructuras[tabla] = estructura.recordset;
            
            // Obtener datos de muestra
            const datos = await pool.request().query(`SELECT TOP 3 * FROM [${tabla}]`);
            reparaciones.datos[tabla] = datos.recordset;
            
            console.log(`   📊 ${tabla}: ${datos.recordset.length} registros`);
            if (datos.recordset.length > 0) {
                console.log(`       Ejemplo: ${JSON.stringify(datos.recordset[0])}`);
            }
            
        } catch (error) {
            console.log(`   ❌ Error en tabla ${tabla}: ${error.message}`);
        }
    }
    
    return reparaciones;
}

module.exports = router;
