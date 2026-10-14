import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { FeedbackContext } from "./feedbackContext";
import { Modal } from "./Modal";
export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [question, setQuestion] = useState<{ message: string; action: string } | null>(null);
  const [notice, setNotice] = useState<{ message: string; kind: "success" | "error" } | null>(null);
  const answer = useRef<((value: boolean) => void) | null>(null);
  const confirm = useCallback((message: string, action = "Confirmar") => {
    answer.current?.(false);
    setQuestion({ message, action });
    return new Promise<boolean>(resolve => { answer.current = resolve; });
  }, []);
  const notify = useCallback((message: string, kind: "success" | "error" = "error") => setNotice({ message, kind }), []);
  const respond = (value: boolean) => { answer.current?.(value); answer.current = null; setQuestion(null); };
  useEffect(() => () => { answer.current?.(false); }, []);
  return <FeedbackContext.Provider value={{ confirm, notify }}>
    {children}
    {notice && <div role={notice.kind === "error" ? "alert" : "status"} className={`fixed bottom-4 right-4 z-[100] max-w-md rounded-xl border p-4 shadow-xl ${notice.kind === "error" ? "bg-red-50 border-red-200 text-red-900" : "bg-emerald-50 border-emerald-200 text-emerald-900"}`}>
      <p className="font-semibold">{notice.kind === "error" ? "No se pudo completar la operación" : "Operación completada"}</p>
      <p className="mt-1 text-sm">{notice.message}</p>
      <button type="button" onClick={() => setNotice(null)} className="mt-2 rounded border border-current px-3 py-1 text-sm">Cerrar aviso</button>
    </div>}
    {question && <Modal title="Confirmar operación" onClose={() => respond(false)}>
      <p>{question.message}</p>
      <div className="flex flex-wrap justify-end gap-3">
        <button type="button" onClick={() => respond(false)} className="rounded-lg border border-slate-300 px-4 py-2 hover:bg-slate-100">Volver sin cambios</button>
        <button type="button" onClick={() => respond(true)} className="rounded-lg bg-orange-600 px-4 py-2 font-medium text-white hover:bg-orange-700">{question.action}</button>
      </div>
    </Modal>}
  </FeedbackContext.Provider>;
}
