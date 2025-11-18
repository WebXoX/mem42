import express, { Request, Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import pdf from 'pdf-parse';
import { runCollaborativeThinking, createMemoryEngram, generateEmbedding } from './gemini';
import { getQdrantClient } from './qdrant';

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

const storage = multer.memoryStorage();
const upload = multer({ storage });

// --- Local Types to fix environment-specific type issues ---
// Fix: Define a local interface for Multer files to avoid issues with Express namespace augmentation.
interface UploadedFile {
    originalname: string;
    mimetype: string;
    buffer: Buffer;
}

// --- API Endpoints ---

// Endpoint to handle the main query and stream results
app.get('/api/query', async (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const { query, tags, requestMemory } = req.query;

    const sendEvent = (data: any) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {
        await runCollaborativeThinking({
            initialQuery: query as string,
            userTags: (tags as string).split(',').map(t => t.trim().toLowerCase()).filter(Boolean),
            requestMemory: requestMemory === 'true',
            callbacks: {
                onPlansGenerated: (plans) => sendEvent({ type: 'plans', payload: plans }),
                onContextRetrieved: (context) => sendEvent({ type: 'context', payload: context }),
                onSynthesisStart: () => sendEvent({ type: 'synthesis' }),
                onFinalThought: (thought) => sendEvent({ type: 'thought', payload: thought }),
                onMemoryGenerated: (memory) => sendEvent({ type: 'memory', payload: memory }),
            },
        });
        sendEvent({ type: 'done' });
    } catch (error) {
        console.error('Error during query processing:', error);
        sendEvent({ type: 'error', payload: 'An error occurred on the server.' });
        res.end();
    }
});

// Endpoint to upload and process documents
app.post('/api/upload', upload.array('documents'), async (req: Request, res: Response) => {
    // Fix: Use the local UploadedFile interface to correctly type req.files.
    const files = req.files as UploadedFile[];
    const tags = (req.body.tags as string).split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
    const qdrant = getQdrantClient();

    let successfulUploads = 0;
    const errors: string[] = [];

    for (const file of files) {
        try {
            let textContent = '';
            if (file.mimetype === 'application/pdf') {
                const data = await pdf(file.buffer);
                textContent = data.text;
            } else {
                textContent = file.buffer.toString('utf-8');
            }

            const engram = await createMemoryEngram(textContent);
            const embedding = await generateEmbedding(engram);

            await qdrant.upsert('mem42', {
                wait: true,
                points: [{
                    id: `engram-${Date.now()}-${Math.random()}`,
                    vector: embedding,
                    payload: { content: engram, tags, source: file.originalname }
                }]
            });
            successfulUploads++;
        } catch (error: any) {
            console.error(`Failed to process file ${file.originalname}:`, error);
            errors.push(`${file.originalname}: ${error.message}`);
        }
    }

    res.status(200).json({
        message: `Processed ${successfulUploads}/${files.length} files.`,
        successfulUploads,
        errors
    });
});


// Endpoint to get the count of engrams
app.get('/api/engram-count', async (req: Request, res: Response) => {
    try {
        const qdrant = getQdrantClient();
        const collectionInfo = await qdrant.getCollection('mem42');
        res.json({ count: collectionInfo.points_count || 0 });
    } catch (error) {
        console.error('Could not fetch collection info:', error);
        // If collection doesn't exist, count is 0
        res.json({ count: 0 });
    }
});

// Endpoint to clear the knowledge base
app.post('/api/clear-knowledge', async (req: Request, res: Response) => {
    try {
        const qdrant = getQdrantClient();
        // This deletes and recreates the collection, ensuring it's empty and has the correct vector params
        await qdrant.recreateCollection('mem42', {
            vectors: { size: 768, distance: 'Cosine' },
        });
        res.status(200).json({ message: 'Knowledge base cleared successfully.' });
    } catch (error: any) {
        console.error('Failed to clear knowledge base:', error);
        res.status(500).json({ message: 'Failed to clear knowledge base.', error: error.message });
    }
});


app.listen(port, () => {
    console.log(`Mem 42 backend listening on port ${port}`);
    // Initialize Qdrant client and ensure collection exists on startup
    getQdrantClient();
});
