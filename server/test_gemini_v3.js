const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function list() {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    console.log('Model object created');
    
    const result = await model.generateContent("Hello");
    console.log('Response:', result.response.text());
  } catch (err) {
    console.error('Error:', err);
  }
}

list();
