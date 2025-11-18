export interface MemoryPoint {
  id: string;
  originalThought: string;
  summary: string;
  tags: string[];
  imagePrompt: string;
}

export interface AgentPlan {
  moduleName: string;
  plan: string;
}

export interface VectorStoreEntry {
  id: string;
  content: string;
  embedding: number[];
  tags?: string[];
  source?: string;
}
