import { ConfigService } from '@nestjs/config';
import { NvidiaProvider } from './nvidia.provider';
import { MockLlmProvider } from './mock-llm.provider';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

async function verify() {
  console.log('Testing NVIDIA NIM provider...');
  const config = new ConfigService();
  const mock = new MockLlmProvider();
  const provider = new NvidiaProvider(config, mock);

  console.log('Provider key:', provider.key);
  console.log('Display name:', provider.displayName);
  console.log('Configured model:', provider.model);
  console.log('isConfigured():', provider.isConfigured());

  if (!provider.isConfigured()) {
    throw new Error('Provider is not configured. Check NVIDIA_API_KEY in .env');
  }

  console.log('\n--- 1. Testing Chat Completion (meta/llama-3.2-11b-vision-instruct) ---');
  const chatResponse = await provider.chat(
    [{ role: 'user', content: 'Respond with: "NVIDIA NIM integration is operational!"' }],
    { model: 'meta/llama-3.2-11b-vision-instruct', maxTokens: 40 },
  );
  console.log('Chat Output:', chatResponse.content.trim());
  console.log('Model Used:', chatResponse.model);
  console.log('Usage:', chatResponse.usage);

  console.log('\n--- 2. Testing Live Streaming (meta/llama-3.2-11b-vision-instruct) ---');
  let streamedText = '';
  process.stdout.write('Stream tokens: ');
  for await (const chunk of provider.streamChat(
    [{ role: 'user', content: 'Count from 1 to 5 separated by spaces.' }],
    { model: 'meta/llama-3.2-11b-vision-instruct', maxTokens: 30 },
  )) {
    process.stdout.write(`[${chunk}]`);
    streamedText += chunk;
  }
  console.log('\nStreamed output:', streamedText.trim());

  console.log('\n--- 3. Testing Default Model (' + provider.model + ') ---');
  console.log('Configured default model:', provider.model);

  console.log('\n========================================');
  console.log('>>> [SUCCESS] NVIDIA NIM is WORKING! <<<');
  console.log('========================================');
}

verify().catch((err) => {
  console.error('[FAILED] Verification error:', err);
  process.exit(1);
});
