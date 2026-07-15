import {
  type CloudflareProbeDefinition,
  builtInCloudflareProbes,
  cloudflareProbeId,
  normalizeCloudflareProbeInput,
} from "./cloudflare-probes";

interface StoredCloudflarePreference {
  version: 1;
  probes: CloudflareProbeDefinition[];
}

const storageKey = "myip.cloudflare.preference.v1";
export const maxCloudflareProbeCount = 100;

export function defaultCloudflareProbes(): CloudflareProbeDefinition[] {
  return builtInCloudflareProbes.map((probe) => ({ ...probe }));
}

export function parseCloudflareProbes(raw: string | null): CloudflareProbeDefinition[] {
  if (!raw) {
    return defaultCloudflareProbes();
  }

  try {
    const stored = JSON.parse(raw) as Partial<StoredCloudflarePreference>;
    if (stored.version !== 1 || !Array.isArray(stored.probes)) {
      return defaultCloudflareProbes();
    }

    const seenIds = new Set<string>();
    const seenUrls = new Set<string>();
    const probes: CloudflareProbeDefinition[] = [];
    for (const candidate of stored.probes.slice(0, maxCloudflareProbeCount)) {
      if (!candidate || typeof candidate.traceUrl !== "string") {
        continue;
      }
      let normalized: ReturnType<typeof normalizeCloudflareProbeInput>;
      try {
        normalized = normalizeCloudflareProbeInput(candidate.traceUrl);
      } catch {
        continue;
      }
      const id = cloudflareProbeId(new URL(normalized.traceUrl).hostname);
      if (seenIds.has(id) || seenUrls.has(normalized.traceUrl)) {
        continue;
      }
      const fallbackTraceUrl = normalizeFallback(candidate.fallbackTraceUrl);
      probes.push({
        id,
        name: typeof candidate.name === "string" && candidate.name.trim() ? candidate.name.trim() : normalized.name,
        traceUrl: normalized.traceUrl,
        fallbackTraceUrl,
      });
      seenIds.add(id);
      seenUrls.add(normalized.traceUrl);
    }
    return probes;
  } catch {
    return defaultCloudflareProbes();
  }
}

export function loadCloudflareProbes(): CloudflareProbeDefinition[] {
  try {
    return parseCloudflareProbes(window.localStorage.getItem(storageKey));
  } catch {
    return defaultCloudflareProbes();
  }
}

export function saveCloudflareProbes(probes: CloudflareProbeDefinition[]): boolean {
  if (probes.length > maxCloudflareProbeCount) {
    return false;
  }
  const preference: StoredCloudflarePreference = { version: 1, probes };
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(preference));
    return true;
  } catch {
    return false;
  }
}

export function clearCloudflareProbes(): boolean {
  try {
    window.localStorage.removeItem(storageKey);
    return true;
  } catch {
    return false;
  }
}

function normalizeFallback(input: unknown): string | undefined {
  if (typeof input !== "string" || !input) {
    return undefined;
  }
  try {
    return normalizeCloudflareProbeInput(input).traceUrl;
  } catch {
    return undefined;
  }
}
