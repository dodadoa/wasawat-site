/**
 * Converts @ mentions in text to Instagram links
 * @param text - The text containing @ mentions
 * @returns HTML string with @ mentions converted to Instagram links
 */
export function linkInstagramMentions(text: string): string {
  // Match @ mentions (including those with underscores, dots, etc.)
  // Pattern: @ followed by word characters, dots, underscores, or hyphens
  const mentionPattern = /@([\w._-]+)/g;
  
  return text.replace(mentionPattern, (match, username) => {
    const instagramUrl = `https://www.instagram.com/${username}/`;
    return `<a href="${instagramUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-400 font-bold hover:underline hover:text-blue-300">${match}</a>`;
  });
}

