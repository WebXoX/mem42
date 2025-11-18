import React, { useState, DragEvent, useRef, useEffect } from 'react';
import { VectorStoreEntry } from '../types';
import { generateEmbedding, createMemoryEngram } from '../services/geminiService';
import * as pdfjsLib from 'pdfjs-dist';

// Set up the PDF.js worker
// This is crucial for PDF parsing to work in the background without freezing the UI.
try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://aistudiocdn.com/pdfjs-dist@^4.6.0/build/pdf.worker.mjs';
} catch (e) {
    console.error("Failed to set PDF.js worker source.", e);
}


interface MemoryCreatorProps {
  vectorStore: VectorStoreEntry[];
  setVectorStore: React.Dispatch<React.SetStateAction<VectorStoreEntry[]>>;
}

// --- File Parsing Utilities ---

const readTextFromFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target?.result as string);
        reader.onerror = (error) => reject(error);
        reader.readAsText(file);
    });
};

const readPdfFromFile = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const arrayBuffer = event.target?.result as ArrayBuffer;
                const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
                let fullText = '';
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    fullText += textContent.items.map((item: any) => item.str).join(' ') + '\n';
                }
                resolve(fullText);
            } catch (error) {
                reject(`Error parsing PDF: ${error instanceof Error ? error.message : String(error)}`);
            }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
    });
};

const parseFile = async (file: File): Promise<string> => {
    const fileType = file.type;
    const fileName = file.name.toLowerCase();

    if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
        return readPdfFromFile(file);
    }
    // A simple check for common text-based file types
    if (fileType.startsWith('text/') || ['.md', '.json', '.csv', '.txt'].some(ext => fileName.endsWith(ext))) {
        return readTextFromFile(file);
    }
    
    throw new Error(`Unsupported file type: ${file.name} (${file.type})`);
};


const MemoryCreator: React.FC<MemoryCreatorProps> = ({ vectorStore, setVectorStore }) => {
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [tags, setTags] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (files) {
      setError(null);
      const newFiles = Array.from(files);
      setStagedFiles(prev => [...prev, ...newFiles]);
    }
  };

  const handleProcessFiles = async () => {
    if (stagedFiles.length === 0) {
      setError("No files selected to process.");
      return;
    }
    setIsLoading(true);
    setError(null);
    
    const newEntries: VectorStoreEntry[] = [];
    const tagArray = tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);

    try {
      for (let i = 0; i < stagedFiles.length; i++) {
        const file = stagedFiles[i];
        
        try {
          setProcessingStatus(`[${i + 1}/${stagedFiles.length}] Parsing ${file.name}...`);
          const textContent = await parseFile(file);

          setProcessingStatus(`[${i + 1}/${stagedFiles.length}] Creating memory engram for ${file.name}...`);
          const engramContent = await createMemoryEngram(textContent);

          setProcessingStatus(`[${i + 1}/${stagedFiles.length}] Embedding engram for ${file.name}...`);
          const embedding = await generateEmbedding(engramContent);

          newEntries.push({
            id: `engram-${Date.now()}-${Math.random()}`,
            content: engramContent,
            embedding,
            tags: tagArray.length > 0 ? tagArray : undefined,
            source: file.name,
          });

        } catch (fileError: any) {
            console.error(`Skipping file ${file.name} due to error:`, fileError);
            setError(prev => `${prev ? prev + '\n' : ''}Skipped ${file.name}: ${fileError.message}`);
        }
      }
      
      const updatedVectorStore = [...vectorStore, ...newEntries];
      setVectorStore(updatedVectorStore);
      localStorage.setItem('mem42-vector-db', JSON.stringify(updatedVectorStore));
      setStagedFiles([]);
      setTags('');

    } catch (e: any) {
      setError(`A critical error occurred during processing: ${e.message}`);
    } finally {
      setIsLoading(false);
      setProcessingStatus('');
    }
  };
  
  const handleClearKnowledge = () => {
      if (window.confirm("Are you sure you want to delete the entire knowledge base? This action cannot be undone.")) {
          setVectorStore([]);
          localStorage.removeItem('mem42-vector-db');
      }
  }

  // --- Drag and Drop Handlers ---
  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); };
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const removeStagedFile = (fileNameToRemove: string) => {
    setStagedFiles(prev => prev.filter(f => f.name !== fileNameToRemove));
  }


  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Left Column: Input */}
      <div className="bg-gray-800/50 p-6 rounded-lg shadow-lg border border-cyan-500/20 flex flex-col">
        <h2 className="text-xl font-bold mb-4 text-cyan-300">Create Knowledge Base</h2>
        
        <div 
          className={`relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-md transition-all duration-300 ${isDragging ? 'border-cyan-400 bg-gray-700/50' : 'border-gray-600'}`}
          onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDragOver={handleDragOver} onDrop={handleDrop}
        >
          <input type="file" multiple ref={fileInputRef} onChange={(e) => handleFiles(e.target.files)} className="hidden" />
          <p className="text-gray-400 mb-2">Drag & drop files here</p>
          <p className="text-gray-500 mb-4">or</p>
          <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-500 transition-colors">
            Upload Files
          </button>
          <p className="text-xs text-gray-500 mt-2">Supports .txt, .md, .pdf, .json, .csv</p>
        </div>

        {stagedFiles.length > 0 && (
            <div className="mt-4">
                <h3 className="text-lg font-semibold text-gray-300 mb-2">Staged Files ({stagedFiles.length})</h3>
                <div className="space-y-2 max-h-40 overflow-y-auto bg-gray-900/50 p-3 rounded-md">
                    {stagedFiles.map(file => (
                        <div key={file.name} className="flex items-center justify-between bg-gray-700 p-2 rounded text-sm">
                            <span className="truncate text-gray-300">{file.name}</span>
                            <button onClick={() => removeStagedFile(file.name)} className="text-red-400 hover:text-red-300 ml-2">&times;</button>
                        </div>
                    ))}
                </div>
            </div>
        )}

        <div className="mt-4">
            <label htmlFor="tags-input" className="block text-sm font-medium text-gray-300 mb-2">Apply Tags to Batch (optional, comma-separated)</label>
            <input
                type="text" id="tags-input"
                className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md focus:ring-2 focus:ring-cyan-500 focus:outline-none text-gray-200 placeholder-gray-500"
                placeholder="e.g., finance, quarterly-report, Q2-2024"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                disabled={isLoading}
            />
        </div>
        <div className="flex items-center justify-end mt-4">
          <button
            onClick={handleProcessFiles}
            disabled={isLoading || stagedFiles.length === 0}
            className="px-6 py-2 bg-cyan-600 text-white font-semibold rounded-md hover:bg-cyan-500 transition-all duration-300 disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
              `Process ${stagedFiles.length} Files & Store`
            )}
          </button>
        </div>
        {processingStatus && <p className="text-cyan-300 text-sm mt-2 text-center">{processingStatus}</p>}
        {error && (
            <div className="bg-red-900/50 border border-red-500 text-red-200 p-4 rounded-lg mt-4 whitespace-pre-wrap">
                <strong>Error(s):</strong><br/>{error}
            </div>
        )}
      </div>

      {/* Right Column: Stored Knowledge */}
      <div className="bg-gray-800/50 p-6 rounded-lg shadow-lg border border-cyan-500/20 flex flex-col h-[70vh]">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-cyan-300">Stored Memory Engrams ({vectorStore.length})</h2>
            {vectorStore.length > 0 && (
                 <button 
                    onClick={handleClearKnowledge}
                    className="px-3 py-1 bg-red-800/70 text-red-200 text-sm font-semibold rounded-md hover:bg-red-700 transition-colors"
                >
                    Clear All
                </button>
            )}
        </div>
        <div className="overflow-y-auto flex-grow pr-2 -mr-2">
          {vectorStore.length > 0 ? (
            <div className="space-y-3">
              {vectorStore.map(entry => (
                <div key={entry.id} className="bg-gray-700/50 p-3 rounded-md">
                   {entry.source && (
                     <p className="text-xs text-cyan-300 font-semibold truncate mb-1" title={entry.source}>
                       Source: {entry.source}
                     </p>
                   )}
                  <p className="text-gray-300 text-sm leading-relaxed">
                    "{entry.content.substring(0, 200)}..."
                  </p>
                   {entry.tags && entry.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                        {entry.tags.map(tag => (
                            <span key={tag} className="px-2 py-0.5 bg-gray-600 text-cyan-200 text-xs rounded-full">{tag}</span>
                        ))}
                    </div>
                   )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-400 py-10 h-full flex items-center justify-center">
              <p>The knowledge base is empty.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MemoryCreator;