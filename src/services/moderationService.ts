export async function moderateContent(text: string, context: "chat" | "news"): Promise<{ isAppropriate: boolean; reason?: string }> {
  try {
    const response = await fetch('/api/moderate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text, context }),
    });

    if (!response.ok) {
      throw new Error("Moderation request failed");
    }

    return await response.json();
  } catch (error) {
    console.error("Moderation error:", error);
    // In case of error, allow the content to pass so we don't block users unnecessarily
    return { isAppropriate: true };
  }
}
