import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from "dotenv";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

async function testGeminiVision() {
    try {
        if (!process.env.GEMINI_API_KEY) {
            console.error("❌ GEMINI_API_KEY is not set!");
            return;
        }
        
        console.log(`API Key length: ${process.env.GEMINI_API_KEY.length}`);
        console.log("Testing Gemini Vision models...");

        // Try Flash models first since user has Flash API key
        const modelsToTest = [
            "gemini-1.5-flash",
            "gemini-1.5-flash-latest", 
            "gemini-2.0-flash",
            "gemini-1.5-pro-latest"
        ];

        for (const modelName of modelsToTest) {
            try {
                console.log(`\nTesting ${modelName}...`);
                const model = genAI.getGenerativeModel({ model: modelName });

                // Simple test with a small base64 image (1x1 red pixel PNG)
                const testImage = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==";

                const result = await model.generateContent([
                    "What color is this image?",
                    {
                        inlineData: {
                            mimeType: "image/png",
                            data: testImage
                        }
                    }
                ]);

                const response = await result.response;
                const text = response.text();

                console.log(`✅ Success! ${modelName} is working!`);
                console.log("Response:", text);
                return; // Success, exit
            } catch (error: any) {
                console.error(`❌ ${modelName} failed:`, error.message);
                if (error.message.includes('404') || error.message.includes('not found')) {
                    console.log(`   → Model not found, trying next...`);
                } else {
                    console.log(`   → Error: ${error.message}`);
                }
            }
        }
        
        console.log("\n❌ All models failed. Please check your API key.");

    } catch (error: any) {
        console.error("❌ Error:", error.message);
        console.error("Full error:", error);
    }
}

testGeminiVision();
