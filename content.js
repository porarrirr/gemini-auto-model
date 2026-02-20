(function () {
  "use strict";

  const LOG_PREFIX = "[gemini-pro-auto-default]";
  const MODEL_TARGET_REGEX = /\bpro\b/i;
  const MODEL_HINT_REGEX = /(pro|flash|model|2\.5|高速|thinking)/i;
  const DISALLOWED_OPTION_REGEX = /(upgrade|trial|plan|subscription|google ai pro|upgrade to|無料|アップグレード)/i;

  const RECHECK_DEBOUNCE_MS = 450;
  const RETRY_DELAY_MS = 1200;
  const MAX_RETRIES = 3;
  const MIN_ATTEMPT_INTERVAL_MS = 350;
  const MENU_WAIT_MS = 1400;
  const VERIFY_WAIT_MS = 1600;

  const state = {
    inFlight: false,
    retryCount: 0,
    lastAttemptAt: 0,
    scheduledTimer: null,
    lastKnownUrl: location.href
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

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
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

  function collectElements(selectors) {
    const found = [];
    const seen = new Set();
    selectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((element) => {
        if (!seen.has(element)) {
          seen.add(element);
          found.push(element);
        }
      });
    });
    return found;
  }

  function scoreModelButton(element) {
    const text = normalizeText(element.textContent);
    let score = 0;

    if (element.matches('button[aria-haspopup="menu"]')) {
      score += 30;
    }
    if (MODEL_HINT_REGEX.test(text)) {
      score += 20;
    }
    if (MODEL_TARGET_REGEX.test(text) || /\bflash\b/i.test(text) || /高速/.test(text)) {
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

    const candidates = combined
      .filter((element) => canClick(element))
      .filter((element) => MODEL_HINT_REGEX.test(normalizeText(element.textContent)) || MODEL_HINT_REGEX.test(element.getAttribute("aria-label") || ""))
      .map((element) => ({ element, score: scoreModelButton(element) }))
      .sort((a, b) => b.score - a.score);

    return candidates.length > 0 ? candidates[0].element : null;
  }

  function getCurrentModelText() {
    const modelButton = findModelButton();
    if (!modelButton) {
      return "";
    }
    const buttonText = normalizeText(modelButton.textContent);
    if (buttonText) {
      return buttonText;
    }
    return normalizeText(modelButton.getAttribute("aria-label"));
  }

  function isProSelected() {
    const currentModelText = getCurrentModelText();
    return MODEL_TARGET_REGEX.test(currentModelText);
  }

  function scoreOptionElement(element) {
    const text = normalizeText(element.textContent);
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

  function findProOption() {
    const optionElements = collectElements(optionSelectors)
      .filter((element) => canClick(element))
      .filter((element) => {
        const text = normalizeText(element.textContent);
        return MODEL_TARGET_REGEX.test(text);
      })
      .map((element) => ({ element, score: scoreOptionElement(element) }))
      .sort((a, b) => b.score - a.score);

    if (optionElements.length === 0) {
      return null;
    }
    return optionElements[0].element;
  }

  async function waitForProOption(timeoutMs) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
      const option = findProOption();
      if (option) {
        return option;
      }
      await wait(100);
    }
    return null;
  }

  async function openModelMenu() {
    const modelButton = findModelButton();
    if (!modelButton) {
      log("debug", "Model button was not found.");
      return false;
    }
    if (!clickElement(modelButton)) {
      log("debug", "Model button exists but could not be clicked.");
      return false;
    }
    const option = await waitForProOption(MENU_WAIT_MS);
    return Boolean(option);
  }

  async function selectProOption() {
    const option = await waitForProOption(500);
    if (!option) {
      log("debug", "Pro option was not found in menu.");
      return false;
    }
    if (!clickElement(option)) {
      log("debug", "Pro option exists but could not be clicked.");
      return false;
    }

    const startedAt = Date.now();
    while (Date.now() - startedAt < VERIFY_WAIT_MS) {
      if (isProSelected()) {
        return true;
      }
      await wait(120);
    }
    return isProSelected();
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
      void ensureProSelected(reason);
    }, delay);
  }

  async function ensureProSelected(reason) {
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
      if (isProSelected()) {
        resetRetryCounter();
        return;
      }

      const opened = await openModelMenu();
      if (!opened) {
        throw new Error("model-menu-not-opened");
      }

      const selected = await selectProOption();
      if (!selected) {
        throw new Error("pro-selection-failed");
      }

      resetRetryCounter();
      log("info", `Model switched to Pro (${reason}).`);
    } catch (error) {
      state.retryCount += 1;
      const errorCode = error instanceof Error ? error.message : String(error);

      if (state.retryCount <= MAX_RETRIES) {
        log("debug", `Retrying Pro selection (${state.retryCount}/${MAX_RETRIES}) due to ${errorCode}.`);
        scheduleRecheck(`${reason}:retry`, RETRY_DELAY_MS);
      } else {
        log("warn", `Pro selection skipped after ${MAX_RETRIES} retries: ${errorCode}.`);
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

  function bootstrap() {
    setupNavigationHooks();
    setupObservers();
    scheduleRecheck("bootstrap", 300);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrap, { once: true });
  } else {
    bootstrap();
  }
})();
