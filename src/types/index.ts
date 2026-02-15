import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      companyId: string;
      companyName: string;
      role: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    companyId: string;
    companyName: string;
    role: string;
  }
}

// Template config types
export interface TemplateConfig {
  sections: {
    header: {
      visible: boolean;
      showLogo: boolean;
      showTagline: boolean;
      showAddress: boolean;
      showPhone: boolean;
      showEmail: boolean;
      showWebsite: boolean;
      showRegNo: boolean;
      showTaxId: boolean;
    };
    docInfo: {
      visible: boolean;
      fields: string[];
    };
    billTo: {
      visible: boolean;
      showShipTo: boolean;
    };
    lineItems: {
      visible: boolean;
      columns: string[];
    };
    totals: {
      visible: boolean;
      showDiscount: boolean;
      showAmountInWords: boolean;
      showShipping: boolean;
      showRounding: boolean;
    };
    footer: {
      visible: boolean;
      showBankDetails: boolean;
      showTerms: boolean;
      showSignature: boolean;
      showStamp: boolean;
      showQrCode: boolean;
      thankYouMessage: string;
      bankDetails: string;
      termsText: string;
    };
  };
  style: {
    primaryColor: string;
    fontFamily: string;
    fontSize: number;
  };
}

export const defaultTemplateConfig: TemplateConfig = {
  sections: {
    header: {
      visible: true,
      showLogo: true,
      showTagline: false,
      showAddress: true,
      showPhone: true,
      showEmail: true,
      showWebsite: false,
      showRegNo: false,
      showTaxId: false,
    },
    docInfo: {
      visible: true,
      fields: ["invoiceNo", "date", "dueDate"],
    },
    billTo: {
      visible: true,
      showShipTo: false,
    },
    lineItems: {
      visible: true,
      columns: ["description", "quantity", "unitPrice", "amount"],
    },
    totals: {
      visible: true,
      showDiscount: false,
      showAmountInWords: false,
      showShipping: false,
      showRounding: false,
    },
    footer: {
      visible: true,
      showBankDetails: false,
      showTerms: false,
      showSignature: false,
      showStamp: false,
      showQrCode: false,
      thankYouMessage: "Thank you for your business!",
      bankDetails: "",
      termsText: "",
    },
  },
  style: {
    primaryColor: "#1B4F72",
    fontFamily: "Helvetica",
    fontSize: 10,
  },
};

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}
