-- Keypoint Hub Providencia · esquema PostgreSQL
-- Generado desde src/core/schema.js con: node tools/build-db.mjs

create extension if not exists btree_gist;

-- Parámetros editables: reglas, horarios, apariencia, correo.
create table if not exists config (
  key text primary key,
  value jsonb
);

-- Perfiles de personas. El id (HUB-00001) es lo único que lleva el QR.
create table if not exists users (
  id text primary key,
  doc_type text not null default 'rut',
  doc_number text not null,
  name text not null,
  email text,
  phone text,
  comuna text,
  activity text,
  occupation text,
  gender text,
  birth_date date,
  reduced_mobility boolean not null default false,
  photo text,
  password_hash text,
  email_verified boolean not null default false,
  status text not null default 'activo',
  guardian_id text references users(id) on delete set null,
  guardian_ok boolean not null default false,
  consent_data boolean not null default false,
  consent_image boolean not null default false,
  consent_belongings boolean not null default false,
  lang text not null default 'es',
  created_at timestamptz not null default now(),
  unique (doc_number),
  check (status in ('pendiente_correo','pendiente_adulto','activo'))
);
create index if not exists users_email_idx on users (email);

-- Códigos de un solo uso para confirmar el correo o entrar sin contraseña.
create table if not exists auth_codes (
  id integer primary key,
  user_id text not null references users(id) on delete cascade,
  code text not null,
  purpose text not null,
  expires_at timestamptz not null,
  used boolean not null default false
);

-- Personal del Hub. Cada persona del equipo es también un usuario.
create table if not exists staff (
  id integer primary key,
  user_id text not null references users(id) on delete cascade,
  position text,
  active boolean not null default true,
  unique (user_id)
);

-- Credenciales del personal: admin, encargado, recepcion, analista.
create table if not exists staff_roles (
  id integer primary key,
  user_id text not null references users(id) on delete cascade,
  role text not null,
  unique (user_id, role),
  check (role in ('admin','encargado','recepcion','analista'))
);

-- Espacios del Hub: cowork, salas, sala gaming, laboratorios, auditorio, residencias.
create table if not exists spaces (
  id integer primary key,
  name text not null,
  kind text not null,
  mode text not null default 'reserva',
  floor integer not null default 1,
  capacity integer not null default 0,
  accessible boolean not null default true,
  requires_cert boolean not null default false,
  min_level integer not null default 1,
  manager_id text references users(id) on delete set null,
  monthly_hours numeric not null default 0,
  gap_min integer not null default 0,
  tolerance_min integer,
  max_hours numeric,
  allow_overnight boolean not null default false,
  accept text,
  color text,
  notes text,
  active boolean not null default true,
  check (mode in ('libre','reserva','evento'))
);

-- Equipos o subdivisiones de un espacio: máquinas, computadores, grupos de residencia.
create table if not exists resources (
  id integer primary key,
  space_id integer not null references spaces(id) on delete cascade,
  name text not null,
  model text,
  specs text,
  capacity integer not null default 1,
  active boolean not null default true
);

-- Certificaciones por laboratorio, con niveles opcionales y vigencia.
create table if not exists certifications (
  id integer primary key,
  space_id integer not null references spaces(id) on delete cascade,
  name text not null,
  level integer not null default 1,
  validity_months integer,
  weekday integer not null default 2,
  time_min integer not null default 720,
  duration_min integer not null default 90,
  seats integer not null default 6,
  cost integer not null default 0,
  diploma_download boolean not null default true,
  instructor_id text references users(id) on delete set null,
  active boolean not null default true
);

-- Sesiones semanales de certificación. Bloquean el laboratorio mientras duran.
create table if not exists cert_sessions (
  id integer primary key,
  certification_id integer not null references certifications(id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  seats integer not null default 6,
  status text not null default 'abierta'
);

-- Inscripciones a una sesión y su resultado.
create table if not exists cert_enrollments (
  id integer primary key,
  session_id integer not null references cert_sessions(id) on delete cascade,
  user_id text not null references users(id) on delete cascade,
  status text not null default 'inscrito',
  unique (session_id, user_id),
  check (status in ('inscrito','aprobado','reprobado','ausente'))
);

-- Certificaciones obtenidas por cada usuario.
create table if not exists user_certs (
  id integer primary key,
  user_id text not null references users(id) on delete cascade,
  certification_id integer not null references certifications(id) on delete cascade,
  granted_at timestamptz not null,
  expires_at timestamptz,
  granted_by text references users(id) on delete set null,
  diploma text
);

-- Reservas de salas, equipos gaming y máquinas. charged_min es lo que se descuenta del saldo.
create table if not exists reservations (
  id integer primary key,
  user_id text not null references users(id) on delete cascade,
  space_id integer not null references spaces(id) on delete cascade,
  resource_id integer references resources(id) on delete set null,
  kind text not null default 'equipo',
  title text,
  start_at timestamptz not null,
  end_at timestamptz not null,
  status text not null default 'confirmada',
  est_min integer not null default 0,
  real_min integer,
  charged_min integer not null default 0,
  attended_at timestamptz,
  finished_at timestamptz,
  cancelled_at timestamptz,
  created_by text references users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (status in ('confirmada','en_revision','en_curso','completada','cancelada','no_asistio','rechazada')),
  check (end_at > start_at)
);
create index if not exists reservations_user_id_idx on reservations (user_id);
create index if not exists reservations_space_id_start_at_idx on reservations (space_id, start_at);

-- Asistentes de una reserva de sala o de grupo. Todos deben tener perfil.
create table if not exists reservation_guests (
  id integer primary key,
  reservation_id integer not null references reservations(id) on delete cascade,
  user_id text not null references users(id) on delete cascade,
  attended boolean not null default false,
  unique (reservation_id, user_id)
);

-- Archivos de trabajo subidos para revisión del encargado.
create table if not exists files (
  id integer primary key,
  user_id text not null references users(id) on delete cascade,
  reservation_id integer references reservations(id) on delete set null,
  space_id integer not null references spaces(id) on delete cascade,
  name text not null,
  size numeric not null default 0,
  status text not null default 'pendiente',
  storage text,
  reviewed_by text references users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  check (status in ('pendiente','aprobado','rechazado','observado','eliminado'))
);

-- Observaciones del encargado sobre un trabajo. El usuario decide cuándo borrarlas.
create table if not exists observations (
  id integer primary key,
  file_id integer references files(id) on delete set null,
  user_id text not null references users(id) on delete cascade,
  author_id text not null references users(id) on delete cascade,
  space_id integer not null references spaces(id) on delete cascade,
  kind text not null default 'observacion',
  text text not null,
  created_at timestamptz not null default now()
);

-- Entradas y salidas del edificio.
create table if not exists visits (
  id integer primary key,
  user_id text not null references users(id) on delete cascade,
  in_at timestamptz not null,
  out_at timestamptz,
  source text not null default 'qr',
  out_source text,
  by_staff text references users(id) on delete set null
);
create index if not exists visits_user_id_idx on visits (user_id);
create index if not exists visits_in_at_idx on visits (in_at);

-- Penalizaciones y premios de horas por laboratorio. period nulo = se aplica todos los meses.
create table if not exists hour_adjustments (
  id integer primary key,
  user_id text not null references users(id) on delete cascade,
  space_id integer not null references spaces(id) on delete cascade,
  period text,
  minutes integer not null,
  kind text not null,
  reason text,
  by_id text references users(id) on delete set null,
  forgiven boolean not null default false,
  created_at timestamptz not null default now(),
  check (kind in ('penalizacion','premio'))
);

-- Restricciones de acceso al Hub. until_at nulo = permanente.
create table if not exists bans (
  id integer primary key,
  user_id text not null references users(id) on delete cascade,
  from_at timestamptz not null,
  until_at timestamptz,
  reason text,
  by_id text references users(id) on delete set null,
  lifted_at timestamptz
);

-- Bloqueos de agenda. space_id nulo = todo el Hub (feriados, cierres).
create table if not exists blocks (
  id integer primary key,
  space_id integer references spaces(id) on delete set null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  reason text,
  by_id text references users(id) on delete set null
);

-- Eventos y avisos. Cada uno puede mostrarse como banner en el inicio.
create table if not exists events (
  id integer primary key,
  kind text not null default 'evento',
  title text not null,
  description text,
  start_at timestamptz,
  end_at timestamptz,
  seats integer,
  space_id integer references spaces(id) on delete set null,
  banner_img text,
  poster_img text,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

-- Inscripción y asistencia a eventos.
create table if not exists event_attendance (
  id integer primary key,
  event_id integer not null references events(id) on delete cascade,
  user_id text not null references users(id) on delete cascade,
  status text not null default 'inscrito',
  at timestamptz not null,
  unique (event_id, user_id)
);

-- Avisos a usuarios. Recepción los ve al escanear a quien no usa correo ni celular.
create table if not exists notifications (
  id integer primary key,
  user_id text not null references users(id) on delete cascade,
  kind text not null default 'aviso',
  title text not null,
  text text,
  data jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_id_idx on notifications (user_id);

-- Fallas de máquinas reportadas por usuarios.
create table if not exists failure_reports (
  id integer primary key,
  user_id text not null references users(id) on delete cascade,
  reservation_id integer references reservations(id) on delete set null,
  space_id integer not null references spaces(id) on delete cascade,
  resource_id integer references resources(id) on delete set null,
  category text not null,
  description text,
  status text not null default 'abierta',
  created_at timestamptz not null default now()
);

-- Rectángulos del plano de cada piso. group_id une rectángulos en una misma zona.
create table if not exists plan_shapes (
  id integer primary key,
  floor integer not null default 1,
  x integer not null,
  y integer not null,
  w integer not null,
  h integer not null,
  z integer not null default 0,
  color text not null,
  text_color text,
  label text,
  kind text not null default 'libre',
  capacity integer not null default 0,
  space_id integer references spaces(id) on delete set null,
  group_id integer
);

-- Históricos importados como estadística anónima (Power BI, Google Forms).
create table if not exists history_stats (
  id integer primary key,
  day date not null,
  space text not null,
  visits integer not null default 0,
  source text
);

-- Correos por enviar o enviados (confirmaciones, códigos, avisos).
create table if not exists outbox (
  id integer primary key,
  to_email text not null,
  subject text not null,
  body text not null,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

-- Registro de acciones del personal.
create table if not exists audit_log (
  id integer primary key,
  at timestamptz not null,
  actor_id text references users(id) on delete set null,
  action text not null,
  entity text,
  entity_id text,
  detail text
);
create index if not exists audit_log_at_idx on audit_log (at);

-- Dos reservas activas no pueden ocupar el mismo equipo al mismo tiempo.
alter table reservations drop constraint if exists reservations_sin_solape;
alter table reservations add constraint reservations_sin_solape exclude using gist
  (resource_id with =, tstzrange(start_at, end_at) with &&)
  where (resource_id is not null and status in ('confirmada','en_revision','en_curso'));

-- Una persona no puede tener dos visitas abiertas a la vez.
create unique index if not exists visits_una_abierta on visits (user_id) where out_at is null;
