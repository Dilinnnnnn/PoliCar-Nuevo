# POLI-CAR Nuevo - Sistema Distribuido

## 📋 Descripción
Sistema de aplicación completamente nuevo que conecta a las bases de datos POLI-CAR existentes usando la arquitectura distribuida ya implementada.

## 🗄️ Bases de Datos Utilizadas
- **PoliCarCentral** (localhost): Base centralizada con replicación completa
- **PoliCarSedeNorte** (26.154.21.115): Fragmentación horizontal NORTE
- **PoliCarSedeSur** (26.91.154.235): Fragmentación horizontal SUR

## 🏗️ Arquitectura de Datos Existente

### Fragmentación Horizontal
- **Empleados**: Divididos por `sede_taller`
  - Norte: `Empleado_informacion_Norte`
  - Sur: `Empleado_informacion` (con CHECK sede_taller = 'SUR')
- **Repuestos**: Divididos por `sede_taller`
  - Norte: `Repuesto_Norte`
  - Sur: `Repuesto`
- **Reparaciones**: Divididas por `sede_taller`
  - Norte: `Reparacion_Norte`
  - Sur: `Reparacion`

### Fragmentación Vertical
- **Empleados**: Información separada de nómina
  - Información: `nombre_empleado`, `sede_taller`, `cedula_empleado`
  - Nómina: `fecha_comienzo`, `salario` (en PoliCarSedeSur)

### Replicación Completa
- **Cliente**: Replicada en todas las sedes
- **Vehiculo**: Replicada en todas las sedes
- **Taller**: Replicada en todas las sedes

## 🚀 Instalación y Ejecución

### Prerequisitos
- Node.js instalado
- Acceso a las bases de datos existentes
- Conectividad a IPs: 26.154.21.115 y 26.91.154.235

### Pasos
1. Instalar dependencias:
   ```bash
   npm install
   ```

2. Iniciar servidor:
   ```bash
   npm start
   ```

3. Verificar conexiones:
   ```bash
   curl http://localhost:3000/api/status
   ```

## 🔗 API Endpoints

### Estado del Sistema
- `GET /api/status` - Estado de conexiones

### Datos Replicados (desde Central)
- `GET /api/clientes` - Todos los clientes
- `GET /api/vehiculos` - Todos los vehículos
- `POST /api/clientes` - Crear cliente
- `POST /api/vehiculos` - Crear vehículo

### Datos Fragmentados
- `GET /api/empleados` - Todos los empleados (consulta distribuida)
- `GET /api/empleados/sede/:sede` - Empleados por sede
- `GET /api/repuestos` - Todos los repuestos
- `GET /api/repuestos/sede/:sede` - Repuestos por sede
- `GET /api/reparaciones` - Todas las reparaciones
- `GET /api/reparaciones/sede/:sede` - Reparaciones por sede

### Consultas Especiales
- `GET /api/resumen-sedes` - Resumen estadístico por sede
- `GET /api/estadisticas` - Estadísticas generales
- `GET /api/diagnostico/:sede` - Prueba de conectividad

## 🎯 Sedes Disponibles
- **CENTRAL** - Base centralizada
- **NORTE** - Sede Norte (26.154.21.115)
- **SUR** - Sede Sur (26.91.154.235)

## 📊 Estructura de Respuestas
```json
{
  "success": true/false,
  "message": "Descripción de la operación",
  "data": [...], // Datos solicitados
  "timestamp": "2025-08-13T..."
}
```

## 🔧 Configuración
La configuración de bases de datos está en `config/database.js`:
- Credenciales para cada sede
- Configuración de pools de conexión
- Timeouts y opciones de conexión

## 📈 Características del Sistema
- ✅ Conecta a bases existentes sin modificarlas
- ✅ Respeta la fragmentación horizontal implementada
- ✅ Utiliza la fragmentación vertical existente
- ✅ Aprovecha la replicación ya configurada
- ✅ Consultas distribuidas transparentes
- ✅ Manejo de errores robusto
- ✅ Diagnóstico de conectividad por sede

## 🆘 Solución de Problemas

### Error de Conexión
1. Verificar que las IPs estén accesibles
2. Comprobar credenciales de base de datos
3. Revisar firewall y puertos SQL Server

### Datos Vacíos
1. Verificar que las tablas tengan datos
2. Comprobar nombres de tablas en cada sede
3. Revisar permisos de usuario SQL

## 📝 Notas Técnicas
- El sistema NO modifica las bases existentes
- Utiliza la estructura de tablas tal como está implementada
- Respeta las restricciones CHECK de fragmentación
- Compatible con la configuración de Linked Servers existente
