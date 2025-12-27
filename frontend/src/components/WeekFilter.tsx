import React from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

interface WeekFilterProps {
  selectedWeek: number;
  selectedYear: number;
  onWeekChange: (week: number, year: number) => void;
}

const WeekFilter: React.FC<WeekFilterProps> = ({
  selectedWeek,
  selectedYear,
  onWeekChange
}) => {
  // Obtenir la semaine actuelle selon ISO 8601 (corrigé)
  const getCurrentWeek = () => {
    const date = new Date();
    const d = new Date(date.getTime());
    d.setHours(0, 0, 0, 0);
    // Jeudi de cette semaine
    d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
    // Premier jeudi de janvier = semaine 1
    const week1 = new Date(d.getFullYear(), 0, 4);
    return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  };

  const currentWeek = getCurrentWeek();
  const currentYear = new Date().getFullYear();
  
  // Debug pour vérifier la semaine calculée
  console.log(`🔍 WeekFilter - Semaine actuelle: S${currentWeek} (${currentYear})`);

  // Navigation semaine précédente/suivante
  const goToPreviousWeek = () => {
    if (selectedWeek > 1) {
      onWeekChange(selectedWeek - 1, selectedYear);
    } else {
      onWeekChange(52, selectedYear - 1);
    }
  };

  const goToNextWeek = () => {
    if (selectedWeek < 53) {
      onWeekChange(selectedWeek + 1, selectedYear);
    } else {
      onWeekChange(1, selectedYear + 1);
    }
  };

  // Obtenir les dates de début et fin de la semaine sélectionnée selon ISO 8601 (corrigé)
  const getWeekDates = (week: number, year: number) => {
    // Trouver le premier jeudi de l'année (semaine 1)
    const jan4 = new Date(year, 0, 4);
    const firstThursday = new Date(jan4.getTime() - (jan4.getDay() - 4) * 86400000);
    
    // Calculer le lundi de la semaine demandée
    const targetWeekStart = new Date(firstThursday.getTime() + (week - 1) * 7 * 86400000);
    targetWeekStart.setDate(targetWeekStart.getDate() - 3); // Revenir au lundi
    targetWeekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(targetWeekStart);
    weekEnd.setDate(targetWeekStart.getDate() + 6); // Dimanche
    
    return {
      start: targetWeekStart.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
      end: weekEnd.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
    };
  };

  const weekDates = getWeekDates(selectedWeek, selectedYear);

  return (
    <div className="inline-flex items-center space-x-1 bg-muted/30 rounded-lg p-1">
      {/* Bouton semaine précédente */}
      <button
        onClick={goToPreviousWeek}
        className="p-1.5 rounded hover:bg-muted transition-colors"
        title="Semaine précédente"
      >
        <ChevronLeft className="w-3 h-3 text-muted-foreground" />
      </button>

      {/* Affichage ultra-compact */}
      <div className="flex items-center space-x-1 px-2 py-1">
        <Calendar className="w-3 h-3 text-muted-foreground" />
        <span className="text-xs font-medium text-foreground">
          S{selectedWeek.toString().padStart(2, '0')}
        </span>
        <span className="text-xs text-muted-foreground">
          {selectedYear}
        </span>
        {selectedWeek === currentWeek && selectedYear === currentYear && (
          <span className="w-1.5 h-1.5 bg-primary rounded-full" title="Semaine actuelle" />
        )}
      </div>

      {/* Bouton semaine suivante */}
      <button
        onClick={goToNextWeek}
        className="p-1.5 rounded hover:bg-muted transition-colors"
        title="Semaine suivante"
      >
        <ChevronRight className="w-3 h-3 text-muted-foreground" />
      </button>

      {/* Dates en tooltip ou petit texte optionnel */}
      <span className="text-xs text-muted-foreground ml-1" title={`${weekDates.start} - ${weekDates.end}`}>
        ({weekDates.start})
      </span>
    </div>
  );
};

export default WeekFilter;
