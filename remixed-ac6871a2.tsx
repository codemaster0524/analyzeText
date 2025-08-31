const analyzeText = async () => {
  // Clear any existing highlights before analyzing
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
    const workerUrl = "https://rapid-truth-f124.eunsung-lee-460.workers.dev";  // ✅ Worker 주소

    const prompt = `Analyze the following text and provide specific suggestions for improvement. 
Focus on grammar, spelling, punctuation, style, and clarity. 
Please respond in ${locale} language.

Text to analyze:
"${textToAnalyze}"

IMPORTANT: When identifying issues, preserve the EXACT text including all quotation marks, apostrophes, and special characters. For example, if the text contains "consumers" with quotes, the issue field should be "consumers" not consumers.

Respond with a JSON array of suggestion objects. Each object should have:
- category: one of "grammar", "spelling", "punctuation", "style", or "clarity"
- issue: the EXACT text that needs improvement (including any quotes or special characters)
- suggestion: the corrected or improved version
- explanation: a brief explanation of why this change improves the text
- position: approximate starting position in the text (character index)

Only include actual issues that need correction. If the text is perfect, return an empty array.

Your entire response must be a valid JSON array. DO NOT include any text outside the JSON structure.`;

    // ✅ Worker를 통해 호출
    const response = await fetch(workerUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          { parts: [{ text: prompt }] }
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2048,
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Worker call failed: ${response.status}`);
    }

    const data = await response.json();
    const geminiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    try {
      let cleanResponse = geminiResponse.trim();
      cleanResponse = cleanResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      
      const jsonMatch = cleanResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        cleanResponse = jsonMatch[0];
      }
      
      const parsedSuggestions = JSON.parse(cleanResponse);
      if (Array.isArray(parsedSuggestions)) {
        setSuggestions(parsedSuggestions);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (parseError) {
      console.error('Parse error:', parseError);
      console.error('Raw response:', geminiResponse);
      setError(t('failedToParse'));
    }
  } catch (err) {
    console.error('Analysis error:', err);
    setError(t('failedToAnalyze'));
  } finally {
    setIsAnalyzing(false);
  }
};
