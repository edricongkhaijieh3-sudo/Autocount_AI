import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { buildSystemPrompt, buildResponsePrompt } from "@/lib/ai/system-prompt";
import { validateQuery } from "@/lib/ai/query-validator";
import { executeQuery } from "@/lib/ai/query-executor";
import Anthropic from "@anthropic-ai/sdk";

function getClaudeClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY environment variable is not set");
  }
  return new Anthropic({ apiKey });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { question } = await req.json();
  if (!question || typeof question !== "string") {
    return NextResponse.json({ error: "Question is required" }, { status: 400 });
  }

  const companyId = (session.user as any).companyId;
  const companyName = (session.user as any).companyName;

  try {
    const claude = getClaudeClient();

    // Step 1: Generate Prisma query from the question
    const systemPrompt = buildSystemPrompt({
      companyId,
      companyName,
      currency: "MYR",
      currentDate: new Date().toISOString().split("T")[0],
    });

    const queryResponse = await claude.messages.create({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        { role: "user", content: question },
      ],
      temperature: 0.1,
    });

    const aiText =
      queryResponse.content[0]?.type === "text"
        ? queryResponse.content[0].text
        : "";

    // Parse the JSON response from Claude
    let parsed;
    try {
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found in AI response");
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      return NextResponse.json({
        response:
          "I had trouble understanding that question. Could you rephrase it? For example: 'How much did I sell in January?' or 'Show my top 5 customers.'",
      });
    }

    // Handle non-query responses (errors, clarifications)
    if (parsed.error) {
      return NextResponse.json({ response: parsed.message });
    }

    // Step 2: Validate the query
    const validation = validateQuery(parsed, companyId);
    if (!validation.valid) {
      return NextResponse.json({
        response:
          validation.error ||
          "I can only answer questions about your data. Try asking about sales, invoices, or expenses.",
      });
    }

    // Step 3: Execute the query
    const result = await executeQuery(validation.query!);
    if (!result.success) {
      if (result.error?.includes("timeout")) {
        return NextResponse.json({
          response:
            "That query is taking longer than expected. Try narrowing your question to a specific date range or customer.",
        });
      }
      return NextResponse.json({
        response:
          "I had trouble fetching that data. Could you try rephrasing your question?",
      });
    }

    // Step 4: Format the response
    const responsePrompt = buildResponsePrompt(
      question,
      result.data,
      "RM",
      validation.query!.explanation
    );

    const formattedResponse = await claude.messages.create({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 1024,
      messages: [{ role: "user", content: responsePrompt }],
      temperature: 0.3,
    });

    const responseText =
      formattedResponse.content[0]?.type === "text"
        ? formattedResponse.content[0].text
        : "I found the data but had trouble formatting it. Please try again.";

    return NextResponse.json({ response: responseText });
  } catch (error: any) {
    console.error("Chat error:", error?.message || error);

    const errorMessage = error?.message?.toLowerCase() || "";

    if (errorMessage.includes("anthropic_api_key") || (errorMessage.includes("api key") && errorMessage.includes("not set"))) {
      return NextResponse.json({
        response: "The AI assistant is not configured yet. Please set the ANTHROPIC_API_KEY environment variable.",
      });
    }

    if (error?.status === 429 || errorMessage.includes("rate") || errorMessage.includes("quota")) {
      return NextResponse.json({
        response: "The AI is temporarily rate-limited. Please wait a moment and try again.",
      });
    }

    if (error?.status === 401 || errorMessage.includes("authentication") || errorMessage.includes("invalid api key")) {
      return NextResponse.json({
        response: "The AI API key appears to be invalid. Please check the ANTHROPIC_API_KEY in your environment variables.",
      });
    }

    if (error?.status === 402 || errorMessage.includes("billing") || errorMessage.includes("credit")) {
      return NextResponse.json({
        response: "Your Anthropic account needs billing set up. Please check your account at https://console.anthropic.com.",
      });
    }

    return NextResponse.json({
      response: `Something went wrong: ${error?.message || "Unknown error"}. Please try again.`,
    });
  }
}
