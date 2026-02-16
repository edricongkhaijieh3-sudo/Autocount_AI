/**
 * Approve (save) AI-created drafts using Prisma.
 * Used when user says "approve" or "save it" in chat.
 */

import { prisma } from "@/lib/prisma";
import type { AnyCreateDraft } from "./chat-create-types";

export async function createEntityFromDraft(
  draft: AnyCreateDraft,
  companyId: string
): Promise<{ success: true; name: string } | { success: false; error: string }> {
  try {
    switch (draft.draftType) {
      case "contact": {
        await prisma.contact.create({
          data: {
            name: draft.name,
            code: draft.code ?? null,
            email: draft.email ?? null,
            phone: draft.phone ?? null,
            billingAddress: draft.billingAddress ?? null,
            type: draft.type ?? "CUSTOMER",
            creditTerms: draft.creditTerms ?? null,
            creditLimit: draft.creditLimit ?? null,
            companyId,
          },
        });
        return { success: true, name: draft.name };
      }
      case "account": {
        await prisma.account.create({
          data: {
            code: draft.code,
            name: draft.name,
            type: draft.type,
            description: draft.description ?? null,
            companyId,
          },
        });
        return { success: true, name: draft.name };
      }
      case "product": {
        await prisma.product.create({
          data: {
            code: draft.code,
            name: draft.name,
            description: draft.description ?? null,
            defaultPrice: draft.defaultPrice ?? 0,
            defaultCost: draft.defaultCost ?? 0,
            categoryId: draft.categoryId ?? null,
            baseUom: draft.baseUom ?? "UNIT",
            companyId,
          },
        });
        return { success: true, name: draft.name };
      }
      case "productCategory": {
        await prisma.productCategory.create({
          data: {
            code: draft.code,
            name: draft.name,
            description: draft.description ?? null,
            companyId,
          },
        });
        return { success: true, name: draft.name };
      }
      case "currency": {
        if (draft.isBase) {
          await prisma.currency.updateMany({
            where: { companyId },
            data: { isBase: false },
          });
        }
        await prisma.currency.create({
          data: {
            code: draft.code,
            name: draft.name,
            symbol: draft.symbol,
            exchangeRate: draft.exchangeRate ?? 1,
            isBase: draft.isBase ?? false,
            companyId,
          },
        });
        return { success: true, name: draft.code };
      }
      case "taxCode": {
        await prisma.taxCode.create({
          data: {
            code: draft.code,
            description: draft.description,
            rate: draft.rate ?? 0,
            taxType: draft.taxType ?? "OUTPUT",
            companyId,
          },
        });
        return { success: true, name: draft.code };
      }
      case "tariffCode": {
        await prisma.tariffCode.create({
          data: {
            code: draft.code,
            description: draft.description,
            companyId,
          },
        });
        return { success: true, name: draft.code };
      }
      case "taxEntity": {
        await prisma.taxEntity.create({
          data: {
            entityName: draft.entityName,
            tin: draft.tin ?? null,
            brn: draft.brn ?? null,
            sstNo: draft.sstNo ?? null,
            companyId,
          },
        });
        return { success: true, name: draft.entityName };
      }
      default:
        return { success: false, error: "Unknown draft type" };
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to create";
    if (typeof e === "object" && e !== null && "code" in e && (e as { code: string }).code === "P2002") {
      return { success: false, error: "A record with this code or name already exists." };
    }
    return { success: false, error: msg };
  }
}
