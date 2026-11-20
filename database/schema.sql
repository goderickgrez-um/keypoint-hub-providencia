-- Keypoint Hub Providencia · esquema PostgreSQL
-- Generado desde src/core/schema.js con: node tools/build-db.mjs

create extension if not exists btree_gist;

-- Parámetros editables: reglas, horarios, apariencia, correo.
create table if not exists config (
  key text primary key,
  value jsonb
);
alter table config add column if not exists value jsonb;

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
  deleted_at timestamptz,
  sessions_after timestamptz,
  unique (doc_number),
  check (status in ('pendiente_correo','pendiente_adulto','activo'))
);
alter table users add column if not exists doc_type text default 'rut';
alter table users add column if not exists doc_number text;
alter table users add column if not exists name text;
alter table users add column if not exists email text;
alter table users add column if not exists phone text;
alter table users add column if not exists comuna text;
alter table users add column if not exists activity text;
alter table users add column if not exists occupation text;
alter table users add column if not exists gender text;
alter table users add column if not exists birth_date date;
alter table users add column if not exists reduced_mobility boolean default false;
alter table users add column if not exists photo text;
alter table users add column if not exists password_hash text;
alter table users add column if not exists email_verified boolean default false;
alter table users add column if not exists status text default 'activo';
alter table users add column if not exists guardian_id text references users(id) on delete set null;
alter table users add column if not exists guardian_ok boolean default false;
alter table users add column if not exists consent_data boolean default false;
alter table users add column if not exists consent_image boolean default false;
alter table users add column if not exists consent_belongings boolean default false;
alter table users add column if not exists lang text default 'es';
alter table users add column if not exists created_at timestamptz;
alter table users add column if not exists deleted_at timestamptz;
alter table users add column if not exists sessions_after timestamptz;
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
alter table auth_codes add column if not exists user_id text references users(id) on delete cascade;
alter table auth_codes add column if not exists code text;
alter table auth_codes add column if not exists purpose text;
alter table auth_codes add column if not exists expires_at timestamptz;
alter table auth_codes add column if not exists used boolean default false;

-- Personal del Hub. Cada persona del equipo es también un usuario.
create table if not exists staff (
  id integer primary key,
  user_id text not null references users(id) on delete cascade,
  position text,
  active boolean not null default true,
  unique (user_id)
);
alter table staff add column if not exists user_id text references users(id) on delete cascade;
alter table staff add column if not exists position text;
alter table staff add column if not exists active boolean default true;

-- Credenciales del personal: admin, encargado, recepcion, analista.
create table if not exists staff_roles (
  id integer primary key,
  user_id text not null references users(id) on delete cascade,
  role text not null,
  unique (user_id, role),
  check (role in ('admin','encargado','recepcion','analista'))
);
alter table staff_roles add column if not exists user_id text references users(id) on delete cascade;
alter table staff_roles add column if not exists role text;

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
alter table spaces add column if not exists name text;
alter table spaces add column if not exists kind text;
alter table spaces add column if not exists mode text default 'reserva';
alter table spaces add column if not exists floor integer default 1;
alter table spaces add column if not exists capacity integer default 0;
alter table spaces add column if not exists accessible boolean default true;
alter table spaces add column if not exists requires_cert boolean default false;
alter table spaces add column if not exists min_level integer default 1;
alter table spaces add column if not exists manager_id text references users(id) on delete set null;
alter table spaces add column if not exists monthly_hours numeric default 0;
alter table spaces add column if not exists gap_min integer default 0;
alter table spaces add column if not exists tolerance_min integer;
alter table spaces add column if not exists max_hours numeric;
alter table spaces add column if not exists allow_overnight boolean default false;
alter table spaces add column if not exists accept text;
alter table spaces add column if not exists color text;
alter table spaces add column if not exists notes text;
alter table spaces add column if not exists active boolean default true;

-- Encargados de cada laboratorio o sala. Un encargado puede tener varios espacios y un espacio varios encargados.
create table if not exists space_managers (
  id integer primary key,
  space_id integer not null references spaces(id) on delete cascade,
  user_id text not null references users(id) on delete cascade,
  unique (space_id, user_id)
);
alter table space_managers add column if not exists space_id integer references spaces(id) on delete cascade;
alter table space_managers add column if not exists user_id text references users(id) on delete cascade;
create index if not exists space_managers_user_id_idx on space_managers (user_id);

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
alter table resources add column if not exists space_id integer references spaces(id) on delete cascade;
alter table resources add column if not exists name text;
alter table resources add column if not exists model text;
alter table resources add column if not exists specs text;
alter table resources add column if not exists capacity integer default 1;
alter table resources add column if not exists active boolean default true;

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
alter table certifications add column if not exists space_id integer references spaces(id) on delete cascade;
alter table certifications add column if not exists name text;
alter table certifications add column if not exists level integer default 1;
alter table certifications add column if not exists validity_months integer;
alter table certifications add column if not exists weekday integer default 2;
alter table certifications add column if not exists time_min integer default 720;
alter table certifications add column if not exists duration_min integer default 90;
alter table certifications add column if not exists seats integer default 6;
alter table certifications add column if not exists cost integer default 0;
alter table certifications add column if not exists diploma_download boolean default true;
alter table certifications add column if not exists instructor_id text references users(id) on delete set null;
alter table certifications add column if not exists active boolean default true;

-- Sesiones semanales de certificación. Bloquean el laboratorio mientras duran.
create table if not exists cert_sessions (
  id integer primary key,
  certification_id integer not null references certifications(id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  seats integer not null default 6,
  status text not null default 'abierta'
);
alter table cert_sessions add column if not exists certification_id integer references certifications(id) on delete cascade;
alter table cert_sessions add column if not exists start_at timestamptz;
alter table cert_sessions add column if not exists end_at timestamptz;
alter table cert_sessions add column if not exists seats integer default 6;
alter table cert_sessions add column if not exists status text default 'abierta';

-- Inscripciones a una sesión y su resultado.
create table if not exists cert_enrollments (
  id integer primary key,
  session_id integer not null references cert_sessions(id) on delete cascade,
  user_id text not null references users(id) on delete cascade,
  status text not null default 'inscrito',
  unique (session_id, user_id),
  check (status in ('inscrito','aprobado','reprobado','ausente'))
);
alter table cert_enrollments add column if not exists session_id integer references cert_sessions(id) on delete cascade;
alter table cert_enrollments add column if not exists user_id text references users(id) on delete cascade;
alter table cert_enrollments add column if not exists status text default 'inscrito';

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
alter table user_certs add column if not exists user_id text references users(id) on delete cascade;
alter table user_certs add column if not exists certification_id integer references certifications(id) on delete cascade;
alter table user_certs add column if not exists granted_at timestamptz;
alter table user_certs add column if not exists expires_at timestamptz;
alter table user_certs add column if not exists granted_by text references users(id) on delete set null;
alter table user_certs add column if not exists diploma text;

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
alter table reservations add column if not exists user_id text references users(id) on delete cascade;
alter table reservations add column if not exists space_id integer references spaces(id) on delete cascade;
alter table reservations add column if not exists resource_id integer references resources(id) on delete set null;
alter table reservations add column if not exists kind text default 'equipo';
alter table reservations add column if not exists title text;
alter table reservations add column if not exists start_at timestamptz;
alter table reservations add column if not exists end_at timestamptz;
alter table reservations add column if not exists status text default 'confirmada';
alter table reservations add column if not exists est_min integer default 0;
alter table reservations add column if not exists real_min integer;
alter table reservations add column if not exists charged_min integer default 0;
alter table reservations add column if not exists attended_at timestamptz;
alter table reservations add column if not exists finished_at timestamptz;
alter table reservations add column if not exists cancelled_at timestamptz;
alter table reservations add column if not exists created_by text references users(id) on delete set null;
alter table reservations add column if not exists created_at timestamptz;
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
alter table reservation_guests add column if not exists reservation_id integer references reservations(id) on delete cascade;
alter table reservation_guests add column if not exists user_id text references users(id) on delete cascade;
alter table reservation_guests add column if not exists attended boolean default false;

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
alter table files add column if not exists user_id text references users(id) on delete cascade;
alter table files add column if not exists reservation_id integer references reservations(id) on delete set null;
alter table files add column if not exists space_id integer references spaces(id) on delete cascade;
alter table files add column if not exists name text;
alter table files add column if not exists size numeric default 0;
alter table files add column if not exists status text default 'pendiente';
alter table files add column if not exists storage text;
alter table files add column if not exists reviewed_by text references users(id) on delete set null;
alter table files add column if not exists reviewed_at timestamptz;
alter table files add column if not exists created_at timestamptz;

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
alter table observations add column if not exists file_id integer references files(id) on delete set null;
alter table observations add column if not exists user_id text references users(id) on delete cascade;
alter table observations add column if not exists author_id text references users(id) on delete cascade;
alter table observations add column if not exists space_id integer references spaces(id) on delete cascade;
alter table observations add column if not exists kind text default 'observacion';
alter table observations add column if not exists text text;
alter table observations add column if not exists created_at timestamptz;

-- Entradas y salidas del edificio.
create table if not exists visits (
  id integer primary key,
  user_id text not null references users(id) on delete cascade,
  in_at timestamptz not null,
  out_at timestamptz,
  source text not null default 'qr',
  out_source text,
  by_staff text references users(id) on delete set null,
  space_id integer references spaces(id) on delete set null
);
alter table visits add column if not exists user_id text references users(id) on delete cascade;
alter table visits add column if not exists in_at timestamptz;
alter table visits add column if not exists out_at timestamptz;
alter table visits add column if not exists source text default 'qr';
alter table visits add column if not exists out_source text;
alter table visits add column if not exists by_staff text references users(id) on delete set null;
alter table visits add column if not exists space_id integer references spaces(id) on delete set null;
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
alter table hour_adjustments add column if not exists user_id text references users(id) on delete cascade;
alter table hour_adjustments add column if not exists space_id integer references spaces(id) on delete cascade;
alter table hour_adjustments add column if not exists period text;
alter table hour_adjustments add column if not exists minutes integer;
alter table hour_adjustments add column if not exists kind text;
alter table hour_adjustments add column if not exists reason text;
alter table hour_adjustments add column if not exists by_id text references users(id) on delete set null;
alter table hour_adjustments add column if not exists forgiven boolean default false;
alter table hour_adjustments add column if not exists created_at timestamptz;

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
alter table bans add column if not exists user_id text references users(id) on delete cascade;
alter table bans add column if not exists from_at timestamptz;
alter table bans add column if not exists until_at timestamptz;
alter table bans add column if not exists reason text;
alter table bans add column if not exists by_id text references users(id) on delete set null;
alter table bans add column if not exists lifted_at timestamptz;

-- Bloqueos de agenda. space_id nulo = todo el Hub (feriados, cierres).
create table if not exists blocks (
  id integer primary key,
  space_id integer references spaces(id) on delete set null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  reason text,
  by_id text references users(id) on delete set null
);
alter table blocks add column if not exists space_id integer references spaces(id) on delete set null;
alter table blocks add column if not exists start_at timestamptz;
alter table blocks add column if not exists end_at timestamptz;
alter table blocks add column if not exists reason text;
alter table blocks add column if not exists by_id text references users(id) on delete set null;

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
  sort_order integer,
  created_at timestamptz not null default now()
);
alter table events add column if not exists kind text default 'evento';
alter table events add column if not exists title text;
alter table events add column if not exists description text;
alter table events add column if not exists start_at timestamptz;
alter table events add column if not exists end_at timestamptz;
alter table events add column if not exists seats integer;
alter table events add column if not exists space_id integer references spaces(id) on delete set null;
alter table events add column if not exists banner_img text;
alter table events add column if not exists poster_img text;
alter table events add column if not exists published boolean default true;
alter table events add column if not exists sort_order integer;
alter table events add column if not exists created_at timestamptz;

-- Inscripción y asistencia a eventos.
create table if not exists event_attendance (
  id integer primary key,
  event_id integer not null references events(id) on delete cascade,
  user_id text not null references users(id) on delete cascade,
  status text not null default 'inscrito',
  at timestamptz not null,
  unique (event_id, user_id)
);
alter table event_attendance add column if not exists event_id integer references events(id) on delete cascade;
alter table event_attendance add column if not exists user_id text references users(id) on delete cascade;
alter table event_attendance add column if not exists status text default 'inscrito';
alter table event_attendance add column if not exists at timestamptz;

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
alter table notifications add column if not exists user_id text references users(id) on delete cascade;
alter table notifications add column if not exists kind text default 'aviso';
alter table notifications add column if not exists title text;
alter table notifications add column if not exists text text;
alter table notifications add column if not exists data jsonb;
alter table notifications add column if not exists read_at timestamptz;
alter table notifications add column if not exists created_at timestamptz;
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
alter table failure_reports add column if not exists user_id text references users(id) on delete cascade;
alter table failure_reports add column if not exists reservation_id integer references reservations(id) on delete set null;
alter table failure_reports add column if not exists space_id integer references spaces(id) on delete cascade;
alter table failure_reports add column if not exists resource_id integer references resources(id) on delete set null;
alter table failure_reports add column if not exists category text;
alter table failure_reports add column if not exists description text;
alter table failure_reports add column if not exists status text default 'abierta';
alter table failure_reports add column if not exists created_at timestamptz;

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
alter table plan_shapes add column if not exists floor integer default 1;
alter table plan_shapes add column if not exists x integer;
alter table plan_shapes add column if not exists y integer;
alter table plan_shapes add column if not exists w integer;
alter table plan_shapes add column if not exists h integer;
alter table plan_shapes add column if not exists z integer default 0;
alter table plan_shapes add column if not exists color text;
alter table plan_shapes add column if not exists text_color text;
alter table plan_shapes add column if not exists label text;
alter table plan_shapes add column if not exists kind text default 'libre';
alter table plan_shapes add column if not exists capacity integer default 0;
alter table plan_shapes add column if not exists space_id integer references spaces(id) on delete set null;
alter table plan_shapes add column if not exists group_id integer;

-- Históricos importados como estadística anónima (Power BI, Google Forms).
create table if not exists history_stats (
  id integer primary key,
  day date not null,
  space text not null,
  visits integer not null default 0,
  source text
);
alter table history_stats add column if not exists day date;
alter table history_stats add column if not exists space text;
alter table history_stats add column if not exists visits integer default 0;
alter table history_stats add column if not exists source text;

-- Correos por enviar o enviados (confirmaciones, códigos, avisos).
create table if not exists outbox (
  id integer primary key,
  to_email text not null,
  subject text not null,
  body text not null,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
alter table outbox add column if not exists to_email text;
alter table outbox add column if not exists subject text;
alter table outbox add column if not exists body text;
alter table outbox add column if not exists created_at timestamptz;
alter table outbox add column if not exists sent_at timestamptz;

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
alter table audit_log add column if not exists at timestamptz;
alter table audit_log add column if not exists actor_id text references users(id) on delete set null;
alter table audit_log add column if not exists action text;
alter table audit_log add column if not exists entity text;
alter table audit_log add column if not exists entity_id text;
alter table audit_log add column if not exists detail text;
create index if not exists audit_log_at_idx on audit_log (at);

-- Dos reservas activas no pueden ocupar el mismo equipo al mismo tiempo.
alter table reservations drop constraint if exists reservations_sin_solape;
alter table reservations add constraint reservations_sin_solape exclude using gist
  (resource_id with =, tstzrange(start_at, end_at) with &&)
  where (resource_id is not null and status in ('confirmada','en_revision','en_curso'));

-- Una persona no puede tener dos visitas abiertas a la vez.
create unique index if not exists visits_una_abierta on visits (user_id) where out_at is null;
