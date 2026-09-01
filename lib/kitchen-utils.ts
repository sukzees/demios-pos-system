export function formatKitchenSendTime(date = new Date()): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function nextStaggeredKitchenTime(baseMs: number, index: number): string {
  return formatKitchenSendTime(new Date(baseMs + index * 1000));
}
