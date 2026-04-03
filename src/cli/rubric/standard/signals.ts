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
  {
    id: '2.7.2',
    name: 'PHI/compliance on hot path',
    tier: 'standard',
    category: 'Signal Follow-Through',
    pts: 1,
    confidence: 'medium',
    na: (ctx) => !ctx.facts.stack.signals.complianceSignals,
    detect: {
      type: 'custom',
      fn: (ctx: FactContext): CheckResult => {
        const content = ctx.agentFacts.instruction.content ?? '';
        const onHotPath =
          /\bPHI\b|HIPAA|patient.*data|tenant.*scope|MUST NOT log/i.test(
            content,
          );
        return {
          id: '2.7.2',
          name: 'PHI/compliance on hot path',
          tier: 'standard',
          category: 'Signal Follow-Through',
          status: onHotPath ? 'pass' : 'fail',
          points: onHotPath ? 1 : 0,
          maxPoints: 1,
          confidence: 'medium',
          message: onHotPath
            ? 'Compliance constraints in instruction file hot path'
            : 'PHI/compliance signals detected but constraints are not in the instruction file hot path',
        };
      },
    },
    recommendation:
      'PHI/compliance signals detected - add mandatory constraints to instruction file: "MUST NOT log PHI", "MUST scope queries by tenant". These belong in the hot path, not only in cold-path security docs.',
    recommendationKey: 'fix-compliance-signal-followthrough',
  },
  {
    id: '2.7.3',
    name: 'Formatter hook covers detected languages',
    tier: 'standard',
    category: 'Signal Follow-Through',
    pts: 1,
    confidence: 'medium',
    na: (ctx) => ctx.facts.stack.signals.formatterGaps.length === 0,
    detect: {
      type: 'custom',
      fn: (ctx: FactContext): CheckResult => {
        const gaps = ctx.facts.stack.signals.formatterGaps;
        return {
          id: '2.7.3',
          name: 'Formatter hook covers detected languages',
          tier: 'standard',
          category: 'Signal Follow-Through',
          status: 'fail',
          points: 0,
          maxPoints: 1,
          confidence: 'medium',
          message: `Formatter gaps: ${gaps.join(', ')} - add formatters to PostToolUse hook (format-file.sh)`,
        };
      },
    },
    recommendation:
      'Add formatters for all detected languages to the PostToolUse hook (format-file.sh). Every language should have a formatter running automatically.',
    recommendationKey: 'fix-formatter-gaps',
  },
];
