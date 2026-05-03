const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const Question = require('./models/Question');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hwp_math_erp');
  const questions = await Question.find({ content: /<img/ }).limit(1);
  if (questions.length === 0) {
    console.log('No questions with images found.');
  } else {
    const q = questions[0];
    console.log(`ID: ${q._id}`);
    console.log(`FULL CONTENT: ${q.content}`);
  }
  process.exit(0);
}

check();
