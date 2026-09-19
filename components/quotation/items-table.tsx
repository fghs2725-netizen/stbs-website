"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Copy, GripVertical, Trash2 } from "lucide-react";
import { calcAmount, formatINR, isItemValid, type QuotationItem, type validateItem } from "./quotation-model";
import { formatCell, MAX_QUANTITY, MAX_RATE, parseNumeric, sanitizeNumericText } from "./editor-logic";

type Errors = Map<string, ReturnType<typeof validateItem>>;
type Field = "description" | "unit" | "quantity" | "rate";
const FIELDS: Field[] = ["description", "unit", "quantity", "rate"];

export function NumberCell({ value, max, label, invalid, cellId, onCommit, onKeyDown }: {
  value: number; max: number; label: string; invalid: boolean; cellId: string;
  onCommit: (n: number) => void; onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const cancelled = useRef(false);
  const shown = draft ?? formatCell(value);
  return (
    <input
      data-cell={cellId}
      inputMode="decimal"
      aria-label={label}
      aria-invalid={invalid || undefined}
      className={`num ${invalid ? "field-error" : ""}`}
      value={shown}
      onFocus={(e) => { cancelled.current = false; setDraft(value === 0 ? "" : String(value)); const input = e.target; requestAnimationFrame(() => { if (document.activeElement === input) input.select(); }); }}
      onChange={(e) => setDraft(sanitizeNumericText(e.target.value))}
      onBlur={() => { if (draft !== null && !cancelled.current) onCommit(parseNumeric(draft, max)); setDraft(null); }}
      onKeyDown={(e) => {
        if (e.key === "Escape") { e.stopPropagation(); cancelled.current = true; (e.target as HTMLInputElement).blur(); return; }
        onKeyDown(e);
      }}
    />
  );
}

export function ItemsTable({ items, errors, focusId, onEdit, onAdd, onRemove, onDuplicate, onMove, onReorder }: {
  items: QuotationItem[];
  errors: Errors;
  focusId: string | null;
  onEdit: (id: string, patch: Partial<QuotationItem>, key: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
  onMove: (from: number, to: number) => void;
  onReorder: (from: number, to: number) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const dragFrom = useRef<number | null>(null);
  const [dropAt, setDropAt] = useState<number | null>(null);
  const originalText = useRef("");

  useEffect(() => {
    if (!focusId) return;
    const el = root.current?.querySelector<HTMLElement>(`[data-cell="${focusId}:description"]`);
    el?.focus();
    el?.scrollIntoView({ block: "nearest" });
  }, [focusId]);

  const focusCell = (row: number, field: Field) => root.current?.querySelector<HTMLElement>(`[data-cell="${items[row]?.id}:${field}"]`)?.focus();

  // Tab moves cell to cell natively; Enter moves down a row and adds a row from the last cell.
  const onCellKey = (row: number, field: Field) => (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const last = field === "rate";
    if (last && row === items.length - 1) onAdd();
    else if (last) focusCell(row + 1, "description");
    else focusCell(row, FIELDS[FIELDS.indexOf(field) + 1]);
  };

  const textCell = (item: QuotationItem, row: number, field: "description" | "unit", label: string, invalid: boolean) => (
    <input
      data-cell={`${item.id}:${field}`}
      aria-label={label}
      aria-invalid={invalid || undefined}
      className={invalid ? "field-error" : ""}
      value={item[field]}
      placeholder={field === "description" ? "Describe the work or material" : "Unit"}
      onFocus={() => { originalText.current = item[field]; }}
      onChange={(e) => onEdit(item.id, { [field]: e.target.value }, `${item.id}:${field}`)}
      onKeyDown={(e) => {
        if (e.key === "Escape") { e.stopPropagation(); onEdit(item.id, { [field]: originalText.current }, `${item.id}:${field}:esc`); (e.target as HTMLInputElement).blur(); return; }
        onCellKey(row, field)(e);
      }}
    />
  );

  return (
    <div className="items-table" role="table" aria-label="Price items" ref={root}>
      <div className="it-head" role="row">
        <span role="columnheader" aria-label="Reorder" />
        <span role="columnheader">Description</span>
        <span role="columnheader">Unit</span>
        <span role="columnheader">Qty</span>
        <span role="columnheader">Rate</span>
        <span role="columnheader">Amount</span>
        <span role="columnheader" aria-label="Row actions" />
      </div>
      {items.map((item, row) => {
        const err = errors.get(item.id);
        return (
          <div
            key={item.id}
            role="row"
            className={`it-row ${err ? "has-errors" : ""} ${dropAt === row ? "drop-target" : ""}`}
            onDragOver={(e) => { if (dragFrom.current !== null) { e.preventDefault(); setDropAt(row); } }}
            onDragLeave={() => setDropAt((d) => (d === row ? null : d))}
            onDrop={(e) => { e.preventDefault(); if (dragFrom.current !== null) onReorder(dragFrom.current, row); dragFrom.current = null; setDropAt(null); }}
          >
            <span role="cell" className="it-grip" draggable onDragStart={(e) => { dragFrom.current = row; e.dataTransfer.effectAllowed = "move"; }} onDragEnd={() => { dragFrom.current = null; setDropAt(null); }} title="Drag to reorder">
              <GripVertical className="size-4" aria-hidden />
              <span className="sr-only">Row {row + 1}</span>
            </span>
            <span role="cell" className="it-desc">{textCell(item, row, "description", `Item ${row + 1} description`, Boolean(err?.description))}</span>
            <span role="cell" className="it-unit">{textCell(item, row, "unit", `Item ${row + 1} unit`, Boolean(err?.unit))}</span>
            <span role="cell" className="it-qty">
              <NumberCell cellId={`${item.id}:quantity`} label={`Item ${row + 1} quantity`} value={item.quantity} max={MAX_QUANTITY} invalid={Boolean(err?.quantity)} onCommit={(n) => onEdit(item.id, { quantity: n }, `${item.id}:quantity:commit`)} onKeyDown={onCellKey(row, "quantity")} />
            </span>
            <span role="cell" className="it-rate">
              <NumberCell cellId={`${item.id}:rate`} label={`Item ${row + 1} rate`} value={item.rate} max={MAX_RATE} invalid={Boolean(err?.rate)} onCommit={(n) => onEdit(item.id, { rate: n }, `${item.id}:rate:commit`)} onKeyDown={onCellKey(row, "rate")} />
            </span>
            <span role="cell" className="it-amount" aria-label={`Item ${row + 1} amount`}>{isItemValid(item) ? formatINR(calcAmount(item.quantity, item.rate)) : "—"}</span>
            <span role="cell" className="it-actions">
              <button type="button" aria-label={`Move item ${row + 1} up`} disabled={row === 0} onClick={() => onMove(row, row - 1)}><ArrowUp className="size-3.5" /></button>
              <button type="button" aria-label={`Move item ${row + 1} down`} disabled={row === items.length - 1} onClick={() => onMove(row, row + 1)}><ArrowDown className="size-3.5" /></button>
              <button type="button" aria-label={`Duplicate item ${row + 1}`} onClick={() => onDuplicate(item.id)}><Copy className="size-3.5" /></button>
              <button type="button" aria-label={`Delete item ${row + 1}`} className="danger" onClick={() => onRemove(item.id)}><Trash2 className="size-3.5" /></button>
            </span>
            {err && <span className="it-error" role="alert">{[err.description, err.unit, err.quantity, err.rate].filter(Boolean).join(" · ")}</span>}
          </div>
        );
      })}
    </div>
  );
}
