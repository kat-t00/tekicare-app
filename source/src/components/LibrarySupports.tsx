import LocalPdfPages from "./LocalPdfPages";
import { supportPages } from "../domain/local-pdf";
import SourceFacts from "./SourceFacts";
import type { OfficialCareItem } from "../domain/official-care";
import { officialCatalog, careDomains } from "../domain/official-care";
export default function LibrarySupports({
  items,
}: {
  items: OfficialCareItem[];
}) {
  const domain = careDomains.find((d) => d.id === items[0]?.domain);
  return (
    <section className="library-supports" aria-label="この項目の支援内容">
      <h3>
        この項目の支援内容 <span className="small muted">{items.length}件</span>
      </h3>
      {domain && domain.id !== "basic" && (
        <div className="library-domain-note">
          <p>{domain.conditions}</p>
          <p>{domain.phaseNote}</p>
        </div>
      )}
      {domain &&
        domain.id !== "basic" &&
        items.length > 1 &&
        items[0].supportNumber === 1 && (
          <LocalPdfPages
            pages={Array.from(
              { length: items[0].pdfPage - domain.page - 12 },
              (_, n) => domain.page + 12 + n,
            )}
          />
        )}
      {items.length > 1 && (
        <nav className="support-detail-index" aria-label="支援の目次">
          {items.map((i) => (
            <a href={`#library-${i.id}`} key={i.id}>
              {i.phase !== "共通" ? `${i.phase} · ` : ""}支援{i.supportNumber}{" "}
              {i.title}
            </a>
          ))}
        </nav>
      )}
      {items.map((i) => (
        <section
          className="library-support-detail"
          id={`library-${i.id}`}
          key={i.id}
        >
          <p className="official-code">
            {i.domainLabel} {i.phase !== "共通" ? i.phase : ""} · {i.middle}
          </p>
          <h3>
            支援{i.supportNumber} {i.title}
          </h3>
          {i.small && <p className="small muted">小項目 {i.small}</p>}
          <SourceFacts item={i} />
          <LocalPdfPages pages={supportPages(i)} />
          <a
            href={`${officialCatalog.sourceUrl}#page=${i.pdfPage}`}
            target="_blank"
            rel="noreferrer"
          >
            この支援の原文（本文p.{i.page}）
          </a>
        </section>
      ))}
    </section>
  );
}
