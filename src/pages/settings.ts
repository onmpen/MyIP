import "../styles.css";
import {
  clearCloudflareProbes,
  defaultCloudflareProbes,
  loadCloudflareProbes,
  maxCloudflareProbeCount,
  saveCloudflareProbes,
} from "../config/cloudflare-preference";
import {
  type CloudflareProbeDefinition,
  createCustomCloudflareProbe,
  normalizeCloudflareProbeInput,
} from "../config/cloudflare-probes";
import {
  type WebRtcDisplayMode,
  clearWebRtcDisplayMode,
  defaultWebRtcDisplayMode,
  loadWebRtcDisplayMode,
  saveWebRtcDisplayMode,
} from "../config/webrtc-preference";
import { validateCloudflareTraceUrl } from "../providers/cloudflare";
import { el, requireElement } from "../ui/dom";

const form = requireElement<HTMLFormElement>("#settings-form");
const status = requireElement<HTMLElement>("#settings-status");
const saveSettingsButton = requireElement<HTMLButtonElement>("#save-settings");
const resetSettingsButton = requireElement<HTMLButtonElement>("#reset-settings");
const cloudflareStatus = requireElement<HTMLElement>("#cloudflare-settings-status");
const cloudflareList = requireElement<HTMLElement>("#cloudflare-settings-list");
const cloudflareCount = requireElement<HTMLElement>("#cloudflare-probe-count");
const cloudflareContent = requireElement<HTMLElement>("#cloudflare-settings-content");
const cloudflareToggle = requireElement<HTMLButtonElement>("#toggle-cloudflare-settings");
const cloudflareName = requireElement<HTMLInputElement>("#cloudflare-probe-name");
const cloudflareInput = requireElement<HTMLInputElement>("#cloudflare-probe-input");
const addCloudflareButton = requireElement<HTMLButtonElement>("#add-cloudflare-probe");
let cloudflareProbes = loadCloudflareProbes();
let dragState: {
  pointerId: number;
  row: HTMLElement;
  handle: HTMLButtonElement;
  placeholder: HTMLElement;
  pointerOffsetX: number;
  pointerOffsetY: number;
  moved: boolean;
} | null = null;
let settlingDrag: { row: HTMLElement; timerId: number } | null = null;
let validationSequence = 0;

selectMode(loadWebRtcDisplayMode());
renderCloudflareProbes();

cloudflareToggle.addEventListener("click", () => {
  const expanded = cloudflareToggle.getAttribute("aria-expanded") === "true";
  cloudflareToggle.setAttribute("aria-expanded", String(!expanded));
  cloudflareToggle.textContent = expanded ? "展开" : "收起";
  cloudflareContent.hidden = expanded;
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const webRtcSaved = saveWebRtcDisplayMode(selectedMode());
  const cloudflareSaved = saveCloudflareProbes(cloudflareProbes);
  const saved = webRtcSaved && cloudflareSaved;
  showStatus(saved ? "设置已保存，返回首页后生效。" : "浏览器存储不可用，设置未保存。", saved);
});

resetSettingsButton.addEventListener("click", () => {
  cancelCloudflareValidation();
  cancelDragging();
  const webRtcCleared = clearWebRtcDisplayMode();
  const cloudflareCleared = clearCloudflareProbes();
  const cleared = webRtcCleared && cloudflareCleared;
  selectMode(defaultWebRtcDisplayMode);
  cloudflareProbes = defaultCloudflareProbes();
  renderCloudflareProbes();
  showCloudflareStatus("");
  showStatus(cleared ? "已恢复全部默认设置。" : "浏览器存储不可用，无法恢复默认。", cleared);
});

addCloudflareButton.addEventListener("click", () => void addCloudflareProbe());
for (const input of [cloudflareName, cloudflareInput]) {
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void addCloudflareProbe();
    }
  });
}

cloudflareList.addEventListener("click", (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-action="delete"]');
  if (!button) {
    return;
  }
  const index = cloudflareProbes.findIndex((probe) => probe.id === button.dataset.id);
  if (index < 0) {
    return;
  }
  cancelCloudflareValidation();
  cloudflareProbes.splice(index, 1);
  renderCloudflareProbes();
  showCloudflareStatus("修改尚未保存。", true);
});

cloudflareList.addEventListener("pointerdown", (event) => {
  const handle = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-drag-id]");
  if (dragState || !handle || event.button !== 0) {
    return;
  }
  finishSettlingDrag();
  const row = handle.closest<HTMLElement>(".cloudflare-setting-row");
  const probeId = handle.dataset.dragId;
  if (!row || !probeId) {
    return;
  }
  event.preventDefault();
  handle.focus();
  const rowRect = row.getBoundingClientRect();
  const placeholder = el("div", { className: "cloudflare-setting-placeholder" });
  placeholder.style.height = `${rowRect.height}px`;
  placeholder.setAttribute("aria-hidden", "true");
  row.before(placeholder);
  document.body.append(row);
  Object.assign(row.style, {
    width: `${rowRect.width}px`,
    height: `${rowRect.height}px`,
    left: `${rowRect.left}px`,
    top: `${rowRect.top}px`,
  });
  row.classList.add("is-dragging");
  handle.setPointerCapture(event.pointerId);
  document.body.classList.add("is-sorting-cloudflare");
  dragState = {
    pointerId: event.pointerId,
    row,
    handle,
    placeholder,
    pointerOffsetX: event.clientX - rowRect.left,
    pointerOffsetY: event.clientY - rowRect.top,
    moved: false,
  };
});

window.addEventListener("pointermove", (event) => {
  if (!dragState || dragState.pointerId !== event.pointerId) {
    return;
  }
  event.preventDefault();
  dragState.row.style.left = `${event.clientX - dragState.pointerOffsetX}px`;
  dragState.row.style.top = `${event.clientY - dragState.pointerOffsetY}px`;
  const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>(".cloudflare-setting-row");
  if (target && cloudflareList.contains(target)) {
    const targetRect = target.getBoundingClientRect();
    const insertionPoint = event.clientY < targetRect.top + targetRect.height / 2 ? target : target.nextSibling;
    if (insertionPoint !== dragState.placeholder) {
      const previousPositions = rowPositions();
      cloudflareList.insertBefore(dragState.placeholder, insertionPoint);
      animateRowsFrom(previousPositions);
      dragState.moved = true;
    }
  }
  if (event.clientY < 72) {
    window.scrollBy(0, -12);
  } else if (event.clientY > window.innerHeight - 72) {
    window.scrollBy(0, 12);
  }
}, { passive: false });

window.addEventListener("pointerup", finishDragging);
window.addEventListener("pointercancel", finishDragging);

cloudflareList.addEventListener("keydown", (event) => {
  const handle = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-drag-id]");
  if (!handle || (event.key !== "ArrowUp" && event.key !== "ArrowDown")) {
    return;
  }
  event.preventDefault();
  const probeId = handle.dataset.dragId;
  if (!probeId) {
    return;
  }
  const index = cloudflareProbes.findIndex((probe) => probe.id === probeId);
  const targetIndex = event.key === "ArrowUp" ? index - 1 : index + 1;
  if (index < 0 || targetIndex < 0 || targetIndex >= cloudflareProbes.length) {
    return;
  }
  cancelCloudflareValidation();
  [cloudflareProbes[index], cloudflareProbes[targetIndex]] = [cloudflareProbes[targetIndex], cloudflareProbes[index]];
  renderCloudflareProbes();
  cloudflareList.querySelector<HTMLButtonElement>(`button[data-drag-id="${probeId}"]`)?.focus();
  showCloudflareStatus(`${cloudflareProbes[targetIndex].name} 已移至第 ${targetIndex + 1} 位，共 ${cloudflareProbes.length} 位，尚未保存。`, true);
});

function selectedMode(): WebRtcDisplayMode {
  return requireElement<HTMLInputElement>('input[name="webrtc-display-mode"]:checked').value as WebRtcDisplayMode;
}

function selectMode(mode: WebRtcDisplayMode): void {
  requireElement<HTMLInputElement>(`input[name="webrtc-display-mode"][value="${mode}"]`).checked = true;
}

async function addCloudflareProbe(): Promise<void> {
  let normalized: ReturnType<typeof normalizeCloudflareProbeInput>;
  try {
    normalized = normalizeCloudflareProbeInput(cloudflareInput.value);
  } catch (error) {
    showCloudflareStatus(error instanceof Error ? error.message : "地址格式无效", false);
    return;
  }

  const candidate = createCustomCloudflareProbe(normalized.traceUrl, cloudflareName.value);
  if (cloudflareProbes.some((probe) => probe.traceUrl === normalized.traceUrl || probe.id === candidate.id)) {
    showCloudflareStatus("这个站点已经在列表中。", false);
    return;
  }
  if (cloudflareProbes.length >= maxCloudflareProbeCount) {
    showCloudflareStatus(`最多只能添加 ${maxCloudflareProbeCount} 个站点。`, false);
    return;
  }

  const validationId = ++validationSequence;
  setCloudflareEditingDisabled(true);
  showCloudflareStatus("正在验证 Cloudflare Trace…", true);
  try {
    await validateCloudflareTraceUrl(normalized.traceUrl);
    if (validationId !== validationSequence) {
      return;
    }
    if (cloudflareProbes.some((probe) => probe.traceUrl === candidate.traceUrl || probe.id === candidate.id)) {
      showCloudflareStatus("这个站点已经在列表中。", false);
      return;
    }
    cloudflareProbes.push(candidate);
    cloudflareName.value = "";
    cloudflareInput.value = "";
    renderCloudflareProbes();
    showCloudflareStatus("验证成功，点击“保存设置”后生效。", true);
  } catch (error) {
    if (validationId !== validationSequence) {
      return;
    }
    showCloudflareStatus(error instanceof Error ? `验证失败：${error.message}` : "验证失败", false);
  } finally {
    if (validationId === validationSequence) {
      setCloudflareEditingDisabled(false);
    }
  }
}

function renderCloudflareProbes(): void {
  cancelDragging();
  finishSettlingDrag();
  cloudflareCount.textContent = `${cloudflareProbes.length} 个站点`;
  cloudflareList.setAttribute("role", "list");
  if (cloudflareProbes.length === 0) {
    cloudflareList.replaceChildren(el("p", { className: "cloudflare-settings-empty", text: "当前没有探测站点。" }));
    return;
  }
  cloudflareList.replaceChildren(...cloudflareProbes.map(renderCloudflareProbeRow));
}

function renderCloudflareProbeRow(probe: CloudflareProbeDefinition, index: number): HTMLElement {
  const row = el("div", { className: "cloudflare-setting-row" });
  row.setAttribute("role", "listitem");
  row.setAttribute("aria-posinset", String(index + 1));
  row.setAttribute("aria-setsize", String(cloudflareProbes.length));
  row.dataset.id = probe.id;
  const dragHandle = el("button", { className: "cloudflare-drag-handle", text: "⠿" });
  dragHandle.type = "button";
  dragHandle.dataset.dragId = probe.id;
  dragHandle.title = "拖动排序";
  dragHandle.setAttribute(
    "aria-label",
    `拖动排序 ${probe.name}，当前第 ${index + 1} 位，共 ${cloudflareProbes.length} 位，也可以使用上下方向键`,
  );
  const identity = el("div", { className: "cloudflare-setting-identity" });
  identity.append(el("strong", { text: probe.name }));
  const hostname = new URL(probe.traceUrl).hostname;
  if (hostname !== probe.name) {
    identity.append(el("small", { text: hostname }));
  }

  const actions = el("div", { className: "cloudflare-setting-actions" });
  actions.append(deleteButton(probe));
  row.append(dragHandle, identity, actions);
  return row;
}

function deleteButton(probe: CloudflareProbeDefinition): HTMLButtonElement {
  const button = el("button", { className: "button is-small", text: "删除" });
  button.type = "button";
  button.dataset.action = "delete";
  button.dataset.id = probe.id;
  button.setAttribute("aria-label", `删除 ${probe.name}`);
  return button;
}

function finishDragging(event: PointerEvent): void {
  if (!dragState || dragState.pointerId !== event.pointerId) {
    return;
  }
  const completedDrag = dragState;
  dragState = null;
  if (completedDrag.handle.hasPointerCapture(event.pointerId)) {
    completedDrag.handle.releasePointerCapture(event.pointerId);
  }
  const destination = completedDrag.placeholder.getBoundingClientRect();
  completedDrag.placeholder.replaceWith(completedDrag.row);
  const moved = completedDrag.moved && syncCloudflareProbeOrder();
  validationSequence += 1;
  if (moved) {
    showCloudflareStatus("顺序已调整，尚未保存。", true);
  }
  const settle = (): void => {
    if (settlingDrag?.row !== completedDrag.row) {
      return;
    }
    settlingDrag = null;
    completedDrag.row.classList.remove("is-dragging", "is-settling");
    completedDrag.row.removeAttribute("style");
    if (!dragState) {
      document.body.classList.remove("is-sorting-cloudflare");
    }
  };

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    settle();
    return;
  }
  completedDrag.row.classList.add("is-settling");
  completedDrag.row.style.left = `${destination.left}px`;
  completedDrag.row.style.top = `${destination.top}px`;
  settlingDrag = { row: completedDrag.row, timerId: window.setTimeout(settle, 170) };
}

function syncCloudflareProbeOrder(): boolean {
  const probesById = new Map(cloudflareProbes.map((probe) => [probe.id, probe]));
  const reorderedProbes = [...cloudflareList.querySelectorAll<HTMLElement>(".cloudflare-setting-row")]
    .map((row) => probesById.get(row.dataset.id || ""))
    .filter((probe): probe is CloudflareProbeDefinition => Boolean(probe));
  if (reorderedProbes.length !== cloudflareProbes.length) {
    return false;
  }
  cloudflareProbes = reorderedProbes;
  return true;
}

function cancelDragging(): void {
  if (!dragState) {
    return;
  }
  const cancelledDrag = dragState;
  dragState = null;
  if (cancelledDrag.handle.hasPointerCapture(cancelledDrag.pointerId)) {
    cancelledDrag.handle.releasePointerCapture(cancelledDrag.pointerId);
  }
  cancelledDrag.placeholder.replaceWith(cancelledDrag.row);
  if (cancelledDrag.moved) {
    syncCloudflareProbeOrder();
  }
  cancelledDrag.row.classList.remove("is-dragging", "is-settling");
  cancelledDrag.row.removeAttribute("style");
  document.body.classList.remove("is-sorting-cloudflare");
}

function finishSettlingDrag(): void {
  if (!settlingDrag) {
    return;
  }
  const completedDrag = settlingDrag;
  settlingDrag = null;
  window.clearTimeout(completedDrag.timerId);
  completedDrag.row.classList.remove("is-dragging", "is-settling");
  completedDrag.row.removeAttribute("style");
  if (!dragState) {
    document.body.classList.remove("is-sorting-cloudflare");
  }
}

function cancelCloudflareValidation(): void {
  validationSequence += 1;
}

function setCloudflareEditingDisabled(disabled: boolean): void {
  addCloudflareButton.disabled = disabled;
  cloudflareName.disabled = disabled;
  cloudflareInput.disabled = disabled;
  saveSettingsButton.disabled = disabled;
  resetSettingsButton.disabled = disabled;
  cloudflareToggle.disabled = disabled;
  for (const button of cloudflareList.querySelectorAll<HTMLButtonElement>("button")) {
    button.disabled = disabled;
  }
}

function rowPositions(): Map<HTMLElement, number> {
  return new Map(
    [...cloudflareList.querySelectorAll<HTMLElement>(".cloudflare-setting-row")].map((row) => [
      row,
      row.getBoundingClientRect().top,
    ]),
  );
}

function animateRowsFrom(previousPositions: Map<HTMLElement, number>): void {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }
  for (const [row, previousTop] of previousPositions) {
    const deltaY = previousTop - row.getBoundingClientRect().top;
    if (deltaY === 0) {
      continue;
    }
    row.animate([{ transform: `translateY(${deltaY}px)` }, { transform: "translateY(0)" }], {
      duration: 180,
      easing: "cubic-bezier(0.2, 0, 0, 1)",
    });
  }
}

function showStatus(message: string, success: boolean): void {
  status.textContent = message;
  status.classList.toggle("is-error", !success);
}

function showCloudflareStatus(message: string, success = true): void {
  cloudflareStatus.textContent = message;
  cloudflareStatus.classList.toggle("is-error", !success);
}
