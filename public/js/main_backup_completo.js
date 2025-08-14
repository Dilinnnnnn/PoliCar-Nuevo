// public/js/main.js - POLI-CAR Sistema Distribuido

// === UTILIDADES GENERALES POLI-CAR ===

// Función auxiliar para mostrar mensajes con branding POLI-CAR
function showMessage(elementId, message, isSuccess) {
  const messageElement = document.getElementById(elementId);
  if (messageElement) {
    messageElement.textContent = message;
    messageElement.style.display = 'block';
    if (isSuccess) {
      messageElement.className = 'success';
    } else {
      messageElement.className = 'error';
    }
    setTimeout(() => {
      messageElement.style.display = 'none';
      messageElement.textContent = '';
    }, 5000);
  }
}

// Obtener sede actual de POLI-CAR
function getCurrentSede() {
  return localStorage.getItem('poli_car_sede') || 'SUR';
}

// === GESTIÓN DE LOGIN ===
document.addEventListener('DOMContentLoaded', function() {
    // Configurar el botón de ingreso solo si existe
    const ingresarBtn = document.getElementById('ingresarBtn');
    if (ingresarBtn) {
        ingresarBtn.addEventListener('click', function() {
            const selectedSede = document.querySelector('input[name="sede"]:checked').value;
            
            // Guardar sede seleccionada
            localStorage.setItem('poli_car_sede', selectedSede.toUpperCase());
            
            // Mostrar mensaje de conexión
            showMessage('message', `Conectando a POLI-CAR sede ${selectedSede}...`, false);
            
            // Simular proceso de conexión
            setTimeout(() => {
                showMessage('message', `✅ Conexión exitosa a POLI-CAR sede ${selectedSede}`, true);
                
                // Redirigir al dashboard
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1500);
            }, 2000);
        });
    }

    // Si es el dashboard, configurar estadísticas
    if (window.location.pathname.includes('dashboard')) {
        console.log('� Dashboard detectado, iniciando carga de estadísticas...');
        // Cargar inmediatamente y luego cada 30 segundos
        setTimeout(loadDashboardStats, 1000);
        setInterval(loadDashboardStats, 30000);
    }
});

// === FUNCIONES DEL DASHBOARD ===

// Función para mostrar información del taller actual
function showTallerInfo() {
  const sede = getCurrentSede();
  const infoElement = document.getElementById('taller-info');
  if (infoElement) {
    infoElement.innerHTML = `🏢 Taller POLI-CAR ${sede}`;
  }
}

// Cargar estadísticas del dashboard (MEJORADO CON DEBUG)
async function loadDashboardStats() {
    console.log('🚀 Iniciando carga de estadísticas del dashboard...');
    try {
        console.log('🔄 Haciendo petición a /api/estadisticas...');
        const response = await fetch('/api/estadisticas');
        console.log('📡 Respuesta recibida:', response.status, response.statusText);
        
        const data = await response.json();
        console.log('📊 Datos recibidos:', data);
        
        if (data.success) {
            console.log('✅ Datos válidos, actualizando dashboard...');
            displayEstadisticas(data.data);
        } else {
            console.error('❌ Error en respuesta del servidor:', data.message);
        }
    } catch (error) {
        console.error('❌ Error cargando estadísticas:', error);
    }
}

function updateDashboardNumbers(stats) {
    updateStat('total-clientes', stats.clientes || 0);
    updateStat('total-vehiculos', stats.vehiculos || 0);
    updateStat('total-empleados', stats.empleados || 0);
    updateStat('total-reparaciones', stats.reparaciones || 0);
}

function updateStat(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 POLI-CAR Nuevo iniciado');
    
    // Inicializar navegación
    initNavigation();
    
    // Inicializar modales
    initModals();
    
    // Cargar datos iniciales
    checkSystemStatus();
    loadDashboard();
    
    // Auto-refresh cada 30 segundos para el dashboard
    setInterval(checkSystemStatus, 30000);
});

// =============================================
// NAVEGACIÓN
// =============================================

function initNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.section');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remover clase active
            navLinks.forEach(l => l.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));
            
            // Agregar clase active
            this.classList.add('active');
            
            // Mostrar sección correspondiente
            const targetId = this.getAttribute('href').substring(1);
            const targetSection = document.getElementById(targetId);
            
            if (targetSection) {
                targetSection.classList.add('active');
                
                // Cargar datos de la sección
                loadSectionData(targetId);
            }
        });
    });
}

function loadSectionData(sectionId) {
    switch(sectionId) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'clientes':
            loadClientes();
            break;
        case 'vehiculos':
            loadVehiculos();
            break;
        case 'empleados':
            loadEmpleados();
            break;
        case 'repuestos':
            loadRepuestos();
            break;
        case 'reparaciones':
            loadReparaciones();
            break;
        case 'consultas':
            // Las consultas se cargan bajo demanda
            break;
    }
}

// =============================================
// SISTEMA STATUS & DASHBOARD
// =============================================

async function checkSystemStatus() {
    try {
        const response = await fetch(`${API_BASE}/status`);
        const result = await response.json();
        
        updateConnectionIndicator(result);
        updateArchitectureStatus(result);
        
    } catch (error) {
        console.error('Error checking system status:', error);
        updateConnectionIndicator({
            success: false,
            data: { connections: { central: false, norte: false, sur: false } }
        });
    }
}

function updateConnectionIndicator(result) {
    const indicator = document.getElementById('connectionIndicator');
    const statusDiv = document.getElementById('connection-status');
    
    if (indicator) {
        const icon = indicator.querySelector('i');
        const text = indicator.querySelector('span');
    
        if (result.success && result.data?.connections) {
            const { norte, sur } = result.data.connections;
            if (norte && sur) {
                icon.className = 'fas fa-check-circle';
                text.textContent = '✅ Conectado a ambas sedes';
                indicator.className = 'connection-indicator connected';
            } else if (norte || sur) {
                icon.className = 'fas fa-exclamation-triangle';
                text.textContent = `⚠️ Conectado a ${norte ? 'Norte' : 'Sur'} únicamente`;
                indicator.className = 'connection-indicator partial';
            } else {
                icon.className = 'fas fa-times-circle';
                text.textContent = '❌ Sin conexión a las sedes';
                indicator.className = 'connection-indicator disconnected';
            }
        } else {
            icon.className = 'fas fa-times-circle';
            text.textContent = '❌ Error de conexión';
            indicator.className = 'connection-indicator disconnected';
        }
    }
    
    // Actualizar el div de status en dashboard
    if (statusDiv) {
        if (result.success && result.data?.connections) {
            const { norte, sur } = result.data.connections;
            if (norte && sur) {
                statusDiv.innerHTML = '🔗 ✅ Conectado a Sede Norte y Sur - Sistema Operativo';
                statusDiv.style.background = 'linear-gradient(135deg, #28a745 0%, #20c997 100%)';
            } else if (norte || sur) {
                statusDiv.innerHTML = `🔗 ⚠️ Conectado solo a Sede ${norte ? 'Norte' : 'Sur'} - Funcionalidad Limitada`;
                statusDiv.style.background = 'linear-gradient(135deg, #ffc107 0%, #fd7e14 100%)';
            } else {
                statusDiv.innerHTML = '🔗 ❌ Sin conexión a las sedes - Verificar red';
                statusDiv.style.background = 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)';
            }
        } else {
            statusDiv.innerHTML = '🔗 ❌ Error de conexión - Verificar servidor';
            statusDiv.style.background = 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)';
        }
    }
    
    if (result.success && result.data) {
        const connections = result.data.connections;
        const total = result.data.totalConnected || 0;
        
        if (total === 3) {
            indicator.className = 'connection-indicator connected';
            icon.className = 'fas fa-circle';
            text.textContent = 'Todas las conexiones activas';
        } else if (total > 0) {
            indicator.className = 'connection-indicator';
            icon.className = 'fas fa-exclamation-circle';
            text.textContent = `${total}/3 conexiones activas`;
        } else {
            indicator.className = 'connection-indicator disconnected';
            icon.className = 'fas fa-times-circle';
            text.textContent = 'Sin conexiones activas';
        }
    } else {
        indicator.className = 'connection-indicator disconnected';
        icon.className = 'fas fa-times-circle';
        text.textContent = 'Error de conectividad';
    }
}

function updateArchitectureStatus(result) {
    if (!result.success || !result.data) return;
    
    const connections = result.data.connections;
    
    // Actualizar estado de cada sede
    updateSedeStatus('Central', 'statusCentral', connections.central);
    updateSedeStatus('Norte', 'statusNorte', connections.norte);
    updateSedeStatus('Sur', 'statusSur', connections.sur);
}

function updateSedeStatus(sedeName, elementId, isConnected) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    if (isConnected) {
        element.textContent = '✅ Conectada';
        element.className = 'status connected';
    } else {
        element.textContent = '❌ Desconectada';
        element.className = 'status disconnected';
    }
}

async function loadDashboard() {
    try {
        // Cargar estadísticas
        await loadEstadisticas();
        
        // Cargar resumen por sedes
        await loadResumenSedes();
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

async function loadEstadisticas() {
    try {
        const response = await fetch(`${API_BASE}/estadisticas`);
        const result = await response.json();
        
        if (result.success) {
            displayEstadisticas(result.data);
        } else {
            console.error('Error loading estadísticas:', result.message);
        }
    } catch (error) {
        console.error('Error fetching estadísticas:', error);
    }
}

function displayEstadisticas(data) {
    console.log('📊 Mostrando estadísticas:', data);
    
    // Actualizar elementos específicos del dashboard
    const totalClientes = document.getElementById('total-clientes');
    const totalVehiculos = document.getElementById('total-vehiculos');
    const totalEmpleados = document.getElementById('total-empleados');
    const totalReparaciones = document.getElementById('total-reparaciones');
    
    if (totalClientes) {
        totalClientes.textContent = data.total_clientes || 0;
        console.log('✅ Total clientes actualizado:', data.total_clientes);
    }
    
    if (totalVehiculos) {
        totalVehiculos.textContent = data.total_vehiculos || 0;
        console.log('✅ Total vehículos actualizado:', data.total_vehiculos);
    }
    
    if (totalEmpleados) {
        totalEmpleados.textContent = data.total_empleados || 0;
        console.log('✅ Total empleados actualizado:', data.total_empleados);
    }
    
    if (totalReparaciones) {
        totalReparaciones.textContent = data.total_reparaciones || 0;
        console.log('✅ Total reparaciones actualizado:', data.total_reparaciones);
    }
    
    // Actualizar info del taller
    const tallerInfo = document.getElementById('taller-info');
    if (tallerInfo && data.detalles_por_sede) {
        const sedes = Object.keys(data.detalles_por_sede);
        const sedesTexto = sedes.map(sede => 
            `${sede}: ${data.detalles_por_sede[sede].empleados || 0} empleados`
        ).join(' | ');
        
        tallerInfo.innerHTML = `🏢 Sistema Distribuido - ${sedesTexto}`;
    }
}

async function loadResumenSedes() {
    try {
        const response = await fetch(`${API_BASE}/resumen-sedes`);
        const result = await response.json();
        
        if (result.success) {
            displayResumenSedes(result.data);
        } else {
            document.getElementById('sedeResumen').innerHTML = 
                `<div class="error">Error: ${result.message}</div>`;
        }
    } catch (error) {
        console.error('Error fetching resumen sedes:', error);
        document.getElementById('sedeResumen').innerHTML = 
            '<div class="error">Error cargando resumen por sedes</div>';
    }
}

function displayResumenSedes(data) {
    const container = document.getElementById('sedeResumen');
    
    if (!data || data.length === 0) {
        container.innerHTML = '<div class="loading">No hay datos disponibles</div>';
        return;
    }
    
    const table = `
        <table class="sede-table">
            <thead>
                <tr>
                    <th>Sede</th>
                    <th>Nombre</th>
                    <th>Empleados</th>
                    <th>Reparaciones</th>
                    <th>Repuestos</th>
                    <th>Ingresos</th>
                </tr>
            </thead>
            <tbody>
                ${data.map(sede => `
                    <tr>
                        <td>${sede.sede_taller}</td>
                        <td>${sede.nombre_taller}</td>
                        <td>${sede.total_empleados}</td>
                        <td>${sede.total_reparaciones}</td>
                        <td>${sede.total_repuestos}</td>
                        <td>$${parseFloat(sede.ingresos_totales || 0).toFixed(2)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    container.innerHTML = table;
}

// =============================================
// CLIENTES
// =============================================

async function loadClientes() {
    try {
        showLoading('clientesTable');
        
        const response = await fetch(`${API_BASE}/clientes`);
        const result = await response.json();
        
        if (result.success) {
            currentData.clientes = result.data;
            displayClientes(result.data);
        } else {
            showError('clientesTable', result.message);
        }
    } catch (error) {
        console.error('Error loading clientes:', error);
        showError('clientesTable', 'Error cargando clientes');
    }
}

function displayClientes(clientes) {
    const tbody = document.querySelector('#clientesTable tbody');
    
    if (!clientes || clientes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No hay clientes disponibles</td></tr>';
        return;
    }
    
    tbody.innerHTML = clientes.map(cliente => `
        <tr>
            <td>${cliente.cedula_cliente}</td>
            <td>${cliente.nombre_cliente}</td>
            <td>${cliente.apellido_cliente}</td>
            <td>${cliente.zona}</td>
            <td>
                <button class="btn btn-info btn-sm" onclick="viewCliente('${cliente.cedula_cliente}')">
                    <i class="fas fa-eye"></i> Ver
                </button>
            </td>
        </tr>
    `).join('');
}

// =============================================
// VEHÍCULOS
// =============================================

async function loadVehiculos() {
    try {
        showLoading('vehiculosTable');
        
        const response = await fetch(`${API_BASE}/vehiculos`);
        const result = await response.json();
        
        if (result.success) {
            currentData.vehiculos = result.data;
            displayVehiculos(result.data);
        } else {
            showError('vehiculosTable', result.message);
        }
    } catch (error) {
        console.error('Error loading vehiculos:', error);
        showError('vehiculosTable', 'Error cargando vehículos');
    }
}

function displayVehiculos(vehiculos) {
    const tbody = document.querySelector('#vehiculosTable tbody');
    
    if (!vehiculos || vehiculos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No hay vehículos disponibles</td></tr>';
        return;
    }
    
    tbody.innerHTML = vehiculos.map(vehiculo => `
        <tr>
            <td>${vehiculo.placa}</td>
            <td>${vehiculo.nombre_cliente} ${vehiculo.apellido_cliente}</td>
            <td>${vehiculo.marca}</td>
            <td>${vehiculo.modelo}</td>
            <td>${vehiculo.anio}</td>
            <td>
                <button class="btn btn-info btn-sm" onclick="viewVehiculo('${vehiculo.placa}')">
                    <i class="fas fa-eye"></i> Ver
                </button>
            </td>
        </tr>
    `).join('');
}

// =============================================
// EMPLEADOS
// =============================================

// Función para compatibilidad con HTML
function cargarEmpleados() {
    console.log('🔄 Cargando empleados...');
    loadEmpleados();
}

async function loadEmpleados() {
    try {
        showLoading('empleadosTable');
        
        const response = await fetch(`${API_BASE}/empleados`);
        const result = await response.json();
        
        if (result.success) {
            currentData.empleados = result.data;
            displayEmpleados(result.data);
        } else {
            showError('empleadosTable', result.message);
        }
    } catch (error) {
        console.error('Error loading empleados:', error);
        showError('empleadosTable', 'Error cargando empleados');
    }
}

async function cargarNominaCompleta() {
    try {
        console.log('💰 Cargando nómina completa...');
        showLoading('empleadosTable');
        
        const response = await fetch(`${API_BASE}/empleados/nomina`);
        const result = await response.json();
        
        if (result.success) {
            currentData.nomina = result.data;
            displayNominaCompleta(result.data);
        } else {
            showError('empleadosTable', result.message);
        }
    } catch (error) {
        console.error('Error loading nómina:', error);
        showError('empleadosTable', 'Error cargando nómina completa');
    }
}

async function loadEmpleadosBySede() {
    const sede = document.getElementById('sedeFilter').value;
    
    if (!sede) {
        loadEmpleados();
        return;
    }
    
    try {
        showLoading('empleadosTable');
        
        const response = await fetch(`${API_BASE}/empleados/sede/${sede}`);
        const result = await response.json();
        
        if (result.success) {
            displayEmpleados(result.data);
        } else {
            showError('empleadosTable', result.message);
        }
    } catch (error) {
        console.error('Error loading empleados by sede:', error);
        showError('empleadosTable', `Error cargando empleados de sede ${sede}`);
    }
}

function displayEmpleados(empleados) {
    const tbody = document.querySelector('#empleadosTable tbody');
    
    if (!empleados || empleados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No hay empleados disponibles</td></tr>';
        
        // Actualizar estadísticas con ceros
        updateEmpleadoStats([]);
        return;
    }
    
    tbody.innerHTML = empleados.map(empleado => `
        <tr>
            <td>${empleado.cedula_empleado}</td>
            <td>${empleado.nombre_empleado}</td>
            <td><span class="badge-sede sede-${empleado.sede_taller.toLowerCase()}">${empleado.sede_taller}</span></td>
            <td>${empleado.fecha_comienzo ? new Date(empleado.fecha_comienzo).toLocaleDateString() : 'N/A'}</td>
            <td>${empleado.salario ? '$' + parseFloat(empleado.salario).toFixed(2) : 'N/A'}</td>
        </tr>
    `).join('');
    
    // Actualizar estadísticas
    updateEmpleadoStats(empleados);
}

function displayNominaCompleta(nomina) {
    const tbody = document.querySelector('#empleadosTable tbody');
    
    if (!nomina || nomina.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No hay información de nómina disponible</td></tr>';
        updateEmpleadoStats([]);
        return;
    }
    
    // Actualizar el header de la tabla para incluir más información
    const table = document.querySelector('#empleadosTable');
    const thead = table.querySelector('thead');
    thead.innerHTML = `
        <tr>
            <th>💰 NÓMINA COMPLETA</th>
            <th>Cédula</th>
            <th>Nombre</th>
            <th>Sede</th>
            <th>Fecha Ingreso</th>
            <th>Salario</th>
        </tr>
    `;
    
    tbody.innerHTML = nomina.map(empleado => `
        <tr>
            <td style="background: linear-gradient(90deg, #28a745, #20c997); color: white; font-weight: bold;">💰</td>
            <td>${empleado.cedula_empleado}</td>
            <td>${empleado.nombre_empleado}</td>
            <td><span class="badge-sede sede-${empleado.sede_taller.toLowerCase()}">${empleado.sede_taller}</span></td>
            <td>${empleado.fecha_comienzo ? new Date(empleado.fecha_comienzo).toLocaleDateString() : 'N/A'}</td>
            <td style="font-weight: bold; color: #28a745;">${empleado.salario ? '$' + parseFloat(empleado.salario).toLocaleString() : 'N/A'}</td>
        </tr>
    `).join('');
    
    // Actualizar estadísticas con información salarial
    updateNominaStats(nomina);
}

function updateNominaStats(nomina) {
    const totalEmpleados = nomina.length;
    const salarios = nomina.filter(e => e.salario && !isNaN(parseFloat(e.salario))).map(e => parseFloat(e.salario));
    const salarioPromedio = salarios.length > 0 ? salarios.reduce((a, b) => a + b, 0) / salarios.length : 0;
    const totalNomina = salarios.reduce((a, b) => a + b, 0);
    
    // Actualizar elementos del DOM
    const statBoxes = document.querySelectorAll('.stat-box .stat-number');
    
    if (statBoxes[0]) statBoxes[0].textContent = totalEmpleados;
    if (statBoxes[1]) statBoxes[1].textContent = '$' + salarioPromedio.toLocaleString(undefined, {maximumFractionDigits: 0});
    if (statBoxes[2]) statBoxes[2].textContent = '$' + totalNomina.toLocaleString();
    
    // Actualizar etiquetas
    const statLabels = document.querySelectorAll('.stat-box div:not(.stat-number)');
    if (statLabels[0]) statLabels[0].textContent = 'Total Empleados';
    if (statLabels[1]) statLabels[1].textContent = 'Salario Promedio';
    if (statLabels[2]) statLabels[2].textContent = 'Total Nómina';
}

function restaurarVistaEmpleados() {
    // Restaurar el header original de la tabla
    const table = document.querySelector('#empleadosTable');
    const thead = table.querySelector('thead');
    thead.innerHTML = `
        <tr>
            <th>Cédula</th>
            <th>Nombre</th>
            <th>Sede</th>
            <th>Fecha Ingreso</th>
            <th>Salario</th>
        </tr>
    `;
    
    // Recargar la vista normal de empleados
    loadEmpleados();
}

function updateEmpleadoStats(empleados) {
    // Calcular estadísticas
    const totalEmpleados = empleados.length;
    const salarios = empleados.filter(e => e.salario && !isNaN(parseFloat(e.salario))).map(e => parseFloat(e.salario));
    const salarioPromedio = salarios.length > 0 ? salarios.reduce((a, b) => a + b, 0) / salarios.length : 0;
    
    // Actualizar elementos del DOM
    const totalElement = document.querySelector('.stat-box .stat-number');
    const promedioElement = document.querySelectorAll('.stat-box .stat-number')[1];
    
    if (totalElement) {
        totalElement.textContent = totalEmpleados;
    }
    
    if (promedioElement) {
        promedioElement.textContent = '$' + salarioPromedio.toFixed(2);
    }
    
    console.log(`📊 Estadísticas empleados: ${totalEmpleados} empleados, salario promedio: $${salarioPromedio.toFixed(2)}`);
}

// =============================================
// REPUESTOS
// =============================================

// Función para compatibilidad con HTML
function cargarRepuestos() {
    console.log('🔄 Cargando repuestos...');
    loadRepuestos();
}

async function loadRepuestos() {
    try {
        showLoading('repuestosTable');
        
        const response = await fetch(`${API_BASE}/repuestos`);
        const result = await response.json();
        
        if (result.success) {
            currentData.repuestos = result.data;
            displayRepuestos(result.data);
        } else {
            showError('repuestosTable', result.message);
        }
    } catch (error) {
        console.error('Error loading repuestos:', error);
        showError('repuestosTable', 'Error cargando repuestos');
    }
}

async function loadRepuestosBySede() {
    const sede = document.getElementById('repuestoSedeFilter').value;
    
    if (!sede) {
        loadRepuestos();
        return;
    }
    
    try {
        showLoading('repuestosTable');
        
        const response = await fetch(`${API_BASE}/repuestos/sede/${sede}`);
        const result = await response.json();
        
        if (result.success) {
            displayRepuestos(result.data);
        } else {
            showError('repuestosTable', result.message);
        }
    } catch (error) {
        console.error('Error loading repuestos by sede:', error);
        showError('repuestosTable', `Error cargando repuestos de sede ${sede}`);
    }
}

function displayRepuestos(repuestos) {
    const tbody = document.querySelector('#repuestosTable tbody');
    
    if (!repuestos || repuestos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No hay repuestos disponibles</td></tr>';
        return;
    }
    
    tbody.innerHTML = repuestos.map(repuesto => `
        <tr>
            <td>${repuesto.id_repuesto}</td>
            <td>${repuesto.nombre_repuesto}</td>
            <td>${repuesto.descripcion_repuesto || 'N/A'}</td>
            <td>${repuesto.cantidad_repuesto}</td>
            <td>$${parseFloat(repuesto.precio_unitario).toFixed(2)}</td>
            <td><span class="badge-sede sede-${repuesto.sede_taller.toLowerCase()}">${repuesto.sede_taller}</span></td>
        </tr>
    `).join('');
}

// =============================================
// REPARACIONES
// =============================================

// Función para compatibilidad con HTML
function cargarReparaciones() {
    console.log('🔄 Cargando reparaciones...');
    loadReparaciones();
}

async function loadReparaciones() {
    try {
        showLoading('reparacionesTable');
        
        const response = await fetch(`${API_BASE}/reparaciones`);
        const result = await response.json();
        
        if (result.success) {
            currentData.reparaciones = result.data;
            displayReparaciones(result.data);
        } else {
            showError('reparacionesTable', result.message);
        }
    } catch (error) {
        console.error('Error loading reparaciones:', error);
        showError('reparacionesTable', 'Error cargando reparaciones');
    }
}

async function loadReparacionesBySede() {
    const sede = document.getElementById('reparacionSedeFilter').value;
    
    if (!sede) {
        loadReparaciones();
        return;
    }
    
    try {
        showLoading('reparacionesTable');
        
        const response = await fetch(`${API_BASE}/reparaciones/sede/${sede}`);
        const result = await response.json();
        
        if (result.success) {
            displayReparaciones(result.data);
        } else {
            showError('reparacionesTable', result.message);
        }
    } catch (error) {
        console.error('Error loading reparaciones by sede:', error);
        showError('reparacionesTable', `Error cargando reparaciones de sede ${sede}`);
    }
}

function displayReparaciones(reparaciones) {
    const tbody = document.querySelector('#reparacionesTable tbody');
    
    if (!reparaciones || reparaciones.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No hay reparaciones disponibles</td></tr>';
        return;
    }
    
    tbody.innerHTML = reparaciones.map(reparacion => `
        <tr>
            <td>${reparacion.id_reparacion}</td>
            <td>${reparacion.placa}</td>
            <td>${reparacion.nombre_cliente ? reparacion.nombre_cliente + ' ' + reparacion.apellido_cliente : 'N/A'}</td>
            <td>${new Date(reparacion.fecha_reparacion).toLocaleDateString()}</td>
            <td>${reparacion.descripcion}</td>
            <td>$${parseFloat(reparacion.precio_total).toFixed(2)}</td>
            <td><span class="badge-sede sede-${reparacion.sede_taller.toLowerCase()}">${reparacion.sede_taller}</span></td>
        </tr>
    `).join('');
}

// =============================================
// CONSULTAS ESPECIALES
// =============================================

async function diagnosticarConexiones() {
    const resultDiv = document.getElementById('diagnosticoResult');
    resultDiv.innerHTML = '<div class="loading">Diagnosticando conexiones...</div>';
    
    try {
        const sedes = ['central', 'norte', 'sur'];
        let diagnostico = '';
        
        for (const sede of sedes) {
            try {
                const response = await fetch(`${API_BASE}/diagnostico/${sede}`);
                const result = await response.json();
                
                diagnostico += `\n=== SEDE ${sede.toUpperCase()} ===\n`;
                diagnostico += `Estado: ${result.success ? '✅ CONECTADA' : '❌ DESCONECTADA'}\n`;
                diagnostico += `Mensaje: ${result.message}\n`;
                
                if (result.data && result.data.testResult) {
                    diagnostico += `Test: ${JSON.stringify(result.data.testResult)}\n`;
                }
                
                diagnostico += `Timestamp: ${result.data ? result.data.timestamp : 'N/A'}\n`;
                
            } catch (error) {
                diagnostico += `\n=== SEDE ${sede.toUpperCase()} ===\n`;
                diagnostico += `Estado: ❌ ERROR DE CONEXIÓN\n`;
                diagnostico += `Error: ${error.message}\n`;
            }
        }
        
        resultDiv.innerHTML = `<pre>${diagnostico}</pre>`;
        
    } catch (error) {
        resultDiv.innerHTML = `<div class="error">Error en diagnóstico: ${error.message}</div>`;
    }
}

// =============================================
// MODALES
// =============================================

function initModals() {
    // Cerrar modales con X
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            modal.style.display = 'none';
        });
    });
    
    // Cerrar modales clickeando fuera
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.style.display = 'none';
            }
        });
    });
    
    // Inicializar formularios
    initForms();
}

function initForms() {
    // Formulario de cliente
    const clienteForm = document.getElementById('addClienteForm');
    if (clienteForm) {
        clienteForm.addEventListener('submit', handleAddCliente);
    }
    
    // Formulario de vehículo
    const vehiculoForm = document.getElementById('addVehiculoForm');
    if (vehiculoForm) {
        vehiculoForm.addEventListener('submit', handleAddVehiculo);
    }
}

function showAddClienteModal() {
    document.getElementById('addClienteModal').style.display = 'block';
}

function showAddVehiculoModal() {
    document.getElementById('addVehiculoModal').style.display = 'block';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

async function handleAddCliente(e) {
    e.preventDefault();
    
    const clienteData = {
        cedula_cliente: document.getElementById('clienteCedula').value,
        nombre_cliente: document.getElementById('clienteNombre').value,
        apellido_cliente: document.getElementById('clienteApellido').value,
        zona: document.getElementById('clienteZona').value
    };
    
    try {
        const response = await fetch(`${API_BASE}/clientes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(clienteData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            closeModal('addClienteModal');
            loadClientes();
            showMessage('Cliente creado exitosamente', 'success');
            e.target.reset();
        } else {
            showMessage(`Error: ${result.message}`, 'error');
        }
    } catch (error) {
        console.error('Error creating cliente:', error);
        showMessage('Error creando cliente', 'error');
    }
}

async function handleAddVehiculo(e) {
    e.preventDefault();
    
    const vehiculoData = {
        placa: document.getElementById('vehiculoPlaca').value,
        cedula_cliente: document.getElementById('vehiculoCedula').value,
        marca: document.getElementById('vehiculoMarca').value,
        modelo: document.getElementById('vehiculoModelo').value,
        anio: parseInt(document.getElementById('vehiculoAnio').value)
    };
    
    try {
        const response = await fetch(`${API_BASE}/vehiculos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(vehiculoData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            closeModal('addVehiculoModal');
            loadVehiculos();
            showMessage('Vehículo creado exitosamente', 'success');
            e.target.reset();
        } else {
            showMessage(`Error: ${result.message}`, 'error');
        }
    } catch (error) {
        console.error('Error creating vehiculo:', error);
        showMessage('Error creando vehículo', 'error');
    }
}

// =============================================
// UTILIDADES
// =============================================

function showLoading(tableId) {
    const tbody = document.querySelector(`#${tableId} tbody`);
    const colspan = tbody.closest('table').querySelectorAll('th').length;
    tbody.innerHTML = `<tr><td colspan="${colspan}" style="text-align: center;" class="loading">Cargando datos...</td></tr>`;
}

function showError(tableId, message) {
    const tbody = document.querySelector(`#${tableId} tbody`);
    const colspan = tbody.closest('table').querySelectorAll('th').length;
    tbody.innerHTML = `<tr><td colspan="${colspan}" style="text-align: center;" class="error">Error: ${message}</td></tr>`;
}

function showMessage(message, type = 'info') {
    // Crear elemento de mensaje
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    
    // Estilo del mensaje
    Object.assign(messageDiv.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '1rem 1.5rem',
        borderRadius: '6px',
        zIndex: '3000',
        maxWidth: '400px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
    });
    
    // Colores según tipo
    if (type === 'success') {
        messageDiv.style.background = '#d4edda';
        messageDiv.style.color = '#155724';
        messageDiv.style.border = '1px solid #c3e6cb';
    } else if (type === 'error') {
        messageDiv.style.background = '#f8d7da';
        messageDiv.style.color = '#721c24';
        messageDiv.style.border = '1px solid #f5c6cb';
    }
    
    document.body.appendChild(messageDiv);
    
    // Remover después de 5 segundos
    setTimeout(() => {
        messageDiv.remove();
    }, 5000);
}

// Funciones placeholder para botones de acción
function viewCliente(cedula) {
    console.log('Ver cliente:', cedula);
    // Implementar vista detallada
}

function viewVehiculo(placa) {
    console.log('Ver vehículo:', placa);
    // Implementar vista detallada
}

// Agregar estilos dinámicos para badges de sede
const style = document.createElement('style');
style.textContent = `
    .badge-sede {
        padding: 0.25rem 0.75rem;
        border-radius: 12px;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
    }
    .badge-sede.sede-norte {
        background: #cfe2ff;
        color: #084298;
    }
    .badge-sede.sede-sur {
        background: #d1e7dd;
        color: #0f5132;
    }
    .badge-sede.sede-central {
        background: #fff3cd;
        color: #664d03;
    }
`;
document.head.appendChild(style);
