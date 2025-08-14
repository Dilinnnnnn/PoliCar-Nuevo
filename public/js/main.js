// =============================================
// FUNCIONES GLOBALES PARA POLI-CAR NUEVO
// =============================================

// Funciones de utilidad globales
window.PoliCar = {
    // Formatear fechas
    formatearFecha: function(fecha) {
        if (!fecha) return 'N/A';
        return new Date(fecha).toLocaleDateString('es-ES');
    },

    // Formatear moneda
    formatearMoneda: function(valor) {
        if (!valor) return '$0.00';
        return `$${parseFloat(valor).toFixed(2)}`;
    },

    // Mostrar mensajes
    mostrarExito: function(mensaje) {
        alert('✅ ' + mensaje);
    },

    mostrarError: function(mensaje) {
        alert('❌ ' + mensaje);
    },

    // Validar cédula
    validarCedula: function(cedula) {
        return /^\d{10}$/.test(cedula);
    },

    // Validar placa
    validarPlaca: function(placa) {
        return /^[A-Z]{3}\d{3,4}$/.test(placa);
    },

    // Capitalizar texto
    capitalizar: function(str) {
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    },

    // Loader global
    mostrarCargando: function(elemento, mostrar = true) {
        const el = typeof elemento === 'string' ? document.getElementById(elemento) : elemento;
        if (el) {
            el.style.display = mostrar ? 'block' : 'none';
        }
    }
};

// Configuración global de fetch
window.PoliCar.request = async function(url, options = {}) {
    try {
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });

        const data = await response.json();
        
        if (!data.success && data.message) {
            throw new Error(data.message);
        }
        
        return data;
    } catch (error) {
        console.error('Error en request:', error);
        throw error;
    }
};

// Función para comprobar estado del servidor
window.PoliCar.verificarEstado = async function() {
    try {
        const response = await window.PoliCar.request('/api/status');
        console.log('✅ Servidor conectado:', response.data);
        return true;
    } catch (error) {
        console.error('❌ Error conectando servidor:', error);
        return false;
    }
};

// Auto-verificar estado al cargar
document.addEventListener('DOMContentLoaded', function() {
    window.PoliCar.verificarEstado();
});

console.log('🎯 POLI-CAR Nuevo - Sistema iniciado correctamente');
