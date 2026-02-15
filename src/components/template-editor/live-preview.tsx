"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TemplateConfig } from "@/types";

interface CustomField {
  id: string;
  section: string;
  fieldName: string;
  fieldKey: string;
  fieldType: string;
}

interface LivePreviewProps {
  config: TemplateConfig;
  customFields: CustomField[];
  docType: string;
}

const SAMPLE_DATA = {
  company: {
    name: "TechVentures Sdn Bhd",
    address: "123 Jalan Teknologi, Cyberjaya 63000, Selangor",
    phone: "+60 3-8888 1234",
    email: "billing@techventures.my",
    website: "www.techventures.my",
    regNo: "202001012345 (1234567-A)",
    taxId: "SST-0001-2026",
    tagline: "Innovative Solutions for Modern Business",
  },
  invoice: {
    invoiceNo: "INV-2026-001",
    date: "15 Feb 2026",
    dueDate: "17 Mar 2026",
  },
  customer: {
    name: "ABC Trading Sdn Bhd",
    address: "456 Jalan Perdagangan\nPetaling Jaya 46000\nSelangor",
    shipTo: "789 Warehouse Road\nShah Alam 40000\nSelangor",
  },
  customFieldValues: {
    poNumber: "PO-2026-0042",
    boNumber: "BO-1001",
    doNumber: "DO-5542",
    salesOrderNo: "SO-2026-018",
    paymentTerms: "Net 30",
    projectCode: "PRJ-ALPHA",
    salesperson: "Ahmad bin Ibrahim",
  },
  lines: [
    { itemCode: "SVC-001", description: "Cloud Hosting Plan A - Annual", qty: 1, unitPrice: 2400, discount: 0, tax: 6, amount: 2544 },
    { itemCode: "SVC-002", description: "SSL Certificate Bundle", qty: 3, unitPrice: 150, discount: 10, tax: 6, amount: 429.30 },
    { itemCode: "DEV-010", description: "Custom API Development (40 hrs)", qty: 40, unitPrice: 180, discount: 0, tax: 6, amount: 7632 },
    { itemCode: "MNT-003", description: "Monthly Maintenance Contract", qty: 12, unitPrice: 500, discount: 5, tax: 6, amount: 6084 },
  ],
  subtotal: 16239.30,
  discount: 450.00,
  shipping: 0,
  taxTotal: 974.36,
  rounding: -0.16,
  total: 16763.50,
};

const docTypeTitle: Record<string, string> = {
  INVOICE: "INVOICE",
  QUOTATION: "QUOTATION",
  CREDIT_NOTE: "CREDIT NOTE",
  DEBIT_NOTE: "DEBIT NOTE",
};

export function LivePreview({ config, customFields, docType }: LivePreviewProps) {
  const s = config.style;
  const sec = config.sections;

  const docInfoCustomFields = customFields.filter((f) => f.section === "docInfo");
  const footerCustomFields = customFields.filter((f) => f.section === "footer");

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Live Preview
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2">
        <div
          className="bg-white border rounded-lg shadow-sm p-6 text-black mx-auto"
          style={{
            fontFamily: s.fontFamily === "Courier" ? "monospace" : s.fontFamily === "Times-Roman" ? "serif" : "sans-serif",
            fontSize: `${s.fontSize}px`,
            maxWidth: "595px",
            minHeight: "800px",
          }}
        >
          {/* Header */}
          {sec.header.visible && (
            <div className="mb-4 pb-3" style={{ borderBottom: `2px solid ${s.primaryColor}` }}>
              <div className="flex justify-between items-start">
                <div>
                  {sec.header.showLogo && (
                    <div className="w-12 h-12 rounded flex items-center justify-center text-white text-xs font-bold mb-2" style={{ backgroundColor: s.primaryColor }}>
                      LOGO
                    </div>
                  )}
                  <h2 className="text-lg font-bold" style={{ color: s.primaryColor }}>
                    {SAMPLE_DATA.company.name}
                  </h2>
                  {sec.header.showTagline && (
                    <p className="text-xs italic opacity-60">{SAMPLE_DATA.company.tagline}</p>
                  )}
                </div>
                <div className="text-right text-xs space-y-0.5">
                  {sec.header.showAddress && <p>{SAMPLE_DATA.company.address}</p>}
                  {sec.header.showPhone && <p>{SAMPLE_DATA.company.phone}</p>}
                  {sec.header.showEmail && <p>{SAMPLE_DATA.company.email}</p>}
                  {sec.header.showWebsite && <p>{SAMPLE_DATA.company.website}</p>}
                  {sec.header.showRegNo && <p>Reg: {SAMPLE_DATA.company.regNo}</p>}
                  {sec.header.showTaxId && <p>Tax ID: {SAMPLE_DATA.company.taxId}</p>}
                </div>
              </div>
            </div>
          )}

          {/* Document Title */}
          <h1 className="text-center text-xl font-bold mb-4" style={{ color: s.primaryColor }}>
            {docTypeTitle[docType] || "INVOICE"}
          </h1>

          {/* Document Info + Bill To */}
          <div className="flex justify-between mb-4 gap-4">
            {/* Bill To */}
            {sec.billTo.visible && (
              <div className="flex-1">
                <p className="text-xs font-bold uppercase mb-1" style={{ color: s.primaryColor }}>Bill To</p>
                <p className="font-semibold text-sm">{SAMPLE_DATA.customer.name}</p>
                <p className="text-xs whitespace-pre-line">{SAMPLE_DATA.customer.address}</p>
                {sec.billTo.showShipTo && (
                  <div className="mt-2">
                    <p className="text-xs font-bold uppercase mb-1" style={{ color: s.primaryColor }}>Ship To</p>
                    <p className="text-xs whitespace-pre-line">{SAMPLE_DATA.customer.shipTo}</p>
                  </div>
                )}
              </div>
            )}

            {/* Document Info */}
            {sec.docInfo.visible && (
              <div className="text-right text-xs space-y-1">
                {sec.docInfo.fields.includes("invoiceNo") && (
                  <div><span className="font-semibold">Invoice #:</span> {SAMPLE_DATA.invoice.invoiceNo}</div>
                )}
                {sec.docInfo.fields.includes("date") && (
                  <div><span className="font-semibold">Date:</span> {SAMPLE_DATA.invoice.date}</div>
                )}
                {sec.docInfo.fields.includes("dueDate") && (
                  <div><span className="font-semibold">Due Date:</span> {SAMPLE_DATA.invoice.dueDate}</div>
                )}
                {docInfoCustomFields.map((f) => (
                  <div key={f.id}>
                    <span className="font-semibold">{f.fieldName}:</span>{" "}
                    {(SAMPLE_DATA.customFieldValues as any)[f.fieldKey] || "—"}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Line Items */}
          {sec.lineItems.visible && (
            <div className="mb-4">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ backgroundColor: s.primaryColor, color: "white" }}>
                    <th className="text-left p-1.5">#</th>
                    {sec.lineItems.columns.includes("itemCode") && <th className="text-left p-1.5">Code</th>}
                    {sec.lineItems.columns.includes("description") && <th className="text-left p-1.5">Description</th>}
                    {sec.lineItems.columns.includes("quantity") && <th className="text-right p-1.5">Qty</th>}
                    {sec.lineItems.columns.includes("unitPrice") && <th className="text-right p-1.5">Price</th>}
                    {sec.lineItems.columns.includes("discount") && <th className="text-right p-1.5">Disc%</th>}
                    {sec.lineItems.columns.includes("tax") && <th className="text-right p-1.5">Tax%</th>}
                    {sec.lineItems.columns.includes("amount") && <th className="text-right p-1.5">Amount</th>}
                  </tr>
                </thead>
                <tbody>
                  {SAMPLE_DATA.lines.map((line, i) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-gray-50" : ""}>
                      <td className="p-1.5">{i + 1}</td>
                      {sec.lineItems.columns.includes("itemCode") && <td className="p-1.5 font-mono">{line.itemCode}</td>}
                      {sec.lineItems.columns.includes("description") && <td className="p-1.5">{line.description}</td>}
                      {sec.lineItems.columns.includes("quantity") && <td className="p-1.5 text-right">{line.qty}</td>}
                      {sec.lineItems.columns.includes("unitPrice") && <td className="p-1.5 text-right">{line.unitPrice.toFixed(2)}</td>}
                      {sec.lineItems.columns.includes("discount") && <td className="p-1.5 text-right">{line.discount}%</td>}
                      {sec.lineItems.columns.includes("tax") && <td className="p-1.5 text-right">{line.tax}%</td>}
                      {sec.lineItems.columns.includes("amount") && <td className="p-1.5 text-right font-semibold">{line.amount.toFixed(2)}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Totals */}
          {sec.totals.visible && (
            <div className="flex justify-end mb-4">
              <div className="w-64 text-xs space-y-1">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>RM {SAMPLE_DATA.subtotal.toFixed(2)}</span>
                </div>
                {sec.totals.showDiscount && (
                  <div className="flex justify-between text-red-600">
                    <span>Discount</span>
                    <span>-RM {SAMPLE_DATA.discount.toFixed(2)}</span>
                  </div>
                )}
                {sec.totals.showShipping && (
                  <div className="flex justify-between">
                    <span>Shipping</span>
                    <span>RM {SAMPLE_DATA.shipping.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Tax (SST 6%)</span>
                  <span>RM {SAMPLE_DATA.taxTotal.toFixed(2)}</span>
                </div>
                {sec.totals.showRounding && (
                  <div className="flex justify-between">
                    <span>Rounding</span>
                    <span>RM {SAMPLE_DATA.rounding.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm pt-1 border-t-2" style={{ borderColor: s.primaryColor, color: s.primaryColor }}>
                  <span>TOTAL</span>
                  <span>RM {SAMPLE_DATA.total.toFixed(2)}</span>
                </div>
                {sec.totals.showAmountInWords && (
                  <p className="text-xs italic mt-1">
                    Ringgit Malaysia Sixteen Thousand Seven Hundred and Sixty-Three and Cents Fifty Only
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Footer */}
          {sec.footer.visible && (
            <div className="mt-6 pt-3 border-t text-xs space-y-3">
              {sec.footer.thankYouMessage && (
                <p className="text-center font-semibold" style={{ color: s.primaryColor }}>
                  {sec.footer.thankYouMessage}
                </p>
              )}

              {sec.footer.showBankDetails && sec.footer.bankDetails && (
                <div>
                  <p className="font-bold mb-0.5">Bank Details</p>
                  <p className="whitespace-pre-line opacity-75">{sec.footer.bankDetails}</p>
                </div>
              )}

              {sec.footer.showTerms && sec.footer.termsText && (
                <div>
                  <p className="font-bold mb-0.5">Terms & Conditions</p>
                  <p className="whitespace-pre-line opacity-75">{sec.footer.termsText}</p>
                </div>
              )}

              {footerCustomFields.map((f) => (
                <div key={f.id}>
                  <p className="font-bold mb-0.5">{f.fieldName}</p>
                  <p className="opacity-75">
                    {(SAMPLE_DATA.customFieldValues as any)[f.fieldKey] || "Sample value"}
                  </p>
                </div>
              ))}

              <div className="flex justify-between mt-6">
                {sec.footer.showSignature && (
                  <div className="text-center">
                    <div className="w-40 border-b border-black mb-1 pt-8"></div>
                    <p className="text-xs">Authorized Signature</p>
                  </div>
                )}
                {sec.footer.showStamp && (
                  <div className="text-center">
                    <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded flex items-center justify-center">
                      <span className="text-gray-300 text-xs">Stamp</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
