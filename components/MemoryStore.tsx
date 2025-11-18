import React, { useState, useMemo } from 'react';
import { MemoryPoint } from '../types';

interface MemoryStoreProps {
  memories: MemoryPoint[];
  setMemories: React.Dispatch<React.SetStateAction<MemoryPoint[]>>;
}

const MemoryStore: React.FC<MemoryStoreProps> = ({ memories, setMemories }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredMemories = useMemo(() => {
    if (!searchTerm.trim()) return memories;
    const lowercasedTerm = searchTerm.toLowerCase();
    return memories.filter(memory =>
      memory.originalThought.toLowerCase().includes(lowercasedTerm) ||
      memory.summary.toLowerCase().includes(lowercasedTerm) ||
      memory.tags.some(tag => tag.toLowerCase().includes(lowercasedTerm))
    );
  }, [searchTerm, memories]);

  const deleteMemory = (id: string) => {
      const updatedMemories = memories.filter(m => m.id !== id);
      setMemories(updatedMemories);
      localStorage.setItem('mem42-memories', JSON.stringify(updatedMemories));
  }
  
  const handleClearMemories = () => {
    if (window.confirm("Are you sure you want to delete all memory archives? This action cannot be undone.")) {
        setMemories([]);
        localStorage.removeItem('mem42-memories');
    }
  }

  return (
    <div className="bg-gray-800/50 p-6 rounded-lg shadow-lg border border-cyan-500/20 h-full max-h-[calc(100vh-10rem)] flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-cyan-300 font-orbitron">Memory Archives</h2>
        {memories.length > 0 && (
            <button 
                onClick={handleClearMemories}
                className="px-3 py-1 bg-red-800/70 text-red-200 text-sm font-semibold rounded-md hover:bg-red-700 transition-colors"
            >
                Clear All
            </button>
        )}
      </div>
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search memories by content or tag..."
          className="w-full p-3 bg-gray-900 border border-gray-600 rounded-md focus:ring-2 focus:ring-cyan-500 focus:outline-none transition-all duration-300 text-gray-200 placeholder-gray-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      <div className="overflow-y-auto flex-grow pr-2 -mr-2">
        {filteredMemories.length > 0 ? (
          <div className="space-y-4">
            {filteredMemories.map(memory => (
              <div key={memory.id} className="bg-gray-700/50 p-4 rounded-lg relative group">
                <button
                  onClick={() => deleteMemory(memory.id)}
                  className="absolute top-2 right-2 p-1 rounded-full bg-red-800/50 text-red-200 hover:bg-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Delete memory"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                </button>
                <p className="text-gray-400 text-sm mb-2">
                  <span className="font-semibold text-gray-300">Original:</span> "{memory.originalThought}"
                </p>
                <p className="text-gray-300 mb-2"><span className="font-semibold text-gray-200">Summary:</span> {memory.summary.substring(0, 150)}...</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {memory.tags.slice(0, 5).map(tag => (
                    <span key={tag} className="px-2 py-0.5 bg-cyan-800/50 text-cyan-200 text-xs rounded-full">{tag}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-400 py-10">
            <p>{memories.length === 0 ? "No memories generated yet." : "No memories match your search."}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MemoryStore;