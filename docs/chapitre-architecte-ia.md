# Chapitre — Architecter avant de construire

---

J'ai passé des mois à coder avec l'IA. Je voyais une feature, je la demandais, le code arrivait, ça marchait. Je passais d'une fonction à l'autre comme on pose des briques : une de plus, encore une, et ça tient.

Puis j'ai arrêté. Pas parce que ça ne marchait pas. Parce que je ne savais plus pourquoi ça marchait.

J'ai demandé à quatre agents d'analyse de plonger dans le code. Pas pour ajouter quoi que ce soit. Juste pour comprendre ce qui était déjà là. Ce qu'ils ont trouvé m'a forcé à revoir tout ce que je croyais savoir sur le développement.

---

## Le mensonge du stub

La fonction `checkPermission()` dans `rbac.ts` retournait `true`. Toujours. Six rôles étaient définis dans une matrice, mais aucun ne contrôlait rien. L'application se présentait comme sécurisée alors qu'elle était ouverte. Un membre pouvait, en théorie, faire ce qu'un trésorier faisait. Ce n'était pas un bug — c'était un choix architectural non déclaré.

J'aurais pu corriger ça en cinq lignes. Remplacer `return true` par un vrai check. Cinq minutes de code. Mais avant de toucher au clavier, j'ai posé la question que tout codeur ignore trop vite : *« Combien de rôles avons-nous réellement ? »*

Une église n'a pas six rôles. Elle en a quatorze. Pasteur Principal, Ancien, Diacre, Pasteur Associé, Pasteur Jeunesse, Responsable de Département, Trésorier, Trésorier Adjoint, Secrétaire, Secrétaire Adjoint, Comptable, Responsable de Groupe, Bénévole, Membre. Quatorze ensembles de permissions différents. Quatorze niveaux d'accès. Chacun mérite une définition explicite.

J'ai passé plus de temps à lister ces rôles et mapper leurs permissions qu'à écrire le code qui les vérifie. Et c'est exactement ça, la différence entre construire et architecturer.

---

## Le hardcoded qui attendait sa bombe

Le code contenant `orgId: 'org-1'` était répété dans des dizaines d'endroits. Le store, les pages, les migrations, les types. L'application prétendait supporter plusieurs organisations, mais le code ne le pouvait pas. Chaque migration vers le multi-org aurait exigé une chasse au trésor dans quarante fichiers.

Le hardcoded n'était pas un raccourci. C'était une dette non déclarée. Une bombe qui attendait d'être activée par le premier besoin de multi-organisation.

J'aurais pu le corriger en remplaçant `'org-1'` par une constante. Mais la question architecturale était plus profonde : *« Comment l'organisation traverse-t-elle tout le système ? »* La réponse n'était pas un find-replace. C'était un contexte organisationnel injecté depuis le haut — un objet `orgContext` passant par le store, les hooks, les services, les adapters. Une décision de design, pas un correctif.

---

## Deux modèles pour une seule vérité

La base de données avait à la fois `org_units` (l'ancien modèle) et `groups` (le nouveau). Le code frontend faisait des requêtes sur les deux. Les données étaient dupliquées. Les appels croisés. La vérité était distribuée entre deux tables qui prétendaient être la même chose.

Rien n'était cassé. Rien n'était clair non plus.

Un codeur aurait choisi l'un des deux et supprimé l'autre. Un architecte a demandé : *« Quelle est la responsabilité sémantique de chaque modèle ? »* La réponse : `org_units` décrit l'apparence (nom, type, couleur), `groups` décrit la hiérarchie (parent, responsable, appartenances). Ils ne sont pas redondants — ils sont complémentaires. Le problème n'était pas leur existence double. Le problème était qu'aucun des deux n'avait de propriétaire clair.

---

## Le.workflow orphelin

Une transaction passait par DRAFT → PENDING → APPROVED. Un versement, lui, était approuvé instantanément. Deux mécanismes financiers dans la même application, deux règles différentes, aucune justification. C'était une incohérence silencieuse.

J'aurais pu uniformiser en cinq lignes. Mais la question architecturale était : *« Pourquoi ces deux flux existent-ils différemment ? »* La réponse : parce que le workflow des versements n'avait jamais été pensé. Il avait été ajouté quand il fallait transférer de l'argent, sans se demander s'il devait passer par une approbation. Le code fonctionnait. L'architecture non.

---

## Ce que l'analyse a changé

Avant l'analyse, je voyais Lumina comme une collection de features. Après, je l'ai vu comme un système de responsabilités.

Chaque fonction a un propriétaire. Chaque table a une raison d'être. Chaque règle métier a un contexte. Quand on sait qui fait quoi et pourquoi, modifier le système devient un acte de précision, pas de force.

J'ai supprimé trois fonctions de calcul de retards qui existaient mais ne servaient à rien. Pas parce qu'elles étaient mauvaises. Parce qu'elles n'appartenaient à aucun flux métier. Une fonction orpheline est plus dangereuse qu'une fonction absente : elle donne l'illusion d'une logique alors qu'elle n'en est pas une.

J'ai redéfini quatorze rôles avec leurs permissions explicites. Pas pour ajouter de la complexité. Pour retirer l'ambiguïté.

J'ai identifié quatre incohérences architecturales avant d'écrire une seule ligne de correction. Chaque incohérence aurait coûté des heures de debugging plus tard.

---

## La leçon

Coder avec l'IA ne change pas ce qu'est un développeur. Il change ce qu'un développeur doit faire.

Avant, la valeur était dans la production de code. Aujourd'hui, l'IA produit du code mieux et plus vite que quiconque. La valeur est dans la qualité de la pensée avant la production.

Un codeur demande : *« Comment je fais ça ? »*
Un architecte demande : *« Devons-nous le faire, et si oui, comment ça tiendra quand on grandira ? »*

La première question produit une fonction. La seconde produit un système.

L'IA a rendu le code Gratuit. Elle a rendu l'architecture Précieuse.

La question n'est plus *« sais-tu coder ? »*
La question est *« sais-tu penser avant de coder ? »*

---

## L'analyse qui a tout changé

J'ai lancé quatre agents d'analyse en parallèle. Pas pour qu'ils codent. Pour qu'ils lisent.

Chacun a plongé dans une dimension du code : le schéma de base de données avec ses 39 migrations, la logique métier avec ses 11 fichiers, les 38 pages de l'interface, les modèles organisationnels. En vingt minutes, ils ont produit plus de cartographie que moi en vingt jours de lecture manuelle.

Le premier agent m'a montré que Lumina avait 22 tables dans sa base, mais que deux modèles coexistaient : `org_units` pour les anciens groupes, `groups` pour les nouveaux. Le deuxième agent m'a montré que `calculerNombreRetards()` existait mais n'était utilisée que dans une page, et que cette page affichait un chiffre sans aucune logique derrière. Le troisième agent m'a montré que 38 pages importaient des fonctions de 11 fichiers différents, créant un réseau de dépendances qu'aucun humain ne maîtrisait entièrement. Le quatrième agent m'a montré que le RBAC était un stub, que les versements n'avaient pas de workflow, et que `org-1` était répété dans des dizaines d'endroits.

Je n'avais rien vu de tout cela en codant. Pas parce que j'étais moins capable. Parce que je regardais chaque brique individuellement, pas le mur entier.

---

## Le codeur voit des fonctions. L'architecte voit des responsabilités.

Quand on code avec l'IA, on pense en termes de fonctions. Je veux une fonction qui calcule les cotisations. L'IA produit la fonction. On teste. Ça marche. On passe à la suivante.

Mais une fonction n'existe jamais seule. Elle vit dans un fichier. Le fichier appartient à un module. Le module communique avec d'autres modules. Les modules partagent des types, des stores, des hooks. Modifier une fonction, c'est modifier un nœud dans un réseau. Le codeur voit le nœud. L'architecte voit le réseau.

Dans Lumina, la fonction `createCulte()` créait un événement de type CULTE, puis générait automatiquement une cotisation NON_PAYE pour chaque membre actif. C'était une fonction unique, logique, bien écrite. Mais elle dépendait du store Zustand, de PowerSync, de la table cotisations, de la table events, et de la liste des membres. Changer son comportement nécessitait de comprendre cinq dépendances, pas une.

Le codeur aurait dit : Je modifie la fonction, je teste, c'est bon.
L'architecte a dit : Attends. Si je change la génération automatique des cotisations, est-ce que les cultes existants sont impactés ? Est-ce que les membres archivés doivent être inclus ? Est-ce que le montant par défaut de 50 FCFA doit être configurable par culte ?

Trois questions. Zéro ligne de code. Mais trois décisions qui déterminent si la fonction restera stable dans six mois.

---

## La tentation du quick fix

Le plus grand danger quand on code avec l'IA n'est pas de mal coder. C'est de bien coder la mauvaise chose.

J'ai vu des agents produire du code parfait pour un problème qui n'existait pas. L'IA est excellente pour générer du code fonctionnel. Elle est moins bonne pour comprendre pourquoi ce code doit exister. Quand on lui demande de créer une fonction, elle crée la fonction. Elle ne demande pas si la fonction est nécessaire. Elle ne vérifie pas si une fonction similaire existe déjà. Elle ne mesure pas l'impact sur le système entier.

C'est le rôle de l'architecte de poser ces questions. Pas après coup. Avant.

Quand j'ai demandé la suppression du système de retards, ce n'était pas parce que le code était mauvais. C'était parce que le concept n'avait pas sa place dans le produit. Une fonction qui fonctionne mais ne sert rien est un poids, pas un atout. Elle occupe de l'espace mental. Elle crée de la confusion. Elle donne l'illusion d'une logique qui n'existe pas.

Supprimer trois fonctions et douze lignes d'interface n'était pas une minimisation. C'était une clarification.

---

## Le RBAC : quand l'absence de contrôle est pire que le chaos

Le stub RBAC était le problème le plus dangereux de Lumina. Pas parce qu'il causait des erreurs. Parce qu'il donnait l'illusion de la sécurité.

Un développeur qui lit `checkPermission()` et voit `return true` peut penser : Ah, c'est temporaire. Je mettrai le vrai code plus tard. Mais plus tard n'arrive jamais. Le stub reste. Les autres développeurs construisent dessus. L'application grandit avec une porte ouverte.

La solution n'était pas de remplacer `return true` par un vrai check. La solution était de se demander : Quels rôles avons-nous ? Quelles sont leurs permissions réelles ? Comment ces permissions se traduisent-elles dans l'interface ?

J'ai passé du temps à lister les quatorze rôles d'une église, à mapper chaque rôle aux actions qu'il pouvait ou ne pouvait pas effectuer, à définir une hiérarchie numérique. J'ai produit une matrice de 14 par 27 cellules. Chaque cellule était une décision consciente.

Ensuite, seulement, j'ai écrit le code.

Cinq lignes auraient suffi pour activer le contrôle. Quarante lignes de réflexion avaient été nécessaires pour savoir quoi contrôler.

---

## Le hardcoded : l'ennemi silencieux

`orgId: org-1` apparaissait dans le store, dans les pages, dans les migrations, dans les types. Chaque occurrence était inoffensive isolément. Ensemble, elles formaient un réseau de dépendances qui rendait toute migration multi-organisation impossible sans refactorisation majeure.

Un codeur voit un hardcoded. Il le remplace par une constante. C'est fini.

Un architecte voit un hardcoded. Il se demande : Pourquoi cette valeur est-elle hardcodée ? Qui l'a mise là ? Quand ? Pourquoi n'a-t-elle pas été injectée ?

La réponse était simple : parce que Lumina était conçu pour une seule église. Le multi-org n'était pas une priorité. Le hardcoded était un choix délibéré, pas une négligence. Mais un choix délibéré reste un choix. Et les choix ont des conséquences.

Quand le besoin de multi-org est arrivé, le codeur aurait eu à modifier des dizaines de fichiers. L'architecte, lui, avait déjà identifié le problème. Il savait que la solution n'était pas un find-replace. Elle était structurelle : un contexte organisationnel injecté depuis le haut du système, passant par le store, les hooks, les services, les adapters.

Le hardcoded n'était pas un bug. C'était une décision architecturale non documentée. Et les décisions non documentées sont les plus dangereuses, parce que personne ne sait pourquoi elles existent.

---

## La cohérence invisible

Un versement transférait des fonds d'une caisse groupe vers la caisse principale. Il créait deux transactions automatiquement, toutes les deux APPROVED. Aucune approbation intermédiaire. Aucune validation par un second acteur.

Une transaction, elle, passait par DRAFT, PENDING, APPROVED. Deux acteurs potentiels : celui qui crée, celui qui approuve.

Deux mécanismes financiers dans la même application. Deux règles différentes. Aucune justification.

Un codeur aurait uniformisé en modifiant le workflow des versements. Un architecte a demandé : Pourquoi les versements sont-ils différents ? Est-ce une incohérence ou un choix ?

La réponse était : une incohérence. Les versements avaient été ajoutés plus tard, sans penser au workflow. Le code fonctionnait, mais l'architecture non. Corriger cela nécessitait de comprendre le flux complet des versements, pas seulement la création des transactions.

---

## Le pouvoir de l'arrêt

Le geste le plus important que j'ai posé sur Lumina n'a pas été d'écrire du code. Il a été d'arrêter d'en écrire.

Quand on code avec l'IA, on a tendance à continuer. Une feature demandée, une feature produite. Encore. Encore. Encore. La momentum porte. On avance. On sent le progrès.

Mais le progrès sans direction est juste de la vitesse.

J'ai arrêté. J'ai demandé l'analyse. J'ai laissé le code parler à lui-même. Et ce qu'il m'a dit m'a permis de prendre des décisions que je n'aurais pas prises en mode construction.

Supprimer les retards. Redéfinir les rôles. Identifier les incohérences. Documenter les choix.

Chaque décision prise après l'analyse aurait été prise sans analyse. La différence est que, sans analyse, on ne sait pas ce qu'on manque.

---

## Ce que l'IA a changé dans mon métier

Avant l'IA, un développeur passait 80 pour cent de son temps à coder et 20 pour cent à réfléchir. Aujourd'hui, l'IA code. Le développeur passe 80 pour cent de son temps à réfléchir et 20 pour cent à vérifier.

La valeur n'est plus dans la production. Elle est dans la décision.

Un bon architecte IA ne demande pas comment je fais ça. Il demande devons-nous le faire, et si oui, comment ça tiendra. Il produit une cartographie avant de toucher au clavier. Il imagine les échecs avant de déployer. Il supprime avant d'ajouter.

L'IA a tué le codeur. Elle a fait naître l'architecte.

La question n'est plus sais-tu coder ?
La question est sais-tu penser avant de coder ?

Et celui qui sait penser avant de coder ne construit pas des features. Il construit des systèmes.

---

*Ce chapitre est tiré de l'expérience réelle de développement de Lumina, une application de gestion financière pour organisations chrétiennes en Afrique francophone. Chaque exemple cité existe dans le code. Chaque décision décrite a été prise avant toute modification.*
