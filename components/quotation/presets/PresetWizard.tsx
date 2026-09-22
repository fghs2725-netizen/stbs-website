"use client";

/**
 * The few questions between "new quotation" and a filled-in item table.
 *
 * One screen per question, because this is used standing at a site on a phone: a long form of small
 * selects is the thing it is replacing. The questions themselves come from the preset — whichever
 * placeholders its wording uses — so adding one later is a change to the wording, not to this file.
 */
import { useState } from "react";
import { ArrowLeft, Check, FileText } from "lucide-react";
import { fieldsInUse, type Preset, type PresetField } from "@/lib/quotation-presets";
import "./preset-wizard.css";

const CUSTOM = "__custom__";

export function PresetWizard({ presets, onDone, onBlank }: {
  presets: Preset[];
  onDone: (preset: Preset, answers: Record<string, string>) => void;
  onBlank: () => void;
}) {
  const [preset, setPreset] = useState<Preset | null>(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [custom, setCustom] = useState("");

  const questions: PresetField[] = preset ? fieldsInUse(preset) : [];
  const field = questions[step];

  const back = () => {
    setCustom("");
    if (step === 0) { setPreset(null); setAnswers({}); return; }
    setStep((n) => n - 1);
  };

  const answer = (value: string) => {
    const next = { ...answers, [field.key]: value };
    setAnswers(next);
    setCustom("");
    if (step + 1 < questions.length) setStep(step + 1);
    else onDone(preset as Preset, next);
  };

  const choose = (p: Preset) => {
    const needed = fieldsInUse(p);
    setPreset(p);
    setStep(0);
    setAnswers({});
    // A preset whose wording has no placeholders has nothing to ask, so it goes straight through.
    if (!needed.length) onDone(p, {});
  };

  if (!preset) {
    return (
      <div className="pw">
        <header className="pw-head">
          <p className="pw-eyebrow">New quotation</p>
          <h1>What are you quoting for?</h1>
          <p className="pw-sub">Pick a job and the items are written for you. You can change every line afterwards.</p>
        </header>
        <div className="pw-choices">
          {presets.map((p) => (
            <button key={p.key} type="button" className="pw-choice" onClick={() => choose(p)}>
              <span className="pw-choice-name">{p.name}</span>
              <span className="pw-choice-meta">{p.items.length} items</span>
            </button>
          ))}
          <button type="button" className="pw-choice pw-choice-quiet" onClick={onBlank}>
            <span className="pw-choice-name"><FileText size={16} aria-hidden /> Blank quotation</span>
            <span className="pw-choice-meta">Start with an empty table</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pw">
      <header className="pw-head">
        <button type="button" className="pw-back" onClick={back}>
          <ArrowLeft size={15} aria-hidden /> Back
        </button>
        <p className="pw-eyebrow">{preset.name} · question {step + 1} of {questions.length}</p>
        <h1>{field.label}</h1>
      </header>

      <div className="pw-choices">
        {field.options.map((option) => (
          <button
            key={option} type="button"
            className={`pw-choice${answers[field.key] === option ? " pw-choice-on" : ""}`}
            onClick={() => answer(option)}
          >
            <span className="pw-choice-name">{option}</span>
            {answers[field.key] === option && <Check size={16} aria-hidden />}
          </button>
        ))}

        {field.allowCustom && (
          <div className="pw-custom">
            <input
              value={custom}
              placeholder="Something else"
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && custom.trim()) { e.preventDefault(); answer(custom.trim()); } }}
              aria-label={`${field.label}, your own value`}
            />
            <button type="button" className="pw-use" disabled={!custom.trim()} onClick={() => answer(custom.trim())}>
              Use it
            </button>
          </div>
        )}
      </div>

      <p className="pw-foot">
        {/* Named so it is obvious this is not the last chance to get it right. */}
        Every line is editable in the next step.
      </p>
    </div>
  );
}

export { CUSTOM };
