import type { CheckDef, FactContext, CheckResult } from '../../types.js';

/** Standard-tier checks for signal follow-through and enforcement (2.7.x). */
export const signalChecks: CheckDef[] = [
  {
    id: '2.7.1',
    name: 'LLM integration addressed in instruction file',
    tier: 'standard',
    category: 'Signal Follow-Through',
    pts: 1,
    confidence: 'medium',
    priority: 'optional',
    na: (ctx) => !ctx.facts.stack.signals.llmIntegration,
    detect: {
      type: 'custom',
      fn: (ctx: FactContext): CheckResult => {
        const content = ctx.agentFacts.instruction.content?.toLowerCase() ?? '';
        const addressed =
          /llm|prompt|model|ai\s+integration/i.test(content) &&
          /ask first|boundary|router/i.test(content);
        return {
          id: '2.7.1',
          name: 'LLM integration addressed in instruction file',
          tier: 'standard',
          category: 'Signal Follow-Through',
          status: addressed ? 'pass' : 'fail',
          points: addressed ? 1 : 0,
          maxPoints: 1,
          confidence: 'medium',
          message: addressed
            ? 'Instruction file addresses LLM integration'
            : 'LLM integration detected but instruction file does not address prompt handling or LLM boundaries',
        };
      },
    },
    recommendation:
      'LLM integration detected - add prompt/template paths to Router Table and "prompt changes require scenario testing" to Ask First boundaries',
    recommendationKey: 'fix-llm-signal-followthrough',
  },
];
