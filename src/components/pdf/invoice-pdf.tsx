"use client";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import { TemplateConfig } from "@/types";

interface InvoiceLine {
  itemCode?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  amount: number;
}

interface InvoiceData {
  invoiceNo: string;
  date: string;
  dueDate: string;
  customer: {
    name: string;
    address: string;
    shipTo?: string;
  };
  company: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    regNo?: string;
    taxId?: string;
    tagline?: string;
  };
  lines: InvoiceLine[];
  subtotal: number;
  discount?: number;
  shipping?: number;
  taxTotal: number;
  rounding?: number;
  total: number;
  customFieldValues?: Record<string, string>;
  notes?: string;
}

interface CustomField {
  section: string;
  fieldName: string;
  fieldKey: string;
  fieldType: string;
}

interface InvoicePDFProps {
  config: TemplateConfig;
  data: InvoiceData;
  customFields: CustomField[];
  docType: string;
}

const docTypeTitle: Record<string, string> = {
  INVOICE: "INVOICE",
  QUOTATION: "QUOTATION",
  CREDIT_NOTE: "CREDIT NOTE",
  DEBIT_NOTE: "DEBIT NOTE",
};

export function InvoicePDF({ config, data, customFields, docType }: InvoicePDFProps) {
  const pc = config.style.primaryColor;
  const fontSize = config.style.fontSize;
  const fontFamily = config.style.fontFamily;
  const sec = config.sections;

  const styles = StyleSheet.create({
    page: { padding: 40, fontSize, fontFamily, color: "#333" },
    headerRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12, paddingBottom: 8, borderBottomWidth: 2, borderBottomColor: pc },
    logo: { width: 40, height: 40, backgroundColor: pc, borderRadius: 4, justifyContent: "center", alignItems: "center", marginBottom: 4 },
    logoText: { color: "white", fontSize: 6, fontWeight: "bold" },
    companyName: { fontSize: fontSize + 4, fontWeight: "bold", color: pc },
    tagline: { fontSize: fontSize - 2, fontStyle: "italic", opacity: 0.6 },
    smallText: { fontSize: fontSize - 2 },
    title: { textAlign: "center", fontSize: fontSize + 8, fontWeight: "bold", color: pc, marginBottom: 12 },
    twoCol: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12, gap: 16 },
    sectionLabel: { fontSize: fontSize - 2, fontWeight: "bold", textTransform: "uppercase", color: pc, marginBottom: 2 },
    tableHeader: { flexDirection: "row", backgroundColor: pc, paddingVertical: 4, paddingHorizontal: 6 },
    tableHeaderCell: { color: "white", fontSize: fontSize - 1, fontWeight: "bold" },
    tableRow: { flexDirection: "row", paddingVertical: 3, paddingHorizontal: 6, borderBottomWidth: 0.5, borderBottomColor: "#ddd" },
    tableRowAlt: { flexDirection: "row", paddingVertical: 3, paddingHorizontal: 6, borderBottomWidth: 0.5, borderBottomColor: "#ddd", backgroundColor: "#f8f8f8" },
    tableCell: { fontSize: fontSize - 1 },
    totalsRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
    totalLabel: { fontSize: fontSize - 1 },
    totalValue: { fontSize: fontSize - 1, textAlign: "right" },
    grandTotal: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, borderTopWidth: 2, borderTopColor: pc, marginTop: 4 },
    grandTotalText: { fontSize: fontSize + 1, fontWeight: "bold", color: pc },
    footer: { marginTop: 20, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#ddd" },
    thankYou: { textAlign: "center", fontWeight: "bold", color: pc, marginBottom: 8 },
    footerLabel: { fontWeight: "bold", fontSize: fontSize - 1, marginBottom: 2 },
    footerText: { fontSize: fontSize - 2, opacity: 0.75 },
    signatureLine: { width: 150, borderBottomWidth: 1, borderBottomColor: "#333", marginTop: 30, marginBottom: 4 },
  });

  const columns = sec.lineItems.columns;
  const colWidths: Record<string, string> = {
    itemCode: "12%",
    description: "30%",
    quantity: "8%",
    unitPrice: "12%",
    discount: "10%",
    tax: "8%",
    amount: "14%",
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        {sec.header.visible && (
          <View style={styles.headerRow}>
            <View>
              {sec.header.showLogo && (
                <View style={styles.logo}>
                  <Text style={styles.logoText}>LOGO</Text>
                </View>
              )}
              <Text style={styles.companyName}>{data.company.name}</Text>
              {sec.header.showTagline && data.company.tagline && (
                <Text style={styles.tagline}>{data.company.tagline}</Text>
              )}
            </View>
            <View style={{ alignItems: "flex-end" }}>
              {sec.header.showAddress && data.company.address && <Text style={styles.smallText}>{data.company.address}</Text>}
              {sec.header.showPhone && data.company.phone && <Text style={styles.smallText}>{data.company.phone}</Text>}
              {sec.header.showEmail && data.company.email && <Text style={styles.smallText}>{data.company.email}</Text>}
              {sec.header.showWebsite && data.company.website && <Text style={styles.smallText}>{data.company.website}</Text>}
              {sec.header.showRegNo && data.company.regNo && <Text style={styles.smallText}>Reg: {data.company.regNo}</Text>}
              {sec.header.showTaxId && data.company.taxId && <Text style={styles.smallText}>Tax ID: {data.company.taxId}</Text>}
            </View>
          </View>
        )}

        {/* Title */}
        <Text style={styles.title}>{docTypeTitle[docType] || "INVOICE"}</Text>

        {/* Bill To + Doc Info */}
        <View style={styles.twoCol}>
          {sec.billTo.visible && (
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionLabel}>Bill To</Text>
              <Text style={{ fontWeight: "bold", fontSize }}>{data.customer.name}</Text>
              <Text style={styles.smallText}>{data.customer.address}</Text>
              {sec.billTo.showShipTo && data.customer.shipTo && (
                <View style={{ marginTop: 6 }}>
                  <Text style={styles.sectionLabel}>Ship To</Text>
                  <Text style={styles.smallText}>{data.customer.shipTo}</Text>
                </View>
              )}
            </View>
          )}
          {sec.docInfo.visible && (
            <View style={{ alignItems: "flex-end" }}>
              {sec.docInfo.fields.includes("invoiceNo") && (
                <Text style={styles.smallText}>Invoice #: {data.invoiceNo}</Text>
              )}
              {sec.docInfo.fields.includes("date") && (
                <Text style={styles.smallText}>Date: {data.date}</Text>
              )}
              {sec.docInfo.fields.includes("dueDate") && (
                <Text style={styles.smallText}>Due Date: {data.dueDate}</Text>
              )}
              {customFields.filter(f => f.section === "docInfo").map(f => (
                <Text key={f.fieldKey} style={styles.smallText}>
                  {f.fieldName}: {data.customFieldValues?.[f.fieldKey] || "—"}
                </Text>
              ))}
            </View>
          )}
        </View>

        {/* Line Items Table */}
        {sec.lineItems.visible && (
          <View style={{ marginBottom: 12 }}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { width: "6%" }]}>#</Text>
              {columns.includes("itemCode") && <Text style={[styles.tableHeaderCell, { width: colWidths.itemCode }]}>Code</Text>}
              {columns.includes("description") && <Text style={[styles.tableHeaderCell, { width: colWidths.description }]}>Description</Text>}
              {columns.includes("quantity") && <Text style={[styles.tableHeaderCell, { width: colWidths.quantity, textAlign: "right" }]}>Qty</Text>}
              {columns.includes("unitPrice") && <Text style={[styles.tableHeaderCell, { width: colWidths.unitPrice, textAlign: "right" }]}>Price</Text>}
              {columns.includes("discount") && <Text style={[styles.tableHeaderCell, { width: colWidths.discount, textAlign: "right" }]}>Disc%</Text>}
              {columns.includes("tax") && <Text style={[styles.tableHeaderCell, { width: colWidths.tax, textAlign: "right" }]}>Tax%</Text>}
              {columns.includes("amount") && <Text style={[styles.tableHeaderCell, { width: colWidths.amount, textAlign: "right" }]}>Amount</Text>}
            </View>
            {data.lines.map((line, i) => (
              <View key={i} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                <Text style={[styles.tableCell, { width: "6%" }]}>{i + 1}</Text>
                {columns.includes("itemCode") && <Text style={[styles.tableCell, { width: colWidths.itemCode }]}>{line.itemCode}</Text>}
                {columns.includes("description") && <Text style={[styles.tableCell, { width: colWidths.description }]}>{line.description}</Text>}
                {columns.includes("quantity") && <Text style={[styles.tableCell, { width: colWidths.quantity, textAlign: "right" }]}>{line.quantity}</Text>}
                {columns.includes("unitPrice") && <Text style={[styles.tableCell, { width: colWidths.unitPrice, textAlign: "right" }]}>{line.unitPrice.toFixed(2)}</Text>}
                {columns.includes("discount") && <Text style={[styles.tableCell, { width: colWidths.discount, textAlign: "right" }]}>{line.discount}%</Text>}
                {columns.includes("tax") && <Text style={[styles.tableCell, { width: colWidths.tax, textAlign: "right" }]}>{line.taxRate}%</Text>}
                {columns.includes("amount") && <Text style={[styles.tableCell, { width: colWidths.amount, textAlign: "right" }]}>{line.amount.toFixed(2)}</Text>}
              </View>
            ))}
          </View>
        )}

        {/* Totals */}
        {sec.totals.visible && (
          <View style={{ alignItems: "flex-end", marginBottom: 12 }}>
            <View style={{ width: 200 }}>
              <View style={styles.totalsRow}>
                <Text style={styles.totalLabel}>Subtotal</Text>
                <Text style={styles.totalValue}>RM {data.subtotal.toFixed(2)}</Text>
              </View>
              {sec.totals.showDiscount && data.discount != null && (
                <View style={styles.totalsRow}>
                  <Text style={[styles.totalLabel, { color: "red" }]}>Discount</Text>
                  <Text style={[styles.totalValue, { color: "red" }]}>-RM {data.discount.toFixed(2)}</Text>
                </View>
              )}
              {sec.totals.showShipping && data.shipping != null && (
                <View style={styles.totalsRow}>
                  <Text style={styles.totalLabel}>Shipping</Text>
                  <Text style={styles.totalValue}>RM {data.shipping.toFixed(2)}</Text>
                </View>
              )}
              <View style={styles.totalsRow}>
                <Text style={styles.totalLabel}>Tax</Text>
                <Text style={styles.totalValue}>RM {data.taxTotal.toFixed(2)}</Text>
              </View>
              {sec.totals.showRounding && data.rounding != null && (
                <View style={styles.totalsRow}>
                  <Text style={styles.totalLabel}>Rounding</Text>
                  <Text style={styles.totalValue}>RM {data.rounding.toFixed(2)}</Text>
                </View>
              )}
              <View style={styles.grandTotal}>
                <Text style={styles.grandTotalText}>TOTAL</Text>
                <Text style={styles.grandTotalText}>RM {data.total.toFixed(2)}</Text>
              </View>
              {sec.totals.showAmountInWords && (
                <Text style={{ fontSize: fontSize - 2, fontStyle: "italic", marginTop: 4 }}>
                  Ringgit Malaysia {numberToWords(data.total)} Only
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Footer */}
        {sec.footer.visible && (
          <View style={styles.footer}>
            {sec.footer.thankYouMessage && (
              <Text style={styles.thankYou}>{sec.footer.thankYouMessage}</Text>
            )}
            {sec.footer.showBankDetails && sec.footer.bankDetails && (
              <View style={{ marginBottom: 6 }}>
                <Text style={styles.footerLabel}>Bank Details</Text>
                <Text style={styles.footerText}>{sec.footer.bankDetails}</Text>
              </View>
            )}
            {sec.footer.showTerms && sec.footer.termsText && (
              <View style={{ marginBottom: 6 }}>
                <Text style={styles.footerLabel}>Terms & Conditions</Text>
                <Text style={styles.footerText}>{sec.footer.termsText}</Text>
              </View>
            )}
            {sec.footer.showSignature && (
              <View style={{ marginTop: 10 }}>
                <View style={styles.signatureLine} />
                <Text style={{ fontSize: fontSize - 2 }}>Authorized Signature</Text>
              </View>
            )}
          </View>
        )}
      </Page>
    </Document>
  );
}

function numberToWords(num: number): string {
  if (num === 0) return "Zero";
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const whole = Math.floor(num);
  const cents = Math.round((num - whole) * 100);

  function convert(n: number): string {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " and " + convert(n % 100) : "");
    if (n < 1000000) return convert(Math.floor(n / 1000)) + " Thousand" + (n % 1000 ? " " + convert(n % 1000) : "");
    return convert(Math.floor(n / 1000000)) + " Million" + (n % 1000000 ? " " + convert(n % 1000000) : "");
  }

  let result = convert(whole);
  if (cents > 0) result += ` and Cents ${convert(cents)}`;
  return result;
}
