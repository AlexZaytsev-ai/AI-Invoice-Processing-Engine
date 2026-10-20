export class InvoiceApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvoiceApiError";
  }
}
