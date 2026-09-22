"use client";

/**
 * Adds or removes segments for one invoice.
 *
 * The switches on the Settings page decide what every invoice prints. This decides what *this* one
 * prints, and it stores only what it was told to change: a segment left alone keeps following the
 * settings, including when the settings later change. That is why each row says which of the two it
 * is currently obeying, and offers a way back.
 */
import { useEffect, useRef } from "react";
import { RotateCcw, X } from "lucide-react";
import {
  INVOICE_BLOCK_SEGMENTS, INVOICE_COLUMN_SEGMENTS,
  type InvoiceBlocks, type InvoiceColumns, type InvoiceSettings, type InvoiceSettingsOverride,
} from "../invoice-settings";

type Props = {
  base: InvoiceSettings;
  value: InvoiceSettingsOverride;
  onChange: (next: InvoiceSettingsOverride) => void;
  onClose: () => void;
  /** Shown while a change is being written, where the panel saves as you go. */
  busy?: boolean;
};

/** Drops a key once it agrees with the settings again, so an untouched segment stores nothing. */
function withKey<T extends object>(group: Partial<T> | undefined, key: keyof T, next: boolean | undefined) {
  const out = { ...(group ?? {}) } as Record<string, boolean>;
  if (next === undefined) delete out[key as string];
  else out[key as string] = next;
  return Object.keys(out).length ? (out as Partial<T>) : undefined;
}

export function SegmentsPanel({ base, value, onChange, onClose, busy }: Props) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  const setColumn = (key: keyof InvoiceColumns, next: boolean | undefined) =>
    onChange({ ...value, columns: withKey<InvoiceColumns>(value.columns, key, next) });
  const setBlock = (key: keyof InvoiceBlocks, next: boolean | undefined) =>
    onChange({ ...value, blocks: withKey<InvoiceBlocks>(value.blocks, key, next) });

  const touched = Boolean(value.columns || value.blocks);

  const Row = ({ label, help, on, overridden, onToggle, onReset }: {
    label: string; help?: string; on: boolean; overridden: boolean;
    onToggle: (next: boolean) => void; onReset: () => void;
  }) => (
    <li className="seg-row">
      <label className="seg-label">
        <input type="checkbox" checked={on} disabled={busy} onChange={(e) => onToggle(e.target.checked)} />
        <span>
          {label}
          {help && <small>{help}</small>}
        </span>
      </label>
      {overridden ? (
        <button type="button" className="seg-reset" onClick={onReset} disabled={busy} title="Follow the settings again">
          <RotateCcw size={13} aria-hidden /> This invoice
        </button>
      ) : (
        <span className="seg-following">Settings</span>
      )}
    </li>
  );

  return (
    <div className="seg-panel" ref={panel} role="dialog" aria-modal="true" aria-label="Segments on this invoice">
      <div className="seg-head">
        <div>
          <h2>Segments on this invoice</h2>
          <p>Changes here apply to this invoice only. Everything else follows Invoice settings.</p>
        </div>
        <button type="button" className="seg-close" onClick={onClose} aria-label="Close">
          <X size={16} aria-hidden />
        </button>
      </div>

      <div className="seg-body">
        <p className="seg-group">Columns in the item table</p>
        <ul>
          {INVOICE_COLUMN_SEGMENTS.map((c) => (
            <Row
              key={c.key} label={c.label} help={c.help}
              on={value.columns?.[c.key] ?? base.columns[c.key]}
              overridden={value.columns?.[c.key] !== undefined}
              onToggle={(next) => setColumn(c.key, next)}
              onReset={() => setColumn(c.key, undefined)}
            />
          ))}
        </ul>

        <p className="seg-group">Blocks on the page</p>
        <ul>
          {INVOICE_BLOCK_SEGMENTS.map((b) => (
            <Row
              key={b.key} label={b.label} help={b.help}
              on={value.blocks?.[b.key] ?? base.blocks[b.key]}
              overridden={value.blocks?.[b.key] !== undefined}
              onToggle={(next) => setBlock(b.key, next)}
              onReset={() => setBlock(b.key, undefined)}
            />
          ))}
        </ul>
      </div>

      <div className="seg-foot">
        <button type="button" className="seg-reset-all" disabled={!touched || busy} onClick={() => onChange({})}>
          <RotateCcw size={14} aria-hidden /> Follow settings for everything
        </button>
        <button type="button" className="seg-done" onClick={onClose}>Done</button>
      </div>
    </div>
  );
}
