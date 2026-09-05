import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import TopHeader from '@/components/TopHeader';
import { formDefinitionRepo, formSubmissionRepo, validateFormSubmission, mapFormFields } from '@/lib/formSystem';
import { generateId } from '@/lib/utils';
import type { FormDefinition } from '@/types';

export default function FormFill() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormDefinition | null>(null);
  const [data, setData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    formDefinitionRepo.get(id!).then(f => {
      setForm(f);
      setLoading(false);
    });
  }, [id]);

  const handleChange = (key: string, value: any) => {
    setData(prev => ({ ...prev, [key]: value }));
    setErrors([]);
  };

  const handleSubmit = async () => {
    if (!form) return;
    const validation = validateFormSubmission(form, data);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }
    const mapped = mapFormFields(form, data);
    const submission = await formSubmissionRepo.create({
      orgId: 'org-1',
      formDefinitionId: form.id,
      formVersion: form.version,
      submittedBy: 'local-user',
      data,
      status: 'SUBMITTED',
    });
    setSubmitted(true);
    setTimeout(() => navigate('/forms'), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <p className="text-text-tertiary text-sm">Chargement...</p>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen bg-canvas">
        <TopHeader title="Formulaire" />
        <div className="max-w-lg mx-auto px-5 pb-24 pt-16">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-text-secondary text-sm mb-5">
            <ArrowLeft className="w-4 h-4" /> Retour
          </button>
          <p className="text-text-tertiary text-sm">Formulaire introuvable</p>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas">
      <TopHeader title={form.name} />
      <div className="max-w-lg mx-auto px-5 pb-24 pt-16">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-text-secondary text-sm mb-5">
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>

        {form.description && (
          <p className="text-text-tertiary text-sm mb-5">{form.description}</p>
        )}

        {errors.length > 0 && (
          <div className="mb-4 p-3 rounded-xl text-sm" style={{ backgroundColor: '#E5133220', color: '#E51332' }}>
            {errors[0]}
          </div>
        )}

        {submitted ? (
          <div className="text-center py-16">
            <CheckCircle className="w-16 h-16 mx-auto mb-4" style={{ color: '#1DB954' }} />
            <p className="text-text-primary font-bold text-lg mb-2">Soumis avec succès !</p>
            <p className="text-text-tertiary text-sm">Redirection en cours...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {form.fields.map((field) => (
              <div key={field.key}>
                <label className="text-text-tertiary text-xs mb-1.5 block">
                  {field.label} {field.required && <span style={{ color: '#E51332' }}>*</span>}
                </label>
                {field.type === 'boolean' ? (
                  <select
                    value={data[field.key] ?? ''}
                    onChange={(e) => handleChange(field.key, e.target.value === 'true')}
                    className="w-full px-4 py-3 rounded-xl text-text-primary text-sm outline-none appearance-none"
                    style={{ backgroundColor: '#212121', border: '1px solid #282828' }}
                  >
                    <option value="">— Sélectionner —</option>
                    <option value="true">Oui</option>
                    <option value="false">Non</option>
                  </select>
                ) : field.type === 'select' && field.options ? (
                  <select
                    value={data[field.key] ?? ''}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    className="w-full px-4 py-3 rounded-xl text-text-primary text-sm outline-none appearance-none"
                    style={{ backgroundColor: '#212121', border: '1px solid #282828' }}
                  >
                    <option value="">— Sélectionner —</option>
                    {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                ) : field.type === 'textarea' ? (
                  <textarea
                    value={data[field.key] ?? ''}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    placeholder={field.label}
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl text-text-primary text-sm outline-none resize-none"
                    style={{ backgroundColor: '#212121', border: '1px solid #282828' }}
                  />
                ) : (
                  <input
                    type={field.type === 'number' || field.type === 'currency' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                    value={data[field.key] ?? ''}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    placeholder={field.label}
                    className="w-full px-4 py-3 rounded-xl text-text-primary text-sm outline-none"
                    style={{ backgroundColor: '#212121', border: '1px solid #282828' }}
                  />
                )}
              </div>
            ))}
            <button
              onClick={handleSubmit}
              className="w-full py-4 rounded-full font-semibold text-white transition-all active:scale-95"
              style={{ backgroundColor: '#FF6B00' }}
            >
              Soumettre
            </button>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
