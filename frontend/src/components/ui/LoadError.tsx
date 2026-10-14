export function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-900">
    <p className="text-sm">{message} Tus datos ingresados se conservan. Comprueba la conexión y vuelve a intentarlo.</p>
    <button type="button" onClick={onRetry} className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-red-100">Reintentar</button>
  </div>;
}
