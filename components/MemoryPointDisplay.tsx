import React from 'react';
import { MemoryPoint } from '../types';

interface MemoryPointDisplayProps {
  memory: Omit<MemoryPoint, 'id' | 'originalThought'>;
}

const MemoryPointDisplay: React.FC<MemoryPointDisplayProps> = ({ memory }) => {
  return (
    <div className="bg-gray-800/70 p-6 rounded-lg shadow-lg border border-gray-700 animate-fade-in">
      <h2 className="text-xl font-bold mb-4 text-cyan-300 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
        Generated Memory Point
      </h2>
      
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-300 mb-2">Summary</h3>
          <p className="text-gray-300 whitespace-pre-wrap">{memory.summary}</p>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-300 mb-2">Tags</h3>
          <div className="flex flex-wrap gap-2">
            {memory.tags.map((tag, index) => (
              <span key={index} className="px-3 py-1 bg-cyan-800/50 text-cyan-200 text-sm rounded-full">
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-300 mb-2">Image Prompt</h3>
          <p className="text-gray-300 italic">"{memory.imagePrompt}"</p>
        </div>
      </div>
    </div>
  );
};

export default MemoryPointDisplay;
