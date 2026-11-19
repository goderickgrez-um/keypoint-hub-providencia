// Crea las tablas y carga los datos iniciales.
//   node server/init-db.mjs --demo    datos de ejemplo (la demo para el Hub)
//   node server/init-db.mjs --clean   base limpia: espacios, máquinas y certificaciones del Hub, más la cuenta de administración
//   Agrega --reset para borrar antes todas las tablas.
import { pool, createSchema, isEmpty, insertAll } from './db.mjs';
import { TABLES } from '../src/core/schema.js';
import { seed } from '../src/core/seed.js';
import { hashPass } from '../src/core/services.js';

const args = process.argv.slice(2), demo = !args.includes('--clean');
if (args.includes('--reset')) { await pool.query(Object.keys(TABLES).reverse().map(t => `drop table if exists ${t} cascade;`).join('\n')); console.log('Tablas borradas.'); }
await createSchema(); console.log('Esquema listo.');
if (!(await isEmpty())) { console.log('La base ya tiene datos. Usa --reset para empezar de nuevo.'); process.exit(0); }
const data = await seed(new Date());
if (!demo) {
  const keepUsers = new Set(['HUB-00001']), pass = process.env.ADMIN_PASSWORD;
  if (!pass || pass.length < 10) { console.error('Define ADMIN_PASSWORD (mínimo 10 caracteres) en el archivo .env para crear la cuenta de administración.'); process.exit(1); }
  for (const t of ['reservations', 'reservation_guests', 'files', 'observations', 'visits', 'hour_adjustments', 'bans', 'event_attendance', 'cert_enrollments', 'notifications', 'failure_reports', 'outbox', 'audit_log', 'auth_codes', 'history_stats']) data[t] = [];
  data.users = data.users.filter(u => keepUsers.has(u.id)).map(u => ({ ...u, email: process.env.ADMIN_EMAIL || u.email, password_hash: null }));
  data.users[0].password_hash = await hashPass(pass);
  data.staff = data.staff.filter(s => keepUsers.has(s.user_id)); data.staff_roles = data.staff_roles.filter(s => keepUsers.has(s.user_id));
  data.user_certs = []; data.events = data.events.filter(e => e.kind === 'aviso');
  data.space_managers = []; data.certifications = data.certifications.map(c => ({ ...c, instructor_id: null }));
}
await insertAll(data);
console.log(demo ? `Datos de ejemplo cargados: ${data.users.length} usuarios, ${data.reservations.length} reservas, ${data.visits.length} visitas.` : 'Base limpia lista con la cuenta de administración.');
await pool.end();
