(function () {
  "use strict";

  const STORAGE_KEY_FORCED_MODE = "forcedMode";
  const MODE_PRO = "pro";
  const MODE_THINKING = "thinking";
  const DEFAULT_FORCED_MODE = MODE_PRO;

  const form = document.getElementById("mode-form");
  const statusElement = document.getElementById("save-status");

  function isValidMode(value) {
    return value === MODE_PRO || value === MODE_THINKING;
  }

  function normalizeMode(value) {
    return isValidMode(value) ? value : DEFAULT_FORCED_MODE;
  }

  function getSyncStorage() {
    if (
      typeof chrome === "undefined" ||
      !chrome.storage ||
      !chrome.storage.sync ||
      typeof chrome.storage.sync.get !== "function" ||
      typeof chrome.storage.sync.set !== "function"
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

  function showStatus(message, isError) {
    if (!statusElement) {
      return;
    }
    statusElement.textContent = message;
    statusElement.classList.toggle("error", Boolean(isError));
  }

  function updateOptionSelectionState() {
    if (!form) {
      return;
    }

    const options = form.querySelectorAll(".mode-option");
    options.forEach((option) => {
      const input = option.querySelector('input[name="forcedMode"]');
      option.classList.toggle("is-selected", Boolean(input && input.checked));
    });
  }

  function setSelectedMode(mode) {
    if (!form) {
      return;
    }
    const input = form.querySelector(`input[name="forcedMode"][value="${mode}"]`);
    if (input) {
      input.checked = true;
    }
    updateOptionSelectionState();
  }

  function loadMode() {
    const storage = getSyncStorage();
    if (!storage) {
      showStatus("Storage API is unavailable.", true);
      setSelectedMode(DEFAULT_FORCED_MODE);
      return;
    }

    storage.get({ [STORAGE_KEY_FORCED_MODE]: DEFAULT_FORCED_MODE }, (items) => {
      const runtimeError = getRuntimeErrorMessage();
      if (runtimeError) {
        showStatus(`Failed to load setting: ${runtimeError}`, true);
        setSelectedMode(DEFAULT_FORCED_MODE);
        return;
      }

      const mode = normalizeMode(items ? items[STORAGE_KEY_FORCED_MODE] : DEFAULT_FORCED_MODE);
      setSelectedMode(mode);
      showStatus("", false);
    });
  }

  function saveMode(mode) {
    const storage = getSyncStorage();
    if (!storage) {
      showStatus("Storage API is unavailable.", true);
      return;
    }

    storage.set({ [STORAGE_KEY_FORCED_MODE]: mode }, () => {
      const runtimeError = getRuntimeErrorMessage();
      if (runtimeError) {
        showStatus(`Failed to save setting: ${runtimeError}`, true);
        return;
      }

      showStatus("Saved.", false);
      setTimeout(() => {
        if (statusElement && statusElement.textContent === "Saved.") {
          showStatus("", false);
        }
      }, 1200);
    });
  }

  function setupEvents() {
    if (!form) {
      return;
    }

    form.addEventListener("change", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) {
        return;
      }
      if (target.name !== "forcedMode") {
        return;
      }

      const mode = normalizeMode(target.value);
      saveMode(mode);
      updateOptionSelectionState();
    });
  }

  setupEvents();
  loadMode();
})();
