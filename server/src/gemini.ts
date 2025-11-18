import { GoogleGenAI } from "@google/genai";
import 'dotenv/config';
import { getQdrantClient } from './qdrant';
import { PLANNING_MODULES, SYSTEM_PROMPT_BASE, MEMORY_GENERATOR_PROMPT, SYNTHESIZER_PROMPT, MEMORY_QUERY_GENERATOR_PROMPT, ENGRAM_CREATION_PROMPT } from '../../src/constants'; // Re-using frontend constants
import { AgentPlan, MemoryPoint } from "../../src/types";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY environment variable not set");
}

// Fix: Use GoogleGenAI instead of deprecated GoogleGenerativeAI
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// Using a real embedding model now
export async function generateEmbedding(text: string): Promise<number[]> {
    const response = await ai.models.embedContent({
        model: 'text-embedding-004',
        content: text,
    });
    return response.embedding.values;
}

export async function createMemoryEngram(documentText: string): Promise<string> {
    const prompt = ENGRAM_CREATION_PROMPT.replace('{document}', documentText);
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { temperature: 0.2 }
    });
    return response.text.trim();
}

// --- Main RAG Logic ---

interface RunCollaborativeThinkingParams {
    initialQuery: string;
    userTags: string[];
    requestMemory: boolean;
    callbacks: {
        onPlansGenerated: (plans: AgentPlan[]) => void;
        onContextRetrieved: (context: string | null) => void;
        onSynthesisStart: () => void;
        onFinalThought: (thought: string) => void;
        onMemoryGenerated: (memory: Omit<MemoryPoint, 'id' | 'originalThought'>) => void;
    };
}

export async function runCollaborativeThinking({
    initialQuery,
    userTags,
    requestMemory,
    callbacks,
}: RunCollaborativeThinkingParams): Promise<void> {
    // Step 1: Parallel Brainstorming
    const planPromises = PLANNING_MODULES.map(async (module) => {
        const prompt = module.prompt.replace('{query}', initialQuery);
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { systemInstruction: SYSTEM_PROMPT_BASE, temperature: 0.5 }
        });
        return { moduleName: module.name, plan: response.text.trim() };
    });

    const plans = await Promise.all(planPromises);
    callbacks.onPlansGenerated(plans);

    // Step 2: Informed Retrieval from Qdrant
    const qdrant = getQdrantClient();
    let context: string | null = null;
    
    const plansString = plans.map(p => `${p.moduleName}: ${p.plan}`).join('\n');
    const memoryPrompt = MEMORY_QUERY_GENERATOR_PROMPT
        .replace('{query}', initialQuery)
        .replace('{plans}', plansString);
    
    const memoryResponse = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: memoryPrompt });
    const optimizedQuery = memoryResponse.text.trim();
    
    const queryEmbedding = await generateEmbedding(optimizedQuery);

    const searchResult = await qdrant.search('mem42', {
        vector: queryEmbedding,
        limit: 3,
        filter: {
            must: userTags.map(tag => ({
                key: 'tags',
                match: { value: tag }
            }))
        }
    });

    if (searchResult.length > 0) {
        context = searchResult.map(result => (result.payload as any).content).join('\n\n---\n\n');
    }
    callbacks.onContextRetrieved(context);
    
    // Step 3: Final Synthesis
    callbacks.onSynthesisStart();
    const plansStringForSynth = plans.map(p => `- ${p.moduleName}: ${p.plan}`).join('\n');
    const synthesizerPrompt = SYNTHESIZER_PROMPT
        .replace('{query}', initialQuery)
        .replace('{plans}', plansStringForSynth)
        .replace('{context}', context || 'No context was retrieved from the knowledge base.');

    const finalResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: synthesizerPrompt,
        config: { temperature: 0.7 }
    });
    const finalThought = finalResponse.text.trim();
    callbacks.onFinalThought(finalThought);

    // Step 4: (Optional) Memory Generation
    if (requestMemory) {
        const memory = await generateMemoryPoint(finalThought);
        callbacks.onMemoryGenerated(memory);
    }
}


async function generateMemoryPoint(finalThought: string): Promise<Omit<MemoryPoint, 'id' | 'originalThought'>> {
    const prompt = MEMORY_GENERATOR_PROMPT.replace('{thought}', finalThought);
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return parseMemoryPoint(response.text);
}


function parseMemoryPoint(text: string): Omit<MemoryPoint, 'id' | 'originalThought'> {
    const summaryMatch = text.match(/Summary:\s*([\s\S]*?)\s*Tags:/);
    const tagsMatch = text.match(/Tags:\s*([\s\S]*?)\s*Image Prompt:/);
    const imagePromptMatch = text.match(/Image Prompt:\s*([\s\S]*)/);

    const summary = summaryMatch ? summaryMatch[1].trim() : 'Could not parse summary.';
    const tags = tagsMatch ? tagsMatch[1].trim().split(',').map(tag => tag.trim()).filter(Boolean) : [];
    const imagePrompt = imagePromptMatch ? imagePromptMatch[1].trim() : 'Could not parse image prompt.';

    return { summary, tags, imagePrompt };
}
