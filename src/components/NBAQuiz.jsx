import { Check, CircleHelp, X, Zap } from "lucide-react";
import { useMemo, useState } from "react";
import { getRandomQuizQuestion } from "../data/quiz";

export default function NBAQuiz({ onReward, onClose }) {
  const question = useMemo(() => getRandomQuizQuestion(), []);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const correct = selectedAnswer === question.answer;

  function handleAnswer(answer) {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(answer);
    onReward(answer === question.answer ? 5 : 1);
  }

  return (
    <div className="quiz-overlay" role="dialog" aria-modal="true" aria-label="NBA Quiz">
      <section className="quiz-panel">
        <header className="quiz-header">
          <div>
            <span><CircleHelp size={15} /> Energy break</span>
            <h2>NBA Quiz</h2>
          </div>
          <button onClick={onClose} aria-label="Close NBA Quiz"><X size={20} /></button>
        </header>

        <div className="quiz-content">
          <strong className="quiz-question">{question.question}</strong>
          <div className="quiz-options">
            {question.options.map((option) => {
              const isSelected = selectedAnswer === option;
              const isCorrect = selectedAnswer !== null && option === question.answer;
              return (
                <button
                  className={`${isSelected ? "is-selected" : ""} ${isCorrect ? "is-correct" : ""}`}
                  disabled={selectedAnswer !== null}
                  key={option}
                  onClick={() => handleAnswer(option)}
                >
                  {option}
                  {isCorrect && <Check size={17} />}
                </button>
              );
            })}
          </div>

          {selectedAnswer !== null && (
            <div className={`quiz-result ${correct ? "is-correct" : "is-wrong"}`}>
              <strong>{correct ? "Correct" : "Not quite"}</strong>
              <span>{correct ? "+5 Energy" : `Correct answer: ${question.answer}. +1 Energy`}</span>
              <button onClick={onClose}><Zap size={16} /> Continue</button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
