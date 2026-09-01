'use client';

import { Shuffle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { Flashcard } from '../ai-studio-types';

export function FlashcardViewer({ cards }: { cards: Flashcard[] }) {
  const [order, setOrder] = useState(() => cards.map((_, index) => index));
  const [position, setPosition] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const card = cards[order[position] ?? 0];
  const shuffle = () => { setOrder((current) => [...current].sort(() => Math.random() - 0.5)); setPosition(0); setRevealed(false); };
  const label = useMemo(() => `${position + 1} of ${cards.length}`, [cards.length, position]);
  if (!card) return <p className="text-xs text-muted-foreground">No flashcards were generated.</p>;
  return <section aria-label="Flashcard viewer" className="space-y-3">
    <div className="flex items-center justify-between text-xs"><span>{label}</span><Button size="sm" variant="outline" onClick={shuffle}><Shuffle className="size-3.5" /> Shuffle</Button></div>
    <button type="button" aria-pressed={revealed} onClick={() => setRevealed((value) => !value)} className="min-h-56 w-full rounded-2xl border border-border bg-background p-6 text-left shadow-sm transition-transform duration-300 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-ring">
      <span className="mb-4 flex gap-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"><span>{card.difficulty ?? 'medium'}</span><span>{card.category ?? 'General'}</span></span>
      <span className="block text-base font-semibold">{revealed ? card.answer : card.question}</span>
      <span className="mt-5 block text-xs text-muted-foreground">{revealed ? 'Click to show question' : 'Click to reveal answer'}</span>
    </button>
    <div className="grid grid-cols-2 gap-2"><Button variant="outline" disabled={position === 0} onClick={() => { setPosition((value) => value - 1); setRevealed(false); }}>Previous</Button><Button disabled={position === cards.length - 1} onClick={() => { setPosition((value) => value + 1); setRevealed(false); }}>Next</Button></div>
  </section>;
}
