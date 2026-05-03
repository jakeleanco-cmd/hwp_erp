const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const Question = require('./models/Question');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hwp_math_erp');
  const questions = await Question.find({ content: /<img/ }).limit(5);
  console.log('--- Questions with Images ---');
  questions.forEach(q => {
    console.log(`ID: ${q._id}`);
    console.log(`Content: ${q.content}`);
    const imgRegex = /id=([a-zA-Z0-9_-]{25,})/g;
    const matches = [...q.content.matchAll(imgRegex)];
    console.log(`Matches: ${matches.map(m => m[1])}`);
    console.log('---');
  });
  process.exit(0);
}

check();
