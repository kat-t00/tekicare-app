import { useSyncExternalStore } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { pdfMatchesEdition } from "./local-pdf";
type State = {
  document: PDFDocumentProxy | null;
  busy: boolean;
  error: string;
  retained: boolean;
};
let state: State = { document: null, busy: false, error: "", retained: false };
let generation = 0,
  started = false;
const listeners = new Set<() => void>();
const emit = (patch: Partial<State>) => {
  state = { ...state, ...patch };
  listeners.forEach((f) => f());
};
export function useLocalPdf() {
  return useSyncExternalStore(
    (f) => {
      listeners.add(f);
      return () => {
        listeners.delete(f);
      };
    },
    () => state,
  );
}
async function database() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open("tekicare-official-pdf", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("document");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function stored(
  action: "read" | "write" | "delete",
  bytes?: ArrayBuffer,
): Promise<ArrayBuffer | undefined> {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(
        "document",
        action === "read" ? "readonly" : "readwrite",
      );
      const store = tx.objectStore("document");
      const req =
        action === "read"
          ? store.get("r7")
          : action === "write"
            ? store.put(bytes, "r7")
            : store.delete("r7");
      tx.oncomplete = () => resolve(action === "read" ? req.result : undefined);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}
async function load(bytes: ArrayBuffer, retain: boolean, restoring = false) {
  const current = ++generation;
  emit({ busy: true, error: "" });
  try {
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    const hash = Array.from(new Uint8Array(digest), (b) =>
      b.toString(16).padStart(2, "0"),
    ).join("");
    if (!pdfMatchesEdition(hash))
      throw new Error(
        "対応する令和7年度改訂版と内容が一致しません。下の公式資料から本編冊子をダウンロードしてください。現在の資料は変更していません。",
      );
    const { openPdf } = await import("./pdf-engine");
    const doc = await openPdf(new Uint8Array(bytes.slice(0)));
    if (current !== generation) {
      await doc.destroy();
      return;
    }
    let retained = false,
      warning = "";
    try {
      if (retain) {
        if (!restoring) await stored("write", bytes);
        retained = true;
      } else if (!restoring) {
        await stored("delete");
      }
    } catch {
      warning =
        "このブラウザでは資料を保存できません。今回は読めますが、再読み込み後はPDFを選び直してください。";
    }
    if (current !== generation) {
      await doc.destroy();
      return;
    }
    const previous = state.document;
    emit({ document: doc, retained, busy: false, error: warning });
    if (previous) await previous.destroy();
  } catch (e) {
    if (current === generation)
      emit({
        busy: false,
        error:
          e instanceof Error
            ? e.message
            : "PDFを読み込めませんでした。もう一度お試しください。",
      });
  }
}
export async function importLocalPdf(file: File, retain: boolean) {
  if (file.size > 40 * 1024 * 1024) {
    emit({ error: "40MB以下の公式本編PDFを選んでください。" });
    return;
  }
  try {
    await load(await file.arrayBuffer(), retain);
  } catch {
    emit({
      error:
        "ファイルを読み取れませんでした。保存先とファイルを確認して選び直してください。",
    });
  }
}
export async function restoreLocalPdf() {
  if (started) return;
  started = true;
  const before = generation;
  try {
    const bytes = await stored("read");
    if (bytes && before === generation) await load(bytes, true, true);
  } catch {
    /* Storage is optional. */
  }
}
export async function removeLocalPdf() {
  ++generation;
  const previous = state.document;
  emit({ document: null, busy: false, error: "", retained: false });
  try {
    await stored("delete");
  } catch {
    emit({
      error:
        "保存資料を削除できませんでした。ブラウザのサイトデータ設定から削除してください。",
    });
  }
  if (previous) await previous.destroy();
}
