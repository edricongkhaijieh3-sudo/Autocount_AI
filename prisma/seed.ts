import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL!;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // Clean existing data
  await prisma.customField.deleteMany();
  await prisma.invoiceLine.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.invoiceTemplate.deleteMany();
  await prisma.journalLine.deleteMany();
  await prisma.journalEntry.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
  await prisma.company.deleteMany();

  // Create company
  const company = await prisma.company.create({
    data: {
      name: "TechVentures Sdn Bhd",
      address: "123 Jalan Teknologi, Cyberjaya 63000, Selangor",
      phone: "+60 3-8888 1234",
      email: "billing@techventures.my",
      website: "www.techventures.my",
      currency: "MYR",
      taxId: "SST-0001-2026",
      regNo: "202001012345 (1234567-A)",
    },
  });

  // Create admin user (password: admin123)
  const passwordHash = await bcrypt.hash("admin123", 12);
  await prisma.user.create({
    data: {
      name: "Admin User",
      email: "admin@techventures.my",
      passwordHash,
      role: "admin",
      companyId: company.id,
    },
  });

  console.log("  Created company and admin user");
  console.log("  Login: admin@techventures.my / admin123");

  // Chart of Accounts
  const accounts = await Promise.all([
    // Assets
    prisma.account.create({ data: { code: "1000", name: "Cash at Bank", type: "ASSET", companyId: company.id } }),
    prisma.account.create({ data: { code: "1010", name: "Petty Cash", type: "ASSET", companyId: company.id } }),
    prisma.account.create({ data: { code: "1100", name: "Accounts Receivable", type: "ASSET", companyId: company.id } }),
    prisma.account.create({ data: { code: "1200", name: "Inventory", type: "ASSET", companyId: company.id } }),
    prisma.account.create({ data: { code: "1300", name: "Prepaid Expenses", type: "ASSET", companyId: company.id } }),
    prisma.account.create({ data: { code: "1400", name: "Deposits Paid", type: "ASSET", companyId: company.id } }),
    prisma.account.create({ data: { code: "1500", name: "Equipment", type: "ASSET", companyId: company.id } }),
    prisma.account.create({ data: { code: "1510", name: "Computer & Software", type: "ASSET", companyId: company.id } }),
    prisma.account.create({ data: { code: "1520", name: "Furniture & Fixtures", type: "ASSET", companyId: company.id } }),
    prisma.account.create({ data: { code: "1600", name: "Accumulated Depreciation", type: "ASSET", companyId: company.id } }),
    // Liabilities
    prisma.account.create({ data: { code: "2000", name: "Accounts Payable", type: "LIABILITY", companyId: company.id } }),
    prisma.account.create({ data: { code: "2100", name: "Accrued Expenses", type: "LIABILITY", companyId: company.id } }),
    prisma.account.create({ data: { code: "2200", name: "SST Payable", type: "LIABILITY", companyId: company.id } }),
    prisma.account.create({ data: { code: "2300", name: "Income Tax Payable", type: "LIABILITY", companyId: company.id } }),
    prisma.account.create({ data: { code: "2400", name: "Unearned Revenue", type: "LIABILITY", companyId: company.id } }),
    prisma.account.create({ data: { code: "2500", name: "Bank Loan", type: "LIABILITY", companyId: company.id } }),
    // Equity
    prisma.account.create({ data: { code: "3000", name: "Owner's Equity", type: "EQUITY", companyId: company.id } }),
    prisma.account.create({ data: { code: "3100", name: "Retained Earnings", type: "EQUITY", companyId: company.id } }),
    prisma.account.create({ data: { code: "3200", name: "Drawings", type: "EQUITY", companyId: company.id } }),
    // Revenue
    prisma.account.create({ data: { code: "4000", name: "Sales Revenue", type: "REVENUE", companyId: company.id } }),
    prisma.account.create({ data: { code: "4100", name: "Service Revenue", type: "REVENUE", companyId: company.id } }),
    prisma.account.create({ data: { code: "4200", name: "Hosting Revenue", type: "REVENUE", companyId: company.id } }),
    prisma.account.create({ data: { code: "4300", name: "Consulting Revenue", type: "REVENUE", companyId: company.id } }),
    prisma.account.create({ data: { code: "4900", name: "Other Income", type: "REVENUE", companyId: company.id } }),
    // Expenses
    prisma.account.create({ data: { code: "5000", name: "Cost of Goods Sold", type: "EXPENSE", companyId: company.id } }),
    prisma.account.create({ data: { code: "5100", name: "Salaries & Wages", type: "EXPENSE", companyId: company.id } }),
    prisma.account.create({ data: { code: "5200", name: "Rent Expense", type: "EXPENSE", companyId: company.id } }),
    prisma.account.create({ data: { code: "5300", name: "Utilities", type: "EXPENSE", companyId: company.id } }),
    prisma.account.create({ data: { code: "5400", name: "Office Supplies", type: "EXPENSE", companyId: company.id } }),
    prisma.account.create({ data: { code: "5500", name: "Marketing & Advertising", type: "EXPENSE", companyId: company.id } }),
    prisma.account.create({ data: { code: "5600", name: "Depreciation", type: "EXPENSE", companyId: company.id } }),
    prisma.account.create({ data: { code: "5700", name: "Insurance", type: "EXPENSE", companyId: company.id } }),
    prisma.account.create({ data: { code: "5800", name: "Travel & Entertainment", type: "EXPENSE", companyId: company.id } }),
    prisma.account.create({ data: { code: "5900", name: "Professional Fees", type: "EXPENSE", companyId: company.id } }),
    prisma.account.create({ data: { code: "5950", name: "Bank Charges", type: "EXPENSE", companyId: company.id } }),
    prisma.account.create({ data: { code: "5990", name: "Miscellaneous Expense", type: "EXPENSE", companyId: company.id } }),
  ]);

  const acctMap: Record<string, string> = {};
  for (const a of accounts) {
    acctMap[a.code] = a.id;
  }

  console.log(`  Created ${accounts.length} accounts`);

  // Contacts
  const contacts = await Promise.all([
    prisma.contact.create({ data: { name: "ABC Trading Sdn Bhd", email: "accounts@abctrading.my", phone: "+60 3-7777 1234", address: "456 Jalan Perdagangan, PJ 46000", type: "CUSTOMER", companyId: company.id } }),
    prisma.contact.create({ data: { name: "Global Systems Pte Ltd", email: "billing@globalsys.sg", phone: "+65 6789 0123", address: "78 Robinson Road, Singapore 068898", type: "CUSTOMER", companyId: company.id } }),
    prisma.contact.create({ data: { name: "Mega Corp Bhd", email: "procurement@megacorp.my", phone: "+60 3-6666 5555", address: "1 Jalan Korporat, KL 50000", type: "CUSTOMER", companyId: company.id } }),
    prisma.contact.create({ data: { name: "StartupHub Inc", email: "finance@startuphub.io", phone: "+60 11-2233 4455", address: "Level 12, Mercu Tower, KL 50100", type: "CUSTOMER", companyId: company.id } }),
    prisma.contact.create({ data: { name: "CloudNine Solutions", email: "ap@cloudnine.my", phone: "+60 3-5555 6666", address: "22 Jalan Cloud, Cyberjaya 63000", type: "CUSTOMER", companyId: company.id } }),
    prisma.contact.create({ data: { name: "DataPrime Analytics", email: "hello@dataprime.my", phone: "+60 3-4444 7777", address: "Block B, Techpark, Shah Alam 40100", type: "CUSTOMER", companyId: company.id } }),
    prisma.contact.create({ data: { name: "Green Energy Co", email: "accounts@greenenergy.my", phone: "+60 3-3333 8888", address: "100 Jalan Hijau, Putrajaya 62000", type: "BOTH", companyId: company.id } }),
    prisma.contact.create({ data: { name: "IT Supplies Malaysia", email: "sales@itsupplies.my", phone: "+60 3-2222 9999", address: "50 Jalan Hardware, PJ 47100", type: "VENDOR", companyId: company.id } }),
    prisma.contact.create({ data: { name: "Office World Sdn Bhd", email: "orders@officeworld.my", phone: "+60 3-1111 0000", address: "15 Jalan Perabot, KL 51000", type: "VENDOR", companyId: company.id } }),
    prisma.contact.create({ data: { name: "Web Hosting Pro", email: "billing@webhostpro.net", phone: "+1 555-0199", address: "100 Server Lane, San Jose, CA 95110", type: "VENDOR", companyId: company.id } }),
  ]);

  console.log(`  Created ${contacts.length} contacts`);

  // Invoice Templates
  const standardTemplate = await prisma.invoiceTemplate.create({
    data: {
      name: "Standard Invoice",
      isDefault: true,
      docType: "INVOICE",
      companyId: company.id,
      config: {
        sections: {
          header: { visible: true, showLogo: true, showTagline: false, showAddress: true, showPhone: true, showEmail: true, showWebsite: false, showRegNo: true, showTaxId: true },
          docInfo: { visible: true, fields: ["invoiceNo", "date", "dueDate"] },
          billTo: { visible: true, showShipTo: false },
          lineItems: { visible: true, columns: ["itemCode", "description", "quantity", "unitPrice", "discount", "tax", "amount"] },
          totals: { visible: true, showDiscount: true, showAmountInWords: true, showShipping: false, showRounding: true },
          footer: { visible: true, showBankDetails: true, showTerms: true, showSignature: true, showStamp: false, showQrCode: false, thankYouMessage: "Thank you for your business!", bankDetails: "Maybank\nAccount: 5123-4567-8901\nSwift: MBBEMYKL", termsText: "Payment is due within 30 days of invoice date." },
        },
        style: { primaryColor: "#1B4F72", fontFamily: "Helvetica", fontSize: 10 },
      },
    },
  });

  // Add custom fields to template
  await prisma.customField.createMany({
    data: [
      { companyId: company.id, templateId: standardTemplate.id, section: "docInfo", fieldName: "PO Number", fieldKey: "poNumber", fieldType: "text", sortOrder: 0 },
      { companyId: company.id, templateId: standardTemplate.id, section: "docInfo", fieldName: "Payment Terms", fieldKey: "paymentTerms", fieldType: "dropdown", sortOrder: 1, options: JSON.stringify(["Net 30", "Net 60", "COD", "Due on Receipt"]) },
      { companyId: company.id, templateId: standardTemplate.id, section: "docInfo", fieldName: "Salesperson", fieldKey: "salesperson", fieldType: "text", sortOrder: 2 },
    ],
  });

  const exportTemplate = await prisma.invoiceTemplate.create({
    data: {
      name: "Export Invoice",
      isDefault: false,
      docType: "INVOICE",
      companyId: company.id,
      config: {
        sections: {
          header: { visible: true, showLogo: true, showTagline: true, showAddress: true, showPhone: true, showEmail: true, showWebsite: true, showRegNo: true, showTaxId: true },
          docInfo: { visible: true, fields: ["invoiceNo", "date", "dueDate"] },
          billTo: { visible: true, showShipTo: true },
          lineItems: { visible: true, columns: ["itemCode", "description", "quantity", "unitPrice", "amount"] },
          totals: { visible: true, showDiscount: false, showAmountInWords: true, showShipping: true, showRounding: false },
          footer: { visible: true, showBankDetails: true, showTerms: true, showSignature: true, showStamp: true, showQrCode: false, thankYouMessage: "Thank you for choosing TechVentures!", bankDetails: "HSBC Bank\nAccount: 001-234567-890\nSwift: HSBCMYKL", termsText: "Payment in USD via wire transfer within 45 days." },
        },
        style: { primaryColor: "#2C3E50", fontFamily: "Helvetica", fontSize: 9 },
      },
    },
  });

  await prisma.customField.createMany({
    data: [
      { companyId: company.id, templateId: exportTemplate.id, section: "docInfo", fieldName: "PO Number", fieldKey: "poNumber", fieldType: "text", sortOrder: 0 },
      { companyId: company.id, templateId: exportTemplate.id, section: "docInfo", fieldName: "Delivery Order", fieldKey: "doNumber", fieldType: "text", sortOrder: 1 },
      { companyId: company.id, templateId: exportTemplate.id, section: "docInfo", fieldName: "Incoterms", fieldKey: "incoterms", fieldType: "dropdown", sortOrder: 2, options: JSON.stringify(["FOB", "CIF", "EXW", "DDP"]) },
    ],
  });

  console.log("  Created 2 invoice templates with custom fields");

  // Create Invoices
  const now = new Date();
  const invoiceData = [
    { no: "INV-2026-001", days: -45, customer: 0, status: "PAID" as const, lines: [{ item: "Cloud Hosting Plan A", code: "SVC-001", qty: 1, price: 2400, disc: 0, tax: 6 }, { item: "SSL Certificate", code: "SVC-002", qty: 3, price: 150, disc: 10, tax: 6 }] },
    { no: "INV-2026-002", days: -40, customer: 1, status: "PAID" as const, lines: [{ item: "Custom API Development", code: "DEV-010", qty: 40, price: 180, disc: 0, tax: 6 }] },
    { no: "INV-2026-003", days: -35, customer: 2, status: "PAID" as const, lines: [{ item: "Annual Maintenance", code: "MNT-003", qty: 12, price: 500, disc: 5, tax: 6 }, { item: "Server Migration", code: "SVC-005", qty: 1, price: 3500, disc: 0, tax: 6 }] },
    { no: "INV-2026-004", days: -30, customer: 3, status: "PAID" as const, lines: [{ item: "Web App Development", code: "DEV-020", qty: 80, price: 200, disc: 0, tax: 6 }] },
    { no: "INV-2026-005", days: -25, customer: 4, status: "PAID" as const, lines: [{ item: "Cloud Hosting Plan B", code: "SVC-003", qty: 1, price: 4800, disc: 0, tax: 6 }] },
    { no: "INV-2026-006", days: -20, customer: 5, status: "SENT" as const, lines: [{ item: "Data Analytics Setup", code: "SVC-010", qty: 1, price: 8500, disc: 5, tax: 6 }] },
    { no: "INV-2026-007", days: -18, customer: 0, status: "SENT" as const, lines: [{ item: "Monthly Support", code: "MNT-001", qty: 3, price: 800, disc: 0, tax: 6 }] },
    { no: "INV-2026-008", days: -15, customer: 6, status: "PAID" as const, lines: [{ item: "Solar Dashboard System", code: "DEV-030", qty: 1, price: 15000, disc: 10, tax: 6 }] },
    { no: "INV-2026-009", days: -12, customer: 1, status: "SENT" as const, lines: [{ item: "Security Audit", code: "SVC-015", qty: 1, price: 5000, disc: 0, tax: 6 }] },
    { no: "INV-2026-010", days: -10, customer: 2, status: "OVERDUE" as const, lines: [{ item: "Network Setup", code: "SVC-020", qty: 1, price: 3200, disc: 0, tax: 6 }] },
    { no: "INV-2026-011", days: -8, customer: 3, status: "DRAFT" as const, lines: [{ item: "Mobile App Phase 2", code: "DEV-025", qty: 60, price: 220, disc: 0, tax: 6 }] },
    { no: "INV-2026-012", days: -5, customer: 4, status: "SENT" as const, lines: [{ item: "Email Hosting", code: "SVC-025", qty: 50, price: 15, disc: 0, tax: 6 }] },
    { no: "INV-2026-013", days: -3, customer: 5, status: "DRAFT" as const, lines: [{ item: "Consulting", code: "CON-001", qty: 10, price: 350, disc: 0, tax: 6 }] },
    { no: "INV-2026-014", days: -60, customer: 0, status: "OVERDUE" as const, lines: [{ item: "Legacy System Migration", code: "DEV-040", qty: 1, price: 12000, disc: 0, tax: 6 }] },
    { no: "INV-2026-015", days: -50, customer: 6, status: "PAID" as const, lines: [{ item: "IoT Integration", code: "DEV-050", qty: 1, price: 9500, disc: 0, tax: 6 }] },
  ];

  for (const inv of invoiceData) {
    const date = new Date(now);
    date.setDate(date.getDate() + inv.days);
    const dueDate = new Date(date);
    dueDate.setDate(dueDate.getDate() + 30);

    const lines = inv.lines.map((l, i) => {
      const baseAmt = l.qty * l.price;
      const discAmt = baseAmt * (l.disc / 100);
      const afterDisc = baseAmt - discAmt;
      const taxAmt = afterDisc * (l.tax / 100);
      return {
        itemName: l.item,
        itemCode: l.code,
        quantity: l.qty,
        unitPrice: l.price,
        discount: l.disc,
        taxRate: l.tax,
        amount: afterDisc + taxAmt,
        sortOrder: i,
      };
    });

    const subtotal = lines.reduce((s, l) => s + (l.quantity * l.unitPrice * (1 - l.discount / 100)), 0);
    const taxTotal = lines.reduce((s, l) => s + (l.quantity * l.unitPrice * (1 - l.discount / 100) * (l.taxRate / 100)), 0);
    const total = subtotal + taxTotal;

    await prisma.invoice.create({
      data: {
        invoiceNo: inv.no,
        date,
        dueDate,
        contactId: contacts[inv.customer].id,
        status: inv.status,
        subtotal,
        taxTotal,
        total,
        templateId: standardTemplate.id,
        companyId: company.id,
        customFieldValues: { poNumber: `PO-2026-${String(Math.floor(Math.random() * 900) + 100)}`, paymentTerms: "Net 30" },
        lines: {
          create: lines,
        },
      },
    });
  }

  console.log(`  Created ${invoiceData.length} invoices`);

  // Journal Entries
  const journalEntries = [
    {
      no: "JE-2026-001", date: -60, desc: "Opening balance - Owner investment",
      lines: [
        { acct: "1000", debit: 100000, credit: 0 },
        { acct: "3000", debit: 0, credit: 100000 },
      ],
    },
    {
      no: "JE-2026-002", date: -55, desc: "Equipment purchase",
      lines: [
        { acct: "1510", debit: 15000, credit: 0 },
        { acct: "1000", debit: 0, credit: 15000 },
      ],
    },
    {
      no: "JE-2026-003", date: -50, desc: "Office rent - January",
      lines: [
        { acct: "5200", debit: 5000, credit: 0 },
        { acct: "1000", debit: 0, credit: 5000 },
      ],
    },
    {
      no: "JE-2026-004", date: -45, desc: "Sales revenue - Cloud Hosting",
      lines: [
        { acct: "1100", debit: 28500, credit: 0 },
        { acct: "4200", debit: 0, credit: 28500 },
      ],
    },
    {
      no: "JE-2026-005", date: -40, desc: "Service revenue - API Development",
      lines: [
        { acct: "1100", debit: 7632, credit: 0 },
        { acct: "4100", debit: 0, credit: 7632 },
      ],
    },
    {
      no: "JE-2026-006", date: -35, desc: "Salaries - January",
      lines: [
        { acct: "5100", debit: 25000, credit: 0 },
        { acct: "1000", debit: 0, credit: 25000 },
      ],
    },
    {
      no: "JE-2026-007", date: -30, desc: "Customer payment received - ABC Trading",
      lines: [
        { acct: "1000", debit: 28500, credit: 0 },
        { acct: "1100", debit: 0, credit: 28500 },
      ],
    },
    {
      no: "JE-2026-008", date: -25, desc: "Marketing expenses",
      lines: [
        { acct: "5500", debit: 3500, credit: 0 },
        { acct: "1000", debit: 0, credit: 3500 },
      ],
    },
    {
      no: "JE-2026-009", date: -20, desc: "Office rent - February",
      lines: [
        { acct: "5200", debit: 5000, credit: 0 },
        { acct: "1000", debit: 0, credit: 5000 },
      ],
    },
    {
      no: "JE-2026-010", date: -15, desc: "Revenue - Solar Dashboard project",
      lines: [
        { acct: "1100", debit: 14310, credit: 0 },
        { acct: "4100", debit: 0, credit: 14310 },
      ],
    },
    {
      no: "JE-2026-011", date: -10, desc: "Utilities payment",
      lines: [
        { acct: "5300", debit: 850, credit: 0 },
        { acct: "1000", debit: 0, credit: 850 },
      ],
    },
    {
      no: "JE-2026-012", date: -5, desc: "Insurance premium",
      lines: [
        { acct: "5700", debit: 2400, credit: 0 },
        { acct: "1000", debit: 0, credit: 2400 },
      ],
    },
  ];

  for (const je of journalEntries) {
    const date = new Date(now);
    date.setDate(date.getDate() + je.date);

    await prisma.journalEntry.create({
      data: {
        entryNo: je.no,
        date,
        description: je.desc,
        companyId: company.id,
        lines: {
          create: je.lines.map((l) => ({
            accountId: acctMap[l.acct],
            debit: l.debit,
            credit: l.credit,
          })),
        },
      },
    });
  }

  console.log(`  Created ${journalEntries.length} journal entries`);

  console.log("\nSeed complete!");
  console.log("Login credentials: admin@techventures.my / admin123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
