'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { QuizQuestion } from '../ai-studio-types';

const normalize = (value: string) => value.trim().toLocaleLowerCase().replace(/[.!?]+$/g, '');

export function QuizPlayer({ questions }: { questions: QuizQuestion[] }) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const score = questions.reduce((total, question, index) => total + (normalize(answers[index] ?? '') === normalize(question.answer) ? 1 : 0), 0);
  return <section aria-label="Quiz player" className="space-y-4">
    {submitted && <div role="status" className="rounded-xl bg-primary/10 p-4 text-sm font-semibold">Score: {score} / {questions.length} ({questions.length ? Math.round(score / questions.length * 100) : 0}%)</div>}
    {questions.map((question, index) => {
      const correct = normalize(answers[index] ?? '') === normalize(question.answer);
      return <fieldset key={question.id ?? index} className={cn('rounded-xl border border-border bg-background p-4', submitted && (correct ? 'border-emerald-500/50' : 'border-red-500/50'))}>
        <legend className="px-1 text-sm font-semibold">{index + 1}. {question.prompt}</legend>
        {question.type === 'short-answer' ? <input aria-label={`Answer ${index + 1}`} disabled={submitted} value={answers[index] ?? ''} onChange={(event) => setAnswers((current) => ({ ...current, [index]: event.target.value }))} className="mt-3 h-10 w-full rounded-lg border border-border bg-panel px-3 text-xs" /> : <div className="mt-3 space-y-2">{(question.options ?? (question.type === 'true-false' ? ['True', 'False'] : [])).map((option) => <label key={option} className="flex cursor-pointer items-center gap-2 rounded-lg border border-border p-2 text-xs"><input type="radio" name={`question-${index}`} disabled={submitted} checked={answers[index] === option} onChange={() => setAnswers((current) => ({ ...current, [index]: option }))} /> {option}</label>)}</div>}
        {submitted && <div className="mt-3 text-xs"><p className={correct ? 'text-emerald-600' : 'text-red-600'}>{correct ? 'Correct' : `Correct answer: ${question.answer}`}</p>{question.explanation && <p className="mt-1 text-muted-foreground">{question.explanation}</p>}</div>}
      </fieldset>;
    })}
    <Button className="w-full" disabled={!questions.length} onClick={() => setSubmitted((value) => !value)}>{submitted ? 'Review answers' : 'Grade quiz'}</Button>
  </section>;
}
