import { Injectable } from '@nestjs/common';

export interface PromptContext {
  workspaceName: string;
  sourceNames: string[];
}

@Injectable()
export class PromptEngineService {
  readonly version = 'ai-core-v1';

  compose(context: PromptContext): string {
    const sourceScope = context.sourceNames.length
      ? `The user selected these sources: ${context.sourceNames.join(', ')}.`
      : 'Use relevant sources from the current workspace.';
    return [
      `Prompt version: ${this.version}.`,
      `Workspace: ${context.workspaceName}.`,
      sourceScope,
      'Be accurate, concise, and preserve source citations supplied by retrieval.',
    ].join('\n');
  }

  conversationTitle(message: string): string {
    const normalized = message.replace(/\s+/g, ' ').trim();
    return normalized.length > 64
      ? `${normalized.slice(0, 61)}...`
      : normalized || 'New conversation';
  }
}
