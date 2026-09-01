import { fireEvent, render, screen } from '@testing-library/react';
import { QuizPlayer } from './quiz-player';

describe('QuizPlayer', () => {
  it('auto-grades and shows answer review', () => {
    render(<QuizPlayer questions={[{ type: 'true-false', prompt: 'RAG uses retrieval.', options: ['True', 'False'], answer: 'True', explanation: 'It retrieves context.' }, { type: 'short-answer', prompt: 'Name the format.', answer: 'CSV' }]} />);
    fireEvent.click(screen.getByLabelText('True'));
    fireEvent.change(screen.getByRole('textbox', { name: 'Answer 2' }), { target: { value: 'csv' } });
    fireEvent.click(screen.getByRole('button', { name: 'Grade quiz' }));
    expect(screen.getByText(/Score: 2 \/ 2/)).toBeInTheDocument();
    expect(screen.getAllByText('Correct')).toHaveLength(2);
  });
});
