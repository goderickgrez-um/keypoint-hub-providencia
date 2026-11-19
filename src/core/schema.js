// Keypoint Hub Providencia · modelo de datos (fuente única).
// De aquí salen: el almacén en memoria del navegador, database/schema.sql y database/seed.sql.
// Notación de columnas:  'tipo'  obligatorio · 'tipo?' admite nulo · 'tipo=valor' valor por defecto
// Tipos: text, int, num, bool, ts (fecha y hora), date, jsonb, o el nombre de otra tabla (llave foránea).

export const TABLES = {
  config: { doc: 'Parámetros editables: reglas, horarios, apariencia, correo.', pk: 'key',
    cols: { key: 'text', value: 'jsonb?' } },

  users: { doc: 'Perfiles de personas. El id (HUB-00001) es lo único que lleva el QR.',
    cols: { id: 'text', doc_type: 'text=rut', doc_number: 'text', name: 'text', email: 'text?', phone: 'text?',
      comuna: 'text?', activity: 'text?', occupation: 'text?', gender: 'text?', birth_date: 'date?',
      reduced_mobility: 'bool=false', photo: 'text?', password_hash: 'text?', email_verified: 'bool=false',
      status: 'text=activo', guardian_id: 'users?', guardian_ok: 'bool=false', consent_data: 'bool=false', consent_image: 'bool=false',
      consent_belongings: 'bool=false', lang: 'text=es', created_at: 'ts' },
    unique: ['doc_number'], index: ['email'],
    check: ["status in ('pendiente_correo','pendiente_adulto','activo')"] },

  auth_codes: { doc: 'Códigos de un solo uso para confirmar el correo o entrar sin contraseña.',
    cols: { id: 'int', user_id: 'users', code: 'text', purpose: 'text', expires_at: 'ts', used: 'bool=false' } },

  staff: { doc: 'Personal del Hub. Cada persona del equipo es también un usuario.',
    cols: { id: 'int', user_id: 'users', position: 'text?', active: 'bool=true' }, unique: ['user_id'] },

  staff_roles: { doc: 'Credenciales del personal: admin, encargado, recepcion, analista.',
    cols: { id: 'int', user_id: 'users', role: 'text' }, unique: ['user_id, role'],
    check: ["role in ('admin','encargado','recepcion','analista')"] },

  spaces: { doc: 'Espacios del Hub: cowork, salas, sala gaming, laboratorios, auditorio, residencias.',
    cols: { id: 'int', name: 'text', kind: 'text', mode: 'text=reserva', floor: 'int=1', capacity: 'int=0',
      accessible: 'bool=true', requires_cert: 'bool=false', min_level: 'int=1', manager_id: 'users?', /* obsoleto: ver space_managers */
      monthly_hours: 'num=0', gap_min: 'int=0', tolerance_min: 'int?', max_hours: 'num?',
      allow_overnight: 'bool=false', accept: 'text?', color: 'text?', notes: 'text?', active: 'bool=true' },
    check: ["mode in ('libre','reserva','evento')"] },

  space_managers: { doc: 'Encargados de cada laboratorio o sala. Un encargado puede tener varios espacios y un espacio varios encargados.',
    cols: { id: 'int', space_id: 'spaces', user_id: 'users' }, unique: ['space_id, user_id'], index: ['user_id'] },

  resources: { doc: 'Equipos o subdivisiones de un espacio: máquinas, computadores, grupos de residencia.',
    cols: { id: 'int', space_id: 'spaces', name: 'text', model: 'text?', specs: 'text?', capacity: 'int=1', active: 'bool=true' } },

  certifications: { doc: 'Certificaciones por laboratorio, con niveles opcionales y vigencia.',
    cols: { id: 'int', space_id: 'spaces', name: 'text', level: 'int=1', validity_months: 'int?', weekday: 'int=2',
      time_min: 'int=720', duration_min: 'int=90', seats: 'int=6', cost: 'int=0', diploma_download: 'bool=true',
      instructor_id: 'users?', active: 'bool=true' } },

  cert_sessions: { doc: 'Sesiones semanales de certificación. Bloquean el laboratorio mientras duran.',
    cols: { id: 'int', certification_id: 'certifications', start_at: 'ts', end_at: 'ts', seats: 'int=6', status: 'text=abierta' } },

  cert_enrollments: { doc: 'Inscripciones a una sesión y su resultado.',
    cols: { id: 'int', session_id: 'cert_sessions', user_id: 'users', status: 'text=inscrito' }, unique: ['session_id, user_id'],
    check: ["status in ('inscrito','aprobado','reprobado','ausente')"] },

  user_certs: { doc: 'Certificaciones obtenidas por cada usuario.',
    cols: { id: 'int', user_id: 'users', certification_id: 'certifications', granted_at: 'ts', expires_at: 'ts?',
      granted_by: 'users?', diploma: 'text?' } },

  reservations: { doc: 'Reservas de salas, equipos gaming y máquinas. charged_min es lo que se descuenta del saldo.',
    cols: { id: 'int', user_id: 'users', space_id: 'spaces', resource_id: 'resources?', kind: 'text=equipo', title: 'text?',
      start_at: 'ts', end_at: 'ts', status: 'text=confirmada', est_min: 'int=0', real_min: 'int?', charged_min: 'int=0',
      attended_at: 'ts?', finished_at: 'ts?', cancelled_at: 'ts?', created_by: 'users?', created_at: 'ts' },
    index: ['user_id', 'space_id, start_at'],
    check: ["status in ('confirmada','en_revision','en_curso','completada','cancelada','no_asistio','rechazada')", 'end_at > start_at'] },

  reservation_guests: { doc: 'Asistentes de una reserva de sala o de grupo. Todos deben tener perfil.',
    cols: { id: 'int', reservation_id: 'reservations', user_id: 'users', attended: 'bool=false' }, unique: ['reservation_id, user_id'] },

  files: { doc: 'Archivos de trabajo subidos para revisión del encargado.',
    cols: { id: 'int', user_id: 'users', reservation_id: 'reservations?', space_id: 'spaces', name: 'text', size: 'num=0',
      status: 'text=pendiente', storage: 'text?', reviewed_by: 'users?', reviewed_at: 'ts?', created_at: 'ts' },
    check: ["status in ('pendiente','aprobado','rechazado','observado','eliminado')"] },

  observations: { doc: 'Observaciones del encargado sobre un trabajo. El usuario decide cuándo borrarlas.',
    cols: { id: 'int', file_id: 'files?', user_id: 'users', author_id: 'users', space_id: 'spaces', kind: 'text=observacion',
      text: 'text', created_at: 'ts' } },

  visits: { doc: 'Entradas y salidas del edificio.',
    cols: { id: 'int', user_id: 'users', in_at: 'ts', out_at: 'ts?', source: 'text=qr', out_source: 'text?', by_staff: 'users?', space_id: 'spaces?' },
    index: ['user_id', 'in_at'] },

  hour_adjustments: { doc: 'Penalizaciones y premios de horas por laboratorio. period nulo = se aplica todos los meses.',
    cols: { id: 'int', user_id: 'users', space_id: 'spaces', period: 'text?', minutes: 'int', kind: 'text', reason: 'text?',
      by_id: 'users?', forgiven: 'bool=false', created_at: 'ts' },
    check: ["kind in ('penalizacion','premio')"] },

  bans: { doc: 'Restricciones de acceso al Hub. until_at nulo = permanente.',
    cols: { id: 'int', user_id: 'users', from_at: 'ts', until_at: 'ts?', reason: 'text?', by_id: 'users?', lifted_at: 'ts?' } },

  blocks: { doc: 'Bloqueos de agenda. space_id nulo = todo el Hub (feriados, cierres).',
    cols: { id: 'int', space_id: 'spaces?', start_at: 'ts', end_at: 'ts', reason: 'text?', by_id: 'users?' } },

  events: { doc: 'Eventos y avisos. Cada uno puede mostrarse como banner en el inicio.',
    cols: { id: 'int', kind: 'text=evento', title: 'text', description: 'text?', start_at: 'ts?', end_at: 'ts?', seats: 'int?',
      space_id: 'spaces?', banner_img: 'text?', poster_img: 'text?', published: 'bool=true', created_at: 'ts' } },

  event_attendance: { doc: 'Inscripción y asistencia a eventos.',
    cols: { id: 'int', event_id: 'events', user_id: 'users', status: 'text=inscrito', at: 'ts' }, unique: ['event_id, user_id'] },

  notifications: { doc: 'Avisos a usuarios. Recepción los ve al escanear a quien no usa correo ni celular.',
    cols: { id: 'int', user_id: 'users', kind: 'text=aviso', title: 'text', text: 'text?', data: 'jsonb?', read_at: 'ts?', created_at: 'ts' },
    index: ['user_id'] },

  failure_reports: { doc: 'Fallas de máquinas reportadas por usuarios.',
    cols: { id: 'int', user_id: 'users', reservation_id: 'reservations?', space_id: 'spaces', resource_id: 'resources?',
      category: 'text', description: 'text?', status: 'text=abierta', created_at: 'ts' } },

  plan_shapes: { doc: 'Rectángulos del plano de cada piso. group_id une rectángulos en una misma zona.',
    cols: { id: 'int', floor: 'int=1', x: 'int', y: 'int', w: 'int', h: 'int', z: 'int=0', color: 'text', text_color: 'text?',
      label: 'text?', kind: 'text=libre', capacity: 'int=0', space_id: 'spaces?', group_id: 'int?' } },

  history_stats: { doc: 'Históricos importados como estadística anónima (Power BI, Google Forms).',
    cols: { id: 'int', day: 'date', space: 'text', visits: 'int=0', source: 'text?' } },

  outbox: { doc: 'Correos por enviar o enviados (confirmaciones, códigos, avisos).',
    cols: { id: 'int', to_email: 'text', subject: 'text', body: 'text', created_at: 'ts', sent_at: 'ts?' } },

  audit_log: { doc: 'Registro de acciones del personal.',
    cols: { id: 'int', at: 'ts', actor_id: 'users?', action: 'text', entity: 'text?', entity_id: 'text?', detail: 'text?' },
    index: ['at'] },
};

const SQL = { text: 'text', int: 'integer', num: 'numeric', bool: 'boolean', ts: 'timestamptz', date: 'date', jsonb: 'jsonb' };

/** Columnas interpretadas: [{name, type, ref, nullable, def}] */
export const COLS = Object.fromEntries(Object.entries(TABLES).map(([t, def]) => [t, Object.entries(def.cols).map(([name, spec]) => {
  const m = /^(\w+)(\?)?(?:=(.*))?$/.exec(spec);
  const ref = SQL[m[1]] ? null : m[1];
  const type = ref ? (ref === 'users' ? 'text' : 'int') : m[1];
  let d = m[3];
  if (d !== undefined) d = type === 'bool' ? d === 'true' : (type === 'int' || type === 'num') ? +d : d;
  return { name, type, ref, nullable: !!m[2], def: d };
})]));

export const pkOf = t => TABLES[t].pk || 'id';

/** Fila con los valores por defecto de la tabla. */
export const blank = t => Object.fromEntries(COLS[t].map(c => [c.name, c.def !== undefined ? c.def : null]));

/** Genera el DDL de PostgreSQL. */
export function toSQL() {
  const out = ['-- Keypoint Hub Providencia · esquema PostgreSQL', '-- Generado desde src/core/schema.js con: node tools/build-db.mjs', '',
    'create extension if not exists btree_gist;', ''];
  for (const [t, def] of Object.entries(TABLES)) {
    const pk = pkOf(t);
    const lines = COLS[t].map(c => {
      let s = `  ${c.name} ${SQL[c.type]}`;
      if (c.name === pk) s += ' primary key';
      else if (!c.nullable) s += ' not null';
      if (c.def !== undefined) s += ` default ${typeof c.def === 'string' ? `'${c.def}'` : c.def}`;
      if (c.type === 'ts' && c.name === 'created_at') s += ' default now()';
      if (c.ref) s += ` references ${c.ref}(id)${c.nullable ? ' on delete set null' : ' on delete cascade'}`;
      return s;
    });
    (def.unique || []).forEach(u => lines.push(`  unique (${u})`));
    (def.check || []).forEach(c => lines.push(`  check (${c})`));
    out.push(`-- ${def.doc}`, `create table if not exists ${t} (`, lines.join(',\n'), ');');
    // Si la tabla ya existía (base creada con una versión anterior), agrega las columnas que falten.
    for (const c of COLS[t]) if (c.name !== pk) out.push(`alter table ${t} add column if not exists ${c.name} ${SQL[c.type]}${c.def !== undefined ? ` default ${typeof c.def === 'string' ? `'${c.def}'` : c.def}` : ''}${c.ref ? ` references ${c.ref}(id)${c.nullable ? ' on delete set null' : ' on delete cascade'}` : ''};`);
    (def.index || []).forEach(i => out.push(`create index if not exists ${t}_${i.replace(/\W+/g, '_')}_idx on ${t} (${i});`));
    out.push('');
  }
  out.push('-- Dos reservas activas no pueden ocupar el mismo equipo al mismo tiempo.',
    "alter table reservations drop constraint if exists reservations_sin_solape;",
    "alter table reservations add constraint reservations_sin_solape exclude using gist",
    "  (resource_id with =, tstzrange(start_at, end_at) with &&)",
    "  where (resource_id is not null and status in ('confirmada','en_revision','en_curso'));", '',
    '-- Una persona no puede tener dos visitas abiertas a la vez.',
    'create unique index if not exists visits_una_abierta on visits (user_id) where out_at is null;', '');
  return out.join('\n');
}
