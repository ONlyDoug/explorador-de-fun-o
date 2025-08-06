export default async function handler(req, res) {
  // 1. Apenas permitir requisições do tipo POST
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  // 2. Obter o prompt do corpo da requisição
  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: "Nenhum prompt foi fornecido." });
  }

  // 3. Obter a chave da API das variáveis de ambiente (seguro)
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "A chave da API do Gemini não foi configurada no servidor.",
    });
  }

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

  // 4. Montar o payload para a API do Gemini
  const payload = {
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
    // Adicionar configurações de segurança para evitar respostas indesejadas
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
      {
        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
        threshold: "BLOCK_ONLY_HIGH",
      },
      {
        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
        threshold: "BLOCK_ONLY_HIGH",
      },
    ],
  };

  try {
    // 5. Fazer a chamada para a API do Gemini a partir do servidor
    const geminiResponse = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!geminiResponse.ok) {
      const errorBody = await geminiResponse.text();
      console.error("Erro da API Gemini:", errorBody);
      throw new Error(
        `A API do Gemini respondeu com o status: ${geminiResponse.status}`
      );
    }

    const geminiResult = await geminiResponse.json();

    // 6. Extrair e enviar a resposta de volta para o frontend
    const text =
      geminiResult.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Não foi possível extrair uma resposta da IA.";
    res.status(200).json({ text });
  } catch (error) {
    console.error("Erro interno no servidor:", error);
    res.status(500).json({ error: error.message });
  }
}
