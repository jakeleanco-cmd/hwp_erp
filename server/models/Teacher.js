const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema(
  {
    teacherId: { 
      type: String, 
      required: true, 
      unique: true, 
      trim: true 
    },
    passwordHash: { 
      type: String, 
      required: true 
    },
    name: { 
      type: String, 
      required: true 
    },
    subject: {
      type: String,
      default: '수학'
    },
    permissions: {
      type: Object,
      default: {
        canImportHwp: false,
        canUseMathEditor: false,
        canManageQuestionBank: true // 기본적으로 문제은행은 접근 가능
      }
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.models.Teacher || mongoose.model('Teacher', teacherSchema);
