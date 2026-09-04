import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="top-center"
      toastOptions={{
        style: {
          background: '#212121',
          border: '1px solid #282828',
          color: '#FFFFFF',
        },
      }}
    />
  );
}
