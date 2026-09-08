import { useParams } from 'react-router-dom';
import { IonPage, IonHeader, IonContent, IonTitle, IonToolbar } from '@ionic/react';

export default function SaisieRapide() {
  const { id } = useParams<{ id: string }>();
  return (
    <IonPage>
      <IonHeader><IonToolbar><IonTitle>SaisieRapide</IonTitle></IonToolbar></IonHeader>
      <IonContent className="bg-canvas">
    <div className="min-h-screen bg-background p-4">
      <h1 className="text-xl font-bold text-foreground mb-4">Saisie Rapide</h1>
      <p className="text-muted-foreground">Membre ID: {id}</p>
    </div>
      </IonContent>
    </IonPage>
  );
}
