/**
 * Starts the Firebase Emulator Suite for local development (demo project — never
 * touches a real Firebase project).
 *
 *   node scripts/emulators.mjs [extra firebase flags]
 *
 * Windows fix: Java NIO opens its internal wake-up pipe as a Unix-domain socket in
 * %TEMP%. When %TEMP% uses an 8.3 short name (C:\Users\NAME~1\…) the connect fails
 * with "Unable to establish loopback connection" and the Firestore emulator exits.
 * Pointing jdk.net.unixdomain.tmpdir at a plain directory avoids it.
 */
import { spawn } from 'node:child_process';

const env = { ...process.env };
if (process.platform === 'win32') {
  const dir = env.PUBLIC || 'C:\\Users\\Public';
  env.JAVA_TOOL_OPTIONS = [env.JAVA_TOOL_OPTIONS, `-Djdk.net.unixdomain.tmpdir=${dir}`].filter(Boolean).join(' ');
}
env.FIREBASE_CLI_DISABLE_UPDATE_CHECK ??= 'true';

const args = [
  'firebase',
  '--non-interactive',
  'emulators:start',
  '--project',
  'demo-portfolio',
  ...process.argv.slice(2),
];
const child = spawn('npx', args, { stdio: 'inherit', env, shell: true });
child.on('exit', (code) => process.exit(code ?? 0));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
