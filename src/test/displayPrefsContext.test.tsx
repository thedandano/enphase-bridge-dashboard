import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { DisplayPrefsProvider } from '@/context/DisplayPrefsProvider';
import { useDisplayPrefs, VISIBLE_KEYS } from '@/context/DisplayPrefsContext';

function Consumer() {
  const { tabletMode, toggleTabletMode, isFullscreen, visibleComponents, toggleComponent } = useDisplayPrefs();
  return (
    <div>
      <span data-testid="tabletMode">{String(tabletMode)}</span>
      <span data-testid="isFullscreen">{String(isFullscreen)}</span>
      {VISIBLE_KEYS.map((k) => (
        <span key={k} data-testid={k}>{String(visibleComponents[k])}</span>
      ))}
      <button onClick={toggleTabletMode}>toggleTablet</button>
      {VISIBLE_KEYS.map((k) => (
        <button key={k} onClick={() => toggleComponent(k)}>toggle-{k}</button>
      ))}
    </div>
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('DisplayPrefsContext — defaults', () => {
  it('tabletMode defaults to false', () => {
    render(<DisplayPrefsProvider><Consumer /></DisplayPrefsProvider>);
    expect(screen.getByTestId('tabletMode').textContent).toBe('false');
  });

  it.each(VISIBLE_KEYS)('visibleComponents.%s defaults to true', (key) => {
    render(<DisplayPrefsProvider><Consumer /></DisplayPrefsProvider>);
    expect(screen.getByTestId(key).textContent).toBe('true');
  });
});

describe('DisplayPrefsContext — localStorage persistence', () => {
  it('toggleTabletMode flips tabletMode and persists', () => {
    render(<DisplayPrefsProvider><Consumer /></DisplayPrefsProvider>);
    fireEvent.click(screen.getByText('toggleTablet'));
    expect(screen.getByTestId('tabletMode').textContent).toBe('true');
    expect(localStorage.getItem('displayPrefs.tabletMode')).toBe('true');
  });

  it.each(VISIBLE_KEYS)('toggleComponent("%s") flips visibility and persists', (key) => {
    render(<DisplayPrefsProvider><Consumer /></DisplayPrefsProvider>);
    fireEvent.click(screen.getByText(`toggle-${key}`));
    expect(screen.getByTestId(key).textContent).toBe('false');
    expect(localStorage.getItem(`displayPrefs.visible.${key}`)).toBe('false');
  });

  it('restores tabletMode from localStorage on mount', () => {
    localStorage.setItem('displayPrefs.tabletMode', 'true');
    render(<DisplayPrefsProvider><Consumer /></DisplayPrefsProvider>);
    expect(screen.getByTestId('tabletMode').textContent).toBe('true');
  });

  it.each(VISIBLE_KEYS)('restores visibility.%s=false from localStorage on mount', (key) => {
    localStorage.setItem(`displayPrefs.visible.${key}`, 'false');
    render(<DisplayPrefsProvider><Consumer /></DisplayPrefsProvider>);
    expect(screen.getByTestId(key).textContent).toBe('false');
  });
});

describe('DisplayPrefsContext — fullscreen', () => {
  it('does not call requestFullscreen when fullscreenEnabled is false', () => {
    Object.defineProperty(document, 'fullscreenEnabled', { value: false, configurable: true });
    const reqFs = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(document.documentElement, 'requestFullscreen', { value: reqFs, configurable: true });

    render(<DisplayPrefsProvider><Consumer /></DisplayPrefsProvider>);
    fireEvent.click(screen.getByText('toggleTablet'));
    expect(reqFs).not.toHaveBeenCalled();
    expect(screen.getByTestId('tabletMode').textContent).toBe('true');
  });

  it('calls requestFullscreen when fullscreenEnabled is true', () => {
    Object.defineProperty(document, 'fullscreenEnabled', { value: true, configurable: true });
    const reqFs = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(document.documentElement, 'requestFullscreen', { value: reqFs, configurable: true });

    render(<DisplayPrefsProvider><Consumer /></DisplayPrefsProvider>);
    fireEvent.click(screen.getByText('toggleTablet'));
    expect(reqFs).toHaveBeenCalledOnce();
  });

  it('swallows requestFullscreen rejection without throwing', async () => {
    Object.defineProperty(document, 'fullscreenEnabled', { value: true, configurable: true });
    const reqFs = vi.fn().mockRejectedValue(new Error('not allowed'));
    Object.defineProperty(document.documentElement, 'requestFullscreen', { value: reqFs, configurable: true });

    render(<DisplayPrefsProvider><Consumer /></DisplayPrefsProvider>);
    await act(async () => {
      fireEvent.click(screen.getByText('toggleTablet'));
    });
    expect(screen.getByTestId('tabletMode').textContent).toBe('true');
  });

  it('isFullscreen updates independently via fullscreenchange event', async () => {
    render(<DisplayPrefsProvider><Consumer /></DisplayPrefsProvider>);
    expect(screen.getByTestId('isFullscreen').textContent).toBe('false');

    Object.defineProperty(document, 'fullscreenElement', { value: document.body, configurable: true });
    await act(async () => {
      document.dispatchEvent(new Event('fullscreenchange'));
    });
    expect(screen.getByTestId('isFullscreen').textContent).toBe('true');

    Object.defineProperty(document, 'fullscreenElement', { value: null, configurable: true });
    await act(async () => {
      document.dispatchEvent(new Event('fullscreenchange'));
    });
    expect(screen.getByTestId('isFullscreen').textContent).toBe('false');
  });

  it('tabletMode stays active when fullscreen exits via Escape', async () => {
    Object.defineProperty(document, 'fullscreenEnabled', { value: true, configurable: true });
    vi.spyOn(document.documentElement, 'requestFullscreen').mockResolvedValue(undefined);

    render(<DisplayPrefsProvider><Consumer /></DisplayPrefsProvider>);
    fireEvent.click(screen.getByText('toggleTablet'));
    expect(screen.getByTestId('tabletMode').textContent).toBe('true');

    // Simulate Escape exiting fullscreen
    Object.defineProperty(document, 'fullscreenElement', { value: null, configurable: true });
    await act(async () => {
      document.dispatchEvent(new Event('fullscreenchange'));
    });
    expect(screen.getByTestId('isFullscreen').textContent).toBe('false');
    expect(screen.getByTestId('tabletMode').textContent).toBe('true');
  });
});
