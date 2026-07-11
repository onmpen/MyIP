export interface ProbeCardConfig {
  providerId: string;
  title: string;
  source: string;
}

export interface ConnectivityCardConfig {
  checkId: string;
  title: string;
  source: string;
}

export interface ProbeCardTarget {
  ip: string;
  geo: string;
}

export const probeCardRows: ProbeCardConfig[][] = [
  [
    { providerId: "webrtc", title: "从本机查询", source: "数据来自 WebRTC" },
    { providerId: "cn-ipv4", title: "从国内网站查询", source: "数据来自 IP.cn" },
    { providerId: "pchome", title: "从国内网站查询", source: "数据来自 PChome" },
  ],
  [
    { providerId: "ipipnet", title: "从国内网站查询", source: "数据来自 IPIP.net" },
    { providerId: "netease-cdn", title: "从国内网站查询", source: "数据来自 网易 CDN" },
    { providerId: "bytedance-cn", title: "从国内网站查询", source: "数据来自 字节跳动" },
  ],
  [
    { providerId: "qualcomm-cn-trace", title: "从国内网站查询", source: "数据来自 高通中国" },
    { providerId: "bytedance-global", title: "从国外网站查询", source: "数据来自 字节跳动" },
  ],
  [
    { providerId: "cloudflare-trace", title: "从国外网站查询", source: "数据来自 1.1.1.1" },
    { providerId: "cloudflare-www-trace", title: "从国外网站查询", source: "数据来自 cloudflare.com" },
    { providerId: "cdnjs-trace", title: "从国外网站查询", source: "数据来自 cdnjs" },
  ],
  [
    { providerId: "discord-trace", title: "从国外网站查询", source: "数据来自 Discord" },
    { providerId: "x-trace", title: "从国外网站查询", source: "数据来自 X" },
    { providerId: "medium-trace", title: "从国外网站查询", source: "数据来自 Medium" },
  ],
  [
    { providerId: "anthropic-trace", title: "从国外网站查询", source: "数据来自 Anthropic" },
    { providerId: "claude-trace", title: "从国外网站查询", source: "数据来自 Claude" },
    { providerId: "chatgpt-trace", title: "从国外网站查询", source: "数据来自 ChatGPT" },
  ],
  [
    { providerId: "openai-trace", title: "从国外网站查询", source: "数据来自 OpenAI" },
    { providerId: "sora-trace", title: "从国外网站查询", source: "数据来自 Sora" },
    { providerId: "grok-trace", title: "从国外网站查询", source: "数据来自 Grok" },
  ],
  [
    { providerId: "pixpix-trace", title: "从国外网站查询", source: "数据来自 PixPix" },
    { providerId: "perplexity-trace", title: "从国外网站查询", source: "数据来自 Perplexity" },
    { providerId: "midjourney-trace", title: "从国外网站查询", source: "数据来自 Midjourney" },
  ],
  [
    { providerId: "coinbase-trace", title: "从国外网站查询", source: "数据来自 Coinbase" },
    { providerId: "okx-trace", title: "从国外网站查询", source: "数据来自 OKX" },
    { providerId: "crypto-trace", title: "从国外网站查询", source: "数据来自 Crypto.com" },
  ],
  [
    { providerId: "zoom-trace", title: "从国外网站查询", source: "数据来自 Zoom" },
    { providerId: "onepassword-trace", title: "从国外网站查询", source: "数据来自 1Password" },
    { providerId: "wise-trace", title: "从国外网站查询", source: "数据来自 Wise" },
  ],
  [
    { providerId: "notion-trace", title: "从国外网站查询", source: "数据来自 Notion" },
    { providerId: "shopify-trace", title: "从国外网站查询", source: "数据来自 Shopify" },
    { providerId: "godaddy-trace", title: "从国外网站查询", source: "数据来自 GoDaddy" },
  ],
  [
    { providerId: "producthunt-trace", title: "从国外网站查询", source: "数据来自 Product Hunt" },
    { providerId: "npm-trace", title: "从国外网站查询", source: "数据来自 npm registry" },
    { providerId: "kali-trace", title: "从国外网站查询", source: "数据来自 Kali" },
  ],
  [
    { providerId: "unpkg-trace", title: "从国外网站查询", source: "数据来自 unpkg" },
    { providerId: "nodejs-trace", title: "从国外网站查询", source: "数据来自 Node.js" },
    { providerId: "gitlab-trace", title: "从国外网站查询", source: "数据来自 GitLab" },
  ],
  [
    { providerId: "crunchyroll-trace", title: "从国外网站查询", source: "数据来自 Crunchyroll" },
    { providerId: "ip-sb", title: "从国外网站查询", source: "数据来自 IP.SB" },
    { providerId: "ipify", title: "从国外网站查询", source: "数据来自 ipify" },
  ],
  [
    { providerId: "ipapi", title: "从国外网站查询", source: "数据来自 ipapi" },
  ],
];

export const connectivityCardConfigs: ConnectivityCardConfig[] = [
  { checkId: "baidu", title: "百度搜索", source: "国内网站" },
  { checkId: "netease-music", title: "网易云音乐", source: "国内网站" },
  { checkId: "github", title: "GitHub", source: "国外网站" },
  { checkId: "youtube", title: "YouTube", source: "海外网站" },
];

export function probeCardTarget(providerId: string): ProbeCardTarget {
  const domId = providerDomId(providerId);
  return {
    ip: `ip-${domId}`,
    geo: `ip-${domId}-geo`,
  };
}

export function connectivityCardTarget(checkId: string): string {
  const targetByCheckId: Record<string, string> = {
    baidu: "http-baidu",
    "netease-music": "http-163",
    github: "http-github",
    youtube: "http-youtube",
  };

  return targetByCheckId[checkId] || `http-${checkId}`;
}

function providerDomId(providerId: string): string {
  const targetByProviderId: Record<string, string> = {
    "cn-ipv4": "cn-ipv4",
    "cloudflare-trace": "cloudflare",
    "claude-trace": "claude",
    webrtc: "webrtc",
    ipipnet: "ipipnet",
    pchome: "pchome",
    "ip-sb": "ipsb",
    ipify: "ipify",
    ipapi: "ipapi",
  };

  return targetByProviderId[providerId] || providerId.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
}
