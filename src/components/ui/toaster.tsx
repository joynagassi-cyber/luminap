import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="top-center"
      toastOptions={{
        style: {
          background: "var(--surface)",
          border: "1px solid var(--border)",
          color: "var(--text-primary)",
        },
      }}
    />
  );
}
