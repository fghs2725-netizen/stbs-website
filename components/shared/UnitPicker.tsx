"use client";

/**
 * Picks the unit a line item is priced in, for both quotations and invoices.
 *
 * A plain `<select>` cannot hold a unit the owner has not met yet, and the free-text box it replaces
 * is how the same job came to be billed in "Rft" on one document and "Running feet" on the next. So:
 * a searchable list of what is known, and one row at the bottom for anything that is not, which is
 * remembered from then on.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Plus, Search } from "lucide-react";

type Props = {
  value: string;
  onChange: (unit: string) => void;
  units: string[];
  /** Remembers a unit the owner typed. Left out where there is nowhere to remember it. */
  onCreate?: (unit: string) => void | Promise<void>;
  id?: string;
  className?: string;
  /** Shown on the button before anything is chosen. */
  placeholder?: string;
  /** The quotation studio finds its cells by this to move focus between them. */
  dataCell?: string;
  ariaLabel?: string;
  invalid?: boolean;
  /**
   * Overrides Enter on the closed button, for a grid where Enter already means "next cell" on every
   * other column. Space still opens the picker either way, since a button activates on both by
   * default and only Enter is intercepted.
   */
  onEnter?: (e: React.KeyboardEvent<HTMLButtonElement>) => void;
};

export function UnitPicker({ value, onChange, units, onCreate, id, className, placeholder = "Unit", dataCell, ariaLabel, invalid, onEnter }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [custom, setCustom] = useState("");

  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const customBox = useRef<HTMLInputElement>(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return units;
    return units.filter((u) => u.toLowerCase().includes(q));
  }, [units, query]);

  const close = () => {
    setOpen(false);
    setQuery("");
    setAdding(false);
    setCustom("");
  };

  // A click outside or Escape closes it, and focus goes back to the button that opened it.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      close();
      button.current?.focus();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  useEffect(() => {
    if (open && !adding) search.current?.focus();
    if (adding) customBox.current?.focus();
  }, [open, adding]);

  const pick = (unit: string) => {
    onChange(unit);
    close();
    button.current?.focus();
  };

  const confirmCustom = () => {
    const name = custom.trim().slice(0, 24);
    if (!name) return;
    // Typing one that already exists just picks it, rather than storing a second spelling of it.
    const known = units.find((u) => u.toLowerCase() === name.toLowerCase());
    if (!known && onCreate) void onCreate(name);
    pick(known ?? name);
  };

  return (
    <div className={`unit-picker ${className ?? ""}`} ref={root}>
      <button
        type="button" id={id} ref={button}
        data-cell={dataCell}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        className="unit-picker-button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (open ? close() : setOpen(true))}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !open && onEnter) { e.preventDefault(); onEnter(e); }
        }}
      >
        <span className={value ? "" : "unit-picker-placeholder"}>{value || placeholder}</span>
        <ChevronDown size={14} aria-hidden />
      </button>

      {open && (
        <div className="unit-picker-panel" role="dialog" aria-label="Choose a unit">
          <div className="unit-picker-search">
            <Search size={14} aria-hidden />
            <input
              ref={search} value={query} placeholder="Search units"
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                // Enter takes the top match, which is the whole point of typing to filter.
                if (e.key === "Enter") { e.preventDefault(); if (matches[0]) pick(matches[0]); }
              }}
            />
          </div>

          <ul className="unit-picker-list" role="listbox">
            {matches.map((u) => (
              <li key={u}>
                <button type="button" role="option" aria-selected={u === value} onClick={() => pick(u)}>
                  <span>{u}</span>
                  {u === value && <Check size={14} aria-hidden />}
                </button>
              </li>
            ))}
            {!matches.length && <li className="unit-picker-empty">No unit matches “{query.trim()}”.</li>}
          </ul>

          <div className="unit-picker-custom">
            {adding ? (
              <>
                <input
                  ref={customBox} value={custom} maxLength={24} placeholder="Your own unit"
                  onChange={(e) => setCustom(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); confirmCustom(); } }}
                />
                <button type="button" className="unit-picker-add" onClick={confirmCustom} disabled={!custom.trim()}>
                  Use it
                </button>
              </>
            ) : (
              <button type="button" className="unit-picker-open-custom" onClick={() => { setAdding(true); setCustom(query.trim()); }}>
                <Plus size={14} aria-hidden /> Use my own unit
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
