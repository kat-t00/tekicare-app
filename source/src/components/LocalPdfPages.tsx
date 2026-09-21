import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import { useLocalPdf } from "../domain/pdf-store";
function Page({
  doc,
  number,
  layout,
}: {
  doc: PDFDocumentProxy;
  number: number;
  layout: boolean;
}) {
  const container = useRef<HTMLDivElement>(null),
    canvas = useRef<HTMLCanvasElement>(null);
  const [near, setNear] = useState(false),
    [text, setText] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    const node = container.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          observer.disconnect();
        }
      },
      { rootMargin: "700px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!near) return;
    let live = true;
    let render: RenderTask | undefined;
    void (async () => {
      try {
        const page = await doc.getPage(number);
        if (!live) return;
        const content = await page.getTextContent();
        if (!live) return;
        setText(
          content.items
            .map((i) => ("str" in i ? i.str + (i.hasEOL ? "\n" : "") : ""))
            .join(""),
        );
        if (layout && canvas.current) {
          const viewport = page.getViewport({ scale: 1.7 });
          const c = canvas.current;
          c.width = viewport.width;
          c.height = viewport.height;
          render = page.render({ canvas: c, viewport });
          await render.promise;
        }
      } catch (e) {
        if (live)
          setError(
            e instanceof Error
              ? e.message
              : "このページを表示できませんでした。",
          );
      }
    })();
    return () => {
      live = false;
      render?.cancel();
    };
  }, [doc, number, near, layout]);
  return (
    <div className="local-pdf-page" ref={container}>
      <h4>本文 p.{number - 12}</h4>
      {error ? (
        <p role="alert">{error}</p>
      ) : layout ? (
        <div className="pdf-page-scroll">
          <canvas
            ref={canvas}
            aria-label={`本文${number - 12}ページの原文レイアウト`}
          />
        </div>
      ) : (
        <div className="pdf-readable-text">
          {text || "本文を読み込んでいます…"}
        </div>
      )}
    </div>
  );
}
export default function LocalPdfPages({ pages }: { pages: number[] }) {
  const { document } = useLocalPdf();
  const [layout, setLayout] = useState(false);
  if (!document) return null;
  return (
    <section className="local-pdf-reader" aria-label="読み込んだ資料の全文">
      <div className="pdf-reader-toolbar">
        <h3>公式本文・全文</h3>
        <div role="group" aria-label="本文の表示方法">
          <button aria-pressed={!layout} onClick={() => setLayout(false)}>
            文字で読む
          </button>
          <button aria-pressed={layout} onClick={() => setLayout(true)}>
            原文のレイアウト
          </button>
        </div>
      </div>
      <p className="small muted">
        読み込んだPDFの本文です。表の列・図・注記の位置は「原文のレイアウト」で確認できます。
      </p>
      {pages.map((p) => (
        <Page
          key={`${p}-${layout}`}
          doc={document}
          number={p}
          layout={layout}
        />
      ))}
    </section>
  );
}
