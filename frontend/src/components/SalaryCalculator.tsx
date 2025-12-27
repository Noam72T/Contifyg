import React, { useState, useEffect } from 'react';
import { Calculator, DollarSign, TrendingUp, Users, Info } from 'lucide-react';
import { 
  calculateSalaryFromSocialScore, 
  getSalaryBracket, 
  getSalaryRange, 
  formatSalary, 
  isEligibleForSalary,
  SALARY_BRACKETS 
} from '../utils/salaryCalculator';

interface SalaryCalculatorProps {
  className?: string;
}

const SalaryCalculator: React.FC<SalaryCalculatorProps> = ({ className = '' }) => {
  const [socialScore, setSocialScore] = useState<number>(0);
  const [positionInBracket, setPositionInBracket] = useState<number>(0.5);
  const [calculatedSalary, setCalculatedSalary] = useState<number>(0);
  const [showBrackets, setShowBrackets] = useState<boolean>(false);

  // Recalculer le salaire quand les paramètres changent
  useEffect(() => {
    if (socialScore > 0) {
      try {
        const salary = calculateSalaryFromSocialScore(socialScore, positionInBracket);
        setCalculatedSalary(salary);
      } catch (error) {
        console.error('Erreur de calcul du salaire:', error);
        setCalculatedSalary(0);
      }
    } else {
      setCalculatedSalary(0);
    }
  }, [socialScore, positionInBracket]);

  const currentBracket = getSalaryBracket(socialScore);
  const salaryRange = getSalaryRange(socialScore);
  const isEligible = isEligibleForSalary(socialScore);

  return (
    <div className={`bg-card rounded-lg border border-border p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
            <Calculator className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Calculateur de Salaire</h3>
            <p className="text-sm text-muted-foreground">Basé sur le score social</p>
          </div>
        </div>
        <button
          onClick={() => setShowBrackets(!showBrackets)}
          className="flex items-center space-x-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 transition-colors"
        >
          <Info className="w-4 h-4" />
          <span>{showBrackets ? 'Masquer' : 'Voir'} les tranches</span>
        </button>
      </div>

      {/* Formulaire de calcul */}
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Score Social
          </label>
          <input
            type="number"
            min="0"
            max="50000"
            step="100"
            value={socialScore}
            onChange={(e) => setSocialScore(Number(e.target.value))}
            placeholder="Entrez le score social..."
            className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
          />
        </div>

        {isEligible && salaryRange && (
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Position dans la tranche ({formatSalary(salaryRange.min)} - {formatSalary(salaryRange.max)})
            </label>
            <div className="space-y-2">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={positionInBracket}
                onChange={(e) => setPositionInBracket(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Minimum</span>
                <span>{Math.round(positionInBracket * 100)}%</span>
                <span>Maximum</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Résultat du calcul */}
      <div className="bg-muted/50 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
            <div>
              <p className="text-sm text-muted-foreground">Salaire hebdomadaire</p>
              <p className="text-2xl font-bold text-foreground">
                {isEligible ? formatSalary(calculatedSalary) : 'Non éligible'}
              </p>
            </div>
          </div>
          {isEligible && (
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Salaire mensuel (4 semaines)</p>
              <p className="text-lg font-semibold text-foreground">
                {formatSalary(calculatedSalary * 4)}
              </p>
            </div>
          )}
        </div>

        {currentBracket && (
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Tranche actuelle: {currentBracket.description}
            </p>
          </div>
        )}

        {!isEligible && socialScore > 0 && (
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-xs text-red-600 dark:text-red-400">
              ⚠️ Score social insuffisant. Minimum requis: 6,000 points
            </p>
          </div>
        )}
      </div>

      {/* Tableau des tranches (affiché/masqué) */}
      {showBrackets && (
        <div className="border-t border-border pt-4">
          <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center space-x-2">
            <TrendingUp className="w-4 h-4" />
            <span>Tranches de rémunération</span>
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {SALARY_BRACKETS.map((bracket, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border text-sm ${
                  currentBracket === bracket
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                    : 'bg-background border-border'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-foreground">
                      Score: {bracket.minScore.toLocaleString()} - {
                        bracket.maxScore === Infinity ? '∞' : bracket.maxScore.toLocaleString()
                      }
                    </p>
                    <p className="text-muted-foreground">
                      Salaire: {formatSalary(bracket.minSalary)} - {
                        bracket.maxSalary === Infinity ? '+' : formatSalary(bracket.maxSalary)
                      }
                    </p>
                  </div>
                  {currentBracket === bracket && (
                    <div className="text-blue-600 dark:text-blue-400">
                      <Users className="w-4 h-4" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Note d'entrée en vigueur */}
      <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
        <p className="text-xs text-yellow-800 dark:text-yellow-200 flex items-center space-x-2">
          <Info className="w-3 h-3" />
          <span>V Entrée en vigueur - Rémunération hebdomadaire basée sur le score social</span>
        </p>
      </div>
    </div>
  );
};

export default SalaryCalculator;
