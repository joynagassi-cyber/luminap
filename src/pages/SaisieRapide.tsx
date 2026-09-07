import { useParams } from 'react-router-dom';

export default function SaisieRapide() {
  const { id } = useParams<{ id: string }>();
  return (
    <div className="min-h-screen bg-background p-4">
      <h1 className="text-xl font-bold text-foreground mb-4">Saisie Rapide</h1>
      <p className="text-muted-foreground">Membre ID: {id}</p>
    </div>
  );
}
