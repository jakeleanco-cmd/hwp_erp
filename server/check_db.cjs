const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const ExamSchema = new mongoose.Schema({
  examName: String,
  questions: Array,
  createdAt: { type: Date, default: Date.now }
});

const Exam = mongoose.model('Exam', ExamSchema);

async function checkLastExam() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hwp_math_erp';
    await mongoose.connect(MONGODB_URI);
    
    const lastExam = await Exam.findOne().sort({ createdAt: -1 });
    if (!lastExam) {
      console.log('No exams found.');
      return;
    }
    
    console.log(`Checking Exam: ${lastExam.examName}`);
    let base64Found = false;
    
    lastExam.questions.forEach((q, i) => {
      const contentStr = JSON.stringify(q);
      if (contentStr.includes('data:image')) {
        console.log(`- Question ${i+1} has Base64 image!`);
        base64Found = true;
      }
      
      if (contentStr.includes('drive.google.com')) {
        console.log(`- Question ${i+1} has Google Drive link.`);
      }
    });
    
    if (!base64Found) {
      console.log('No Base64 images found in the last exam. (Success!)');
    }
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkLastExam();
