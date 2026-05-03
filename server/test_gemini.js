const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function list() {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // There is no direct listModels in the SDK for some versions, but we can try to fetch a model
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    console.log('Model object created');
    
    // Try a simple request
    const result = await model.generateContent("Hello");
    console.log('Response:', result.response.text());
  } catch (err) {
    console.error('Error:', err);
  }
}

list();
