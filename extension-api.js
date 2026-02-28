(function () {
  "use strict";

  const api = typeof browser !== "undefined"
    ? browser
    : (typeof chrome !== "undefined" ? chrome : null);

  function getRuntimeLastErrorMessage() {
    if (!api || !api.runtime || !api.runtime.lastError) {
      return "";
    }
    return api.runtime.lastError.message || "unknown-runtime-error";
  }

  function getStorageArea(type) {
    if (!api || !api.storage) {
      return null;
    }
    const area = api.storage[type];
    if (!area || typeof area.get !== "function" || typeof area.set !== "function") {
      return null;
    }
    return area;
  }

  function promiseStyleStorageGet(area, query) {
    try {
      const maybePromise = area.get(query);
      if (maybePromise && typeof maybePromise.then === "function") {
        return maybePromise;
      }
    } catch (error) {
      return Promise.reject(error);
    }
    return Promise.reject(new Error("promise-storage-get-unavailable"));
  }

  function callbackStyleStorageGet(area, query) {
    return new Promise((resolve, reject) => {
      area.get(query, (items) => {
        const runtimeError = getRuntimeLastErrorMessage();
        if (runtimeError) {
          reject(new Error(runtimeError));
          return;
        }
        resolve(items);
      });
    });
  }

  async function storageGetFromArea(area, query) {
    try {
      return await promiseStyleStorageGet(area, query);
    } catch (error) {
      return callbackStyleStorageGet(area, query);
    }
  }

  function promiseStyleStorageSet(area, values) {
    try {
      const maybePromise = area.set(values);
      if (maybePromise && typeof maybePromise.then === "function") {
        return maybePromise;
      }
    } catch (error) {
      return Promise.reject(error);
    }
    return Promise.reject(new Error("promise-storage-set-unavailable"));
  }

  function callbackStyleStorageSet(area, values) {
    return new Promise((resolve, reject) => {
      area.set(values, () => {
        const runtimeError = getRuntimeLastErrorMessage();
        if (runtimeError) {
          reject(new Error(runtimeError));
          return;
        }
        resolve();
      });
    });
  }

  async function storageSetOnArea(area, values) {
    try {
      await promiseStyleStorageSet(area, values);
    } catch (error) {
      await callbackStyleStorageSet(area, values);
    }
  }

  async function storageGet(storageKey, defaultValue) {
    const query = { [storageKey]: defaultValue };
    const candidates = ["sync", "local"];

    let lastError = null;
    for (const candidate of candidates) {
      const area = getStorageArea(candidate);
      if (!area) {
        continue;
      }

      try {
        const result = await storageGetFromArea(area, query);
        return result || query;
      } catch (error) {
        lastError = error;
      }
    }

    if (lastError) {
      throw lastError;
    }
    return query;
  }

  async function storageSet(values) {
    const candidates = ["sync", "local"];
    let lastError = null;

    for (const candidate of candidates) {
      const area = getStorageArea(candidate);
      if (!area) {
        continue;
      }

      try {
        await storageSetOnArea(area, values);
        return;
      } catch (error) {
        lastError = error;
      }
    }

    if (lastError) {
      throw lastError;
    }
    throw new Error("storage-api-unavailable");
  }

  function addStorageChangedListener(listener) {
    if (!api || !api.storage || !api.storage.onChanged || typeof api.storage.onChanged.addListener !== "function") {
      return false;
    }
    api.storage.onChanged.addListener(listener);
    return true;
  }

  function openOptionsPage() {
    if (!api || !api.runtime || typeof api.runtime.openOptionsPage !== "function") {
      return false;
    }
    api.runtime.openOptionsPage();
    return true;
  }

  globalThis.__geminiExt = {
    api,
    getRuntimeLastErrorMessage,
    getStorageArea,
    storageGet,
    storageSet,
    addStorageChangedListener,
    openOptionsPage
  };
})();