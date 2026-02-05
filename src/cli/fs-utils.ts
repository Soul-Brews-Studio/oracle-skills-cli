import { existsSync, mkdirSync, rmSync, cpSync, renameSync, copyFileSync } from 'fs';
import { $ } from 'bun';

export type ShellMode = 'auto' | 'shell' | 'no-shell';

const isWindows = process.platform === 'win32';

function useShell(mode: ShellMode): boolean {
  if (mode === 'shell') return true;
  if (mode === 'no-shell') return false;
  // auto: shell on Unix, fs on Windows
  return !isWindows;
}

export async function mkdirp(dir: string, mode: ShellMode = 'auto'): Promise<void> {
  if (useShell(mode)) {
    await $`mkdir -p ${dir}`.quiet();
  } else {
    mkdirSync(dir, { recursive: true });
  }
}

export async function rmrf(path: string, mode: ShellMode = 'auto'): Promise<void> {
  if (!existsSync(path)) return;
  if (useShell(mode)) {
    await $`rm -rf ${path}`.quiet();
  } else {
    rmSync(path, { recursive: true, force: true });
  }
}

export async function cpr(src: string, dest: string, mode: ShellMode = 'auto'): Promise<void> {
  if (useShell(mode)) {
    await $`cp -r ${src} ${dest}`.quiet();
  } else {
    cpSync(src, dest, { recursive: true });
  }
}

export async function mv(src: string, dest: string, mode: ShellMode = 'auto'): Promise<void> {
  if (useShell(mode)) {
    await $`mv ${src} ${dest}`.quiet();
  } else {
    renameSync(src, dest);
  }
}

export async function rmf(path: string, mode: ShellMode = 'auto'): Promise<void> {
  if (!existsSync(path)) return;
  if (useShell(mode)) {
    await $`rm -f ${path}`.quiet();
  } else {
    rmSync(path, { force: true });
  }
}

export async function cp(src: string, dest: string, mode: ShellMode = 'auto'): Promise<void> {
  if (useShell(mode)) {
    await $`cp ${src} ${dest}`.quiet();
  } else {
    copyFileSync(src, dest);
  }
}
