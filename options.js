(function () {
  "use strict";

  const STORAGE_KEY_FORCED_MODE = "forcedMode";
  const MODE_PRO = "pro";
  const MODE_THINKING = "thinking";
  const DEFAULT_FORCED_MODE = MODE_PRO;
  const extensionBridge = globalThis.__geminiExt || null;

  const form = document.getElementById("mode-form");
  const statusElement = document.getElementById("save-status");

  function isValidMode(value) {
    return value === MODE_PRO || value === MODE_THINKING;
  }

  function normalizeMode(value) {
    return isValidMode(value) ? value : DEFAULT_FORCED_MODE;
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

  async function loadMode() {
    if (!extensionBridge || typeof extensionBridge.storageGet !== "function") {
      showStatus("Storage API is unavailable.", true);
      setSelectedMode(DEFAULT_FORCED_MODE);
      return;
    }

    try {
      const items = await extensionBridge.storageGet(STORAGE_KEY_FORCED_MODE, DEFAULT_FORCED_MODE);
      const mode = normalizeMode(items ? items[STORAGE_KEY_FORCED_MODE] : DEFAULT_FORCED_MODE);
      setSelectedMode(mode);
      showStatus("", false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "unknown-runtime-error";
      showStatus(`Failed to load setting: ${errorMessage}`, true);
      setSelectedMode(DEFAULT_FORCED_MODE);
    }
  }

  async function saveMode(mode) {
    if (!extensionBridge || typeof extensionBridge.storageSet !== "function") {
      showStatus("Storage API is unavailable.", true);
      return;
    }

    try {
      await extensionBridge.storageSet({ [STORAGE_KEY_FORCED_MODE]: mode });
      showStatus("Saved.", false);
      setTimeout(() => {
        if (statusElement && statusElement.textContent === "Saved.") {
          showStatus("", false);
        }
      }, 1200);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "unknown-runtime-error";
      showStatus(`Failed to save setting: ${errorMessage}`, true);
    }
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
      void saveMode(mode);
      updateOptionSelectionState();
    });
  }

  setupEvents();
  void loadMode();
})();
