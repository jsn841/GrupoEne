/* Envío de cada promoción a una base de datos Supabase para el análisis del equipo.
 *
 * Mientras url o key estén vacíos, NO se envía nada: el botón del asistente dice
 * «Crear promoción» y la herramienta funciona igual que siempre.
 * En cuanto rellenes url y key, el botón pasa a «Crear y enviar para el análisis» y,
 * al crear una promoción, se inserta una copia en la tabla indicada.
 *
 * Cómo activarlo (gratis):
 *   1. Crea un proyecto en https://supabase.com (plan gratuito).
 *   2. En «SQL Editor» pega y ejecuta:
 *        create table promociones (
 *          id bigint generated always as identity primary key,
 *          nombre text,
 *          creada timestamptz,
 *          datos jsonb,
 *          resultados jsonb,
 *          recibido timestamptz default now()
 *        );
 *        alter table promociones enable row level security;
 *        -- solo permite INSERTAR con la clave pública; NADIE puede leer con ella
 *        create policy "insertar con anon" on promociones for insert to anon with check (true);
 *      Así los datos no son públicos: para leerlos (los jefes) se usa la consola de
 *      Supabase o la clave de servicio, nunca la clave pública que va aquí.
 *   3. En «Project Settings → API» copia la «Project URL» y la clave «anon public»
 *      y pégalas abajo.
 */
window.ENVIO = {
  url: 'https://ejotwiulkqknbwuudplt.supabase.co',   // Project URL
  key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqb3R3aXVsa3FrbmJ3dXVkcGx0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3NDI5MTIsImV4cCI6MjEwODMxODkxMn0.k0qtOa-FmQ0IO_NImkwcGci4EWaZnmSbBJl1P51OZdo',   // clave pública «anon»
  tabla: 'promociones',
};
