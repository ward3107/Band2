import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LanguageProvider } from '@/contexts/LanguageContext';
import LanguageSwitcher from '../LanguageSwitcher';

function renderSwitcher() {
  return render(
    <LanguageProvider>
      <LanguageSwitcher />
    </LanguageProvider>
  );
}

// ── Rendering ────────────────────────────────────────────────────────────────

describe('LanguageSwitcher', () => {
  beforeEach(() => localStorage.clear());

  it('renders the toggle button', () => {
    renderSwitcher();
    expect(screen.getByRole('button', { name: /select language/i })).toBeInTheDocument();
  });

  it('does not show the dropdown by default', () => {
    renderSwitcher();
    expect(screen.queryByText('English')).not.toBeInTheDocument();
    expect(screen.queryByText('עברית')).not.toBeInTheDocument();
  });

  it('opens the dropdown when the button is clicked', async () => {
    const user = userEvent.setup();
    renderSwitcher();
    await user.click(screen.getByRole('button', { name: /select language/i }));
    expect(screen.getByText('English')).toBeInTheDocument();
    expect(screen.getByText('עברית')).toBeInTheDocument();
    expect(screen.getByText('العربية')).toBeInTheDocument();
  });

  it('closes the dropdown after selecting a language', async () => {
    const user = userEvent.setup();
    renderSwitcher();
    await user.click(screen.getByRole('button', { name: /select language/i }));
    await user.click(screen.getByText('עברית'));
    expect(screen.queryByText('English')).not.toBeInTheDocument();
  });

  it('marks the active language with a checkmark', async () => {
    const user = userEvent.setup();
    renderSwitcher();
    await user.click(screen.getByRole('button', { name: /select language/i }));
    // The English option should have a checkmark since it is the default
    const englishButton = screen.getByRole('button', { name: /english/i });
    expect(englishButton).toHaveTextContent('✓');
  });

  it('updates the active checkmark after switching language', async () => {
    const user = userEvent.setup();
    renderSwitcher();
    await user.click(screen.getByRole('button', { name: /select language/i }));
    await user.click(screen.getByText('עברית'));
    // Re-open to verify
    await user.click(screen.getByRole('button', { name: /select language/i }));
    const hebrewButton = screen.getByRole('button', { name: /עברית/i });
    expect(hebrewButton).toHaveTextContent('✓');
  });

  it('closes the dropdown when clicking outside', async () => {
    const user = userEvent.setup();
    renderSwitcher();
    await user.click(screen.getByRole('button', { name: /select language/i }));
    expect(screen.getByText('English')).toBeInTheDocument();
    await user.click(document.body);
    expect(screen.queryByText('English')).not.toBeInTheDocument();
  });

  it('has correct aria-expanded attribute', async () => {
    const user = userEvent.setup();
    renderSwitcher();
    const toggle = screen.getByRole('button', { name: /select language/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
  });
});
