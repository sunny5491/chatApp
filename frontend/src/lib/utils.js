export function formatMessageTime(date) {
  const messageDate = new Date(date);
  const now = new Date();
  
  const isToday = messageDate.toDateString() === now.toDateString();
  const isYesterday = new Date(now.setDate(now.getDate() - 1)).toDateString() === messageDate.toDateString();
  
  const timeStr = messageDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  if (isToday) return `Today at ${timeStr}`;
  if (isYesterday) return `Yesterday at ${timeStr}`;
  
  return `${messageDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric"
  })} at ${timeStr}`;
}