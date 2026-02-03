import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText, convertToModelMessages, stepCountIs } from 'ai';
import { createClient } from '@/lib/supabaseServer';
import { z } from 'zod';

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages, sessionId } = await req.json();
  const supabase = await createClient();

  // Convert messages to ModelMessage format to avoid AI_InvalidPromptError
  const modelMessages = await convertToModelMessages(messages);

  // Proactively save user message at the start to ensure it's not lost
  if (sessionId && sessionId !== 'undefined' && sessionId !== 'null') {
    const lastUserMessage = messages[messages.length - 1];
    if (lastUserMessage && lastUserMessage.role === 'user') {
      console.log(`[Prophet API] Proactively saving user message for session: ${sessionId}`);
      const { error } = await supabase.from('chat_messages').insert({
        session_id: sessionId,
        role: 'user',
        content: lastUserMessage.content || '',
        parts: lastUserMessage.parts || [{ type: 'text', text: lastUserMessage.content }]
      });
      if (error) console.error("[Prophet API] Error saving user message:", error);
    }
  }

  const google = createGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY,
  });

  const result = streamText({
    model: google('gemini-2.0-flash'),
    messages: modelMessages,
    stopWhen: stepCountIs(5),
    system: `
      You are the Prophet, the supreme intelligence of this Productivity Engine.
      Your goal is to help the user manage their "Boats" (Projects) and overcome "Entropy" (Decay/Inactivity).
      
      PHILOSOPHY:
      - High-Performance Minimalism: Swiss Design, Slate/Charcoal vibe.
      - Tone: Optimistic, Stoic, Concise, Professional.
      - You have "God Mode" access to the user's data.

      DATA CONCEPTS:
      - Boats: Projects that need maintenance.
      - Entropy: The decay of neglected priorities.
      - Syllabus: The curated list of what to execute next.

      TOOLS:
      - Use 'get_analytics' to fetch data about tasks, projects, and logs.
      - Use 'generate_chart' to suggest a visualization for the data you find.
      
      When users ask about their progress, productivity, or specific projects, fetch the data first, then explain it stoically, and finally provide a chart if relevant.
    `,
    tools: {
      get_analytics: {
        description: 'Fetch productivity analytics, task distribution, or stagnation reports.',
        inputSchema: z.object({
          type: z.enum(['activity_logs', 'task_distribution', 'stagnation_report', 'all']),
          days: z.number().default(7),
        }),
        execute: async ({ type, days }: { type: 'activity_logs' | 'task_distribution' | 'stagnation_report' | 'all', days: number }) => {
          console.log(`[Prophet API] >> EXECUTE get_analytics:`, { type, days });
          const now = new Date();
          const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

          const data: any = {};

          if (type === 'activity_logs' || type === 'all') {
            const { data: logs } = await supabase
              .from('activity_logs')
              .select('*')
              .gte('completed_at', startDate);
            data.activity_logs = logs;
          }

          if (type === 'task_distribution' || type === 'all') {
            const { data: tasks } = await supabase
              .from('tasks')
              .select('id, state, energy_tag, projects(name, tier)');
            data.tasks = tasks;
          }

          if (type === 'stagnation_report' || type === 'all') {
            const { data: stagnant } = await supabase
              .from('tasks')
              .select('id, title, last_touched_at, projects(name)')
              .eq('state', 'Active')
              .order('last_touched_at', { ascending: true })
              .limit(10);
            data.stagnant_tasks = stagnant;
          }

          return data;
        },
      },
      generate_chart: {
        description: 'Suggest a chart to visualize productivity data. This will be rendered as a UI component.',
        inputSchema: z.object({
          chartType: z.enum(['bar', 'line', 'pie', 'area']),
          title: z.string(),
          data: z.array(z.record(z.string(), z.any())),
          xAxisKey: z.string().optional(),
          yAxisKey: z.string().optional(),
          dataKeys: z.array(z.string()),
        }),
        execute: async (params: any) => {
          console.log(`[Prophet API] >> EXECUTE generate_chart:`, JSON.stringify(params, null, 2));
          return params;
        },
      },
    },
    onFinish: async ({ text, toolCalls, toolResults }: { text: string, toolCalls: any[], toolResults: any[] }) => {
      console.log(`[Prophet API] onFinish CALL:`, {
        textLength: text?.length || 0,
        toolCallsCount: toolCalls?.length || 0,
        toolResultsCount: toolResults?.length || 0,
        toolCalls: JSON.stringify(toolCalls, null, 2),
        toolResults: JSON.stringify(toolResults, null, 2)
      });
      
      // Save assistant response to Supabase if sessionId is provided
      if (sessionId && sessionId !== 'undefined' && sessionId !== 'null') {
        try {
          console.log(`[Prophet API] Saving assistant response...`);
          const { error, data } = await supabase.from('chat_messages').insert({
            session_id: sessionId,
            role: 'assistant',
            content: text || '', 
            parts: [{ type: 'text', text: text || '' }]
          });
          
          if (error) {
            console.error("[Prophet API] Supabase Insert Error:", error);
          } else {
            console.log("[Prophet API] Supabase Insert Success");
          }
        } catch (error) {
          console.error("[Prophet API] Critical save failure:", error);
        }
      }
    }
  });

  return result.toUIMessageStreamResponse();
}
