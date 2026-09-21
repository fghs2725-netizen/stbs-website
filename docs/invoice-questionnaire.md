# Invoice feature: questions for the owner

Open `docs/invoice-design-v1.html` in a browser to see the first design. It follows the clean sample you
supplied, with your own details and the Indian tax-invoice fields added.

Nothing below has been built yet, and no database change has been made. Answer only what you have a view
on: every question has a recommended default in **bold**, and "default" is a complete answer.

---

## 1. What the invoice shows (the on/off switches in Settings)

The design shows every switch turned on at once, which is the busiest an invoice will ever look. Tell me
which should be **on by default**; each stays switchable per invoice.

### Columns in the item table

| Switch | Default | Keep? |
|---|---|---|
| HSN / SAC code | **On** — required once you charge GST | |
| Unit (Nos, Meter, Job…) | **On** | |
| Details under the item name (brand, model, size) | **On** — same as the quotation | |
| Serial number column | **Off** — the sample has none, QTY leads | |
| Per-item discount column | **Off** — one discount on the subtotal, as the quotation does | |
| Per-item GST rate column | **Off** — one rate for the whole invoice | |

**1a.** If different items need different GST rates (say 18% on services, 12% on some material), say so —
that changes the totals block and the per-item rate column becomes necessary.

### Blocks on the page

| Switch | Default | Keep? |
|---|---|---|
| Ship To / site address | **On**, hidden when it is the same as Bill To | |
| Place of supply | **On** — required on a GST invoice | |
| Reverse charge line | **On** — required, almost always "No" | |
| Due date | **On** | |
| "Original for recipient" marker | **On** | |
| Reference to the quotation it came from | **On** when converted | |
| Amount in words | **On** | |
| Advance received / balance due | **On** when an advance is recorded | |
| Round off | **On** | |
| Payment / bank details | **On** | |
| UPI QR code | **On** — see question 5 | |
| Signature and stamp | **On** | |
| Terms and conditions | **On** | |
| Declaration ("we certify that…") | **Off** — the terms cover it; switch on if your CA wants it | |
| PAID / OVERDUE stamp across the page | **Off** | |

---

## 2. Numbering

**2a.** Separate series from quotations? Recommended: **yes**.
Quotation `STBS/2026-27/0142`, invoice `STBS/INV/2026-27/0031`.

**2b.** Format. Recommended: **`STBS/INV/{financial year}/{4 digits}`**, restarting at 0001 each
financial year on 1 April — the same rule your quotations use now.

**2c.** Is there an existing invoice book to continue from? If you already issue invoices by hand or in
another program, give me the last number used and the software will carry on from there. This matters:
a GST invoice series must be continuous, with no gaps or duplicates, for the whole financial year.

**2d.** Should the number be reserved when the invoice is created, or only when it is issued?
Recommended: **only on issue**, so abandoned drafts never eat a number and leave a gap.

---

## 3. GST

**3a.** GST on by default for invoices? Recommended: **on** (a quotation may be without GST, a tax
invoice normally is not).

**3b.** Default rate. Recommended: **18%**.

**3c.** CGST+SGST vs IGST chosen automatically from the client's state (Haryana → CGST+SGST, anywhere
else → IGST)? Recommended: **yes, chosen automatically, with a manual override**.

**3d.** HSN/SAC codes. I need the correct code for each thing you sell — I will not guess these, as a
wrong code on a tax invoice is your liability, not a cosmetic error. Please give the codes you use for:
borewell drilling, tubewell construction, rainwater harvesting, submersible pumps, PVC/casing pipe, GI
pipe, cable, starters and panels, gravel, labour and machine shifting, and anything else you bill often.
Your CA will have these. Once given, the software remembers the code per item name so you type it once.

**3e.** Do you need an **HSN summary table** (a small table grouping taxable value and tax by HSN code)?
Recommended: **off for now** — it becomes mandatory at higher turnover; your CA will know.

**3f.** Does e-invoicing apply to you (the government IRN and signed QR code, for businesses above the
turnover threshold)? Recommended answer if unsure: **no** — but please confirm with your CA, because if
it does apply, an invoice is not valid without the IRN, and that is a much bigger piece of work.

---

## 4. Payment details to print

I have used obvious placeholders in the design (`0000 0000 0000`, `XXXX0000000`). I will not invent these.
Please supply:

- Account name (as in the bank record)
- Account number
- IFSC
- Bank and branch
- UPI ID
- Anything else you want printed (cheque payable name, and so on)

**4a.** Should these print on every invoice, or only when you switch them on? Recommended: **every
invoice**.

---

## 5. UPI QR code

**5a.** Which do you want?
- **Recommended:** a QR generated per invoice that already carries the amount, so the client scans and
  pays the exact balance without typing it.
- Or: a fixed QR image of your existing UPI code, uploaded once.
- Or: no QR.

For the generated one I need the UPI ID and the exact account holder name as registered.

---

## 6. Signature and stamp

**6a.** Upload a scanned signature and rubber stamp to print automatically, or leave a blank box to sign
by hand? Recommended: **blank box**, unless you want the convenience — a printed signature on a PDF that
leaves your hands is easy for someone else to reuse.

**6b.** Name and designation under the line. Recommended: **"Authorised Signatory"** with no name, or give
me the name to print.

---

## 7. Payment terms, due date and part payment

**7a.** Default credit period. Recommended: **14 days** from the invoice date. ("Due on receipt" and 30
days are the other common choices.)

**7b.** Do you take advances? The design shows "Advance received" and "Balance due". Should I let you
record payments against an invoice (date, amount, method) so the balance is always right, and mark it
Paid automatically when the balance reaches zero? Recommended: **yes**.

**7c.** Should the invoice list show what is overdue, and by how many days? Recommended: **yes**.

---

## 8. Turning a quotation into an invoice

My understanding of what you asked for, please correct anything wrong:

- A **Convert to invoice** button on a quotation copies the client, the items, the discount and the GST
  settings into a new invoice.
- Every field is then **editable on the invoice**, and editing it never changes the quotation.
- Later edits to the quotation do **not** flow into the invoice.
- The quotation then shows that its invoice exists, with **View invoice** and **Download invoice**
  buttons next to the existing quotation buttons.
- A **New invoice** button creates a fresh invoice with no quotation behind it.

**8a.** Can one quotation produce **more than one** invoice — part billing, or a running bill per stage?
Recommended: **yes, allow several**, with the quotation listing each one. This is common in site work.
If you say no, the button disappears once an invoice exists.

**8b.** When converting, should the invoice start as a **draft** you check and then issue, or be issued
straight away? Recommended: **draft**.

---

## 9. Editing, cancelling and credit notes

This is the one place where the software should stop you, so it is worth a decision.

**9a.** Once an invoice is **issued** (numbered and sent), should it stay locked from editing?
Recommended: **yes, locked**. Under GST an issued invoice is not supposed to be quietly altered; the
correct fixes are a cancellation or a credit note. I would allow: cancel (the number stays used, marked
Cancelled) and, if you want it, a credit note.

**9b.** Do you want **credit notes** (for a return, a rate correction or a discount after the fact)?
Recommended: **not in the first version**, added later if your CA asks for it.

**9c.** Which statuses do you want? Recommended: **Draft, Issued, Partly paid, Paid, Cancelled**.

---

## 10. The invoice template editor

Built the same way as the quotation template editor: several named templates, one marked default, a
switcher on each invoice, and duplicate/rename/archive.

**10a.** Which wording should be editable per template? Recommended: **all of these** —

- the title ("Tax Invoice", "Invoice", "Proforma Invoice")
- the "Original for recipient" line
- terms and conditions
- the declaration
- the payment-details heading and any extra payment note
- the signature line wording
- the page footer

**10b.** Do you want a **Proforma Invoice** template (same design, different title, no GST number
consumed, for advance requests)? Recommended: **yes** — it is nearly free once the rest exists, and it is
useful for asking for an advance before work starts.

**10c.** Should invoices use the **same design as this sample only**, or do you also want a version in the
dark gold STBS style of the quotation, switchable per template? Recommended: **this clean sample only**
for now.

---

## 11. The logo on white paper

Your logo files (`logo.png`, `stbs-logo-only.png`) are white lettering with a glow, made for a dark
background. On white paper they disappear, so in the design I have set the logo in a dark block, which
works but uses a lot of ink on every page.

**11a.** Do you have, or can you get, a version of the logo in dark colours on a transparent background?
That is the right fix and will look better. If not, I will keep the dark block.

---

## 12. Sharing and file names

**12a.** PDF file name. Recommended: **`STBS-Invoice-{number}-{client}.pdf`**, matching the quotation.

**12b.** Share on WhatsApp and email, reusing what the quotation already does? Recommended: **yes**.

**12c.** Word (.docx) export for invoices too? Recommended: **no** — an invoice should go out as a PDF.

---

## 13. What I still need from you before any of this can go live

- [ ] Bank details and UPI ID (question 4)
- [ ] HSN / SAC codes for your regular items (question 3d)
- [ ] Confirmation on e-invoicing from your CA (question 3f)
- [ ] The last invoice number already used, if any (question 2c)
- [ ] A dark version of the logo, if one exists (question 11)
- [ ] Approval to add the invoice tables to the database (this needs a migration; I will show you the SQL
      before running anything, and it only adds new tables, it does not touch quotations)

---

## 14. Anything I have missed

Tell me anything your clients or your CA ask for that is not above — a purchase-order number field, a
vehicle or e-way bill number, a delivery challan reference, a work-completion date, TDS deduction, a
second GSTIN for a different state, and so on. It is much cheaper to add now than after the design is
built.
