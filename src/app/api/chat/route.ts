import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { buildSystemPrompt, buildResponsePrompt } from "@/lib/ai/system-prompt";
import { validateQuery } from "@/lib/ai/query-validator";
import { executeQuery } from "@/lib/ai/query-executor";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

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
    // Step 1: Generate Prisma query from the question
    const systemPrompt = buildSystemPrompt({
      companyId,
      companyName,
      currency: "MYR",
      currentDate: new Date().toISOString().split("T")[0],
    });

    const queryResponse = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: question }],
    });

    const aiText =
      queryResponse.content[0].type === "text"
        ? queryResponse.content[0].text
        : "";

    // Parse the JSON response from Claude
    let parsed;
    try {
      // Extract JSON from potential markdown code blocks
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

    const formattedResponse = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [{ role: "user", content: responsePrompt }],
    });

    const responseText =
      formattedResponse.content[0].type === "text"
        ? formattedResponse.content[0].text
        : "I found the data but had trouble formatting it. Please try again.";

    return NextResponse.json({ response: responseText });
  } catch (error: any) {
    console.error("Chat error:", error);

    if (error?.status === 429) {
      return NextResponse.json({
        response:
          "You've used your AI queries for now. You can still access all reports manually from the Reports page. Please try again in a few minutes.",
      });
    }

    return NextResponse.json({
      response:
        "Something went wrong while processing your question. Please try again.",
    });
  }
}
