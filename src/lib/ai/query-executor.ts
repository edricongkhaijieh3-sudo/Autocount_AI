import { prisma } from "@/lib/prisma";
import { ValidatedQuery } from "./query-validator";

const QUERY_TIMEOUT_MS = 5000;

export async function executeQuery(query: ValidatedQuery): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  try {
    const model = (prisma as any)[query.model];
    if (!model) {
      return { success: false, error: `Model ${query.model} not found` };
    }

    const operation = model[query.operation];
    if (!operation) {
      return {
        success: false,
        error: `Operation ${query.operation} not found on ${query.model}`,
      };
    }

    // Execute with timeout
    const result = await Promise.race([
      operation.call(model, query.args),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Query timeout: exceeded 5 seconds")),
          QUERY_TIMEOUT_MS
        )
      ),
    ]);

    // For groupBy results, resolve contact names if contactId is in the result
    if (
      query.operation === "groupBy" &&
      Array.isArray(result) &&
      result.length > 0 &&
      result[0].contactId
    ) {
      const contactIds = result.map((r: any) => r.contactId);
      const contacts = await prisma.contact.findMany({
        where: { id: { in: contactIds } },
        select: { id: true, name: true },
      });
      const contactMap = Object.fromEntries(
        contacts.map((c) => [c.id, c.name])
      );
      return {
        success: true,
        data: result.map((r: any) => ({
          ...r,
          contactName: contactMap[r.contactId] || "Unknown",
        })),
      };
    }

    return { success: true, data: result };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Query execution failed",
    };
  }
}
