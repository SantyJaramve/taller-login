const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const doc = new PDFDocument({
  size: 'letter',
  margins: { top: 60, bottom: 60, left: 65, right: 65 },
  bufferPages: true,
  info: {
    Title: 'CocinasApp - Documentacion Tecnica',
    Author: 'Desarrollo Web',
    Subject: 'Dashboard de Gestion de Cocinas de Interes Social',
  },
});

const outputPath = path.join(__dirname, '..', 'Documentacion_CocinasApp.pdf');
doc.pipe(fs.createWriteStream(outputPath));

const C = {
  dark: '#1A1612',
  gray: '#5C5549',
  lgray: '#8C8477',
  wood: '#8B7458',
  accent: '#A08B6E',
  light: '#F0EBE3',
  white: '#FAFAF8',
};

function nextPage() { doc.addPage(); doc.font('Helvetica'); }

function addTitle(t) {
  doc.fontSize(22).font('Helvetica-Bold').fillColor(C.dark).text(t, 65, doc.y || 65, { width: 480 });
  doc.moveDown(0.3);
  doc.moveTo(65, doc.y).lineTo(545, doc.y).lineWidth(2).strokeColor(C.accent).stroke();
  doc.moveDown(0.8);
}

function addSubtitle(t) {
  doc.fontSize(13).font('Helvetica-Bold').fillColor(C.wood).text(t, 65, doc.y, { width: 480 });
  doc.moveDown(0.4);
}

function addBody(t) {
  doc.fontSize(10).font('Helvetica').fillColor(C.dark).text(t, 65, doc.y, { width: 480, lineGap: 3 });
  doc.moveDown(0.5);
}

function addBullet(t) {
  doc.fontSize(10).font('Helvetica').fillColor(C.dark).text('•  ' + t, 80, doc.y, { width: 460, lineGap: 2 });
  doc.moveDown(0.2);
}

function addTable(headers, rows) {
  const colW = Math.floor(480 / headers.length);
  let startY = doc.y;

  // header
  doc.rect(65, startY, 480, 20).fill(C.accent);
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#FFFFFF');
  headers.forEach((h, i) => {
    doc.text(h, 70 + i * colW, startY + 5, { width: colW - 10 });
  });
  doc.y = startY + 22;

  // rows
  rows.forEach((row) => {
    const ry = doc.y;
    doc.fontSize(9).font('Helvetica').fillColor(C.gray);
    row.forEach((cell, i) => {
      doc.text(cell, 70 + i * colW, ry, { width: colW - 10 });
    });
    doc.y = doc.y + 2;
    doc.moveTo(65, doc.y).lineTo(545, doc.y).lineWidth(0.3).strokeColor(C.light).stroke();
    doc.moveDown(0.3);
  });
  doc.moveDown(0.5);
}

// ========== PORTADA ==========
doc.rect(0, 0, 612, 792).fill(C.dark);
doc.rect(0, 0, 612, 280).fill('#231F1B');

for (let i = 0; i < 18; i++) {
  doc.save().moveTo(0, 40 + i * 15).lineTo(612, 50 + i * 15).lineWidth(0.5).strokeColor(C.accent).stroke().restore();
}

doc.fontSize(42).font('Helvetica-Bold').fillColor('#F0ECE6').text('CocinasApp', 65, 110, { width: 480 });
doc.moveDown(0.3);
doc.fontSize(16).font('Helvetica').fillColor(C.accent).text('Gestion Integral de Instalaciones', 65, doc.y, { width: 480 });
doc.moveDown(0.3);
doc.fontSize(11).font('Helvetica').fillColor('#B0A899').text('Dashboard Empresarial Premium', 65, doc.y, { width: 480 });
doc.moveDown(1.5);
doc.fontSize(10).font('Helvetica').fillColor('#7A7164');
doc.text('Centro de operaciones digital para la gestion de cocinas', 65, doc.y, { width: 480 });
doc.text('de interes social y control operativo de carpinteros', 65, doc.y + 4, { width: 480 });

doc.y = 540;
doc.fontSize(10).font('Helvetica').fillColor('#B0A899');
doc.text('Tecnologias: React - TypeScript - Node.js - Express - SQLite', 65, doc.y, { width: 480 });
doc.moveDown(0.5);
doc.text('Arquitectura: Frontend + Backend + Base de datos relacional', 65, doc.y, { width: 480 });
doc.moveDown(0.5);
doc.text('Ciclo: Desarrollo Web - 2026', 65, doc.y, { width: 480 });
doc.moveDown(0.5);
doc.text('Ciudad: Medellin, Colombia', 65, doc.y, { width: 480 });

doc.y = 700;
doc.fontSize(9).fillColor(C.gray).text('Documento tecnico con diseno, arquitectura, implementacion y manual de uso.', 65, doc.y, { width: 480, align: 'center' });

// ========== INDICE ==========
nextPage();
addTitle('Indice de Contenidos');

const toc = [
  '1.  Resumen Ejecutivo',
  '2.  Objetivo del Proyecto',
  '3.  Stack Tecnologico',
  '4.  Arquitectura del Sistema',
  '5.  Modelo de Datos',
  '6.  Sistema de Autenticacion y Roles',
  '7.  Flujo de Estados de Cocinas',
  '8.  Modulos del Sistema',
  '    8.1  Dashboard y Centro de Operaciones',
  '    8.2  Gestion de Cocinas',
  '    8.3  Gestion de Carpinteros',
  '    8.4  Asignacion Inteligente',
  '    8.5  Evidencia Fotografica',
  '    8.6  Reportes y Analitica',
  '    8.7  Agenda / Calendario',
  '    8.8  Gestion de Usuarios',
  '9.  Sistema Visual (UX/UI)',
  '10. Seguridad',
  '11. Manual de Uso',
  '12. Estructura de Archivos',
  '13. Instalacion y Ejecucion',
  '14. Capacidades Futuras',
  '15. Conclusiones',
];

toc.forEach(item => {
  doc.fontSize(10).font('Helvetica').fillColor(C.dark).text(item, 80, doc.y, { width: 440 });
  doc.moveDown(0.25);
});

// ========== 1. RESUMEN ==========
nextPage();
addTitle('1. Resumen Ejecutivo');
addBody('CocinasApp es un sistema web empresarial disenado especificamente para la gestion integral de instalaciones de cocinas de interes social en la ciudad de Medellin. El sistema centraliza y digitaliza un proceso que actualmente se realiza mediante llamadas telefonicas, registros internos y mensajeria de WhatsApp.');
addBody('El producto incluye un dashboard operativo que permite a supervisores y empleados gestionar todo el ciclo de vida de una cocina: desde su recepcion como pendiente, pasando por el contacto con el beneficiario, la confirmacion de disponibilidad, la asignacion a un carpintero, el seguimiento de la instalacion, hasta la recepcion de evidencia fotografica y la finalizacion.');
addBody('El sistema esta disenado para ser utilizado exclusivamente por empleados y supervisores de la empresa. Los carpinteros no tienen cuenta ni acceden al sistema; la comunicacion con ellos se realiza externamente via WhatsApp, y el sistema genera los mensajes estructurados correspondientes.');

// ========== 2. OBJETIVO ==========
addSubtitle('2. Objetivo del Proyecto');
addBody('El objetivo principal es eliminar la dependencia de procesos manuales (llamadas, WhatsApp sin registro, hojas de calculo) y reemplazarlos por un centro de operaciones digital que proporciona:');
addBullet('Trazabilidad completa de cada cocina y cada accion realizada.');
addBullet('Control operativo de carpinteros (disponibilidad, carga, desempeno).');
addBullet('Asignacion inteligente basada en reglas de negocio.');
addBullet('Informacion en tiempo real para la toma de decisiones.');
addBullet('Evidencia fotografica centralizada y validada.');
addBullet('Reportes y analitica orientados a la accion.');

// ========== 3. STACK ==========
nextPage();
addTitle('3. Stack Tecnologico');
addSubtitle('Backend');
addBody('Servidor construido con Node.js y Express, tipado completamente en TypeScript. La base de datos es SQLite (via better-sqlite3), que permite portabilidad y despliegue sin infraestructura externa. La autenticacion utiliza JWT (JSON Web Tokens) con contrasenas hasheadas usando bcrypt.');
addSubtitle('Frontend');
addBody('Aplicacion de una sola pagina (SPA) construida con React 18 y TypeScript, utilizando Vite como bundler. El sistema de estilos es CSS personalizado con design tokens para soportar temas claro y oscuro. Las graficas se generan con Recharts y la iconografia con Lucide React.');
addSubtitle('Tabla de Componentes');
addTable(
  ['Capa', 'Tecnologia', 'Justificacion'],
  [
    ['Frontend', 'React 18 + TypeScript', 'Componentes reactivos, tipado fuerte'],
    ['Bundler', 'Vite 8', 'Velocidad de desarrollo y build'],
    ['Backend', 'Node.js + Express', 'API REST, escalable'],
    ['Base de datos', 'SQLite + better-sqlite3', 'Portatil, sin servidor'],
    ['Auth', 'JWT + bcrypt', 'Estandar industrial, seguro'],
    ['Iconos', 'Lucide React', 'Minimalista, lineal, profesional'],
    ['Graficas', 'Recharts', 'Configurable, ligero'],
    ['Estilos', 'CSS con design tokens', 'Control total, temas'],
  ]
);

// ========== 4. ARQUITECTURA ==========
addSubtitle('4. Arquitectura del Sistema');
addBody('El sistema sigue una arquitectura de capas clara y separada:');
addBullet('Presentacion (Frontend): React con componentes modulares, rutas protegidas por rol, contextos globales para autenticacion y tema.');
addBullet('Logica de Negocio (Backend): Controladores separados por dominio (cocinas, carpinteros, asignaciones, auth), con middleware de autenticacion y autorizacion.');
addBullet('Datos (Base de datos): Modelo relacional normalizado con 12 tablas principales, claves foraneas, indices y restricciones de integridad.');
addBullet('Comunicacion: API REST con formato JSON, autenticacion Bearer Token, proxies configurados para desarrollo.');
addBody('La separacion permite que cada capa sea mantenible, testeable y escalable independientemente. El frontend se comunica exclusivamente con el backend mediante la capa de servicios API, sin acceder directamente a la base de datos.');

// ========== 5. MODELO DE DATOS ==========
nextPage();
addTitle('5. Modelo de Datos');
addBody('La base de datos relacional contiene las siguientes entidades principales:');

const tables = [
  ['roles', 'Almacena los roles del sistema (admin, supervisor, employee). 3 registros semilla.'],
  ['users', 'Usuarios del sistema con credenciales hasheadas. Referencia a roles.'],
  ['kitchen_types', 'Los 6 tipos de cocina configurables (inferior, superior, combinados; basico y especial).'],
  ['kitchen_statuses', 'Los 11 estados del flujo de una cocina, con color y categoria.'],
  ['carpenters', 'Informacion de carpinteros: nombre, contacto, estado, capacidad, carga actual.'],
  ['carpenter_types', 'Relacion N:N: que tipos de cocina puede instalar cada carpintero.'],
  ['carpenter_zones', 'Zonas geograficas donde trabaja cada carpintero.'],
  ['beneficiaries', 'Datos del beneficiario: nombre, contacto, direccion, zona, barrio.'],
  ['kitchens', 'Entidad central. Referencia a tipo, beneficiario, estado, carpintero, usuario creador.'],
  ['kitchen_status_history', 'Historial completo de cambios de estado de cada cocina.'],
  ['assignments', 'Registro de cada asignacion: cocina-carpintero, estado (pending/accepted/rejected).'],
  ['evidence', 'Fotografias de instalacion: URL, validacion, usuario que valido.'],
  ['observations', 'Observaciones internas asociadas a cualquier entidad.'],
  ['audit_log', 'Registro de acciones criticas del sistema para auditoria.'],
];
tables.forEach(([name, desc]) => {
  doc.fontSize(10).font('Helvetica-Bold').fillColor(C.wood).text('  ' + name + ': ', 70, doc.y, { continued: true, width: 460 });
  doc.font('Helvetica').fillColor(C.gray).text(desc);
  doc.moveDown(0.2);
});

doc.moveDown(0.5);
addSubtitle('Indices de Base de Datos');
addBody('Se han creado 14 indices para optimizar las consultas mas frecuentes: estados de cocina, carpintero asignado, tipo de cocina, historial, asignaciones, evidencia, observaciones, auditoria, estado de carpinteros y zona de beneficiarios.');

// ========== 6. AUTENTICACION ==========
nextPage();
addTitle('6. Sistema de Autenticacion y Roles');
addSubtitle('Autenticacion');
addBody('El sistema utiliza autenticacion basada en tokens JWT. Al iniciar sesion, el servidor valida las credenciales y retorna un token de 24 horas de duracion. Este token se almacena en el navegador y se envia en cada peticion HTTP mediante el header Authorization: Bearer {token}.');
addSubtitle('Roles y Permisos');
addTable(
  ['Rol', 'Alcance', 'Permisos principales'],
  [
    ['Administrador', 'Acceso total', 'Gestion de usuarios, config, todo CRUD'],
    ['Supervisor', 'Operacion', 'Cocinas, carpinteros, asignaciones, reportes, evidencia'],
    ['Empleado', 'Gestion diaria', 'Consulta cocinas, beneficiarios, seguimiento'],
  ]
);
addBody('Los permisos se validan tanto en el frontend (ocultando elementos de UI) como en el backend (middleware de autorizacion en cada ruta). Un carpintero NO tiene cuenta en el sistema.');

// ========== 7. FLUJO DE ESTADOS ==========
nextPage();
addTitle('7. Flujo de Estados de Cocinas');
addBody('Cada cocina atraviesa un flujo de 11 estados posibles. Cada cambio de estado se registra con: usuario que realizo la accion, fecha/hora, estado anterior, estado nuevo y observaciones.');
addSubtitle('Flujo Principal');
addTable(
  ['Estado', 'Categoria', 'Descripcion'],
  [
    ['Pendiente', 'Pendiente', 'Cocina registrada, sin accion aun'],
    ['Beneficiario Contactado', 'En proceso', 'Se contacto al beneficiario'],
    ['Disponibilidad Confirmada', 'En proceso', 'Beneficiario disponible para instalacion'],
    ['Carpintero Contactado', 'En proceso', 'Se contacto a un carpintero'],
    ['Pendiente de Respuesta', 'En proceso', 'Esperando aceptacion o rechazo'],
    ['Asignada', 'En proceso', 'Carpintero acepto la instalacion'],
    ['Informacion Enviada', 'En proceso', 'Se envio info por WhatsApp'],
    ['En Instalacion', 'En proceso', 'Carpintero realizando el trabajo'],
    ['Evidencia Recibida', 'En proceso', 'Fotografia recibida'],
    ['Finalizada', 'Completada', 'Instalacion completada y validada'],
    ['Rechazada', 'Rechazada', 'Carpintero rechazo (re-asignable)'],
  ]
);
addBody('Desde el estado "Rechazada", la cocina puede regresar al proceso de busqueda de otro carpintero. El historial anterior nunca se elimina.');

// ========== 8. MODULOS ==========
nextPage();
addTitle('8. Modulos del Sistema');

addSubtitle('8.1 Dashboard y Centro de Operaciones');
addBody('El dashboard es el punto de entrada principal. Muestra:');
addBullet('Indicadores clave: total cocinas, pendientes, en proceso, finalizadas, carpinteros disponibles.');
addBullet('Centro de atencion prioritaria con conteo de: beneficiarios no contactados, pendientes de confirmar, sin carpintero, esperando respuesta, pendientes de evidencia, evidencias sin validar.');
addBullet('Actividad reciente de los ultimos 10 cambios de estado.');
addBullet('Distribucion de cocinas por estado con colores codificados.');
addBody('Cada indicador y cada elemento de la atencion prioritaria son clickeables, llevando directamente al listado filtrado correspondiente.');

addSubtitle('8.2 Gestion de Cocinas');
addBody('Modulo central del sistema. Permite:');
addBullet('Crear nuevas cocinas con tipo, beneficiario, direccion, zona y observaciones.');
addBullet('Listar todas las cocinas con busqueda, filtros por estado, tipo, zona y carpintero.');
addBullet('Ver el detalle completo de una cocina con: beneficiario, carpintero, timeline visual, evidencia y observaciones.');
addBullet('Avanzar estados con botones contextuales segun el estado actual.');
addBullet('Generar mensaje WhatsApp estructurado con un clic.');
addBullet('Subir y visualizar evidencia fotografica.');
addBullet('Agregar observaciones internas.');

addSubtitle('8.3 Gestion de Carpinteros');
addBody('Modulo de gestion profesional de carpinteros (entidades internas, sin cuenta de usuario):');
addBullet('Informacion personal: nombre, telefono, WhatsApp, email.');
addBullet('Estado operativo: disponible, ocupado, inactivo.');
addBullet('Capacidad: maxima, actual, barra de carga visual.');
addBullet('Zonas de trabajo y tipos de cocina que puede instalar.');
addBullet('Perfil detallado con: instalaciones, historial, estadisticas de desempeno, observaciones.');
addBullet('Tasa de cumplimiento y tasa de rechazo calculadas con datos reales.');

addSubtitle('8.4 Asignacion Inteligente');
addBody('Sistema de scoring para la asignacion de carpinteros a cocinas. Cuando un usuario selecciona una cocina para asignar, el sistema:');
addBullet('Consulta los carpinteros activos y disponibles.');
addBullet('Evalua compatibilidad de tipo de cocina (30 puntos).');
addBullet('Evalua coincidencia de zona geografica (25 puntos).');
addBullet('Evalua estado de disponibilidad (20 puntos).');
addBullet('Evalua capacidad restante (15 puntos).');
addBullet('Evalua historial de desempeno (10 puntos).');
addBullet('Muestra los candidatos ordenados por puntuacion, con razones y advertencias.');
addBullet('Identifica y marca al "Carpintero recomendado" con estrella dorada.');
addBody('La arquitectura esta preparada para incorporar algoritmos de recomendacion mas avanzados (IA, optimizacion de rutas) sin rehacer el sistema.');

nextPage();
addSubtitle('8.5 Evidencia Fotografica');
addBody('Cada cocina permite registrar evidencia de instalacion:');
addBullet('Subida de fotografias (JPG, PNG, WebP, max. 10MB).');
addBullet('Visualizacion inline en el detalle de la cocina.');
addBullet('Registro de fecha de recepcion y usuario que subio.');
addBullet('Sistema de validacion (pendiente/aprobado) con registro de quien valido.');
addBullet('Disenado para soportar un futuro estado "Evidencia pendiente de validacion".');

addSubtitle('8.6 Reportes y Analitica');
addBody('Dashboard de reportes con graficas interactivas:');
addBullet('Cocinas por estado (barras coloreadas por estado).');
addBullet('Cocinas por tipo de instalacion (barras).');
addBullet('Cocinas por zona geografica (barras).');
addBullet('Estado de carpinteros (donut: disponibles, ocupados, inactivos).');
addBody('Todas las metricas se calculan exclusivamente con datos reales del sistema.');

addSubtitle('8.7 Agenda / Calendario');
addBody('Vista de calendario mensual que muestra la distribucion de instalaciones. Al seleccionar una fecha, se muestra el panel lateral con las cocinas programadas o asignadas para ese dia. Incluye navegacion entre meses y marcador de la fecha actual.');

addSubtitle('8.8 Gestion de Usuarios');
addBody('Modulo exclusivo para administradores. Permite listar usuarios existentes, crear nuevos usuarios con nombre, email, contrasena y rol, y visualizar el estado de cada cuenta.');

// ========== 9. SISTEMA VISUAL ==========
nextPage();
addTitle('9. Sistema Visual (UX/UI)');

addSubtitle('Identidad Visual');
addBody('La identidad esta inspirada en la madera, la carpinteria y la arquitectura interior. Se utilizan tonos madera de manera sutil y elegante, sin dominar la interfaz. El software sigue siendo enterprise; la madera es identidad, no decoracion.');

addSubtitle('Paleta de Colores');
addBody('Tema Claro: Blanco calido (#FAFAF8), tonos madera (#A08B6E), gris piedra, tonos carbon, detalles oscuros elegantes. Sin colores saturados.');
addBody('Tema Oscuro: Carbon (#121010), negro suave, grafito, tonos madera oscuros, contrastes cuidadosamente seleccionados para legibilidad.');

addSubtitle('Tipografia');
addBody('Inter como fuente principal para toda la interfaz. DM Sans para titulos y display. Jerarquia clara con pesos 300-700. Solo dos familias tipograficas.');

addSubtitle('Iconografia');
addBody('Lucide React: biblioteca de iconos minimalista, lineal, coherente y funcional. Sin emojis. Todos los iconos tienen el mismo tamano y peso visual.');

addSubtitle('Principios de Diseno');
addBullet('Cada elemento visual tiene una razon funcional.');
addBullet('Minimo numero de clicks para operaciones frecuentes.');
addBullet('Animaciones sutiles (fadeIn, slideIn) solo cuando aportan.');
addBullet('Responsive design real: desktop, laptop, tablet, smartphone.');
addBullet('Priorizar productividad sobre decoracion.');

addSubtitle('Componentes UI Reutilizables');
addBody('Sistema de componentes documentado en CSS con design tokens: botones (primary, secondary, outline, danger, success, ghost), badges (success, warning, danger, info, neutral), cards, modals, formularios, tablas con paginacion, filtros, timeline visual, barras de progreso, indicadores de estado con dot de color.');

// ========== 10. SEGURIDAD ==========
nextPage();
addTitle('10. Seguridad');
addBullet('Autenticacion JWT con expiracion de 24 horas.');
addBullet('Contrasenas almacenadas con bcrypt (hash + salt).');
addBullet('Autorizacion basada en roles validada en backend (middleware).');
addBullet('Rutas protegidas: todas las rutas API requieren token valido.');
addBullet('Control de acceso: cada endpoint verifica el rol del usuario.');
addBullet('Validacion de datos en backend con verificacion de tipos.');
addBullet('Proteccion de archivos: solo imagenes permitidas en upload.');
addBullet('Limite de uploads: maximo 10MB por archivo.');
addBullet('CORS configurado para origenes especificos.');
addBullet('Variables de entorno para secretos (JWT_SECRET, DB_PATH).');
addBullet('Registro de acciones criticas en tabla de auditoria.');
addBullet('Manejo correcto de sesiones: token eliminado al cerrar.');

// ========== 11. MANUAL DE USO ==========
nextPage();
addTitle('11. Manual de Uso');

addSubtitle('11.1 Inicio de Sesion');
addBody('Al acceder al sistema, se presenta la pantalla de login. Ingrese su usuario y contrasena. Las credenciales de prueba estan disponibles en la pantalla. Al autenticarse, el sistema redirige al Dashboard.');

addSubtitle('11.2 Dashboard');
addBody('El Dashboard muestra los indicadores principales. Los numeros son clickeables y llevan al listado filtrado. La seccion "Atencion prioritaria" muestra que necesita resolucion hoy. La actividad reciente muestra los ultimos cambios.');

addSubtitle('11.3 Crear una Cocina');
addBody('Navegue a Cocinas > Nueva cocina. Seleccione el tipo de instalacion (inferior, superior o combinado; basico o especial). Complete los datos del beneficiario (nombre, telefono, direccion, zona, barrio). La cocina se crea en estado "Pendiente".');

addSubtitle('11.4 Avanzar el Estado de una Cocina');
addBody('Abra el detalle de la cocina. El panel lateral derecho muestra los botones de avance disponibles segun el estado actual. Por ejemplo, si esta en "Pendiente", el boton muestra "Marcar como contactado". Cada avance se registra en la linea de tiempo.');

addSubtitle('11.5 Asignar un Carpintero');
addBody('Desde el detalle de la cocina, haga clic en "Asignar carpintero" o vaya a Asignaciones > Nueva asignacion. El sistema muestra los candidatos ordenados por puntuacion, con razones y advertencias. El carpintero recomendado tiene una estrella. Seleccione y confirme.');

addSubtitle('11.6 Generar Mensaje WhatsApp');
addBody('Despues de asignar un carpintero, aparece el boton "WhatsApp" en el detalle de la cocina. Al hacer clic, se genera un mensaje estructurado con: nombre del beneficiario, direccion, tipo de cocina, datos de contacto. Se abre WhatsApp Web con el mensaje prellenado.');

addSubtitle('11.7 Registrar Respuesta del Carpintero');
addBody('En el modulo de Asignaciones, las asignaciones pendientes muestran botones de aceptar o rechazar. Si acepta, la cocina avanza a "Asignada". Si rechaza, se desasigna y el carpintero queda libre. La cocina regresa al flujo de busqueda.');

addSubtitle('11.8 Subir Evidencia Fotografica');
addBody('En el detalle de la cocina, la seccion "Evidencia" permite subir una fotografia de la instalacion. La imagen se asocia a la cocina con fecha, usuario y posibilidad de validacion.');

addSubtitle('11.9 Cambiar Tema');
addBody('El boton de tema (sol/luna) en la barra superior alterna entre el tema claro y oscuro. La preferencia se guarda en el navegador.');

// ========== 12. ESTRUCTURA ==========
nextPage();
addTitle('12. Estructura de Archivos del Proyecto');

addSubtitle('Backend (server/)');
[
  'server/package.json - Dependencias y scripts',
  'server/tsconfig.json - Configuracion TypeScript',
  'server/.env - Variables de entorno',
  'server/src/index.ts - Servidor Express principal',
  'server/src/db/schema.ts - BD SQLite + schema + seed data',
  'server/src/types/index.ts - Tipos y permisos',
  'server/src/middleware/auth.ts - JWT + autorizacion',
  'server/src/controllers/auth.controller.ts - Login, usuarios',
  'server/src/controllers/kitchen.controller.ts - Cocinas CRUD + estados',
  'server/src/controllers/carpenter.controller.ts - Carpinteros CRUD',
  'server/src/controllers/assignment.controller.ts - Asignaciones inteligentes',
  'server/src/routes/*.ts - Rutas HTTP por modulo',
].forEach(f => addBullet(f));

doc.moveDown(0.5);
addSubtitle('Frontend (client/)');
[
  'client/src/main.tsx - Punto de entrada',
  'client/src/App.tsx - Router principal',
  'client/src/styles/globals.css - Design system y tokens',
  'client/src/styles/components.css - Componentes UI',
  'client/src/styles/layout.css - Sidebar, topbar, responsive',
  'client/src/styles/login.css - Estilos del login',
  'client/src/context/AuthContext.tsx - Estado de autenticacion',
  'client/src/context/ThemeContext.tsx - Tema claro/oscuro',
  'client/src/services/api.ts - Cliente HTTP con JWT',
  'client/src/components/layout/Layout.tsx - Layout principal',
  'client/src/pages/*.tsx - Paginas por modulo',
].forEach(f => addBullet(f));

// ========== 13. INSTALACION ==========
nextPage();
addTitle('13. Instalacion y Ejecucion');

addSubtitle('Prerequisitos');
addBullet('Node.js v18 o superior');
addBullet('npm v9 o superior');

addSubtitle('Pasos de Instalacion');
addBody('1. Instalar dependencias del backend: cd server && npm install');
addBody('2. Instalar dependencias del frontend: cd client && npm install');
addBody('3. Iniciar el backend (Terminal 1): cd server && npm run dev');
addBody('4. Iniciar el frontend (Terminal 2): cd client && npm run dev');
addBody('5. Abrir el navegador en http://localhost:5173');

addSubtitle('Credenciales de Prueba');
addTable(
  ['Rol', 'Usuario', 'Contrasena'],
  [
    ['Administrador', 'admin', 'admin123'],
    ['Supervisor', 'supervisor1', 'super123'],
    ['Empleado', 'empleado1', 'emp123'],
  ]
);

addSubtitle('Datos de Prueba');
addBody('El sistema se inicializa automaticamente con: 3 usuarios, 11 estados de cocina, 6 tipos de cocina, 6 carpinteros con zonas y tipos asignados, 12 cocinas en diferentes estados con beneficiarios y observaciones.');

// ========== 14. CAPACIDADES FUTURAS ==========
nextPage();
addTitle('14. Capacidades Futuras');
addBody('La arquitectura esta disenada para incorporar las siguientes funcionalidades sin rehacer el sistema existente:');
addBullet('Integracion oficial con WhatsApp Business API.');
addBullet('Geolocalizacion y mapas para visualizar cocinas y carpinteros por zona.');
addBullet('Optimizacion de rutas para instalaciones del mismo dia.');
addBullet('Sistema avanzado de recomendacion con machine learning.');
addBullet('Notificaciones push en tiempo real.');
addBullet('Exportacion de reportes a PDF y Excel.');
addBullet('Firma digital del beneficiario al recibir la instalacion.');
addBullet('Aplicacion movil nativa o PWA.');
addBullet('Inteligencia artificial para prediccion de carga de trabajo.');
addBullet('Migracion a PostgreSQL para despliegue en produccion.');

// ========== 15. CONCLUSIONES ==========
addSubtitle('15. Conclusiones');
addBody('CocinasApp es un producto empresarial disenado especificamente para resolver un problema operativo real: la gestion desorganizada de instalaciones de cocinas de interes social en Medellin. No es un dashboard generico ni un CRUD sin contexto.');
addBody('Cada modulo responde a una necesidad real del proceso de negocio. Cada estado representa un punto real del flujo. Cada accion tiene trazabilidad completa. El diseno transmite la sensacion de que la empresa necesita este sistema.');
addBody('La arquitectura limpia, el tipado fuerte, la separacion de responsabilidades y el modelado extensible de tipos de cocina y estados garantizan que el sistema puede crecer con la empresa sin necesidad de reescrituras mayores.');

// ========== PIE ==========
const pages = doc.bufferedPageRange().count;
for (let i = 0; i < pages; i++) {
  doc.switchToPage(i);
  if (i > 0) {
    doc.fontSize(8).font('Helvetica').fillColor(C.lgray);
    doc.text('CocinasApp - Documentacion Tecnica', 65, 760, { width: 300 });
    doc.text('Pagina ' + (i + 1) + ' de ' + pages, 65, 760, { width: 480, align: 'right' });
  }
}

doc.end();

doc.on('end', () => {
  const stats = fs.statSync(outputPath);
  console.log('PDF generado: ' + outputPath);
  console.log('Tamano: ' + (stats.size / 1024).toFixed(1) + ' KB');
  console.log('Paginas: ' + pages);
});
