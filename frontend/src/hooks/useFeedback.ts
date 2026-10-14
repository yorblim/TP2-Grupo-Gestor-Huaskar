import { useContext } from "react";
import { FeedbackContext } from "../components/ui/feedbackContext";
export function useFeedback() {
  const context = useContext(FeedbackContext);
  if (!context) throw new Error("FeedbackProvider requerido");
  return context;
}
