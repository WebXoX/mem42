import { GoogleGenAI, Type } from "@google/genai";
import { MemoryPoint, AgentPlan, VectorStoreEntry } from '../types';
import { PLANNING_MODULES, SYSTEM_PROMPT_BASE, MEMORY_GENERATOR_PROMPT, SYNTHESIZER_PROMPT, MEMORY_QUERY_GENERATOR_PROMPT, ENGRAM_CREATION_PROMPT } from '../constants';
import { findTopKSimilar } from '../utils/vectorUtils';


if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * NOTE: This function simulates embedding generation.
 * In a real-world application, you would use a dedicated embedding model.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  await new Promise(resolve => setTimeout(resolve, 50)); 
  return Array.from({ length: 768 }, () => Math.random() * 2 - 1);
}

/**
 * Reads a full document and creates a dense summary ("engram") of it.
 */
export async function createMemoryEngram(documentText: string): Promise<string> {
  const prompt = ENGRAM_CREATION_PROMPT.replace('{document}', documentText);
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      temperature: 0.2,
    }
  });
  return response.text.trim();
}


interface RunCollaborativeThinkingParams {
  initialQuery: string;
  vectorStore: VectorStoreEntry[];
  userTags: string[];
  callbacks: {
    onPlansGenerated: (plans: AgentPlan[]) => void;
    onContextRetrieved: (context: string | null, query: string) => void;
    onSynthesisStart: () => void;
  };
}

export async function runCollaborativeThinking({
  initialQuery,
  vectorStore,
  userTags,
  callbacks,
}: RunCollaborativeThinkingParams): Promise<{ finalThought: string }> {
  // Step 1: Parallel Brainstorming
  const planPromises = PLANNING_MODULES.map(async (module) => {
    const prompt = module.prompt.replace('{query}', initialQuery);
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_PROMPT_BASE,
        temperature: 0.5,
      }
    });
    return {
      moduleName: module.name,
      plan: response.text.trim(),
    };
  });

  const plans = await Promise.all(planPromises);
  callbacks.onPlansGenerated(plans);

  // Step 2: Informed Retrieval
  let context: string | null = null;
  let optimizedQuery = initialQuery;

  if (vectorStore.length > 0) {
    // 2a: Use Memory Philosopher to create a search query from plans
    const plansString = plans.map(p => `${p.moduleName}: ${p.plan}`).join('\n');
    const memoryPrompt = MEMORY_QUERY_GENERATOR_PROMPT
        .replace('{query}', initialQuery)
        .replace('{plans}', plansString);

    const memoryResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: memoryPrompt,
    });
    optimizedQuery = memoryResponse.text.trim();

    // 2b: Pre-filter by user-provided tags
    let searchCorpus = vectorStore;
    if (userTags.length > 0) {
      searchCorpus = vectorStore.filter(entry =>
        entry.tags && userTags.every(searchTag =>
          entry.tags!.some(entryTag => entryTag.toLowerCase().includes(searchTag))
        )
      );
    }
    
    // 2c: Vector search on the (potentially filtered) corpus
    if (searchCorpus.length > 0) {
      const queryEmbedding = await generateEmbedding(optimizedQuery);
      const similarChunks = findTopKSimilar(queryEmbedding, searchCorpus, 3);
      if (similarChunks.length > 0) {
        context = similarChunks.map(chunk => chunk.content).join('\n\n---\n\n');
      }
    }
  }
  callbacks.onContextRetrieved(context, optimizedQuery);
  
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
      config: {
        temperature: 0.7,
      }
    });
  
  const finalThought = finalResponse.text.trim();
  return { finalThought };
}


export async function generateMemoryPoint(finalThought: string): Promise<Omit<MemoryPoint, 'id' | 'originalThought'>> {
  const prompt = MEMORY_GENERATOR_PROMPT.replace('{thought}', finalThought);
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });

  const rawText = response.text;
  return parseMemoryPoint(rawText);
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
