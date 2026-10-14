import { createContext } from "react";
export interface Feedback {
  confirm: (message: string, action?: string) => Promise<boolean>;
  notify: (message: string, kind?: "success" | "error") => void;
}
export const FeedbackContext = createContext<Feedback | null>(null);
