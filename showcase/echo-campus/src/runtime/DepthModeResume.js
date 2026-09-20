const PREFIX = "echo-campus-depth-resume:";
const DB_NAME = "echo-campus-depth-import";
function openFiles() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore("files");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function storedFile(key, file, { removeOnly = false } = {}) {
  const db = await openFiles();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction("files", "readwrite"), store = tx.objectStore("files");
      let result;
      if (removeOnly) store.delete(key);
      else if (file) store.put(file, key);
      else { const read = store.get(key); read.onsuccess = () => { result = read.result; store.delete(key); }; }
      tx.oncomplete = () => resolve(result); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error);
    });
  } finally { db.close(); }
}
async function discardStoredFile(key) { await storedFile(key, null, { removeOnly: true }); }
export async function prepareStandardDepthResume({ id, options }, { currentUrl = location.href, storage = sessionStorage, saveFile = storedFile, removeFile = discardStoredFile } = {}) {
  const token = crypto.randomUUID(), copy = { ...options }, file = copy.file;
  delete copy.file;
  let fileSaved = false;
  try {
    if (file) { await saveFile(token, file); fileSaved = true; }
    storage.setItem(PREFIX + token, JSON.stringify({ id, options: copy, hasFile: !!file }));
    const url = new URL(currentUrl); url.searchParams.set("depth", "standard"); url.searchParams.set("depthResume", token);
    return url.href;
  } catch (error) {
    try { storage.removeItem(PREFIX + token); } catch {}
    if (fileSaved) try { await removeFile(token); } catch {}
    throw error;
  }
}
export async function discardStandardDepthResume(url, { storage = sessionStorage, removeFile = discardStoredFile } = {}) {
  const token = new URL(url).searchParams.get("depthResume");
  if (!token || !/^[a-f0-9-]{36}$/i.test(token)) return;
  const raw = storage.getItem(PREFIX + token);
  storage.removeItem(PREFIX + token);
  if (!raw) return;
  const record = JSON.parse(raw);
  if (record.hasFile) await removeFile(token);
}
// Preparing a large local import is asynchronous. A later scene selection must
// win, including when this old transfer finishes after the new scene is ready.
export async function resumeDepthIfCurrent(selection, { isCurrent, prepare = prepareStandardDepthResume, discard = discardStandardDepthResume, replace = url => location.replace(url) } = {}) {
  const url = await prepare(selection);
  if (!isCurrent()) { await discard(url); return false; }
  replace(url);
  return true;
}
export async function consumeStandardDepthResume({ search = location.search, storage, loadFile = storedFile } = {}) {
  const token = new URLSearchParams(search).get("depthResume");
  if (!token || !/^[a-f0-9-]{36}$/i.test(token)) return null;
  // Ordinary scene startup must not touch storage on browsers that deny it.
  try { storage ??= globalThis.sessionStorage; } catch { return null; }
  if (!storage) return null;
  let raw;
  try { raw = storage.getItem(PREFIX + token); } catch { return null; }

  if (!raw) return null;
  const record = JSON.parse(raw);
  if (record.hasFile) {
    record.options.file = await loadFile(token);
    if (!record.options.file) throw new Error("场景文件恢复失败，请重新选择文件");
  }
  storage.removeItem(PREFIX + token);
  return record;
}
