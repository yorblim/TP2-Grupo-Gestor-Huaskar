import { useFeedback } from "../../../hooks/useFeedback";
import { useState, useRef } from "react";

export function ImportPage() {
    const { notify } = useFeedback();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ created: number; errors: string[]; totalErrors: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setResult(null);

    const fd = new FormData();
    fd.append("file", file);

    try {
      const r = await fetch("/api/import/products", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.message || "Error");
      setResult(d.data);
    } catch (err: any) {
      notify(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Importación Masiva</h1>
        <p className="text-sm text-slate-500">Sube un archivo CSV para importar productos</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <h2 className="text-sm font-semibold text-slate-900 mb-3">Formato del CSV</h2>
        <div className="bg-slate-50 rounded-lg p-4 mb-4 font-mono text-xs text-slate-600 overflow-x-auto">
          <pre>{`code,name,price,costPrice,stock,minStock,category
PROD-001,Arroz 1kg,3.50,2.80,100,10,Abarrotes
PROD-002,Aceite 1L,8.00,6.50,50,5,Limpieza`}</pre>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Archivo CSV</label>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-orange-50 file:text-orange-600 hover:file:bg-orange-100"
              required
            />
          </div>

          <button
            type="submit"
            disabled={!file || loading}
            className="bg-orange-500 hover:bg-orange-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            {loading ? "Importando..." : "Importar Productos"}
          </button>
        </form>
      </div>

      {result && (
        <div className={`bg-white rounded-lg shadow-sm border p-6 ${result.created > 0 ? 'border-emerald-200' : 'border-red-200'}`}>
          <h2 className="text-lg font-bold text-slate-900 mb-2">Resultado</h2>
          <p className={`text-sm ${result.created > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {result.created} productos importados correctamente
          </p>
          {result.totalErrors > 0 && (
            <div className="mt-3">
              <p className="text-sm font-medium text-red-600 mb-2">{result.totalErrors} errores:</p>
              <ul className="list-disc list-inside text-xs text-red-500 space-y-1">
                {result.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
