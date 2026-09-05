import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, BarChart3, Download, X } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import TopHeader from '@/components/TopHeader';
import { reportEngine } from '@/lib/reporting';
import { generateId } from '@/lib/utils';
import type { ReportDefinition } from '@/types';

const METRICS = [
  { value: 'sum', label: 'Somme' },
  { value: 'count', label: 'Comptage' },
  { value: 'avg', label: 'Moyenne' },
];

export default function ReportBuilder() {
  const navigate = useNavigate();
  const [report, setReport] = useState<Partial<ReportDefinition>>({
    dataSource: 'transactions',
    dimensions: [],
    metrics: [],
    filters: [],
    groupBy: [],
  });
  const [showPreview, setShowPreview] = useState(false);
  const [previewResult, setPreviewResult] = useState<any>(null);
  const [error, setError] = useState('');

  const addDimension = (dim: string) => {
    if (!report.dimensions?.includes(dim)) {
      setReport(prev => ({ ...prev, dimensions: [...(prev.dimensions || []), dim] }));
    }
  };

  const removeDimension = (dim: string) => {
    setReport(prev => ({ ...prev, dimensions: prev.dimensions?.filter(d => d !== dim) }));
  };

  const addMetric = (field: string, fn: string, alias: string) => {
    setReport(prev => ({ ...prev, metrics: [...(prev.metrics || []), `${field}:${fn}:${alias || field}`] }));
  };

  const removeMetric = (index: number) => {
    setReport(prev => ({ ...prev, metrics: prev.metrics?.filter((_, i) => i !== index) }));
  };

  const runPreview = async () => {
    if (!report.name || report.dimensions?.length === 0 || report.metrics?.length === 0) {
      setError('Nom, dimensions et métriques requis');
      return;
    }
    setError('');
    const def: ReportDefinition = {
      id: generateId(),
      orgId: 'org-1',
      name: report.name!,
      dataSource: report.dataSource || 'transactions',
      dimensions: report.dimensions || [],
      metrics: report.metrics as any || [],
      filters: report.filters || [],
      groupBy: report.groupBy || [],
      sortBy: null,
      savedBy: 'local-user',
      isTemplate: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    try {
      const result = await reportEngine.execute(def);
      setPreviewResult(result);
      setShowPreview(true);
    } catch (e: any) {
      setError(e.message || 'Erreur lors de l\'exécution');
    }
  };

  return (
    <div className="min-h-screen bg-canvas">
      <TopHeader title="Créer un rapport" />
      <div className="max-w-lg mx-auto px-5 pb-24 pt-16">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-text-secondary text-sm mb-5">
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>

        <h1 className="text-text-primary font-bold text-xl mb-5">Constructeur de rapport</h1>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="text-text-tertiary text-xs mb-1.5 block">Nom du rapport *</label>
            <input
              type="text"
              value={report.name || ''}
              onChange={(e) => setReport(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Ex: Revenus par groupe"
              className="w-full px-4 py-3 rounded-xl text-text-primary text-sm outline-none"
              style={{ backgroundColor: '#212121', border: '1px solid #282828' }}
            />
          </div>

          {/* Dimensions */}
          <div>
            <label className="text-text-tertiary text-xs mb-1.5 block">Dimensions (groupement)</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {(['month', 'year', 'sourceCaisseId', 'categoryId'] as const).map(dim => (
                <button
                  key={dim}
                  onClick={() => addDimension(dim)}
                  disabled={report.dimensions?.includes(dim)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium"
                  style={report.dimensions?.includes(dim) ? { backgroundColor: '#282828', color: '#808080', cursor: 'default' } : { backgroundColor: '#FF6B0020', color: '#FF6B00' }}
                >
                  {dim === 'month' ? 'Mois' : dim === 'year' ? 'Année' : dim === 'sourceCaisseId' ? 'Caisse' : 'Catégorie'}
                </button>
              ))}
            </div>
            {report.dimensions?.map(dim => (
              <div key={dim} className="flex items-center gap-2 mb-1 px-3 py-2 rounded-lg" style={{ backgroundColor: '#282828' }}>
                <span className="text-text-primary text-xs">{dim === 'month' ? 'Mois' : dim === 'year' ? 'Année' : dim === 'sourceCaisseId' ? 'Caisse' : 'Catégorie'}</span>
                <button onClick={() => removeDimension(dim)} style={{ color: '#E51332' }}>
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>

          {/* Metrics */}
          <div>
            <label className="text-text-tertiary text-xs mb-1.5 block">Métriques</label>
            <div className="space-y-2">
              {report.metrics?.map((metric: any, index: number) => {
                const parts = metric.split(':');
                return (
                  <div key={index} className="flex items-center gap-2 p-2 rounded-lg" style={{ backgroundColor: '#212121' }}>
                    <span className="text-text-primary text-xs flex-1">{parts[2] || parts[0]}</span>
                    <span className="text-text-tertiary text-xs">{parts[1]}</span>
                    <button onClick={() => removeMetric(index)} style={{ color: '#E51332' }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
              <button
                onClick={() => addMetric('amount', 'sum', '')}
                className="w-full py-2 rounded-lg text-xs font-medium"
                style={{ backgroundColor: '#282828', color: '#FF6B00' }}
              >
                <Plus className="w-3 h-3 inline mr-1" /> Ajouter une métrique
              </button>
            </div>
          </div>

          {error && <p className="text-xs" style={{ color: '#E51332' }}>{error}</p>}

          <button
            onClick={runPreview}
            className="w-full py-3.5 rounded-full font-semibold text-white transition-all active:scale-95"
            style={{ background: 'linear-gradient(135deg, #FF8533, #FF6B00)' }}
          >
            <BarChart3 className="w-4 h-4 inline mr-2" /> Aperçu du rapport
          </button>
        </div>

        {/* Preview */}
        {showPreview && previewResult && (
          <div className="mt-5 rounded-xl p-4" style={{ backgroundColor: '#212121' }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-text-primary text-sm font-semibold">Aperçu</p>
              <span className="text-text-tertiary text-xs">{previewResult.total} ligne{previewResult.total !== 1 ? 's' : ''}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    {previewResult.columns.map(col => (
                      <th key={col} className="text-left py-1.5 px-2 text-text-tertiary font-medium">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewResult.rows.slice(0, 5).map((row: any, i: number) => (
                    <tr key={i} className="border-t" style={{ borderColor: '#282828' }}>
                      {previewResult.columns.map(col => (
                        <td key={col} className="py-1.5 px-2 text-text-primary">{row[col]}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
