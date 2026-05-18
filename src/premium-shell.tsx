import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Search, X } from 'lucide-react';
import { filterCommandItems, type CommandItem, type ContextHeaderModel } from './premium-ui';

export function ContextHeader({
  model,
  onOpenCommands,
  onToggleFocusMode,
  focusMode,
  canToggleFocusMode = true
}: {
  model: ContextHeaderModel;
  onOpenCommands: () => void;
  onToggleFocusMode: () => void;
  focusMode: boolean;
  canToggleFocusMode?: boolean;
}) {
  return <header className="context-header" aria-label="Workspace context">
    <div className="context-header-main">
      <span>{model.pageLabel}</span>
      <h1>{model.noteLabel}</h1>
      <p>{model.workspaceLabel}{model.asOfLabel ? ` / ${model.asOfLabel}` : ''}</p>
    </div>
    <div className="context-header-meta" aria-label="Current context">
      {model.badges.map(badge => <span key={badge}>{badge}</span>)}
      <strong className={model.statusTone}>{model.statusLabel}</strong>
      {canToggleFocusMode && <button type="button" onClick={onToggleFocusMode}>{focusMode ? 'Exit focus' : 'Focus'}</button>}
      <button type="button" className="command-trigger" onClick={onOpenCommands}><Search size={14}/>Ctrl+K</button>
    </div>
  </header>;
}

export function CommandPalette({
  open,
  items,
  onClose,
  onRun
}: {
  open: boolean;
  items: CommandItem[];
  onClose: () => void;
  onRun: (id: CommandItem['id']) => void;
}) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const dialogRef = useRef<HTMLElement | null>(null);
  const visibleItems = useMemo(() => filterCommandItems(items, query), [items, query]);
  const enabledIndexes = useMemo(
    () => visibleItems.map((item, index) => item.disabled ? -1 : index).filter(index => index >= 0),
    [visibleItems]
  );

  useEffect(() => {
    setActiveIndex(enabledIndexes[0] ?? 0);
  }, [query, enabledIndexes[0]]);

  if (!open) return null;

  function moveActive(delta: number) {
    if (!enabledIndexes.length) return;
    const position = Math.max(0, enabledIndexes.indexOf(activeIndex));
    const nextPosition = (position + delta + enabledIndexes.length) % enabledIndexes.length;
    setActiveIndex(enabledIndexes[nextPosition]);
  }

  function runActiveItem() {
    const item = visibleItems[activeIndex] && !visibleItems[activeIndex].disabled
      ? visibleItems[activeIndex]
      : visibleItems.find(candidate => !candidate.disabled);
    if (!item) return;
    onRun(item.id);
    onClose();
  }

  function onDialogKeyDown(event: React.KeyboardEvent<HTMLElement>) {
    if (event.key !== 'Tab') return;
    const focusable = [...(dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not(:disabled), input:not(:disabled), [href], [tabindex]:not([tabindex="-1"])'
    ) ?? [])].filter(element => element.offsetParent !== null);
    if (!focusable.length) {
      event.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return <div className="command-palette-backdrop" role="presentation" onMouseDown={onClose}>
    <section
      ref={dialogRef}
      className="command-palette"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      onMouseDown={event => event.stopPropagation()}
      onKeyDown={onDialogKeyDown}
    >
      <div className="command-palette-search">
        <Search size={15}/>
        <input
          autoFocus
          value={query}
          onChange={event => setQuery(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Escape') onClose();
            if (event.key === 'Enter') {
              event.preventDefault();
              runActiveItem();
            }
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              moveActive(1);
            }
            if (event.key === 'ArrowUp') {
              event.preventDefault();
              moveActive(-1);
            }
          }}
          placeholder="Search actions"
        />
        <button type="button" onClick={onClose} title="Close commands"><X size={15}/></button>
      </div>
      <div className="command-palette-list">
        {visibleItems.map(item => <button
          type="button"
          key={item.id}
          className={visibleItems[activeIndex]?.id === item.id ? 'active' : undefined}
          aria-selected={visibleItems[activeIndex]?.id === item.id}
          disabled={item.disabled}
          onClick={() => {
            onRun(item.id);
            onClose();
          }}
        >
          <span>{item.section}</span>
          <b>{item.label}</b>
          {item.shortcut && <small>{item.shortcut}</small>}
        </button>)}
      </div>
    </section>
  </div>;
}

export interface StatusToast {
  id: string;
  tone: 'success' | 'error' | 'info';
  title: string;
  body?: string;
}

export function StatusToastStack({ toasts, onDismiss }: { toasts: StatusToast[]; onDismiss: (id: string) => void }) {
  if (!toasts.length) return null;
  return <div className="status-toast-stack" aria-live="polite">
    {toasts.map(toast => <article className={`status-toast ${toast.tone}`} key={toast.id}>
      {toast.tone === 'error' ? <AlertTriangle size={15}/> : <CheckCircle2 size={15}/>}
      <span><b>{toast.title}</b>{toast.body && <small>{toast.body}</small>}</span>
      <button type="button" onClick={() => onDismiss(toast.id)} title="Dismiss"><X size={14}/></button>
    </article>)}
  </div>;
}
