import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { buildSystemPrompt, buildResponsePrompt, buildContextAwarePrompt } from "@/lib/ai/system-prompt";
import { validateSQL } from "@/lib/ai/query-validator";
import { executeSQL } from "@/lib/ai/query-executor";
import Anthropic from "@anthropic-ai/sdk";

function getClaudeClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY environment variable is not set");
  }
  return new Anthropic({ apiKey });
}

interface PageContext {
  currentPage?: string;
  currentAction?: string;
  pageDescription?: string;
  formData?: Record<string, unknown>;
  availableActions?: string[];
}

function isHelpQuestion(question: string, pageContext?: PageContext): boolean {
  const helpPatterns = [
    /what (do|should) i (put|fill|enter|write|select)/i,
    /how (do|should|can) i/i,
    /what (is|are|does) (this|that|the)/i,
    /help me/i,
    /explain/i,
    /what('s| is) (a|the) (difference|meaning)/i,
    /i('m| am) (confused|stuck|not sure|unsure)/i,
    /what (terms|payment|tax|discount)/i,
    /guide me/i,
    /walk me through/i,
    /step by step/i,
  ];

  // If user is actively filling a form and asks a question, likely help
  if (pageContext?.currentAction && pageContext.formData) {
    return helpPatterns.some((p) => p.test(question));
  }

  return helpPatterns.some((p) => p.test(question));
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { question, pageContext } = await req.json();
  if (!question || typeof question !== "string") {
    return NextResponse.json(
      { error: "Question is required" },
      { status: 400 }
    );
  }

  const companyId = (session.user as any).companyId;
  const companyName = (session.user as any).companyName ?? "My Company";

  try {
    const claude = getClaudeClient();

    // Determine if this is a help/guidance question or a data question
    const helpMode = isHelpQuestion(question, pageContext as PageContext);

    if (helpMode && pageContext?.currentPage) {
      return await handleContextAwareHelp(claude, question, companyName, pageContext as PageContext);
    }

    // Default: data query mode
    return await handleDataQuery(claude, question, companyId, companyName);
  } catch (error: any) {
    console.error("Chat error:", error?.message || error);
    return handleAPIError(error);
  }
}

/**
 * Handles context-aware help questions — gives guidance based on current page/action.
 */
async function handleContextAwareHelp(
  claude: Anthropic,
  question: string,
  companyName: string,
  pageContext: PageContext
) {
  const systemPrompt = buildContextAwarePrompt({
    companyName,
    currentPage: pageContext.currentPage || "dashboard",
    currentAction: pageContext.currentAction,
    pageDescription: pageContext.pageDescription,
    formData: pageContext.formData,
    availableActions: pageContext.availableActions,
  });

  const response = await claude.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: "user", content: question }],
    temperature: 0.4,
  });

  const text =
    response.content[0]?.type === "text" ? response.content[0].text : "";

  // Check if the context-aware handler decided this is actually a data query
  try {
    const parsed = JSON.parse(text);
    if (parsed.sql_query) {
      // Re-route to data query handler
      const companyId = ""; // Will be fetched from session in the data handler
      return NextResponse.json({
        response: "Let me look that up for you...",
        reroute: "data_query",
      });
    }
  } catch {
    // Not JSON, that's fine — it's a normal text response
  }

  return NextResponse.json({ response: text });
}

/**
 * Handles data questions — generates SQL, executes, and formats results.
 */
async function handleDataQuery(
  claude: Anthropic,
  question: string,
  companyId: string,
  companyName: string
) {
  const systemPrompt = buildSystemPrompt({
    companyId,
    companyName,
    currency: "MYR",
    currentDate: new Date().toISOString().split("T")[0],
  });

  const sqlResponse = await claude.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: "user", content: question }],
    temperature: 0,
  });

  const aiText =
    sqlResponse.content[0]?.type === "text"
      ? sqlResponse.content[0].text
      : "";

  let parsed: { sql?: string; explanation?: string; error?: boolean; message?: string };
  try {
    const jsonMatch = aiText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    return NextResponse.json({
      response: aiText || "I had trouble understanding that. Could you rephrase?",
    });
  }

  if (parsed.error) {
    return NextResponse.json({
      response: parsed.message || "I can only answer questions about your business data.",
    });
  }

  if (!parsed.sql) {
    return NextResponse.json({
      response: parsed.message || "I couldn't generate a query for that question. Try asking about sales, invoices, expenses, or customers.",
    });
  }

  const validation = validateSQL(parsed.sql, companyId);
  if (!validation.valid) {
    console.warn("SQL validation failed:", validation.error, "SQL:", parsed.sql);
    return NextResponse.json({
      response: "I generated a query but it didn't pass safety checks. Could you try rephrasing your question?",
    });
  }

  const result = await executeSQL(validation.sql!);
  if (!result.success) {
    const retryResponse = await claude.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        { role: "user", content: question },
        { role: "assistant", content: aiText },
        {
          role: "user",
          content: `The SQL query failed with error: "${result.error}". Please fix the query and try again. Remember to use double quotes for PascalCase table names and camelCase column names. Return the same JSON format.`,
        },
      ],
      temperature: 0,
    });

    const retryText =
      retryResponse.content[0]?.type === "text"
        ? retryResponse.content[0].text
        : "";

    let retryParsed: { sql?: string; explanation?: string } | null = null;
    try {
      const retryMatch = retryText.match(/\{[\s\S]*\}/);
      if (retryMatch) retryParsed = JSON.parse(retryMatch[0]);
    } catch { /* ignore */ }

    if (retryParsed?.sql) {
      const retryValidation = validateSQL(retryParsed.sql, companyId);
      if (retryValidation.valid) {
        const retryResult = await executeSQL(retryValidation.sql!);
        if (retryResult.success) {
          return await formatAndRespond(
            claude,
            question,
            retryResult.data,
            retryParsed.explanation || parsed.explanation || ""
          );
        }
      }
    }

    return NextResponse.json({
      response: result.error?.includes("timeout")
        ? "That query is taking too long. Try narrowing your question to a specific date range or fewer results."
        : "I had trouble fetching that data. Could you try rephrasing your question?",
    });
  }

  return await formatAndRespond(
    claude,
    question,
    result.data,
    parsed.explanation || ""
  );
}

/**
 * Sends raw query results to Claude for human-friendly formatting.
 */
async function formatAndRespond(
  claude: Anthropic,
  question: string,
  data: any,
  explanation: string
) {
  const responsePrompt = buildResponsePrompt(question, data, "RM", explanation);

  const formatted = await claude.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 1024,
    messages: [{ role: "user", content: responsePrompt }],
    temperature: 0.3,
  });

  const responseText =
    formatted.content[0]?.type === "text"
      ? formatted.content[0].text
      : "I found the data but had trouble formatting it. Please try again.";

  return NextResponse.json({ response: responseText });
}

/**
 * Maps common Anthropic API errors to user-friendly messages.
 */
function handleAPIError(error: any) {
  const msg = (error?.message || "").toLowerCase();

  if (msg.includes("api key") && (msg.includes("not set") || msg.includes("invalid"))) {
    return NextResponse.json({
      response: "The AI assistant is not configured yet. Please set the ANTHROPIC_API_KEY.",
    });
  }
  if (error?.status === 429 || msg.includes("rate") || msg.includes("quota")) {
    return NextResponse.json({
      response: "The AI is temporarily rate-limited. Please wait a moment and try again.",
    });
  }
  if (error?.status === 401 || msg.includes("authentication")) {
    return NextResponse.json({
      response: "The AI API key appears to be invalid. Please check your ANTHROPIC_API_KEY.",
    });
  }
  if (error?.status === 402 || msg.includes("billing") || msg.includes("credit")) {
    return NextResponse.json({
      response: "Your Anthropic account needs billing set up. Check https://console.anthropic.com.",
    });
  }

  return NextResponse.json({
    response: `Something went wrong. Please try again.`,
  });
}
