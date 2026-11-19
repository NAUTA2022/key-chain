/** Version of the terms the onboarding asks users to accept (must match the API's TERMS_VERSION). */
export const TERMS_VERSION = '2026-10-08';

export type LegalSection = { title: string; paragraphs: string[] };

export const TERMS: LegalSection[] = [
  { title: 'Quiénes somos y qué ofrecemos', paragraphs: [
    'La 33 es una plataforma que permite invertir en fracciones tokenizadas de activos reales (RWA) mediante tokens de seguridad bajo el estándar ERC-3643, con identidad verificada on-chain.',
    'Mientras esté activo el entorno de pruebas, todas las operaciones se ejecutan en una red de pruebas privada con saldos sin valor económico. Ninguna operación de ese entorno representa una inversión real.',
  ] },
  { title: 'Requisitos para usar la plataforma', paragraphs: [
    'Debés ser mayor de edad, tener capacidad legal para contratar y completar la verificación de identidad (KYC/KYB) antes de invertir.',
    'Algunas jurisdicciones pueden estar restringidas por razones regulatorias o de sanciones. Podemos rechazar o suspender cuentas que no cumplan estos requisitos.',
  ] },
  { title: 'Tu wallet y tus claves', paragraphs: [
    'Accedés con tu propia wallet. Sos responsable de custodiar tus claves y de los dispositivos desde los que firmás. La 33 nunca te pedirá tu frase semilla ni tus claves privadas.',
    'Tu identidad on-chain (ONCHAINID) es gestionada por la plataforma para registrar tus credenciales de verificación.',
  ] },
  { title: 'Riesgos de invertir', paragraphs: [
    'Invertir en activos reales tokenizados implica riesgos, incluida la pérdida parcial o total del capital. Los rendimientos estimados no están garantizados y los resultados pasados no anticipan resultados futuros.',
    'La liquidez de los tokens puede ser limitada. La información de cada proyecto es provista por su emisor; revisá los documentos antes de invertir.',
  ] },
  { title: 'Comisiones', paragraphs: [
    'Las comisiones vigentes se informan antes de cada operación. Las comisiones on-chain se aplican según los contratos del protocolo.',
  ] },
  { title: 'Uso aceptable', paragraphs: [
    'No podés usar la plataforma para actividades ilícitas, lavado de dinero, financiamiento del terrorismo, manipulación de mercado ni para eludir controles de cumplimiento.',
  ] },
  { title: 'Limitación de responsabilidad', paragraphs: [
    'La plataforma se ofrece “tal cual”. No respondemos por fallas de redes blockchain, wallets o servicios de terceros fuera de nuestro control, en la medida permitida por la ley aplicable.',
  ] },
  { title: 'Cambios y contacto', paragraphs: [
    'Podemos actualizar estos términos; te pediremos aceptar la nueva versión cuando el cambio sea relevante. Para consultas, escribinos desde el Centro de ayuda.',
  ] },
];

export const PRIVACY: LegalSection[] = [
  { title: 'Datos que tratamos', paragraphs: [
    'Dirección de wallet, datos de perfil (nombre, email, país, preferencias), datos de verificación de identidad (nombre legal, documento, país y archivos que subas), operaciones e historial de inversiones, tickets de soporte y datos técnicos de sesión (IP y navegador).',
  ] },
  { title: 'Para qué los usamos', paragraphs: [
    'Para prestar el servicio, verificar tu identidad y cumplir obligaciones de prevención de lavado de dinero, ejecutar y registrar tus inversiones, darte soporte, enviarte avisos operativos y mejorar la seguridad de la plataforma.',
  ] },
  { title: 'Con quién los compartimos', paragraphs: [
    'Con proveedores que operan la infraestructura (alojamiento, base de datos, almacenamiento, envío de emails, nodos blockchain y wallets) y, cuando lo exija la ley, con autoridades competentes. Los registros on-chain son públicos por naturaleza.',
  ] },
  { title: 'Cuánto tiempo los conservamos', paragraphs: [
    'Los datos de verificación e inversiones se conservan el tiempo que exigen las normas de prevención de lavado de dinero y fiscales, aun si pedís el cierre de tu cuenta.',
  ] },
  { title: 'Tus derechos', paragraphs: [
    'Podés ver y editar tu perfil, descargar una copia de tus datos y pedir el cierre de tu cuenta desde Perfil → Privacidad. También podés escribirnos desde el Centro de ayuda.',
  ] },
  { title: 'Seguridad', paragraphs: [
    'Aplicamos cifrado en tránsito, controles de acceso por rol, registros de auditoría y almacenamiento privado de documentos. Ningún sistema es infalible: avisanos si detectás un problema.',
  ] },
];
