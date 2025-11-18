import React from 'react';
import { AgentPlan } from '../types';
import { ModuleIcon } from './icons/ModuleIcons';

interface ThinkingProcessProps {
  plans: AgentPlan[];
}

const ThinkingProcess: React.FC<ThinkingProcessProps> = ({ plans }) => {
  return (
    <div className="bg-gray-800/50 p-6 rounded-lg shadow-lg border border-cyan-500/20 animate-fade-in">
      <h2 className="text-xl font-bold mb-4 text-cyan-300">Initial Agent Perspectives</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans.map((plan) => (
            <div key={plan.moduleName} className="bg-gray-700/50 p-4 rounded-md">
              <div className="flex items-center gap-3 mb-2">
                <ModuleIcon moduleName={plan.moduleName} className="w-6 h-6 text-cyan-400 flex-shrink-0" />
                <h3 className="text-lg font-semibold text-gray-200">{plan.moduleName.replace(' Module', '')}</h3>
              </div>
              <p className="text-gray-300 text-sm">{plan.plan}</p>
            </div>
        ))}
      </div>
    </div>
  );
};

export default ThinkingProcess;
