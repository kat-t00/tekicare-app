import { useEffect, useState } from "react";
import {
  useLocalPdf,
  restoreLocalPdf,
  importLocalPdf,
  removeLocalPdf,
} from "../domain/pdf-store";
import { BOOK_URL } from "../domain/library";
export default function LocalPdfSetup() {
  const pdf = useLocalPdf();
  const [retain, setRetain] = useState(true);
  useEffect(() => {
    void restoreLocalPdf();
  }, []);
  return (
    <section className="panel local-pdf-setup" aria-label="公式本文の読み込み">
      <h3>
        {pdf.document
          ? "公式本文をこの画面で読めます"
          : "公式本文を、この画面で読む"}
      </h3>
      {pdf.document ? (
        <>
          <p>
            令和7年度改訂版 · 内容照合済み ·{" "}
            {pdf.retained ? "この端末に保存済み" : "今回のみ読み込み"}
          </p>
          <button onClick={() => void removeLocalPdf()} disabled={pdf.busy}>
            読み込んだPDFを削除
          </button>
        </>
      ) : (
        <>
          <p>
            公式の本編PDFを一度選ぶと、各項目の全文を表示します。ファイルは外部へ送信しません。
          </p>
          <div className="local-pdf-actions">
            <a href={BOOK_URL} target="_blank" rel="noreferrer">
              ① 公式本編PDFを入手
            </a>
            <label className="file-button">
              ② PDFを読み込む
              <input
                type="file"
                accept="application/pdf,.pdf"
                aria-label="公式本編PDFを読み込む"
                disabled={pdf.busy}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void importLocalPdf(file, retain);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
          <label>
            <input
              type="checkbox"
              checked={retain}
              onChange={(e) => setRetain(e.target.checked)}
            />{" "}
            この端末に資料を保存して、次回も使う
          </label>
        </>
      )}
      {pdf.busy && <p role="status">資料の版を確認して読み込んでいます…</p>}
      {pdf.error && <p role="alert">{pdf.error}</p>}
    </section>
  );
}
