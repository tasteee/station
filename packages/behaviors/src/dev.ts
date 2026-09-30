/**
 * Dev-mode warnings. Bundlers replace `process.env.NODE_ENV`, so these
 * vanish from production builds. Each message prints once.
 */
const seen = new Set<string>();

declare const process: { env: { NODE_ENV?: string } } | undefined;

export function isDev(): boolean {
  try {
    return process?.env.NODE_ENV !== "production";
  } catch {
    return true;
  }
}

export function devWarn(message: string, element?: Element): void {
  if (!isDev() || seen.has(message)) return;
  seen.add(message);
  console.warn(`[station] ${message}`, ...(element ? [element] : []));
}
