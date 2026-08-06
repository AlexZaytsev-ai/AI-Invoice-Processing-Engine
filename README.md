# AI Invoice Processing Engine

AI-powered invoice processing workflow built with **n8n** that extracts invoice data from PDF files, validates business rules, prevents duplicate records, and automatically creates or updates invoices.

---

## Business Problem

Companies receive invoices by email every day. Manual processing is slow, error-prone, and increases the risk of duplicate records and incorrect payments.

This workflow automates invoice processing and validates critical business rules before data is stored.

---

## Workflow Architecture

```text
Gmail Trigger
      │
      ▼
Get Invoice Email
      │
      ▼
Extract PDF Text
      │
      ▼
AI Invoice Analysis
      │
      ▼
Prepare Invoice Data
      │
      ▼
Supplier Lookup
      │
      ▼
Bank Account Validation
      │
      ▼
Invoice Lookup
      │
      ▼
Invoice Exists?
      │
 ┌────┴─────┐
 │          │
 ▼          ▼
Create   Invoice Changed?
Invoice        │
               ▼
         Update Invoice
               │
               ▼
        Notifications
```

---

## Architecture Principles

- AI extracts and structures invoice data.
- Business decisions are handled by deterministic workflow logic.
- Supplier Registry is the Single Source of Truth.
- Composite Business Keys prevent duplicate invoices.
- Existing invoices are updated instead of duplicated.
- Manual Review handles uncertain scenarios.

---

## Tech Stack

| Technology | Purpose |
|------------|---------|
| n8n | Workflow Automation |
| Gmail API | Email Trigger |
| OpenAI | Invoice Analysis |
| Google Sheets | Data Storage |
| Telegram | Notifications |

---

## Key Features

- PDF text extraction
- AI Invoice Analysis
- Supplier Lookup
- Bank Account Validation
- Duplicate Detection
- Change Detection
- Versioning
- Manual Review
- Telegram Notifications

---

## Business Rules

- Validate supplier against Supplier Registry.
- Verify bank account.
- Detect duplicate invoices using **supplier_inn + invoice_number**.
- Update invoices only when business data changes.

---

## Future Improvements

- PostgreSQL
- OCR support
- ERP integration
- Approval workflow
- Audit logging

---

Built as part of my AI Automation Engineer portfolio.
