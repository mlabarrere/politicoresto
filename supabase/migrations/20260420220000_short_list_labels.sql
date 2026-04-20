begin;

-- Les list_label des legislatives etaient trop longs pour la grille
-- (ex: "Rassemblement national et allies (Union Extreme Droite)") et se
-- faisaient massacrer par shortName() cote front. On les remplace par des
-- libelles concis, immediatement lisibles dans une tuile.
--
-- Le code nuance (UXD, NUP, ENS, UDC, etc.) reste disponible pour le filtrage
-- et l'affichage debug.

update public.election_result set list_label = 'RN + allies'
  where list_label in (
    'Rassemblement national et allies (Union Extreme Droite)',
    'Rassemblement national et alliés (Union Extrême Droite)',
    'Rassemblement national'
  );

update public.election_result set list_label = 'NFP'
  where list_label = 'Nouveau Front populaire';

update public.election_result set list_label = 'Ensemble'
  where list_label in (
    'Ensemble pour la Republique',
    'Ensemble (majorité présidentielle)',
    'Ensemble (majorite presidentielle)',
    'La Republique en Marche + MoDem'
  );

update public.election_result set list_label = 'NUPES'
  where list_label = 'Nouvelle Union populaire écologique et sociale (NUPES)';

update public.election_result set list_label = 'UDC'
  where list_label in (
    'Les Republicains + UDI + Divers droite',
    'Les Républicains + UDI + DVD',
    'Union de la droite et du centre (LR + UDI + DVD)'
  );

update public.election_result set list_label = 'LFI'
  where list_label = 'La France insoumise';

update public.election_result set list_label = 'PS-PRG'
  where list_label = 'Parti socialiste + PRG';

update public.election_result set list_label = 'EELV'
  where list_label in ('Ecologistes (EELV)', 'Europe Ecologie Les Verts');

update public.election_result set list_label = 'Écolos'
  where list_label in (
    'Ecologistes',
    'Ecologistes (hors NUPES)'
  );

update public.election_result set list_label = 'PCF'
  where list_label = 'Parti communiste';

update public.election_result set list_label = 'PS + PRG'
  where list_label = 'Parti socialiste - PRG';

update public.election_result set list_label = 'FN'
  where list_label = 'Front national';

update public.election_result set list_label = 'UMP'
  where list_label = 'Union pour un Mouvement Populaire';

update public.election_result set list_label = 'FG'
  where list_label = 'Front de Gauche';

update public.election_result set list_label = 'DLF'
  where list_label in (
    'Debout la France',
    'Debout la Republique',
    'Debout la Republique',
    'Divers souverainiste'
  );

update public.election_result set list_label = 'Reconquête'
  where list_label = 'Reconquete';

update public.election_result set list_label = 'DVG'
  where list_label = 'Divers gauche';

update public.election_result set list_label = 'DVD'
  where list_label = 'Divers droite';

update public.election_result set list_label = 'EXG'
  where list_label = 'Extreme gauche';

update public.election_result set list_label = 'Régio.'
  where list_label = 'Regionalistes';

update public.election_result set list_label = 'Centre'
  where list_label = 'Centre (MoDem + Nouveau Centre + Parti Radical)';

update public.election_result set list_label = 'Divers'
  where list_label = 'Divers';

-- Europeennes 2024: raccourcir les libelles de liste
update public.election_result set list_label = 'La France revient (RN)'
  where list_label = 'La France revient (Rassemblement national)';
update public.election_result set list_label = 'Besoin d''Europe'
  where list_label = 'Besoin d''Europe (Renaissance - MoDem - Horizons)';
update public.election_result set list_label = 'Reveiller l''Europe'
  where list_label = 'Reveiller l''Europe (PS - Place publique)';
update public.election_result set list_label = 'La France fiere (Reconquete)'
  where list_label = 'La France fiere (Reconquete)';

commit;
