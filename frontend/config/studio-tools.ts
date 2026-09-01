import type { AIOutputType } from '@/features/ai-studio/ai-studio-types';

export const STUDIO_CATEGORIES = ['Understand', 'Create', 'Media', 'Visualize', 'Utilities'] as const;
export type StudioCategory = (typeof STUDIO_CATEGORIES)[number];
export type ToolAvailability = 'available' | 'missing';
export type StudioToolId =
  | 'explain' | 'summary' | 'translate'
  | 'image' | 'image-editing' | 'image-translation' | 'ocr' | 'pdf-translation'
  | 'audio' | 'speech-to-text' | 'text-to-speech' | 'video'
  | 'mind-map' | 'diagram-generator' | 'presentation-generator'
  | 'report' | 'key-points' | 'flashcards' | 'quiz' | 'study-guide' | 'analytics' | 'chart' | 'ask-anything';

export type StudioTool = {
  id: StudioToolId;
  endpoint?: string;
  name: string;
  description: string;
  category: StudioCategory;
  outputType?: AIOutputType;
  mediaType?: 'image' | 'video' | 'audio';
  availability: ToolAvailability;
  missingReason?: string;
  availabilityNote?: string;
  requiresSource?: boolean;
  accent?: 'violet' | 'blue' | 'cyan' | 'emerald' | 'amber' | 'rose';
};

export const STUDIO_TOOLS: readonly StudioTool[] = [
  { id: 'explain', endpoint: '/ai-studio/explain', name: 'Explain', description: 'Clarify complex ideas with grounded examples.', category: 'Understand', availability: 'available' },
  { id: 'summary', endpoint: '/ai-studio/summary', outputType: 'SUMMARY', name: 'Summarize', description: 'Create short, medium, detailed, or bullet summaries.', category: 'Understand', availability: 'available' },
  { id: 'translate', endpoint: '/ai-studio/translate', outputType: 'TRANSLATION', name: 'Translate', description: 'Translate documents or selected text.', category: 'Understand', availability: 'available' },

  { id: 'report', endpoint: '/ai-studio/report', outputType: 'REPORT', name: 'Report Generator', description: 'Create executive, detailed, or bullet reports.', category: 'Create', availability: 'available' },
  { id: 'diagram-generator', endpoint: '/ai-studio/diagram', name: 'Diagram Generator', description: 'Generate a Mermaid diagram from a selected source.', category: 'Create', availability: 'available', requiresSource: true },
  { id: 'presentation-generator', endpoint: '/ai-studio/presentation', outputType: 'REPORT', name: 'Presentation Generator', description: 'Turn workspace material into a structured presentation deck.', category: 'Create', availability: 'available' },
  { id: 'key-points', endpoint: '/ai-studio/key-points', outputType: 'KEY_POINTS', name: 'Key Points', description: 'Extract important facts, claims, and decisions.', category: 'Create', availability: 'available' },
  { id: 'flashcards', endpoint: '/ai-studio/flashcards', outputType: 'FLASHCARDS', name: 'Flashcards', description: 'Practice recall with categorized cards.', category: 'Create', availability: 'available' },
  { id: 'quiz', endpoint: '/ai-studio/quiz', outputType: 'QUIZ', name: 'Quiz Generator', description: 'Take an auto-graded mixed-format quiz.', category: 'Create', availability: 'available' },
  { id: 'study-guide', endpoint: '/ai-studio/study-guide', outputType: 'STUDY_GUIDE', name: 'Study Guide', description: 'Build concepts, examples, and a learning path.', category: 'Create', availability: 'available' },

  { id: 'image', endpoint: '/media/generate', mediaType: 'image', name: 'Image Generation', description: 'Create high-resolution images from natural-language prompts.', category: 'Media', availability: 'available' },
  { id: 'image-editing', endpoint: '/media/generate', mediaType: 'image', name: 'Image Editing', description: 'Edit or reimagine an image with natural-language instructions.', category: 'Media', availability: 'available' },
  { id: 'image-translation', endpoint: '/ai-studio/image-translation', name: 'Image Translation', description: 'Extract, translate, and re-render text inside images and PDFs.', category: 'Media', availability: 'available', availabilityNote: 'The same pipeline accepts PDF files.' },
  { id: 'ocr', endpoint: '/ai-studio/ocr', name: 'OCR Text Extractor', description: 'Extract clean text from uploaded documents and images.', category: 'Media', availability: 'available' },
  { id: 'pdf-translation', endpoint: '/ai-studio/image-translation', name: 'PDF Translation', description: 'Translate text in PDF uploads using the Image Translation pipeline.', category: 'Media', availability: 'available', availabilityNote: 'Uses /ai-studio/image-translation because that endpoint already supports PDF uploads.' },
  { id: 'audio', endpoint: '/media/generate', mediaType: 'audio', name: 'Audio Generation', description: 'Generate spoken audio from workspace material.', category: 'Media', availability: 'available' },
  { id: 'speech-to-text', endpoint: '/ai-studio/explain', name: 'Speech-to-Text', description: 'Transcribe and analyze audio into grounded text.', category: 'Media', availability: 'available' },
  { id: 'text-to-speech', endpoint: '/media/generate', mediaType: 'audio', name: 'Text-to-Speech', description: 'Convert written text into spoken audio.', category: 'Media', availability: 'available' },
  { id: 'video', endpoint: '/media/generate', mediaType: 'video', name: 'Video Generation', description: 'Generate cinematic motion sequences and video storyboards from prompts.', category: 'Media', availability: 'available' },

  { id: 'mind-map', endpoint: '/ai-studio/mind-map', outputType: 'MIND_MAP', name: 'Mind Map', description: 'Explore concepts as an interactive hierarchy.', category: 'Visualize', availability: 'available' },
  { id: 'analytics', endpoint: '/ai-studio/analytics', outputType: 'ANALYTICS_REPORT', name: 'CSV & Excel Insights', description: 'Profile columns, statistics, quality, outliers, and trends.', category: 'Visualize', availability: 'available', requiresSource: true },
  { id: 'chart', endpoint: '/ai-studio/chart', outputType: 'CHART', name: 'Charts', description: 'Visualize CSV or Excel data with six chart types.', category: 'Visualize', availability: 'available', requiresSource: true },

  { id: 'ask-anything', name: 'Ask Anything', description: 'Ask a free-form grounded question.', category: 'Utilities', availability: 'available' },
] as const;

export const MEDIA_TOOLS = STUDIO_TOOLS.filter((tool) => tool.category === 'Media');

export function toolsForCategory(category: StudioCategory): readonly StudioTool[] {
  return STUDIO_TOOLS.filter((tool) => tool.category === category);
}
