AI Invoice Processing Engine

AI-powered invoice processing workflow built with n8n that extracts invoice data from PDF files, validates business rules, prevents duplicate records, stores invoices in PostgreSQL, and synchronizes them with Bitrix24.

Business Problem

Companies receive supplier invoices by email every day. Manual processing is slow, error-prone, and can lead to duplicate records or payment based on incomplete or unverified bank details.

This workflow automates invoice processing, validates critical business rules, and sends uncertain cases to a manager for manual review before data is processed further.

Workflow Architecture

Gmail Trigger
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
Invoice Data Valid?
      │
 ┌────┴───────────────────────┐
 │ No                         │ Yes
 ▼                            ▼
Manual Review          Find Supplier by INN
                               │
                               ▼
                     Bank Account Match?
                               │
                    ┌──────────┴──────────┐
                    │ No                  │ Yes
                    ▼                     ▼
              Manual Review       Find Existing Invoice
                                           │
                                           ▼
                                   Invoice Exists?
                                           │
                              ┌────────────┴────────────┐
                              │ No                       │ Yes
                              ▼                          ▼
                  Create in PostgreSQL          Invoice Changed?
                                                        │
                                          ┌─────────────┴─────────────┐
                                          │ No                        │ Yes
                                          ▼                           ▼
                                     Stop: duplicate          Update PostgreSQL
                                                 │                   │
                                                 └─────────┬─────────┘
                                                           ▼
                                            Sync Bitrix24 sub-workflow
                                                           │
                                                           ▼
                                              Telegram notification

Workflow



Architecture Principles

AI extracts and structures invoice data; deterministic workflow logic makes business decisions.

Invoice data must contain invoice_number, supplier_inn, and bank_account; amount must be greater than zero.

Supplier Registry in PostgreSQL is the Single Source of Truth for supplier bank details.

Suppliers are identified by INN, not by a potentially inconsistent company name.

Composite business key supplier_inn + invoice_number prevents duplicate invoices.

Existing invoices are updated only when key business data changes; repeated unchanged emails stop safely.

Manual Review handles missing, unknown, or suspicious data.

Tech Stack

Technology

Purpose

n8n

Workflow Automation and Routing

Gmail API

Email Trigger and PDF Attachments

OpenAI

Structured Invoice Analysis

PostgreSQL

Supplier Registry and Invoice Storage

Bitrix24 REST API + OAuth2

Create and Update Invoice Items

JavaScript

Compare Invoice Data Before Update

Telegram

Manager Notifications

Key Features

PDF text extraction

AI Invoice Analysis

Required Data Validation

Supplier Lookup by INN

Bank Account Validation

Composite Business Key

Duplicate and Change Detection

Invoice Versioning

Bitrix24 Sync Sub-workflow

Retry On Fail for Bitrix24 Updates

Manual Review and Telegram Notifications

Business Rules

Validate required invoice data before processing.

Validate supplier against the PostgreSQL Supplier Registry using supplier_inn.

Verify the bank account before further processing; do not update it automatically when it differs.

Detect duplicate invoices using supplier_inn + invoice_number.

Update invoices only when business data changes.

Keep the Bitrix24 item ID in PostgreSQL to update the same item instead of creating a duplicate.

Future Improvements

OCR support for scanned invoices

Approval workflow for high-risk invoices

Audit logging

Monitoring and alerting

Author

Alexander Zaytsev

AI Automation Engineer

GitHub: https://github.com/AlexZaytsev-ai

Email: polonix315@gmail.com
