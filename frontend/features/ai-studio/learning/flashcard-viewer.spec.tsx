import { fireEvent, render, screen } from '@testing-library/react';
import { FlashcardViewer } from './flashcard-viewer';

describe('FlashcardViewer', () => {
  it('reveals answers and navigates cards accessibly', () => {
    render(<FlashcardViewer cards={[{ question: 'What is RAG?', answer: 'Grounded retrieval', difficulty: 'easy', category: 'AI' }, { question: 'Second?', answer: 'Answer two' }]} />);
    expect(screen.getByText('What is RAG?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /What is RAG/ }));
    expect(screen.getByText('Grounded retrieval')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Second?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Shuffle/ })).toBeInTheDocument();
  });
});
