import React, { useState, useEffect, useCallback } from 'react';
import { MemoryPoint, AgentPlan } from './types';
import InputForm from './components/InputForm';
import ThinkingProcess from './components/ThinkingProcess';
import ResultDisplay from './components/ResultDisplay';
import MemoryPointDisplay from './components/MemoryPointDisplay';
import MemoryStore from './components/MemoryStore';
import MemoryCreator from './components/MemoryCreator';
import { BrainIcon } from './components/icons/BrainIcon';

type View = 'query' | 'creation';

const App: React.FC = () => {
  const [view, setView] = useState<View>('query');
  
  const [userInput, setUserInput] = useState<string>('');
  const [tagFilter, setTagFilter] = useState<string>('');
  const [requestMemory, setRequestMemory] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  
  const [agentPlans, setAgentPlans] = useState<AgentPlan[]>([]);
  const [retrievedContext, setRetrievedContext] = useState<string | null>(null);
  const [finalThought, setFinalThought] = useState<string | null>(null);
  const [generatedMemory, setGeneratedMemory] = useState<Omit<MemoryPoint, 'id' | 'originalThought'> | null>(null);

  const [storedMemories, setStoredMemories] = useState<MemoryPoint[]>([]);

  useEffect(() => {
    try {
      const savedMemories = localStorage.getItem('mem42-memories');
      if (savedMemories) setStoredMemories(JSON.parse(savedMemories));
    } catch (e) {
      console.error("Failed to load memories from localStorage", e);
      setError("Could not load saved memories.");
    }
  }, []);

  const saveMemory = useCallback((newMemory: MemoryPoint) => {
    setStoredMemories(prevMemories => {
      const updatedMemories = [newMemory, ...prevMemories];
      try {
        localStorage.setItem('mem42-memories', JSON.stringify(updatedMemories));
      } catch (e) {
        console.error("Failed to save memory to localStorage", e);
        setError("Could not save the new memory. Your browser storage might be full.");
      }
      return updatedMemories;
    });
  }, []);

  const resetState = () => {
    setError(null);
    setAgentPlans([]);
    setRetrievedContext(null);
    setFinalThought(null);
    setGeneratedMemory(null);
    setLoadingMessage('');
  };

  const handleSubmit = async () => {
    if (!userInput.trim()) {
      setError("Please enter a thought or question.");
      return;
    }
    setIsLoading(true);
    resetState();
    setLoadingMessage('Initiating query...');

    const queryParams = new URLSearchParams({
        query: userInput,
        tags: tagFilter,
        requestMemory: String(requestMemory),
    });

    const eventSource = new EventSource(`/api/query?${queryParams.toString()}`);

    eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === 'plans') {
            setLoadingMessage('Gathering perspectives...');
            setAgentPlans(data.payload);
        } else if (data.type === 'context') {
            setLoadingMessage('Consulting knowledge base...');
            setRetrievedContext(data.payload);
        } else if (data.type === 'synthesis') {
            setLoadingMessage('Synthesizing final thought...');
        } else if (data.type === 'thought') {
            setFinalThought(data.payload);
        } else if (data.type === 'memory') {
            setLoadingMessage('Generating long-term memory...');
            const memoryData = data.payload;
            setGeneratedMemory(memoryData);
            saveMemory({ ...memoryData, id: Date.now().toString(), originalThought: userInput });
        } else if (data.type === 'done') {
            eventSource.close();
            setIsLoading(false);
            setLoadingMessage('');
        }
    };

    eventSource.onerror = (err) => {
        console.error("EventSource failed:", err);
        setError("An error occurred while communicating with the server.");
        setIsLoading(false);
        eventSource.close();
    };
  };


  const NavButton: React.FC<{ targetView: View; label: string }> = ({ targetView, label }) => (
    <button
      onClick={() => setView(targetView)}
      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${view === targetView ? 'bg-cyan-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-8">
          <div className="flex items-center justify-center gap-4">
            <BrainIcon className="w-12 h-12 text-cyan-400" />
            <h1 className="text-4xl md:text-5xl font-orbitron text-white tracking-wider">
              Mem <span className="text-cyan-400">42</span>
            </h1>
          </div>
           <p className="mt-4 text-lg text-gray-400 max-w-3xl mx-auto">
            A collaborative multi-agent system to build a knowledge base and reason upon it.
          </p>
        </header>

        <nav className="flex justify-center gap-4 mb-8">
          <NavButton targetView="query" label="Query Brain" />
          <NavButton targetView="creation" label="Manage Knowledge" />
        </nav>
        
        {view === 'query' ? (
          <main className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column: Input and Processing */}
            <div className="flex flex-col gap-8">
              <InputForm
                userInput={userInput}
                setUserInput={setUserInput}
                tagFilter={tagFilter}
                setTagFilter={setTagFilter}
                requestMemory={requestMemory}
                setRequestMemory={setRequestMemory}
                onSubmit={handleSubmit}
                isLoading={isLoading}
              />

              {isLoading && (
                <div className="bg-gray-800/50 p-6 rounded-lg shadow-lg border border-cyan-500/20 flex flex-col items-center justify-center h-64">
                  <div className="loader"></div>
                  <p className="mt-4 text-cyan-300 font-semibold">{loadingMessage}</p>
                </div>
              )}
              
              {error && (
                <div className="bg-red-900/50 border border-red-500 text-red-200 p-4 rounded-lg">
                  <strong>Error:</strong> {error}
                </div>
              )}

              {/* --- FINAL OUTPUTS (MOVED TO TOP) --- */}
              {finalThought && !isLoading && (
                <ResultDisplay thought={finalThought} />
              )}
              
              {generatedMemory && !isLoading && (
                <MemoryPointDisplay memory={generatedMemory} />
              )}

              {/* --- INTERMEDIATE STEPS (NOW BELOW OUTPUT) --- */}
              {!isLoading && agentPlans.length > 0 && (
                <ThinkingProcess plans={agentPlans} />
              )}
              
              {!isLoading && retrievedContext && (
                 <div className="bg-gray-800/70 p-6 rounded-lg shadow-lg border border-gray-700 animate-fade-in">
                  <h3 className="text-xl font-bold mb-4 text-cyan-300 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7a8 8 0 0116 0" /></svg>
                    Retrieved Context
                  </h3>
                  <div className="bg-gray-900/50 p-4 rounded-md max-h-48 overflow-y-auto border border-gray-600">
                    <p className="text-sm text-gray-300 whitespace-pre-wrap font-mono">
                      {retrievedContext}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Memory Store */}
            <MemoryStore memories={storedMemories} setMemories={setStoredMemories} />
          </main>
        ) : (
          <MemoryCreator />
        )}
      </div>
    </div>
  );
};

export default App;
