import "../styles.css";
import { connectivityCardConfigs, connectivityCardTarget, probeCardRows, probeCardTarget } from "../config/dashboard";
import { geoProviders } from "../providers/geo";
import { connectivityChecks, runConnectivityCheckTwice } from "../providers/connectivity";
import { probeProviders } from "../providers/probes";
import type { ConnectivityResult, GeoResult, ProbeResult } from "../types";
import { renderDashboardCards } from "../ui/cards";
import { requireElement } from "../ui/dom";

const probeTargets = Object.fromEntries(probeCardRows.flat().map((config) => [config.providerId, probeCardTarget(config.providerId)]));
const connectivityTargets = Object.fromEntries(
  connectivityCardConfigs.map((config) => [config.checkId, connectivityCardTarget(config.checkId)]),
);
const probeResults = new Map<string, ProbeResult>();
const geoProviderSelect = requireElement<HTMLSelectElement>("#geo-provider-select");
const originalGeoOptionId = "__original";

renderDashboardCards();
renderGeoProviderSelect();

for (const target of Object.values(probeTargets)) {
  setText(target.ip, "检测中");
  setText(target.geo, "");
}

for (const target of Object.values(connectivityTargets)) {
  setText(target, "检测中");
}

for (const provider of probeProviders) {
  void provider.query().then((result) => {
    probeResults.set(result.providerId, result);
    renderProbeResult(result);
    void renderSelectedGeo(result);
  });
}

for (const check of connectivityChecks) {
  void runConnectivityCheckTwice(check, renderConnectivityResult);
}

function renderProbeResult(result: ProbeResult): void {
  const target = probeTargets[result.providerId];
  if (!target) {
    return;
  }

  setText(target.ip, result.status === "success" ? result.ip || "N/A" : "N/A");
  setText(target.geo, result.status === "success" ? result.geo?.locationText || "不包含地理位置" : result.error || "查询失败");
}

function renderGeoProviderSelect(): void {
  const originalOption = document.createElement("option");
  originalOption.value = originalGeoOptionId;
  originalOption.textContent = "原始结果";
  originalOption.selected = true;

  geoProviderSelect.replaceChildren(
    originalOption,
    ...geoProviders.map((provider) => {
      const option = document.createElement("option");
      option.value = provider.id;
      option.textContent = provider.name;
      return option;
    }),
  );

  geoProviderSelect.addEventListener("change", () => {
    for (const result of probeResults.values()) {
      void renderSelectedGeo(result);
    }
  });
}

async function renderSelectedGeo(result: ProbeResult): Promise<void> {
  const target = probeTargets[result.providerId];
  if (!target || result.status !== "success" || !result.ip) {
    return;
  }

  const selectedProvider = selectedGeoProvider();
  if (selectedProvider) {
    const selectedProviderId = selectedProvider.id;
    setText(target.geo, "归属地查询中");
    const geoResult = await selectedProvider.lookup(result.ip);
    if (geoProviderSelect.value !== selectedProviderId) {
      return;
    }
    setText(target.geo, formatGeoResults([geoResult]));
    return;
  }

  if (result.geo?.locationText) {
    setText(target.geo, result.geo.locationText);
    return;
  }

  setText(target.geo, "不包含地理位置");
}

function selectedGeoProvider() {
  if (geoProviderSelect.value === originalGeoOptionId) {
    return undefined;
  }

  return geoProviders.find((provider) => provider.id === geoProviderSelect.value);
}

function formatGeoResults(results: GeoResult[]): string {
  const lines = results
    .map((result) => (result.status === "success" ? `${providerName(result.providerId)}: ${result.locationText}` : ""))
    .filter(Boolean);

  if (lines.length > 0) {
    return lines.join(" / ");
  }

  return "归属地查询失败";
}

function providerName(providerId: string): string {
  const embeddedProviderNames: Record<string, string> = {
    "cn-ipv4": "IP.cn",
    ipipnet: "IPIP.net",
    pchome: "PChome",
    "ip-sb": "IP.SB",
    ipapi: "ipapi",
    webrtc: "WebRTC",
    "cloudflare-trace": "Trace",
    "claude-trace": "Trace",
  };

  return geoProviders.find((provider) => provider.id === providerId)?.name || embeddedProviderNames[providerId] || providerId;
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
  requireElement<HTMLElement>(`#${id}`).textContent = value;
}
