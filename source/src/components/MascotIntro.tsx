import { useEffect, useRef } from "react";

export default function MascotIntro({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const node = dialog.current;
    node?.showModal();
    return () => {
      node?.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      className="mascot-dialog"
      ref={dialog}
      aria-label="適ケアくんの自己紹介"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <section className="mascot-intro">
        <img src="/tekicare-kun.png" alt="適ケアくん" />
        <p>
          あ、見つかっちゃった。ぼく、適ケアくんだ。ケアマネジメントってむずかしーよな。でもな、ぼくみたいな
          "もやもや"のなかに、"にーず"とか"おもい"ってのがあるみたいだ。だからぼくは、このもやもやの真ん中で、みてるぞ。おいらが、適ケアくんだ。よろしくな。
        </p>
        <button onClick={onClose}>閉じる</button>
      </section>
    </dialog>
  );
}
