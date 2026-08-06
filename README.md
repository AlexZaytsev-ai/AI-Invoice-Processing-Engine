# AI Invoice Processing Engine

## Business Problem

Companies receive a large number of invoices by email every day. Manual invoice processing requires employees to download PDF files, extract invoice details, verify suppliers, validate bank accounts, detect duplicate invoices, and manually create or update records.

This process is time-consuming, error-prone, and increases the risk of duplicate records, incorrect payments, and delayed invoice processing.

---

## Solution Overview

AI Invoice Processing Engine is an end-to-end invoice automation workflow built in n8n.

The workflow automatically:

- monitors Gmail for new invoice emails;
- extracts text from PDF attachments;
- uses AI to convert unstructured invoice text into structured JSON;
- validates suppliers against a trusted Supplier Registry;
- verifies bank account information;
- detects existing invoices using a Composite Business Key;
- creates new invoices or updates existing records;
- sends notifications for successful processing and manual review scenarios.

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
Supplier Validation
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

## Key Features

- Gmail invoice automation
- PDF text extraction
- AI-powered invoice analysis
- Structured Output (JSON)
- Supplier Lookup
- Bank Account Validation
- Composite Business Key
- Duplicate Detection
- Change Detection
- Versioning
- Manual Review
- Telegram notifications

---

## Tech Stack

- n8n
- Gmail API
- OpenAI
- Structured Output Parser
- Google Sheets
- Telegram Bot API

---

## Business Rules

### Supplier Validation

Every supplier must exist in the Supplier Registry.

If no supplier is found, the workflow stops and requests manual review.

---

### Bank Account Validation

The bank account extracted from the invoice must match the trusted bank account stored in the Supplier Registry.

If the bank account differs, processing stops and the manager is notified.

---

### Duplicate Detection

Invoices are searched using a Composite Business Key:

- supplier_inn
- invoice_number

This prevents duplicate invoice creation.

---

### Change Detection

Existing invoices are compared with incoming invoice data.

If no business fields have changed:

- workflow ends.

If changes are detected:

- existing invoice is updated;
- version number is incremented.

---

## Data Flow

```text
Incoming Email
      │
      ▼
PDF Extraction
      │
      ▼
AI Processing
      │
      ▼
Data Mapping
      │
      ▼
Business Validation
      │
      ▼
Data Persistence
      │
      ▼
Notification
```

---

## Manual Review

Manual review is triggered when:

- supplier is not found;
- bank account validation fails.

These scenarios require human verification before further processing.

---

## Skills Demonstrated

- AI Automation
- n8n Workflow Development
- Business Process Automation
- AI Document Processing
- Structured Output
- Workflow Architecture
- Business Validation
- Data Mapping
- Supplier Lookup
- Versioning
- Change Detection
- Error Handling
- Google Workspace Automation

---

## Future Improvements

- PostgreSQL instead of Google Sheets
- OCR support for scanned invoices
- Multi-currency validation
- ERP integration (SAP / Oracle / Dynamics)
- Approval workflow
- Audit logging
- Dashboard and analytics
