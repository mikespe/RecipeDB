import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

const TOGETHER_API_KEY = process.env.TOGETHER_API_KEY || '';

/**
 * Extract a recipe from a base64 image using the Llama 3.2 Vision model via Together AI.
 * Returns an object with title, ingredients (string[]), instructions (string[]), and optional fields.
 */
export async function extractRecipeFromImage(base64Data: string) {
    if (!TOGETHER_API_KEY) {
        console.error('TOGETHER_API_KEY is not set');
        return null;
    }

    // Prompt instructing the model to output strict JSON
    const prompt = `You are given a photo of a recipe. Extract the recipe information and return ONLY a JSON object with the following fields:\n{\n  "title": string,\n  "ingredients": string[],\n  "instructions": string[],\n  "cookTime": number | null,\n  "totalTime": number | null,\n  "servings": number | null\n}\nIf any field is not present, use null (or an empty array for ingredients/instructions). Do NOT include any extra text or markdown formatting.`;

    const payload = {
        model: 'meta-llama/Llama-3.2-11B-Vision-Instruct',
        messages: [
            {
                role: 'user',
                content: [
                    { type: 'text', text: prompt },
                    {
                        type: 'image_url',
                        image_url: { url: `data:image/png;base64,${base64Data.split(',')[1]}` }
                    }
                ]
            }
        ],
        max_tokens: 1024,
        temperature: 0.0,
        top_p: 1.0,
        stream: false
    };

    try {
        console.log('Sending request to Together AI Llama Vision...');
        const response = await axios.post('https://api.together.xyz/v1/chat/completions', payload, {
            headers: {
                Authorization: `Bearer ${TOGETHER_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        const text = response.data?.choices?.[0]?.message?.content;
        console.log('Together AI response text:', text);

        if (!text) {
            console.error('No content returned from Together AI');
            return null;
        }

        // Remove possible markdown fences
        let jsonText = text.trim();
        if (jsonText.startsWith('```json')) {
            jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (jsonText.startsWith('```')) {
            jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }

        const recipeData = JSON.parse(jsonText);
        console.log('Parsed recipe data:', JSON.stringify(recipeData, null, 2));
        return recipeData;
    } catch (err: any) {
        console.error('Error calling Together AI Vision:', err.message);
        console.error(err);
        return null;
    }
}
