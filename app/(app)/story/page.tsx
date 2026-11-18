import fs from 'node:fs/promises';
import path from 'node:path';
import { StoryView } from './StoryView';

export const dynamic = 'force-static';

export default async function StoryPage() {
  const md = await fs.readFile(path.join(process.cwd(), 'content', 'story.md'), 'utf8');
  return <StoryView markdown={md} />;
}
