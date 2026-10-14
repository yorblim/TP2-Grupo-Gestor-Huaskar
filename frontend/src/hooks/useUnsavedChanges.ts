import { useEffect, useRef } from "react";
import { useBlocker } from "react-router-dom";
import { useFeedback } from "./useFeedback";
export function useUnsavedChanges(dirty: boolean) {
  const { confirm } = useFeedback();
  const handling = useRef(false);
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && currentLocation.pathname !== nextLocation.pathname);
  useEffect(() => {
    if (blocker.state !== "blocked" || handling.current) return;
    handling.current = true;
    void confirm("Hay datos sin guardar. ¿Quieres salir y descartar el formulario?", "Salir sin guardar").then(yes => {
      if (yes) blocker.proceed(); else blocker.reset();
    }).finally(() => { handling.current = false; });
  }, [blocker, confirm]);
  useEffect(() => {
    if (!dirty) return;
    const prevent = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", prevent);
    return () => window.removeEventListener("beforeunload", prevent);
  }, [dirty]);
}
