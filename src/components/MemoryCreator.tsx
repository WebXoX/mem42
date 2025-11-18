import React, { useState, DragEvent, useRef } from 'react';

const MemoryCreator: React.FC = () => {
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [tags, setTags] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [knowledgeBaseCount, setKnowledgeBaseCount] = useState(0);

  // Fetch initial count of items in knowledge base
  React.useEffect(() => {
    fetch('/api/engram-count')
      .then(res => res.json())
      .then(data => setKnowledgeBaseCount(data.count))
      .catch(err => console.error("Could not fetch engram count", err));
  }, []);


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
    setProcessingStatus(`Starting upload of ${stagedFiles.length} files...`);

    const formData = new FormData();
    stagedFiles.forEach(file => {
      formData.append('documents', file);
    });
    formData.append('tags', tags);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || `Server responded with status ${response.status}`);
      }

      const result = await response.json();
      setKnowledgeBaseCount(prev => prev + result.successfulUploads);
      
      if(result.errors && result.errors.length > 0) {
        setError(`Some files failed to process:\n- ${result.errors.join('\n- ')}`);
      }

      setStagedFiles([]);
      setTags('');

    } catch (e: any) {
      setError(`A critical error occurred during processing: ${e.message}`);
    } finally {
      setIsLoading(false);
      setProcessingStatus('');
    }
  };
  
  const handleClearKnowledge = async () => {
      if (window.confirm("Are you sure you want to delete the entire knowledge base from Qdrant? This action is permanent and cannot be undone.")) {
        try {
            await fetch('/api/clear-knowledge', { method: 'POST' });
            setKnowledgeBaseCount(0);
        } catch(e: any) {
            setError(`Failed to clear knowledge base: ${e.message}`);
        }
      }
  }

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
    <div className="space-y-8">
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

       <div className="bg-gray-800/50 p-6 rounded-lg shadow-lg border border-cyan-500/20 flex flex-col">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-cyan-300">Knowledge Base Status</h2>
             <button 
                onClick={handleClearKnowledge}
                className="px-3 py-1 bg-red-800/70 text-red-200 text-sm font-semibold rounded-md hover:bg-red-700 transition-colors"
            >
                Clear All Knowledge
            </button>
        </div>
        <div className="text-center bg-gray-900/50 p-8 rounded-md">
            <p className="text-gray-400 text-lg">Total Memory Engrams in Qdrant</p>
            <p className="text-5xl font-orbitron text-cyan-400 mt-2">{knowledgeBaseCount}</p>
        </div>
      </div>
    </div>
  );
};

export default MemoryCreator;
