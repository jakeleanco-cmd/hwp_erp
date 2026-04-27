const mongoose = require('mongoose');

/**
 * 관리자 계정 스키마
 * aca_erp의 패턴을 따라 email, passwordHash, name 필드를 사용합니다.
 */
const adminSchema = new mongoose.Schema(
  {
    email: { 
      type: String, 
      required: true, 
      unique: true, 
      trim: true, 
      lowercase: true 
    },
    passwordHash: { 
      type: String, 
      required: true 
    },
    name: { 
      type: String, 
      default: '관리자' 
    },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Admin || mongoose.model('Admin', adminSchema);
