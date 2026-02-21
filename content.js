(function () {
  "use strict";

  const LOG_PREFIX = "[gemini-pro-auto-default]";

  const MODE_PRO = "pro";
  const MODE_THINKING = "thinking";
  const DEFAULT_FORCED_MODE = MODE_PRO;
  const STORAGE_KEY_FORCED_MODE = "forcedMode";

  const PRO_TARGET_REGEX = /\bpro\b/i;
  const THINKING_TARGET_REGEX = /(thinking|思考)/i;
  const MODEL_HINT_REGEX = /(pro|flash|model|2\.5|高速|thinking|思考)/i;
  const DISALLOWED_OPTION_REGEX = /(upgrade|trial|plan|subscription|google ai pro|upgrade to|無料|アップグレード)/i;

  const RECHECK_DEBOUNCE_MS = 450;
  const RETRY_DELAY_MS = 1200;
  const MAX_RETRIES = 3;
  const MIN_ATTEMPT_INTERVAL_MS = 350;
  const MENU_WAIT_MS = 1400;
  const VERIFY_WAIT_MS = 1600;
  const CONFIRMED_SELECTION_COOLDOWN_MS = 180000;

  const state = {
    forcedMode: DEFAULT_FORCED_MODE,
    inFlight: false,
    retryCount: 0,
    lastAttemptAt: 0,
    scheduledTimer: null,
    lastKnownUrl: location.href,
    lastConfirmedMode: null,
    lastConfirmedAt: 0
  };

  const modelButtonSelectors = [
    'button[aria-haspopup="menu"]',
    'button[aria-label*="model" i]',
    'button[aria-label*="gemini" i]',
    '[role="button"][aria-label*="model" i]'
  ];

  const optionSelectors = [
    '[role="menuitem"]',
    '[role="option"]',
    '[aria-selected]',
    '[aria-checked]',
    '[role="listbox"] [role="button"]',
    '[role="menu"] button',
    'button'
  ];

  const openMenuContainerSelectors = [
    '[role="menu"]',
    '[role="listbox"]',
    '[aria-modal="true"]',
    '[role="dialog"]'
  ];

  function log(level, message, extra) {
    if (typeof extra === "undefined") {
      console[level](`${LOG_PREFIX} ${message}`);
      return;
    }
    console[level](`${LOG_PREFIX} ${message}`, extra);
  }

  function normalizeText(input) {
    return (input || "").replace(/\s+/g, " ").trim();
  }

  function getElementTextCandidates(element) {
    if (!element || !(element instanceof Element)) {
      return [];
    }

    const candidates = [
      normalizeText(element.textContent),
      normalizeText(element.getAttribute("aria-label")),
      normalizeText(element.getAttribute("title"))
    ];
    return candidates.filter(Boolean);
  }

  function getElementSearchText(element) {
    return getElementTextCandidates(element).join(" ");
  }

  function getElementPrimaryText(element) {
    const candidates = getElementTextCandidates(element);
    return candidates.length > 0 ? candidates[0] : "";
  }

  function summarizeText(text, maxLength = 80) {
    const normalized = normalizeText(text);
    if (normalized.length <= maxLength) {
      return normalized;
    }
    return `${normalized.slice(0, maxLength)}...`;
  }

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function isValidForcedMode(value) {
    return value === MODE_PRO || value === MODE_THINKING;
  }

  function normalizeForcedMode(value) {
    return isValidForcedMode(value) ? value : DEFAULT_FORCED_MODE;
  }

  function getModeLabel(mode) {
    return mode === MODE_THINKING ? "Thinking" : "Pro";
  }

  function getModeTargetRegex(mode) {
    return mode === MODE_THINKING ? THINKING_TARGET_REGEX : PRO_TARGET_REGEX;
  }

  function markModeConfirmed(mode) {
    state.lastConfirmedMode = mode;
    state.lastConfirmedAt = Date.now();
  }

  function clearModeConfirmation() {
    state.lastConfirmedMode = null;
    state.lastConfirmedAt = 0;
  }

  function hasFreshModeConfirmation(mode) {
    if (state.lastConfirmedMode !== mode || state.lastConfirmedAt <= 0) {
      return false;
    }
    return Date.now() - state.lastConfirmedAt < CONFIRMED_SELECTION_COOLDOWN_MS;
  }

  function matchesTargetMode(text, mode) {
    return getModeTargetRegex(mode).test(normalizeText(text));
  }

  function getSyncStorage() {
    if (
      typeof chrome === "undefined" ||
      !chrome.storage ||
      !chrome.storage.sync ||
      typeof chrome.storage.sync.get !== "function"
    ) {
      return null;
    }
    return chrome.storage.sync;
  }

  function getRuntimeErrorMessage() {
    if (typeof chrome === "undefined" || !chrome.runtime || !chrome.runtime.lastError) {
      return "";
    }
    return chrome.runtime.lastError.message || "unknown-runtime-error";
  }

  function loadForcedMode() {
    const storage = getSyncStorage();
    if (!storage) {
      return Promise.resolve(DEFAULT_FORCED_MODE);
    }

    return new Promise((resolve) => {
      storage.get({ [STORAGE_KEY_FORCED_MODE]: DEFAULT_FORCED_MODE }, (items) => {
        const runtimeError = getRuntimeErrorMessage();
        if (runtimeError) {
          log("debug", `Failed to load forced mode from storage: ${runtimeError}.`);
          resolve(DEFAULT_FORCED_MODE);
          return;
        }
        const savedMode = items ? items[STORAGE_KEY_FORCED_MODE] : DEFAULT_FORCED_MODE;
        resolve(normalizeForcedMode(savedMode));
      });
    });
  }

  async function refreshForcedMode() {
    const mode = await loadForcedMode();
    state.forcedMode = mode;
    return mode;
  }

  function setupStorageListener() {
    if (
      typeof chrome === "undefined" ||
      !chrome.storage ||
      !chrome.storage.onChanged ||
      typeof chrome.storage.onChanged.addListener !== "function"
    ) {
      return;
    }

    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "sync") {
        return;
      }
      if (!changes[STORAGE_KEY_FORCED_MODE]) {
        return;
      }

      const changedMode = normalizeForcedMode(changes[STORAGE_KEY_FORCED_MODE].newValue);
      if (changedMode === state.forcedMode) {
        return;
      }

      state.forcedMode = changedMode;
      resetRetryCounter();
      clearModeConfirmation();
      log("info", `Forced mode changed to ${getModeLabel(changedMode)}.`);
      scheduleRecheck("forced-mode-changed", 150);
    });
  }

  function isElementVisible(element) {
    if (!element || !(element instanceof Element)) {
      return false;
    }
    const style = window.getComputedStyle(element);
    if (
      style.display === "none" ||
      style.visibility === "hidden" ||
      style.opacity === "0"
    ) {
      return false;
    }
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function isElementEnabled(element) {
    if (!element || !(element instanceof HTMLElement)) {
      return false;
    }
    return !element.hasAttribute("disabled") && element.getAttribute("aria-disabled") !== "true";
  }

  function canClick(element) {
    return isElementVisible(element) && isElementEnabled(element);
  }

  function clickElement(element) {
    if (!canClick(element)) {
      return false;
    }
    element.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, cancelable: true }));
    element.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
    element.click();
    element.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true }));
    return true;
  }

  function collectElements(selectors, roots = [document]) {
    const rootList = Array.isArray(roots) ? roots : [roots];
    const found = [];
    const seen = new Set();

    rootList.forEach((root) => {
      if (!root || typeof root.querySelectorAll !== "function") {
        return;
      }

      selectors.forEach((selector) => {
        root.querySelectorAll(selector).forEach((element) => {
          if (!seen.has(element)) {
            seen.add(element);
            found.push(element);
          }
        });
      });
    });

    return found;
  }

  function getOpenMenuContainers() {
    return collectElements(openMenuContainerSelectors)
      .filter((element) => isElementVisible(element))
      .filter((container) => {
        const role = container.getAttribute("role");
        if (role === "menu" || role === "listbox") {
          return true;
        }
        return Boolean(container.querySelector('[role="menu"],[role="listbox"],[aria-selected],[aria-checked]'));
      });
  }

  function containerLooksLikeModelMenu(container) {
    const optionElements = collectElements(optionSelectors, [container]);
    if (optionElements.length === 0) {
      return false;
    }

    return optionElements.some((element) => MODEL_HINT_REGEX.test(getElementSearchText(element)));
  }

  function isModelMenuLikelyOpen() {
    const containers = getOpenMenuContainers().filter((container) => containerLooksLikeModelMenu(container));
    if (containers.length === 0) {
      return false;
    }

    const optionElements = collectElements(optionSelectors, containers).filter((element) => canClick(element));
    if (optionElements.length === 0) {
      return false;
    }

    return optionElements.some((element) => {
      const text = getElementSearchText(element);
      return (
        MODEL_HINT_REGEX.test(text) ||
        element.getAttribute("aria-selected") === "true" ||
        element.getAttribute("aria-checked") === "true"
      );
    });
  }

  function getSelectedModeTextFromOpenMenu() {
    const menuContainers = getOpenMenuContainers().filter((container) => containerLooksLikeModelMenu(container));
    const selectedCandidates = collectElements(
      ['[aria-selected="true"]', '[aria-checked="true"]'],
      menuContainers
    ).filter((element) => isElementVisible(element));

    for (const candidate of selectedCandidates) {
      const optionElement = candidate.closest('[role="menuitem"],[role="option"],button,[role="button"]');
      const text = getElementSearchText(optionElement || candidate);
      if (text) {
        return text;
      }
    }

    return "";
  }

  function getSelectionEvidence(mode, allowCachedConfirmation = true) {
    const buttonText = getCurrentModelText();
    if (matchesTargetMode(buttonText, mode)) {
      return { isSelected: true, source: "button", text: buttonText };
    }
    if (buttonText && MODEL_HINT_REGEX.test(buttonText) && !matchesTargetMode(buttonText, mode)) {
      return { isSelected: false, source: "button", text: buttonText };
    }

    const menuSelectedText = getSelectedModeTextFromOpenMenu();
    if (matchesTargetMode(menuSelectedText, mode)) {
      return { isSelected: true, source: "menu", text: menuSelectedText };
    }
    if (allowCachedConfirmation && hasFreshModeConfirmation(mode)) {
      return { isSelected: true, source: "cache", text: "" };
    }

    return {
      isSelected: false,
      source: "none",
      text: buttonText || menuSelectedText
    };
  }

  function scoreModelButton(element) {
    const text = getElementSearchText(element);
    let score = 0;

    if (element.matches('button[aria-haspopup="menu"]')) {
      score += 30;
    }
    if (MODEL_HINT_REGEX.test(text)) {
      score += 20;
    }
    if (PRO_TARGET_REGEX.test(text) || THINKING_TARGET_REGEX.test(text) || /\bflash\b/i.test(text) || /高速/.test(text)) {
      score += 30;
    }
    if (element.closest("header")) {
      score += 10;
    }
    if (text.length > 120) {
      score -= 25;
    }
    return score;
  }

  function findModelButton() {
    const explicitCandidates = collectElements(modelButtonSelectors);
    const genericButtons = Array.from(document.querySelectorAll("button,[role='button']"));
    const combined = [...explicitCandidates, ...genericButtons];
    const openMenuContainers = getOpenMenuContainers();

    const candidates = combined
      .filter((element) => canClick(element))
      .filter((element) => !openMenuContainers.some((container) => container.contains(element)))
      .filter((element) => MODEL_HINT_REGEX.test(getElementSearchText(element)))
      .map((element) => ({ element, score: scoreModelButton(element) }))
      .sort((a, b) => b.score - a.score);

    return candidates.length > 0 ? candidates[0].element : null;
  }

  function getCurrentModelText() {
    const modelButton = findModelButton();
    if (!modelButton) {
      return "";
    }
    return getElementPrimaryText(modelButton);
  }

  function isTargetSelected(mode, allowCachedConfirmation = true) {
    return getSelectionEvidence(mode, allowCachedConfirmation).isSelected;
  }

  function scoreOptionElement(element) {
    const text = getElementSearchText(element);
    let score = 0;
    const role = element.getAttribute("role") || "";

    if (role === "menuitem" || role === "option") {
      score += 35;
    }
    if (element.hasAttribute("aria-selected") || element.hasAttribute("aria-checked")) {
      score += 25;
    }
    if (element.closest('[role="menu"],[role="listbox"],[aria-modal="true"],[role="dialog"]')) {
      score += 20;
    }
    if (/2\.5/i.test(text)) {
      score += 15;
    }
    if (/gemini/i.test(text)) {
      score += 10;
    }
    if (text.length > 120) {
      score -= 20;
    }
    if (DISALLOWED_OPTION_REGEX.test(text)) {
      score -= 100;
    }
    return score;
  }

  function findTargetOption(mode, withinOpenMenuOnly = false) {
    const roots = withinOpenMenuOnly
      ? getOpenMenuContainers().filter((container) => containerLooksLikeModelMenu(container))
      : [document];
    if (withinOpenMenuOnly && roots.length === 0) {
      return null;
    }

    const optionElements = collectElements(optionSelectors, roots)
      .filter((element) => canClick(element))
      .filter((element) => matchesTargetMode(getElementSearchText(element), mode))
      .map((element) => ({ element, score: scoreOptionElement(element) }))
      .sort((a, b) => b.score - a.score);

    if (optionElements.length === 0) {
      return null;
    }
    return optionElements[0].element;
  }

  async function waitForTargetOption(timeoutMs, mode, withinOpenMenuOnly = false) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
      const option = findTargetOption(mode, withinOpenMenuOnly);
      if (option) {
        return option;
      }
      await wait(100);
    }
    return null;
  }

  async function waitForModelMenu(timeoutMs) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
      if (isModelMenuLikelyOpen()) {
        return true;
      }
      await wait(100);
    }
    return false;
  }

  async function openModelMenu(mode) {
    if (isModelMenuLikelyOpen()) {
      return true;
    }

    const modelButton = findModelButton();
    if (!modelButton) {
      log("debug", "Model button was not found.");
      return false;
    }
    if (!clickElement(modelButton)) {
      log("debug", "Model button exists but could not be clicked.");
      return false;
    }

    const opened = await waitForModelMenu(MENU_WAIT_MS);
    if (!opened) {
      log("debug", `${getModeLabel(mode)} menu did not open in time.`);
      return false;
    }
    return true;
  }

  function dispatchEscapeKey() {
    const eventInit = {
      key: "Escape",
      code: "Escape",
      keyCode: 27,
      which: 27,
      bubbles: true,
      cancelable: true
    };

    const activeTarget = document.activeElement && typeof document.activeElement.dispatchEvent === "function"
      ? document.activeElement
      : document.body;

    if (activeTarget && typeof activeTarget.dispatchEvent === "function") {
      activeTarget.dispatchEvent(new KeyboardEvent("keydown", eventInit));
      activeTarget.dispatchEvent(new KeyboardEvent("keyup", eventInit));
    }

    document.dispatchEvent(new KeyboardEvent("keydown", eventInit));
    document.dispatchEvent(new KeyboardEvent("keyup", eventInit));
  }

  async function closeModelMenu() {
    if (!isModelMenuLikelyOpen()) {
      return true;
    }

    const modelButton = findModelButton();
    if (modelButton && clickElement(modelButton)) {
      await wait(120);
      if (!isModelMenuLikelyOpen()) {
        return true;
      }
    }

    dispatchEscapeKey();
    await wait(120);
    return !isModelMenuLikelyOpen();
  }

  async function selectTargetOption(mode) {
    const modeLabel = getModeLabel(mode);
    const option = await waitForTargetOption(500, mode, true);
    if (!option) {
      log("debug", `${modeLabel} option was not found in menu.`);
      return false;
    }
    if (!clickElement(option)) {
      log("debug", `${modeLabel} option exists but could not be clicked.`);
      return false;
    }

    const startedAt = Date.now();
    while (Date.now() - startedAt < VERIFY_WAIT_MS) {
      if (isTargetSelected(mode, false)) {
        return true;
      }
      await wait(120);
    }
    return isTargetSelected(mode, false);
  }

  function resetRetryCounter() {
    state.retryCount = 0;
  }

  function scheduleRecheck(reason, delay = RECHECK_DEBOUNCE_MS) {
    if (state.scheduledTimer) {
      clearTimeout(state.scheduledTimer);
    }
    state.scheduledTimer = setTimeout(() => {
      state.scheduledTimer = null;
      void ensureTargetSelected(reason);
    }, delay);
  }

  async function ensureTargetSelected(reason) {
    const now = Date.now();
    if (state.inFlight) {
      return;
    }
    if (now - state.lastAttemptAt < MIN_ATTEMPT_INTERVAL_MS) {
      scheduleRecheck(`${reason}:throttled`, MIN_ATTEMPT_INTERVAL_MS);
      return;
    }

    state.lastAttemptAt = now;
    state.inFlight = true;

    try {
      const mode = state.forcedMode;
      const modeLabel = getModeLabel(mode);

      const initialSelection = getSelectionEvidence(mode, true);
      if (initialSelection.isSelected) {
        if (initialSelection.source !== "cache") {
          markModeConfirmed(mode);
        }
        resetRetryCounter();
        return;
      }

      const opened = await openModelMenu(mode);
      if (!opened) {
        throw new Error("model-menu-not-opened");
      }

      const selectionAfterMenuOpen = getSelectionEvidence(mode, false);
      if (selectionAfterMenuOpen.isSelected) {
        const closed = await closeModelMenu();
        markModeConfirmed(mode);
        resetRetryCounter();
        const evidenceText = selectionAfterMenuOpen.text ? `: ${summarizeText(selectionAfterMenuOpen.text)}` : "";
        log(
          "info",
          `${modeLabel} already selected via ${selectionAfterMenuOpen.source}${evidenceText}; menu ${closed ? "closed" : "left open"} (${reason}).`
        );
        return;
      }

      const selected = await selectTargetOption(mode);
      if (!selected) {
        throw new Error("target-selection-failed");
      }

      markModeConfirmed(mode);
      resetRetryCounter();
      log("info", `Model switched to ${modeLabel} (${reason}).`);
    } catch (error) {
      state.retryCount += 1;
      const errorCode = error instanceof Error ? error.message : String(error);

      if (state.retryCount <= MAX_RETRIES) {
        log("debug", `Retrying ${getModeLabel(state.forcedMode)} selection (${state.retryCount}/${MAX_RETRIES}) due to ${errorCode}.`);
        scheduleRecheck(`${reason}:retry`, RETRY_DELAY_MS);
      } else {
        log("warn", `${getModeLabel(state.forcedMode)} selection skipped after ${MAX_RETRIES} retries: ${errorCode}.`);
        resetRetryCounter();
      }
    } finally {
      state.inFlight = false;
    }
  }

  function onUrlChange(trigger) {
    if (location.href === state.lastKnownUrl) {
      return;
    }
    state.lastKnownUrl = location.href;
    resetRetryCounter();
    clearModeConfirmation();
    scheduleRecheck(`url-change:${trigger}`, 300);
  }

  function setupNavigationHooks() {
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function pushStateWithHook(...args) {
      const result = originalPushState.apply(this, args);
      onUrlChange("pushState");
      return result;
    };

    history.replaceState = function replaceStateWithHook(...args) {
      const result = originalReplaceState.apply(this, args);
      onUrlChange("replaceState");
      return result;
    };

    window.addEventListener("popstate", () => onUrlChange("popstate"));
    window.addEventListener("hashchange", () => onUrlChange("hashchange"));
  }

  function setupObservers() {
    const observer = new MutationObserver(() => {
      scheduleRecheck("dom-mutation");
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        scheduleRecheck("tab-visible", 250);
      }
    });
  }

  async function bootstrap() {
    setupNavigationHooks();
    setupObservers();
    setupStorageListener();

    await refreshForcedMode();
    scheduleRecheck("bootstrap", 300);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      void bootstrap();
    }, { once: true });
  } else {
    void bootstrap();
  }
})();
