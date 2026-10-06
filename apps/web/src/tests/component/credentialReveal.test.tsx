import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { CredentialRevealDialog } from '@/features/admin/staff/CredentialRevealDialog';

const creds = { name: 'Ramesh K.', email: 'ramesh@main.pc', tempPassword: 'K7m#pQ2x', kind: 'created' as const };

describe('CredentialRevealDialog', () => {
  it('shows the password and warns it is shown only once', () => {
    render(<CredentialRevealDialog credentials={creds} onDone={() => {}} />);
    expect(screen.getByTestId('temp-password')).toHaveTextContent('K7m#pQ2x');
    expect(screen.getByText(/shown only once/i)).toBeInTheDocument();
  });

  it('can hide and re-show the password', () => {
    render(<CredentialRevealDialog credentials={creds} onDone={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /hide password/i }));
    expect(screen.getByTestId('temp-password')).not.toHaveTextContent('K7m#pQ2x');
    fireEvent.click(screen.getByRole('button', { name: /show password/i }));
    expect(screen.getByTestId('temp-password')).toHaveTextContent('K7m#pQ2x');
  });

  it('Done hands control back so the parent can clear the password', () => {
    const onDone = vi.fn();
    const { rerender } = render(<CredentialRevealDialog credentials={creds} onDone={onDone} />);
    fireEvent.click(screen.getByRole('button', { name: /^done$/i }));
    expect(onDone).toHaveBeenCalledTimes(1);

    rerender(<CredentialRevealDialog credentials={null} onDone={onDone} />);
    expect(screen.queryByText('K7m#pQ2x')).not.toBeInTheDocument();
  });

  it('asks "Did you copy the password?" before closing another way', () => {
    const onDone = vi.fn();
    render(<CredentialRevealDialog credentials={creds} onDone={onDone} />);
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });
    expect(screen.getByText(/did you copy the password/i)).toBeInTheDocument();
    expect(onDone).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /yes, close/i }));
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});