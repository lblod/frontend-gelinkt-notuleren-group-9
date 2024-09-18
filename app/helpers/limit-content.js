export default function limitContent(text, limit) {
  if (!text) return '';
  if (text.length < limit) {
    return text;
  } else {
    return text.slice(0, limit) + '...';
  }
}
