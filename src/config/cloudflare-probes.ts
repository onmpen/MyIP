export interface CloudflareProbeDefinition {
  id: string;
  name: string;
  traceUrl: string;
  fallbackTraceUrl?: string;
}

function builtIn(
  name: string,
  hostname: string,
  fallbackHostname?: string,
): CloudflareProbeDefinition {
  return {
    id: cloudflareProbeId(hostname),
    name,
    traceUrl: traceUrl(hostname),
    fallbackTraceUrl: fallbackHostname ? traceUrl(fallbackHostname) : undefined,
  };
}

export const homeCloudflareProbeIds = ["chatgpt-com", "claude-ai", "grok-com"] as const;

export const builtInCloudflareProbes: CloudflareProbeDefinition[] = [
  builtIn("ChatGPT", "chatgpt.com"),
  builtIn("Claude", "claude.ai"),
  builtIn("Grok", "grok.com"),
  builtIn("高通中国", "www.qualcomm.cn"),
  builtIn("Discord", "discord.com", "gateway.discord.gg"),
  builtIn("X", "x.com"),
  builtIn("Medium", "medium.com"),
  builtIn("Anthropic", "anthropic.com"),
  builtIn("OpenAI", "openai.com"),
  builtIn("Sora", "sora.com"),
  builtIn("PixPix", "pixpix.com"),
  builtIn("Perplexity", "www.perplexity.ai"),
  builtIn("Midjourney", "midjourney.com"),
  builtIn("Coinbase", "coinbase.com"),
  builtIn("OKX", "www.okx.com"),
  builtIn("Crypto.com", "crypto.com"),
  builtIn("Zoom", "zoom.us"),
  builtIn("1Password", "1password.com"),
  builtIn("Wise", "wise.com"),
  builtIn("Notion", "notion.so"),
  builtIn("Shopify", "shopify.com"),
  builtIn("GoDaddy", "godaddy.com"),
  builtIn("Product Hunt", "producthunt.com"),
  builtIn("Cloudflare cdnjs", "cdnjs.cloudflare.com"),
  builtIn("npm registry", "registry.npmjs.org"),
  builtIn("Kali Download", "kali.download"),
  builtIn("unpkg", "unpkg.com"),
  builtIn("Node.js", "nodejs.org"),
  builtIn("GitLab", "gitlab.com"),
  builtIn("Crunchyroll", "crunchyroll.com"),
];

export function normalizeCloudflareProbeInput(input: string): Pick<CloudflareProbeDefinition, "name" | "traceUrl"> {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error("请输入域名或 Cloudflare Trace 地址");
  }

  const candidate = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw new Error("域名或地址格式无效");
  }

  if (url.protocol !== "https:") {
    throw new Error("仅支持 HTTPS 地址");
  }
  if (url.username || url.password || url.port || !isDomainName(url.hostname)) {
    throw new Error("域名或地址格式无效");
  }

  const normalizedPath = url.pathname.replace(/\/+$/, "") || "/";
  if (normalizedPath !== "/" && normalizedPath !== "/cdn-cgi/trace") {
    throw new Error("地址必须是域名或 /cdn-cgi/trace");
  }

  return {
    name: url.hostname.toLowerCase(),
    traceUrl: `${url.origin}/cdn-cgi/trace`,
  };
}

export function createCustomCloudflareProbe(input: string, name?: string): CloudflareProbeDefinition {
  const normalized = normalizeCloudflareProbeInput(input);
  return {
    id: cloudflareProbeId(new URL(normalized.traceUrl).hostname),
    ...normalized,
    name: name?.trim() || normalized.name,
  };
}

export function cloudflareProbeId(hostname: string): string {
  return hostname.toLowerCase().replace(/-/g, "_").replace(/\./g, "-");
}

function traceUrl(hostname: string): string {
  return `https://${hostname}/cdn-cgi/trace`;
}

function isDomainName(hostname: string): boolean {
  if (!hostname.includes(".") || /^\d+(?:\.\d+){3}$/.test(hostname)) {
    return false;
  }
  return hostname.split(".").every((label) => /^[a-z\d](?:[a-z\d-]*[a-z\d])?$/i.test(label));
}
