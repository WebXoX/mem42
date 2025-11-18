import React from 'react';

interface ResultDisplayProps {
  thought: string;
}

const ResultDisplay: React.FC<ResultDisplayProps> = ({ thought }) => {
  return (
    <div className="bg-gradient-to-br from-gray-800 to-gray-900/50 p-6 rounded-lg shadow-2xl border border-cyan-500/30 animate-fade-in">
      <h2 className="text-2xl font-bold mb-4 text-cyan-300 font-orbitron flex items-center gap-3">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
        Synthesized Thought
      </h2>
      <div className="text-gray-200 leading-relaxed text-base">
        {thought.split('\n').map((paragraph, index) => (
          <p key={index} className="mb-4 last:mb-0">{paragraph || '\u00A0'}</p>
        ))}
      </div>
    </div>
  );
};

export default ResultDisplay;
