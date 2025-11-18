import { VectorStoreEntry } from '../types';

// Function to calculate the dot product of two vectors
function dotProduct(vecA: number[], vecB: number[]): number {
  let product = 0;
  for (let i = 0; i < vecA.length; i++) {
    product += vecA[i] * vecB[i];
  }
  return product;
}

// Function to calculate the magnitude of a vector
function magnitude(vec: number[]): number {
  let sum = 0;
  for (let i = 0; i < vec.length; i++) {
    sum += vec[i] * vec[i];
  }
  return Math.sqrt(sum);
}

// Function to calculate cosine similarity between two vectors
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  const dot = dotProduct(vecA, vecB);
  const magA = magnitude(vecA);
  const magB = magnitude(vecB);
  if (magA === 0 || magB === 0) {
    return 0;
  }
  return dot / (magA * magB);
}

/**
 * Finds the top K most similar entries in the vector store to a query embedding.
 * @param queryEmbedding The vector embedding of the query.
 * @param vectorStore The array of vector store entries to search through.
 * @param k The number of top results to return.
 * @returns An array of the top K most similar vector store entries.
 */
export function findTopKSimilar(queryEmbedding: number[], vectorStore: VectorStoreEntry[], k: number): VectorStoreEntry[] {
  if (!queryEmbedding || queryEmbedding.length === 0 || vectorStore.length === 0) {
    return [];
  }

  const similarities: { entry: VectorStoreEntry; similarity: number }[] = vectorStore.map(entry => ({
    entry,
    similarity: cosineSimilarity(queryEmbedding, entry.embedding),
  }));

  similarities.sort((a, b) => b.similarity - a.similarity);

  return similarities.slice(0, k).map(sim => sim.entry);
}
