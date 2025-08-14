// ===== POLI-CAR NUEVO - JAVASCRIPT PRINCIPAL =====

// Variables globales
let sedeActual = 'Central';

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', function() {
    // Si estamos en index.html (login)
    if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
        inicializarLogin();
    }
    // Si estamos en dashboard.html
    else if (window.location.pathname.includes('dashboard.html')) {
        inicializarDashboard();
    }
    // Si estamos en páginas de gestión
    else {
        inicializarPaginaGestion();
    }
});

// ===== FUNCIONES DE LOGIN =====
function inicializarLogin() {
    const ingresarBtn = document.getElementById('ingresarBtn');
    
    if (ingresarBtn) {
        ingresarBtn.addEventListener('click', function() {
            const sedeSeleccionada = document.querySelector('input[name="sede"]:checked').value;
            const messageElement = document.getElementById('message');
            
            messageElement.textContent = `Conectando a sede ${sedeSeleccionada}...`;
            messageElement.className = 'login-message';
            
            // Guardar sede seleccionada
            localStorage.setItem('sedeSeleccionada', sedeSeleccionada);
            sedeActual = sedeSeleccionada;
            
            // Simular verificación de conexión
            setTimeout(() => {
                messageElement.textContent = `✅ Conectado exitosamente a sede ${sedeSeleccionada}`;
                messageElement.className = 'login-message success';
                
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1000);
            }, 1500);
        });
    }
}

// ===== FUNCIONES DE DASHBOARD =====
function inicializarDashboard() {
    sedeActual = localStorage.getItem('sedeSeleccionada') || 'Central';
    actualizarInfoSede();
    cargarEstadisticas();
    verificarConexiones();
}

function actualizarInfoSede() {
    const sedeNameElement = document.getElementById('sede-name');
    const sedeDescElement = document.getElementById('sede-description');
    
    if (sedeNameElement) {
        sedeNameElement.textContent = sedeActual;
    }
    
    const descripciones = {
        'Central': 'Gestión centralizada de clientes y vehículos',
        'Norte': 'Empleados, repuestos y reparaciones - Sede Norte',
        'Sur': 'Empleados, repuestos y reparaciones - Sede Sur'
    };
    
    if (sedeDescElement) {
        sedeDescElement.textContent = descripciones[sedeActual];
    }
}

// ===== FUNCIONES DE GESTIÓN =====
function inicializarPaginaGestion() {
    sedeActual = localStorage.getItem('sedeSeleccionada') || 'Central';
    
    // Cargar datos según la página actual
    if (window.location.pathname.includes('gestionarClientes.html')) {
        cargarClientes();
    } else if (window.location.pathname.includes('gestionarVehiculos.html')) {
        cargarVehiculos();
    } else if (window.location.pathname.includes('gestionarEmpleados.html')) {
        cargarEmpleados();
    } else if (window.location.pathname.includes('gestionarRepuestos.html')) {
        cargarRepuestos();
    } else if (window.location.pathname.includes('gestionarReparaciones.html')) {
        cargarReparaciones();
    }
}

// ===== FUNCIONES API =====

// Cargar estadísticas generales
async function cargarEstadisticas() {
    try {
        const response = await fetch('/api/estadisticas');
        const data = await response.json();
        
        if (data.success) {
            const stats = data.data;
            updateStatElement('total-clientes', stats.clientes || 0);
            updateStatElement('total-vehiculos', stats.vehiculos || 0);
            updateStatElement('total-empleados', stats.empleados || 0);
            updateStatElement('total-reparaciones', stats.reparaciones || 0);
        }
    } catch (error) {
        console.error('Error cargando estadísticas:', error);
    }
}

function updateStatElement(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    }
}

// Verificar conexiones a todas las bases
async function verificarConexiones() {
    try {
        const response = await fetch('/api/status');
        const data = await response.json();
        
        if (data.success && data.data.connections) {
            const conn = data.data.connections;
            updateConnectionStatus('status-central', conn.central);
            updateConnectionStatus('status-norte', conn.norte);
            updateConnectionStatus('status-sur', conn.sur);
        }
    } catch (error) {
        console.error('Error verificando conexiones:', error);
        updateConnectionStatus('status-central', false);
        updateConnectionStatus('status-norte', false);
        updateConnectionStatus('status-sur', false);
    }
}

function updateConnectionStatus(elementId, isConnected) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = isConnected ? '✅ Activa' : '❌ Sin conexión';
        element.style.color = isConnected ? '#27ae60' : '#e74c3c';
    }
}

// ===== FUNCIONES DE DATOS =====

// Cargar clientes
async function cargarClientes() {
    try {
        mostrarCargando('clientesTable');
        const response = await fetch('/api/clientes');
        const data = await response.json();
        
        if (data.success) {
            mostrarClientesTabla(data.data);
        } else {
            mostrarError('Error cargando clientes: ' + data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarError('Error de conexión al cargar clientes');
    }
}

function mostrarClientesTabla(clientes) {
    const tbody = document.querySelector('#clientesTable tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    clientes.forEach(cliente => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${cliente.cedula_cliente}</td>
            <td>${cliente.nombre_cliente}</td>
            <td>${cliente.apellido_cliente}</td>
            <td>${cliente.zona}</td>
            <td>
                <button class="btn btn-primary" onclick="editarCliente('${cliente.cedula_cliente}')">Editar</button>
                <button class="btn btn-danger" onclick="eliminarCliente('${cliente.cedula_cliente}')">Eliminar</button>
            </td>
        `;
    });
}

// Cargar vehículos
async function cargarVehiculos() {
    try {
        mostrarCargando('vehiculosTable');
        const response = await fetch('/api/vehiculos');
        const data = await response.json();
        
        if (data.success) {
            mostrarVehiculosTabla(data.data);
        } else {
            mostrarError('Error cargando vehículos: ' + data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarError('Error de conexión al cargar vehículos');
    }
}

function mostrarVehiculosTabla(vehiculos) {
    const tbody = document.querySelector('#vehiculosTable tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    vehiculos.forEach(vehiculo => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${vehiculo.placa}</td>
            <td>${vehiculo.nombre_cliente} ${vehiculo.apellido_cliente}</td>
            <td>${vehiculo.marca}</td>
            <td>${vehiculo.modelo}</td>
            <td>${vehiculo.año}</td>
            <td>
                <button class="btn btn-primary" onclick="editarVehiculo('${vehiculo.placa}')">Editar</button>
                <button class="btn btn-danger" onclick="eliminarVehiculo('${vehiculo.placa}')">Eliminar</button>
            </td>
        `;
    });
}

// ===== FUNCIONES DE UTILIDAD =====

function mostrarCargando(tableId) {
    const tbody = document.querySelector(`#${tableId} tbody`);
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="100%" class="loading">Cargando datos...</td></tr>';
    }
}

function mostrarError(mensaje) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = mensaje;
    
    const container = document.querySelector('.container');
    if (container) {
        container.insertBefore(errorDiv, container.firstChild);
        
        // Remover mensaje después de 5 segundos
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }
}

function mostrarExito(mensaje) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = mensaje;
    
    const container = document.querySelector('.container');
    if (container) {
        container.insertBefore(successDiv, container.firstChild);
        
        // Remover mensaje después de 3 segundos
        setTimeout(() => {
            successDiv.remove();
        }, 3000);
    }
}

// ===== FUNCIONES CRUD PLACEHOLDER =====
function editarCliente(cedula) {
    alert(`Editar cliente: ${cedula} (Función pendiente de implementar)`);
}

function eliminarCliente(cedula) {
    if (confirm(`¿Está seguro de eliminar el cliente ${cedula}?`)) {
        alert('Eliminación pendiente de implementar');
    }
}

function editarVehiculo(placa) {
    alert(`Editar vehículo: ${placa} (Función pendiente de implementar)`);
}

function eliminarVehiculo(placa) {
    if (confirm(`¿Está seguro de eliminar el vehículo ${placa}?`)) {
        alert('Eliminación pendiente de implementar');
    }
}
