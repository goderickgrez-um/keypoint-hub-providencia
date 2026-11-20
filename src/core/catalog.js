// Catálogos y valores por defecto. Todo lo de DEFAULTS es editable desde "Reglas" y "Apariencia".

export const ACTIVITIES = ['Trabajo', 'Estudio', 'Vivo', 'Tengo mi emprendimiento patentado en la comuna',
  'Realizo trámites o actividades puntuales en la comuna', 'Solo utilizo el espacio de cowork'];

export const OCCUPATIONS = ['Academia, docencia e investigación', 'Ingeniería, tecnología y ciencias', 'Salud, medicina, bienestar y deporte',
  'Administración, finanzas, contabilidad y negocios', 'Ventas, comercio, retail y servicios al cliente', 'Construcción, minería, industria y logística',
  'Derecho, gestión pública, defensa y seguridad', 'Oficios técnicos, reparaciones y mantenimiento', 'Turismo, transporte, gastronomía y hotelería',
  'Agricultura, ganadería, pesca y medio ambiente', 'Emprendimiento y trabajo independiente', 'Estudiante',
  'Labores del hogar, cesantes, jubilados o no remunerados', 'Ciencias sociales, humanidades y gestión pública', 'Arquitectura, diseño y planificación',
  'Artes, comunicaciones y entretenimiento', 'Consultoría, asesoría y formación continua'];

export const GENDERS = ['Mujer', 'Hombre', 'No binario', 'Prefiero no especificar'];
export const DOC_TYPES = { rut: 'RUT', rut_provisorio: 'RUT provisorio', pasaporte: 'Pasaporte' };
export const ROLES = { admin: 'Administración', encargado: 'Encargado de laboratorio', recepcion: 'Recepción', analista: 'Analista de datos' };
export const FAILURES = ['No enciende o se apaga sola', 'Se detuvo a mitad del trabajo', 'Atasco o falta de material',
  'Resultado defectuoso o desalineado', 'Ruido, olor o temperatura anormal', 'Error de software o de conexión', 'Otra'];
export const KINDS = { cowork: 'Cowork', sala: 'Sala de reuniones', gaming: 'Sala gaming', lab: 'Laboratorio', auditorio: 'Auditorio', residencia: 'Residencias', otro: 'Otro' };
export const MODES = { libre: 'Libre', reserva: 'Con reserva', evento: 'Evento' };
export const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
export const ACCEPT_3D = '.stl,.3mf,.obj,.ctb,.zip,.rar';
export const ACCEPT_LASER = '.svg,.dxf,.pdf,.png,.jpg,.zip,.rar';
export const ACTIVE = ['confirmada', 'en_revision', 'en_curso'];

// Paletas permitidas en Apariencia: el tema claro solo ofrece fondos claros y el oscuro solo fondos oscuros.
export const PALETTE = {
  light: { bg: ['#F5F5F7', '#FFFFFF', '#F1F5F6', '#EAF3F2', '#EEF1F6', '#F6F2EC', '#F4EFF3', '#E9EEF0'],
    text: ['#1D1D1F', '#0F2A2E', '#1F2937', '#2B2B2E', '#3A3A3C', '#143A52'] },
  dark: { bg: ['#000000', '#0B0F12', '#111417', '#1C1C1E', '#10201F', '#141B26', '#1E1A22', '#22272B'],
    text: ['#F5F5F7', '#FFFFFF', '#E6F2F1', '#DDE3EA', '#C7C7CC', '#FFF4DC'] },
  accent: ['#0E7C86', '#1B8F7E', '#2A7FA8', '#3B6FB6', '#4E8D5B', '#5AC8C0', '#63B6D8', '#7FC8A0', '#B26A1F', '#8A5FBF'],
  onColor: ['#FFFFFF', '#F5F5F7', '#00201F', '#1D1D1F', '#0B0F12', '#FFF4DC'],
};

export const THEME = {
  light: { bg: '#F5F5F7', bg2: '#F5F5F7', surface: '#FFFFFF', text: '#1D1D1F', muted: '#63636A', accent: '#0E7C86', onAccent: '#FFFFFF', bar: '#FFFFFF', barText: '#1D1D1F' },
  dark: { bg: '#000000', bg2: '#000000', surface: '#1C1C1E', text: '#F5F5F7', muted: '#A1A1A8', accent: '#5AC8C0', onAccent: '#00201F', bar: '#1C1C1E', barText: '#F5F5F7' },
};

export const DEFAULTS = {
  system_name: 'Keypoint Hub Providencia', tagline: 'Vida buena', logo: null,
  hours: { 1: [510, 1080], 2: [510, 1080], 3: [510, 1080], 4: [510, 1080], 5: [510, 1020] }, // minutos desde las 00:00; sábado y domingo cerrado
  block_min: 50, block_gap_min: 10,          // salas y gaming: bloques de 50 min con 10 de pausa
  cancel_notice_min: 15, tolerance_min: 15,  // aviso mínimo para cancelar y espera antes de liberar
  max_active: 3, max_hours: 12, staff_extra_hours: 6,
  release_room_without_host: false, release_room_after_min: 30,
  default_zone: null,                        // espacio donde queda registrada quien entra sin reserva (null = cowork)
  code_minutes: 15,                          // vigencia de los códigos enviados por correo
  file_max_mb: 4096, keep_rejected_days: 7, keep_approved_days: 30,
  floor_capacity: { 1: 130, 2: 80 },        // un piso por llave; se agregan o quitan desde el plano
  min_age: 4, max_age: 95,
  mail: { host: 'smtp.gmail.com', port: 465, user: '', from: '' },
  google_client_id: '', microsoft_client_id: '',
  theme: THEME,
};
