import React from 'react';

interface InputFormProps {
  userInput: string;
  setUserInput: (value: string) => void;
  tagFilter: string;
  setTagFilter: (value: string) => void;
  requestMemory: boolean;
  setRequestMemory: (value: boolean) => void;
  onSubmit: () => void;
  isLoading: boolean;
}

const InputForm: React.FC<InputFormProps> = ({
  userInput,
  setUserInput,
  tagFilter,
  setTagFilter,
  requestMemory,
  setRequestMemory,
  onSubmit,
  isLoading,
}) => {
  return (
    <div className="bg-gray-800/50 p-6 rounded-lg shadow-lg border border-cyan-500/20">
      <h2 className="text-xl font-bold mb-4 text-cyan-300">Enter Your Thought</h2>
      <textarea
        className="w-full h-40 p-3 bg-gray-900 border border-gray-600 rounded-md focus:ring-2 focus:ring-cyan-500 focus:outline-none transition-all duration-300 text-gray-200 placeholder-gray-500"
        placeholder="Enter a question, document, or idea to process..."
        value={userInput}
        onChange={(e) => setUserInput(e.target.value)}
        disabled={isLoading}
      />
      <div className="mt-4">
        <label htmlFor="tag-filter-input" className="block text-sm font-medium text-gray-300 mb-2">Tag Filters (optional, comma-separated)</label>
        <input
            type="text"
            id="tag-filter-input"
            className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md focus:ring-2 focus:ring-cyan-500 focus:outline-none text-gray-200 placeholder-gray-500"
            placeholder="Search only within documents with these tags..."
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            disabled={isLoading}
        />
      </div>
      <div className="flex items-center justify-between mt-4">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            className="w-5 h-5 accent-cyan-500 bg-gray-700 rounded border-gray-500 focus:ring-cyan-600"
            checked={requestMemory}
            onChange={(e) => setRequestMemory(e.target.checked)}
            disabled={isLoading}
          />
          <span className="text-gray-300">Generate Long-Term Memory</span>
        </label>
        <button
          onClick={onSubmit}
          disabled={isLoading}
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
            'Initiate'
          )}
        </button>
      </div>
    </div>
  );
};

export default InputForm;
