import { useEffect, useRef, useId, type ReactNode } from "react";
export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const element = ref.current;
    const previous = document.activeElement as HTMLElement | null;
    element?.showModal();
    return () => { element?.close(); previous?.focus(); };
  }, []);
  return <dialog ref={ref} aria-labelledby={id} onCancel={e => { e.preventDefault(); onClose(); }} className="m-auto w-[calc(100%-2rem)] max-w-2xl max-h-[85vh] rounded-xl border border-slate-200 p-0 text-slate-900 shadow-2xl backdrop:bg-black/50">
    <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
      <h2 id={id} className="text-lg font-bold">{title}</h2>
      <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100">Cerrar</button>
    </div>
    <div className="space-y-4 overflow-y-auto p-5">{children}</div>
  </dialog>;
}
