import { QdrantClient } from '@qdrant/js-client-rest';
import 'dotenv/config';

let qdrantClient: QdrantClient;

const QDRANT_URL = process.env.QDRANT_URL;
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;
const COLLECTION_NAME = 'mem42';

if (!QDRANT_URL) {
    throw new Error("QDRANT_URL environment variable not set");
}

export const getQdrantClient = (): QdrantClient => {
    if (!qdrantClient) {
        qdrantClient = new QdrantClient({
            url: QDRANT_URL,
            apiKey: QDRANT_API_KEY,
        });

        // Ensure the collection exists when the client is first created
        ensureCollectionExists();
    }
    return qdrantClient;
};

async function ensureCollectionExists() {
    try {
        await qdrantClient.getCollection(COLLECTION_NAME);
        console.log(`Collection "${COLLECTION_NAME}" already exists.`);
    } catch (error) {
        console.log(`Collection "${COLLECTION_NAME}" not found. Creating it now...`);
        await qdrantClient.recreateCollection(COLLECTION_NAME, {
            vectors: {
                size: 768, // Standard size for Google's text-embedding-004
                distance: 'Cosine',
            },
        });
        console.log(`Collection "${COLLECTION_NAME}" created successfully.`);
    }
}
