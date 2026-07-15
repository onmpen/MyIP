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

export interface ProbeCardSection {
  title?: string;
  rows: ProbeCardConfig[][];
}

export const homeProbeCardSections: ProbeCardSection[] = [
  {
    rows: [[{ providerId: "webrtc", title: "从本机查询", source: "数据来自 WebRTC" }]],
  },
  {
    title: "国内网站出口",
    rows: [
      [
        { providerId: "netease-cdn", title: "从国内网站查询", source: "数据来自 网易 CDN" },
        { providerId: "bytedance-cn", title: "从国内网站查询", source: "数据来自 字节跳动" },
        { providerId: "pchome", title: "从国内网站查询", source: "数据来自 PChome" },
      ],
    ],
  },
  {
    title: "国内 IP 查询",
    rows: [
      [
        { providerId: "cn-ipv4", title: "从国内网站查询", source: "数据来自 ip.cn" },
        { providerId: "ipipnet", title: "从国内网站查询", source: "数据来自 ipip.net" },
        { providerId: "uapipro", title: "从国内网站查询", source: "数据来自 UApiPro" },
      ],
    ],
  },
  {
    title: "海外 AI 服务",
    rows: [
      [
        { providerId: "chatgpt-com", title: "从国外网站查询", source: "数据来自 ChatGPT" },
        { providerId: "claude-ai", title: "从国外网站查询", source: "数据来自 Claude" },
        { providerId: "grok-com", title: "从国外网站查询", source: "数据来自 Grok" },
      ],
    ],
  },
  {
    title: "海外 IP 查询",
    rows: [
      [
        { providerId: "ip-sb", title: "从国外网站查询", source: "数据来自 ip.sb" },
        { providerId: "ipapi", title: "从国外网站查询", source: "数据来自 ipapi.co" },
        { providerId: "ipbase", title: "从国外网站查询", source: "数据来自 ipbase.com" },
      ],
    ],
  },
];

export const homeProbeCardRows = homeProbeCardSections.flatMap((section) => section.rows);
export const homeProbeCardConfigs = homeProbeCardRows.flat();

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
    "claude-ai": "claude",
    webrtc: "webrtc",
    ipipnet: "ipipnet",
    pchome: "pchome",
    "ip-sb": "ipsb",
    ipapi: "ipapi",
    ipbase: "ipbase",
  };

  return targetByProviderId[providerId] || providerId.replace(/[^a-z0-9_-]+/gi, "-").replace(/^-|-$/g, "");
}
