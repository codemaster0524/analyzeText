const analyzeText = async () => {
  if (editorRef.current) {
    let content = editorRef.current.innerHTML;
    content = content.replace(/<mark[^>]*>(.*?)<\/mark>/g, '$1');
    editorRef.current.innerHTML = content;
    updateContent();
  }

  if (!text.trim()) {
    setError(t('pleaseEnterText'));
    return;
  }

  setIsAnalyzing(true);
  setError('');
  setSuggestions([]);

  try {
    const textToAnalyze = text;
    const workerUrl = "https://rapid-truth-f124.eunsung-lee-460.workers.dev";  // Worker 주소

    const prompt = `Analyze the following text and provide suggestions...
Text to analyze:
"${textToAnalyze}"

IMPORTANT: preserve the EXACT text including any special characters.

Respond with a valid JSON array of suggestions (category, issue, suggestion, explanation, position).`;

    const response = await fetch(workerUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 2048 }
      })
    });

    if (!response.ok) throw new Error(`Worker call failed: ${response.status}`);

    const data = await response.json();
    const geminiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    try {
      let cleanResponse = geminiResponse.trim()
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '');
      const jsonMatch = cleanResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) cleanResponse = jsonMatch[0];
      const parsed = JSON.parse(cleanResponse);
      if (Array.isArray(parsed)) {
        setSuggestions(parsed);
      } else throw new Error('Invalid response format');
    } catch (parseErr) {
      console.error('Parse error:', parseErr, geminiResponse);
      setError(t('failedToParse'));
    }
  } catch (err) {
    console.error('Analysis error:', err);
    setError(t('failedToAnalyze'));
  } finally {
    setIsAnalyzing(false);
  }
};
