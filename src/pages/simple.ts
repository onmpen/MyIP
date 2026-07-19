import "../styles.css";
import { connectivityChecks, runConnectivityCheckTwice } from "../providers/connectivity";
import { probeProviders } from "../providers/probes";
import type { ConnectivityResult, ProbeResult } from "../types";
import { requireElement } from "../ui/dom";

const probeTargets: Record<string, { ip: string; geo?: string; enabledInSimple: boolean }> = {
  webrtc: { ip: "ip-webrtc", geo: "ip-webrtc-geo", enabledInSimple: false },
  ipipnet: { ip: "ip-ipipnet", enabledInSimple: true },
  "cn-ipv4": { ip: "ip-cn-ipv4", geo: "ip-cn-ipv4-geo", enabledInSimple: true },
  "ip-sb": { ip: "ip-ipsb", geo: "ip-ipsb-geo", enabledInSimple: true },
  ipapi: { ip: "ip-ipapi", geo: "ip-ipapi-geo", enabledInSimple: true },
};

const connectivityTargets: Record<string, string> = {
  baidu: "http-baidu",
  "netease-music": "http-163",
  github: "http-github",
  youtube: "http-youtube",
};

for (const target of Object.values(probeTargets)) {
  if (!target.enabledInSimple) {
    continue;
  }
  setText(target.ip, "检测中");
  if (target.geo) {
    setText(target.geo, "");
  }
}

for (const target of Object.values(connectivityTargets)) {
  setText(target, "检测中");
}

for (const provider of probeProviders) {
  const target = probeTargets[provider.id];
  if (target?.enabledInSimple) {
    void provider.query().then(renderProbeResult);
  }
}

for (const check of connectivityChecks) {
  void runConnectivityCheckTwice(check, renderConnectivityResult);
}

function renderProbeResult(result: ProbeResult): void {
  const target = probeTargets[result.providerId];
  if (!target?.enabledInSimple) {
    return;
  }

  if (result.providerId === "ipipnet") {
    setText(target.ip, result.status === "success" ? `${result.ip || ""} ${result.geo?.locationText || ""}` : result.error || "查询失败");
    return;
  }

  setText(target.ip, result.status === "success" ? result.ip || "N/A" : "N/A");
  if (target.geo) {
    setText(target.geo, result.status === "success" ? result.geo?.locationText || "" : result.error || "查询失败");
  }
}

function renderConnectivityResult(result: ConnectivityResult): void {
  const target = connectivityTargets[result.checkId];
  if (!target) {
    return;
  }

  const text =
    result.status === "success"
      ? `<span class="sk-text-success">连接正常 · ${result.durationMs}ms</span>`
      : `<span class="sk-text-error">${result.error || "无法访问"}</span>`;
  requireElement<HTMLElement>(`#${target}`).innerHTML = text;
}

function setText(id: string, value: string): void {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value;
  }
}
