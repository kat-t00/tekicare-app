import { useState } from "react";
import { Copy } from "lucide-react";
import {
  assessmentParagraph,
  assessmentSource,
  assessmentText,
  generateAssessmentParagraph,
} from "../domain/pipeline";
import type { Result } from "../domain/schema";
export default function RecordEditor({
  result,
  id,
  name,
  onChange,
  copy,
}: {
  result: Result;
  id: number;
  name: string;
  onChange: (r: Result) => void;
  copy: (text: string) => Promise<boolean>;
}) {
  const [preview, setPreview] = useState(false),
    [message, setMessage] = useState(""),
    [undo, setUndo] = useState<{ text: string; source: string } | null>(null);
  const value = assessmentParagraph(result, id),
    generated = generateAssessmentParagraph(result, id),
    source = assessmentSource(result, id);
  const set = (text: string, base = source) =>
    onChange({
      ...result,
      assessmentDrafts: {
        ...result.assessmentDrafts,
        [id]: { text, source: base },
      },
    });
  return (
    <div className="record-editor">
      <label htmlFor={`draft-${id}`}>記録文</label>
      <textarea
        id={`draft-${id}`}
        aria-label={`${id} ${name}の記録文`}
        value={value}
        maxLength={24000}
        rows={Math.max(3, Math.min(8, Math.ceil(value.length / 50)))}
        placeholder="情報を追記できます"
        onChange={(e) => {
          set(e.target.value);
          setPreview(false);
          setUndo(null);
          setMessage("");
        }}
      />
      {result.assessmentDrafts?.[id] &&
        result.assessmentDrafts[id].source !== source && (
          <p role="alert" className="draft-warning">
            参照する原文が変わりました。編集文は保持しています。原文と照合してください。
          </p>
        )}
      <div className="draft-actions">
        <button
          aria-label={`${id} ${name}をコピー`}
          disabled={!value}
          onClick={async () =>
            setMessage(
              (await copy(assessmentText(result, id)))
                ? "コピーしました。"
                : "コピーできませんでした。文章を選択してコピーしてください。",
            )
          }
        >
          <Copy size={18} />
          記録文をコピー
        </button>
        <button
          disabled={value === generated}
          onClick={() => {
            setPreview(true);
            setMessage("");
          }}
        >
          原文ベースの文と比較
        </button>
        {undo && (
          <button
            onClick={() => {
              set(undo.text, undo.source);
              setUndo(null);
              setMessage("置き換え前の編集文に戻しました。");
            }}
          >
            置き換えを取り消す
          </button>
        )}
      </div>
      {preview && (
        <section
          className="replacement-preview"
          aria-label={`${id} ${name}の置き換え確認`}
        >
          <h4>この項目の編集文を置き換えますか？</h4>
          <div className="replacement-columns">
            <div>
              <strong>現在の編集文</strong>
              <p>{value || "（空欄）"}</p>
            </div>
            <div>
              <strong>原文ベースの文</strong>
              <p>{generated || "（空欄）"}</p>
            </div>
          </div>
          <p>
            置き換えると、この項目の手入力・追記が上の原文ベースの文に変わります。
          </p>
          <div className="draft-actions">
            <button
              onClick={() => {
                setUndo(
                  result.assessmentDrafts?.[id] ?? { text: value, source },
                );
                set(generated);
                setPreview(false);
                setMessage(
                  "原文ベースの文に置き換えました。取り消しできます。",
                );
              }}
            >
              この内容に置き換える
            </button>
            <button onClick={() => setPreview(false)}>キャンセル</button>
          </div>
        </section>
      )}
      {message && (
        <p className="inline-notice" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
