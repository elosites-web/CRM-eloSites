import { BRIEFING_BLOCKS } from '../constants';

// The base briefing has sections 1-9. Optional blocks are numbered from 10 and
// the two closing sections ("O que enviar" and "Observações finais") follow
// them, so numbering stays continuous whatever blocks are selected.
const FIRST_BLOCK_NUMBER = 10;

export function buildBriefingContext(blockIds: string[]) {
  const blocks = BRIEFING_BLOCKS.filter((block) => blockIds.includes(block.id));
  return {
    nicheSections: blocks.map((block, index) => ({
      title: `${FIRST_BLOCK_NUMBER + index}. ${block.title}`,
      questions: block.questions.map((text) => ({ text })),
    })),
    sendSectionNumber: String(FIRST_BLOCK_NUMBER + blocks.length),
    finalSectionNumber: String(FIRST_BLOCK_NUMBER + blocks.length + 1),
  };
}
