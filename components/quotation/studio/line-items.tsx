"use client";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown, Copy, Plus, Trash2 } from "lucide-react";
import { calcAmount, formatINR, isItemValid, validateItem, type QuotationItem } from "../quotation-model";
import { formatCell, MAX_QUANTITY, MAX_RATE, parseNumeric, sanitizeNumericText } from "../editor-logic";
import { ITEM_PRESETS, UNIT_OPTIONS } from "./studio-logic";

type Field = "description" | "unit" | "quantity" | "rate";
const ORDER: Field[] = ["description", "unit", "quantity", "rate"];
const FIELD_ERROR: Record<Field, keyof ReturnType<typeof validateItem>> = { description: "description", unit: "unit", quantity: "quantity", rate: "rate" };

/** A borderless numeric cell: digits only while focused, Indian grouping once you leave it. */
function NumCell({ value, max, label, cellId, invalid, onCommit, onBlurCell, onKeyDown }: {
  value: number; max: number; label: string; cellId: string; invalid: boolean;
  onCommit: (n: number) => void; onBlurCell: () => void; onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const cancelled = useRef(false);
  return (
    <input
      data-cell={cellId}
      inputMode="decimal"
      aria-label={label}
      aria-invalid={invalid || undefined}
      className="qs-cell qs-num"
      value={draft ?? formatCell(value)}
      onFocus={(e) => { cancelled.current = false; setDraft(value === 0 ? "" : String(value)); const el = e.target; requestAnimationFrame(() => { if (document.activeElement === el) el.select(); }); }}
      onChange={(e) => setDraft(sanitizeNumericText(e.target.value))}
      onBlur={() => { if (draft !== null && !cancelled.current) onCommit(parseNumeric(draft, max)); setDraft(null); onBlurCell(); }}
      onKeyDown={(e) => {
        if (e.key === "Escape") { e.stopPropagation(); cancelled.current = true; (e.target as HTMLInputElement).blur(); return; }
        onKeyDown(e);
      }}
    />
  );
}

/** Description cell: grows with its text so long descriptions are readable, exactly like a line in a document. */
function GrowingText({ value, ...rest }: { value: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return <textarea ref={ref} rows={1} value={value} {...rest} />;
}

export function LineItems({ items, focusId, onEdit, onAdd, onRemove, onDuplicate, onMove }: {
  items: QuotationItem[];
  focusId: string | null;
  onEdit: (id: string, patch: Partial<QuotationItem>, key: string) => void;
  onAdd: (preset?: { description: string; unit: string }) => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
  onMove: (from: number, to: number) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const original = useRef("");
  const menu = useRef<HTMLDetailsElement>(null);
  // A field only shows its error once you have been in it, so a fresh row is not red before you type.
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const touch = (id: string, field: Field) => setTouched((s) => (s.has(`${id}:${field}`) ? s : new Set(s).add(`${id}:${field}`)));

  useEffect(() => {
    if (!focusId) return;
    const el = root.current?.querySelector<HTMLElement>(`[data-cell="${focusId}:description"]`);
    el?.focus();
    el?.scrollIntoView({ block: "nearest" });
  }, [focusId]);

  const errors = useMemo(() => new Map(items.map((i) => [i.id, validateItem(i)] as const)), [items]);
  const focusCell = (row: number, field: Field) => root.current?.querySelector<HTMLElement>(`[data-cell="${items[row]?.id}:${field}"]`)?.focus();

  // Tab moves cell to cell natively; Enter goes to the next cell, and past the last cell of the last row it adds a row.
  const onCellKey = (row: number, field: Field) => (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (field === "rate" && row === items.length - 1) onAdd();
    else if (field === "rate") focusCell(row + 1, "description");
    else focusCell(row, ORDER[ORDER.indexOf(field) + 1]);
  };

  const Presets = () => (
    <details className="qs-menu" ref={menu}>
      <summary><ChevronDown size={14} aria-hidden /> Common items</summary>
      <ul>
        {ITEM_PRESETS.map((p) => (
          <li key={p.description}>
            <button type="button" onClick={() => { onAdd(p); if (menu.current) menu.current.open = false; }}>{p.description}<small>{p.unit}</small></button>
          </li>
        ))}
      </ul>
    </details>
  );

  if (items.length === 0) {
    return (
      <div className="qs-items-empty" data-qs-target="items">
        <p>No price items yet.</p>
        <span>Add the work and materials you are quoting for. Rates are always yours to enter.</span>
        <div className="qs-items-actions">
          <button type="button" className="qs-btn qs-btn-solid" onClick={() => onAdd()}><Plus size={15} aria-hidden /> Add first item</button>
          <Presets />
        </div>
      </div>
    );
  }

  const incomplete = items.filter((i) => !isItemValid(i)).length;

  return (
    <div data-qs-target="items">
      <datalist id="qs-units">{UNIT_OPTIONS.map((u) => <option key={u} value={u} />)}</datalist>
      <div className="qs-items" role="table" aria-label="Price items" ref={root}>
        <div className="qs-items-head" role="row">
          <span role="columnheader">Sr.</span>
          <span role="columnheader">Description</span>
          <span role="columnheader">Unit</span>
          <span role="columnheader">Qty</span>
          <span role="columnheader">Rate</span>
          <span role="columnheader">Amount</span>
          <span role="columnheader" aria-label="Row actions" />
        </div>
        {items.map((item, row) => {
          const err = errors.get(item.id) ?? {};
          const shown = ORDER.filter((f) => touched.has(`${item.id}:${f}`) && err[FIELD_ERROR[f]]);
          const complete = isItemValid(item);
          const bad = (f: Field) => shown.includes(f);
          const n = row + 1;
          return (
            <div key={item.id} role="row" className="it-row qs-row" data-incomplete={complete ? undefined : "true"}>
              <span role="cell" className="qs-rownum">{String(n).padStart(2, "0")}</span>
              <span role="cell" className="it-desc">
                <GrowingText
                  data-cell={`${item.id}:description`}
                  aria-label={`Item ${n} description`}
                  aria-invalid={bad("description") || undefined}
                  className="qs-cell"
                  placeholder="Describe the work or material"
                  value={item.description}
                  onFocus={() => { original.current = item.description; }}
                  onBlur={() => touch(item.id, "description")}
                  onChange={(e) => onEdit(item.id, { description: e.target.value.replace(/\r?\n/g, " ") }, `${item.id}:description`)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") { e.stopPropagation(); onEdit(item.id, { description: original.current }, `${item.id}:description:esc`); (e.target as HTMLElement).blur(); return; }
                    onCellKey(row, "description")(e);
                  }}
                />
              </span>
              <span role="cell" className="it-unit">
                <input
                  data-cell={`${item.id}:unit`}
                  list="qs-units"
                  aria-label={`Item ${n} unit`}
                  aria-invalid={bad("unit") || undefined}
                  className="qs-cell"
                  placeholder="Unit"
                  value={item.unit}
                  onFocus={() => { original.current = item.unit; }}
                  onBlur={() => touch(item.id, "unit")}
                  onChange={(e) => onEdit(item.id, { unit: e.target.value }, `${item.id}:unit`)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") { e.stopPropagation(); onEdit(item.id, { unit: original.current }, `${item.id}:unit:esc`); (e.target as HTMLElement).blur(); return; }
                    onCellKey(row, "unit")(e);
                  }}
                />
              </span>
              <span role="cell" className="it-qty">
                <NumCell cellId={`${item.id}:quantity`} label={`Item ${n} quantity`} value={item.quantity} max={MAX_QUANTITY} invalid={bad("quantity")} onCommit={(v) => onEdit(item.id, { quantity: v }, `${item.id}:quantity:commit`)} onBlurCell={() => touch(item.id, "quantity")} onKeyDown={onCellKey(row, "quantity")} />
              </span>
              <span role="cell" className="it-rate">
                <NumCell cellId={`${item.id}:rate`} label={`Item ${n} rate`} value={item.rate} max={MAX_RATE} invalid={bad("rate")} onCommit={(v) => onEdit(item.id, { rate: v }, `${item.id}:rate:commit`)} onBlurCell={() => touch(item.id, "rate")} onKeyDown={onCellKey(row, "rate")} />
              </span>
              <span role="cell" className="it-amount" aria-label={`Item ${n} amount`}>{complete ? formatINR(calcAmount(item.quantity, item.rate)) : "—"}</span>
              <span role="cell" className="it-actions">
                <button type="button" aria-label={`Move item ${n} up`} disabled={row === 0} onClick={() => onMove(row, row - 1)}><ArrowUp size={14} /></button>
                <button type="button" aria-label={`Move item ${n} down`} disabled={row === items.length - 1} onClick={() => onMove(row, row + 1)}><ArrowDown size={14} /></button>
                <button type="button" aria-label={`Duplicate item ${n}`} onClick={() => onDuplicate(item.id)}><Copy size={14} /></button>
                <button type="button" aria-label={`Delete item ${n}`} className="qs-danger" onClick={() => onRemove(item.id)}><Trash2 size={14} /></button>
              </span>
              {shown.length > 0 && <span className="it-error" role="alert">{shown.map((f) => err[FIELD_ERROR[f]]).join(" · ")}</span>}
            </div>
          );
        })}
      </div>
      <div className="qs-items-actions">
        <button type="button" className="qs-btn" onClick={() => onAdd()}><Plus size={15} aria-hidden /> Add item</button>
        <Presets />
        {incomplete > 0 && <span className="qs-items-note">{incomplete} incomplete {incomplete === 1 ? "row is" : "rows are"} left off the quotation until {incomplete === 1 ? "it has" : "they have"} a description, unit, quantity and rate.</span>}
      </div>
    </div>
  );
}
