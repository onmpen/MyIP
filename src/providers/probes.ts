import { cacheBust, fetchJson, fetchText, loadScript, RequestError } from "../lib/http";
import { errorMessage, measure } from "../lib/timing";
import type { GeoResult, ProbeProvider, ProbeResult } from "../types";
import {
  type IpSbResponse,
  type IpapiResponse,
  type PchomeResponse,
  normalizeIpSbGeo,
  normalizeIpapiGeo,
  parseCloudflareTrace,
  parseIpCnText,
  parseIpipNetText,
  parsePchomeResponse,
} from "./parsers";

declare global {
  interface Window {
    webkitRTCPeerConnection?: typeof RTCPeerConnection;
  }
}

function embeddedGeo(providerId: string, locationText: string, raw?: unknown): GeoResult {
  return {
    providerId,
    locationText,
    raw,
    status: "success",
    durationMs: 0,
  };
}

function failure(providerId: string, durationMs: number, error: unknown): ProbeResult {
  return {
    providerId,
    status: "error",
    durationMs,
    error: errorMessage(error),
  };
}

export const probeProviders: ProbeProvider[] = [
  {
    id: "cn-ipv4",
    name: "中国出口 IPv4",
    group: "国内",
    homepage: "https://my.ip.cn/",
    description: "从国内 IP 查询站点获取当前中国出口 IPv4。",
    async query() {
      const startedAt = performance.now();
      try {
        const { value, durationMs } = await measure(fetchCnIp);
        return {
          providerId: "cn-ipv4",
          ip: value.ip,
          geo: embeddedGeo("cn-ipv4", value.locationText, value.raw),
          raw: value.raw,
          status: "success",
          durationMs,
        };
      } catch (error) {
        return failure("cn-ipv4", Math.round(performance.now() - startedAt), error);
      }
    },
  },
  {
    id: "cloudflare-trace",
    name: "Cloudflare 出口 IP",
    group: "海外",
    homepage: "https://1.1.1.1/cdn-cgi/trace",
    description: "从 1.1.1.1 的 Cloudflare trace 获取访问 Cloudflare 时的出口 IP。",
    async query() {
      return traceProbe("cloudflare-trace", "https://1.1.1.1/cdn-cgi/trace");
    },
  },
  ...cloudflareTraceProviders([
    ["cloudflare-cn-trace", "Cloudflare 中国", "国内", "www.qualcomm.cn", "从 www.qualcomm.cn 的 Cloudflare trace 获取访问 Cloudflare 中国节点时的出口 IP。"],
    ["qualcomm-cn-trace", "高通中国", "国内", "www.qualcomm.cn", "从 www.qualcomm.cn 的 Cloudflare trace 获取访问高通中国时的出口 IP。"],
  ]),
  {
    id: "netease-cdn",
    name: "网易",
    group: "国内",
    homepage: "https://necaptcha.nosdn.127.net/",
    description: "从网易验证码 CDN 的响应头获取出口 IP。",
    async query() {
      return headerProbe("netease-cdn", "https://necaptcha.nosdn.127.net/ab7f4275c1744aa28e0a8f3a1c58c532.png", [
        "cdn-user-ip",
      ]);
    },
  },
  {
    id: "bytedance-cn",
    name: "字节跳动",
    group: "国内",
    homepage: "https://perfops.byte-test.com/",
    description: "从字节跳动 perfops 测试资源响应头获取出口 IP。",
    async query() {
      return headerProbe("bytedance-cn", "https://perfops.byte-test.com/500b-bench.jpg", ["x-request-ip", "x-response-cinfo"]);
    },
  },
  {
    id: "bytedance-global",
    name: "字节跳动",
    group: "海外",
    homepage: "https://perfops2.byte-test.com/",
    description: "从字节跳动 perfops2 测试资源响应头获取出口 IP。",
    async query() {
      return headerProbe("bytedance-global", "https://perfops2.byte-test.com/500b-bench.jpg", ["x-request-ip", "x-response-cinfo"]);
    },
  },
  {
    id: "claude-trace",
    name: "Claude AI 出口 IP",
    group: "海外",
    homepage: "https://claude.ai/cdn-cgi/trace",
    description: "从 claude.ai 的 Cloudflare trace 获取访问 Claude AI 时的出口 IP。",
    async query() {
      return traceProbe("claude-trace", "https://claude.ai/cdn-cgi/trace");
    },
  },
  ...cloudflareTraceProviders([
    ["discord-trace", "Discord", "海外", "discord.com", "从 discord.com 的 Cloudflare trace 获取出口 IP。", "gateway.discord.gg"],
    ["x-trace", "X", "海外", "x.com", "从 x.com 的 Cloudflare trace 获取出口 IP。"],
    ["medium-trace", "Medium", "海外", "medium.com", "从 medium.com 的 Cloudflare trace 获取出口 IP。"],
    ["anthropic-trace", "Anthropic", "海外", "anthropic.com", "从 anthropic.com 的 Cloudflare trace 获取出口 IP。"],
    ["chatgpt-trace", "ChatGPT", "海外", "chatgpt.com", "从 chatgpt.com 的 Cloudflare trace 获取出口 IP。"],
    ["openai-trace", "OpenAI", "海外", "openai.com", "从 openai.com 的 Cloudflare trace 获取出口 IP。"],
    ["sora-trace", "Sora", "海外", "sora.com", "从 sora.com 的 Cloudflare trace 获取出口 IP。"],
    ["grok-trace", "Grok", "海外", "grok.com", "从 grok.com 的 Cloudflare trace 获取出口 IP。"],
    ["pixpix-trace", "PixPix", "海外", "pixpix.com", "从 pixpix.com 的 Cloudflare trace 获取出口 IP。"],
    ["perplexity-trace", "Perplexity", "海外", "www.perplexity.ai", "从 www.perplexity.ai 的 Cloudflare trace 获取出口 IP。"],
    ["midjourney-trace", "Midjourney", "海外", "midjourney.com", "从 midjourney.com 的 Cloudflare trace 获取出口 IP。"],
    ["coinbase-trace", "Coinbase", "海外", "coinbase.com", "从 coinbase.com 的 Cloudflare trace 获取出口 IP。"],
    ["okx-trace", "OKX", "海外", "www.okx.com", "从 www.okx.com 的 Cloudflare trace 获取出口 IP。"],
    ["crypto-trace", "Crypto.com", "海外", "crypto.com", "从 crypto.com 的 Cloudflare trace 获取出口 IP。"],
    ["zoom-trace", "Zoom", "海外", "zoom.us", "从 zoom.us 的 Cloudflare trace 获取出口 IP。"],
    ["onepassword-trace", "1Password", "海外", "1password.com", "从 1password.com 的 Cloudflare trace 获取出口 IP。"],
    ["wise-trace", "Wise", "海外", "wise.com", "从 wise.com 的 Cloudflare trace 获取出口 IP。"],
    ["notion-trace", "Notion", "海外", "notion.so", "从 notion.so 的 Cloudflare trace 获取出口 IP。"],
    ["shopify-trace", "Shopify", "海外", "shopify.com", "从 shopify.com 的 Cloudflare trace 获取出口 IP。"],
    ["godaddy-trace", "GoDaddy", "海外", "godaddy.com", "从 godaddy.com 的 Cloudflare trace 获取出口 IP。"],
    ["producthunt-trace", "Product Hunt", "海外", "producthunt.com", "从 producthunt.com 的 Cloudflare trace 获取出口 IP。"],
    ["cloudflare-www-trace", "Cloudflare", "海外", "www.cloudflare.com", "从 www.cloudflare.com 的 Cloudflare trace 获取出口 IP。"],
    ["cdnjs-trace", "Cloudflare cdnjs", "海外", "cdnjs.cloudflare.com", "从 cdnjs.cloudflare.com 的 Cloudflare trace 获取出口 IP。"],
    ["npm-trace", "npm registry", "海外", "registry.npmjs.org", "从 registry.npmjs.org 的 Cloudflare trace 获取出口 IP。"],
    ["kali-trace", "Kali Download", "海外", "kali.download", "从 kali.download 的 Cloudflare trace 获取出口 IP。"],
    ["unpkg-trace", "unpkg", "海外", "unpkg.com", "从 unpkg.com 的 Cloudflare trace 获取出口 IP。"],
    ["nodejs-trace", "Node.js", "海外", "nodejs.org", "从 nodejs.org 的 Cloudflare trace 获取出口 IP。"],
    ["gitlab-trace", "GitLab", "海外", "gitlab.com", "从 gitlab.com 的 Cloudflare trace 获取出口 IP。"],
    ["crunchyroll-trace", "Crunchyroll", "海外", "crunchyroll.com", "从 crunchyroll.com 的 Cloudflare trace 获取出口 IP。"],
  ]),
  {
    id: "webrtc",
    name: "WebRTC",
    group: "本机",
    homepage: "https://developer.mozilla.org/docs/Web/API/WebRTC_API",
    description: "从本机 WebRTC ICE candidate 中尝试读取本地泄露 IP。",
    async query() {
      const startedAt = performance.now();
      try {
        const ip = await getWebrtcIp();
        return {
          providerId: "webrtc",
          ip,
          geo: embeddedGeo("webrtc", "WebRTC Leaked IP"),
          status: "success",
          durationMs: Math.round(performance.now() - startedAt),
        };
      } catch (error) {
        return failure("webrtc", Math.round(performance.now() - startedAt), error);
      }
    },
  },
  {
    id: "pchome",
    name: "PChome",
    group: "国内",
    homepage: "https://whois.pconline.com.cn/",
    description: "从 PChome 查询当前出口 IP 和归属信息。",
    async query() {
      const startedAt = performance.now();
      try {
        const { value, durationMs } = await measure(fetchPchomeIp);
        return {
          providerId: "pchome",
          ip: value.ip,
          geo: embeddedGeo("pchome", value.locationText, value.raw),
          raw: value.raw,
          status: "success",
          durationMs,
        };
      } catch (error) {
        return failure("pchome", Math.round(performance.now() - startedAt), error);
      }
    },
  },
  {
    id: "ipipnet",
    name: "IPIP.net",
    group: "国内",
    homepage: "https://myip.ipip.net/",
    description: "从 IPIP.net 查询当前访问该服务时的出口 IP。",
    async query() {
      const startedAt = performance.now();
      try {
        const { value: text, durationMs } = await measure(() => fetchText("https://myip.ipip.net/"));
        const parsed = parseIpipNetText(text);
        return {
          providerId: "ipipnet",
          ip: parsed.ip,
          geo: embeddedGeo("ipipnet", parsed.locationText, text),
          raw: text,
          status: "success",
          durationMs,
        };
      } catch (error) {
        return failure("ipipnet", Math.round(performance.now() - startedAt), error);
      }
    },
  },
  {
    id: "ip-sb",
    name: "IP.SB",
    group: "海外",
    homepage: "https://ip.sb/",
    description: "从 IP.SB 查询出口 IP 和内置归属信息。",
    async query() {
      const startedAt = performance.now();
      try {
        const { value: data, durationMs } = await measure(() => fetchJson<IpSbResponse>("https://api.ip.sb/geoip"));
        if (!data.ip) {
          throw new Error("IP.SB 未返回 IP");
        }
        return {
          providerId: "ip-sb",
          ip: data.ip,
          geo: { ...normalizeIpSbGeo(data), durationMs },
          raw: data,
          status: "success",
          durationMs,
        };
      } catch (error) {
        return failure("ip-sb", Math.round(performance.now() - startedAt), error);
      }
    },
  },
  {
    id: "ipify",
    name: "ipify",
    group: "海外",
    homepage: "https://www.ipify.org/",
    description: "从 ipify 获取出口 IP。",
    async query() {
      const startedAt = performance.now();
      try {
        const { value: data, durationMs } = await measure(() => fetchJson<{ ip?: string }>("https://api.ipify.org/?format=json"));
        if (!data.ip) {
          throw new Error("ipify 未返回 IP");
        }
        return {
          providerId: "ipify",
          ip: data.ip,
          raw: data,
          status: "success",
          durationMs,
        };
      } catch (error) {
        return failure("ipify", Math.round(performance.now() - startedAt), error);
      }
    },
  },
  {
    id: "ipapi",
    name: "ipapi",
    group: "海外",
    homepage: "https://ipapi.co/",
    description: "从 ipapi 查询出口 IP 和内置归属信息。",
    async query() {
      const startedAt = performance.now();
      try {
        const { value: data, durationMs } = await measure(() => fetchJson<IpapiResponse>("https://ipapi.co/json"));
        if (!data.ip) {
          throw new Error("ipapi 未返回 IP");
        }
        return {
          providerId: "ipapi",
          ip: data.ip,
          geo: { ...normalizeIpapiGeo(data), durationMs },
          raw: data,
          status: "success",
          durationMs,
        };
      } catch (error) {
        return failure("ipapi", Math.round(performance.now() - startedAt), error);
      }
    },
  },
];

type TraceProviderConfig = [
  id: string,
  name: string,
  group: ProbeProvider["group"],
  domain: string,
  description: string,
  fallbackDomain?: string,
];

function cloudflareTraceProviders(configs: TraceProviderConfig[]): ProbeProvider[] {
  return configs.map(([id, name, group, domain, description, fallbackDomain]) => ({
    id,
    name,
    group,
    homepage: `https://${domain}/cdn-cgi/trace`,
    description,
    async query() {
      const primaryUrl = `https://${domain}/cdn-cgi/trace`;
      const fallbackUrl = fallbackDomain ? `https://${fallbackDomain}/cdn-cgi/trace` : undefined;
      return traceProbe(id, primaryUrl, fallbackUrl);
    },
  }));
}

async function traceProbe(providerId: string, url: string, fallbackUrl?: string): Promise<ProbeResult> {
  const startedAt = performance.now();
  try {
    const { value: text, durationMs } = await measure(() => fetchText(url, 5000));
    const parsed = parseCloudflareTrace(text);
    return {
      providerId,
      ip: parsed.ip,
      geo: embeddedGeo(providerId, traceLocationText(parsed.colo, parsed.locationCode), parsed.raw),
      raw: parsed.raw,
      status: "success",
      durationMs,
    };
  } catch (error) {
    if (fallbackUrl) {
      try {
        const { value: text, durationMs } = await measure(() => fetchText(fallbackUrl, 5000));
        const parsed = parseCloudflareTrace(text);
        return {
          providerId,
          ip: parsed.ip,
          geo: embeddedGeo(providerId, traceLocationText(parsed.colo, parsed.locationCode), parsed.raw),
          raw: parsed.raw,
          status: "success",
          durationMs: Math.round(performance.now() - startedAt) || durationMs,
        };
      } catch {
        // Report the original domain failure below; the fallback is only a rescue path.
      }
    }
    return failure(providerId, Math.round(performance.now() - startedAt), error);
  }
}

async function headerProbe(providerId: string, url: string, headerNames: string[]): Promise<ProbeResult> {
  const startedAt = performance.now();
  try {
    const { value: response, durationMs } = await measure(() => fetchHead(url, 5000));
    const rawHeaders = Object.fromEntries(headerNames.map((name) => [name, response.headers.get(name)]));
    const headerValue = headerNames.map((name) => response.headers.get(name)).find(Boolean);
    const ip = extractIp(headerValue || "");
    if (!ip) {
      throw new Error("响应头未返回 IP");
    }
    return {
      providerId,
      ip,
      raw: rawHeaders,
      status: "success",
      durationMs,
    };
  } catch (error) {
    return failure(providerId, Math.round(performance.now() - startedAt), error);
  }
}

async function fetchHead(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(cacheBust(url), {
      method: "HEAD",
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new RequestError(`HTTP ${response.status}`, response.status);
    }
    return response;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new RequestError("请求超时");
    }
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

function extractIp(value: string): string | undefined {
  return /([0-9]{1,3}(?:\.[0-9]{1,3}){3}|[a-f0-9]{1,4}(?::[a-f0-9]{1,4}){2,7})/i.exec(value)?.[1];
}

function traceLocationText(colo?: string, locationCode?: string): string {
  const coloNameByCode: Record<string, string> = {
    SJC: "San Jose",
  };
  const normalizedColo = colo?.toUpperCase();
  if (normalizedColo) {
    return `Cloudflare ${coloNameByCode[normalizedColo] || normalizedColo} (${normalizedColo})`;
  }
  return locationCode ? `Cloudflare ${locationCode.toUpperCase()}` : "未知归属";
}

async function fetchCnIp(): Promise<{ ip: string; locationText: string; raw: string; source: string }> {
  try {
    const text = await fetchText("https://my.ip.cn/", 5000);
    return {
      ...parseIpCnText(text),
      raw: text,
      source: "IP.cn",
    };
  } catch {
    // Fall back to IP138 if IP.cn is unavailable.
  }

  try {
    const text = await fetchText("https://2026.ip138.com/", 5000);
    const match = text.match(/(\d+\.\d+\.\d+\.\d+)/);
    if (match?.[1]) {
      return {
        ip: match[1],
        locationText: "未知归属",
        raw: text,
        source: "IP138",
      };
    }
  } catch {
    // IP138 may redirect or reject cross-origin requests.
  }

  throw new Error("中国出口 IPv4 获取失败");
}

async function fetchPchomeIp(): Promise<{ ip: string; locationText: string; raw: PchomeResponse; source: string }> {
  const callbackName = `__myipPchome${Date.now()}${Math.floor(Math.random() * 100000)}`;

  try {
    const data = await new Promise<PchomeResponse>((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        cleanup();
        reject(new Error("PChome 请求超时"));
      }, 8000);

      function cleanup() {
        window.clearTimeout(timeout);
        Reflect.deleteProperty(window, callbackName);
      }

      Object.defineProperty(window, callbackName, {
        configurable: true,
        value: (payload: PchomeResponse) => {
          cleanup();
          resolve(payload);
        },
      });

      loadScript(`https://whois.pconline.com.cn/ipJson.jsp?callback=${callbackName}`, 8000, {
        charset: "GBK",
        referrerPolicy: "no-referrer",
      }).catch((error: unknown) => {
        cleanup();
        reject(error);
      });
    });
    return {
      ...parsePchomeResponse(data),
      raw: data,
      source: "PChome",
    };
  } finally {
    Reflect.deleteProperty(window, callbackName);
  }
}

function getWebrtcIp(timeoutMs = 3000): Promise<string> {
  return new Promise((resolve, reject) => {
    const PeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection;
    if (!PeerConnection) {
      reject(new Error("N/A"));
      return;
    }

    const connection = new PeerConnection({ iceServers: [] });
    const timer = window.setTimeout(() => {
      connection.close();
      reject(new Error("N/A"));
    }, timeoutMs);

    connection.createDataChannel("");
    connection
      .createOffer()
      .then((offer) => connection.setLocalDescription(offer))
      .catch(() => {
        window.clearTimeout(timer);
        connection.close();
        reject(new Error("N/A"));
      });

    connection.onicecandidate = (event) => {
      const candidate = event.candidate?.candidate;
      if (!candidate) {
        return;
      }

      const match = /([0-9]{1,3}(\.[0-9]{1,3}){3}|[a-f0-9]{1,4}(:[a-f0-9]{1,4}){7})/i.exec(candidate);
      if (match?.[1]) {
        window.clearTimeout(timer);
        connection.onicecandidate = null;
        connection.close();
        resolve(match[1]);
      }
    };
  });
}
