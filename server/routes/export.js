const express = require('express');
const router = express.Router();
const Question = require('../models/Question');
const { requireAuth } = require('../middleware/auth');
const { getDriveService } = require('../config/googleDriveConfig');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, ImageRun } = require('docx');

// Gemini AI 초기화 (환경 변수에 GEMINI_API_KEY가 등록되어 있어야 함)
let genAI = null;
if (process.env.GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
}

/**
 * 문항 정보를 OCR로 읽어 DOCX(한글 호환) 파일로 내보냅니다.
 */
router.get('/questions/:id/hwp', requireAuth, async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) return res.status(404).json({ error: '문항을 찾을 수 없습니다.' });

    const imageParagraphs = [];
    let ocrResult = '';

    // 이미지 추출 로직 (img 태그의 src 속성 분석)
    const imgTagRegex = /<img[^>]+src="([^">]+)"/g;
    const matches = [...question.content.matchAll(imgTagRegex)];
    
    if (matches.length > 0 && genAI) {
      const drive = getDriveService();
      const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

      for (const match of matches) {
        const src = match[1];
        let imageBuffer = null;
        let mimeType = 'image/png';

        try {
          if (src.startsWith('data:image/')) {
            const parts = src.split(',');
            imageBuffer = Buffer.from(parts[1], 'base64');
            const mimeMatch = parts[0].match(/data:(image\/[^;]+);base64/);
            if (mimeMatch) mimeType = mimeMatch[1];
          } else {
            const idMatch = src.match(/id=([a-zA-Z0-9_-]{25,})/);
            if (idMatch) {
              const fileId = idMatch[1];
              const response = await drive.files.get({
                fileId: fileId,
                alt: 'media'
              }, { responseType: 'arraybuffer' });
              imageBuffer = Buffer.from(response.data);
            }
          }

          if (imageBuffer) {
            // 1. 원본 이미지 삽입 (도형 등 확인용)
            imageParagraphs.push(new Paragraph({
              children: [
                new ImageRun({
                  data: imageBuffer,
                  transformation: { width: 450, height: 300 }, // 기본 크기 조절
                })
              ],
              alignment: AlignmentType.CENTER,
              spacing: { before: 200, after: 200 }
            }));

            // 2. Gemini OCR 호출
            const imageBase64 = imageBuffer.toString('base64');
            const prompt = "이 이미지는 학교 시험 문제의 일부분입니다. 이미지 내의 모든 텍스트(문제 지문, 보기 등)를 한 토씨도 틀리지 말고 정확히 추출해 주세요. 수학 기호나 수식은 LaTeX 형식($...$)을 최대한 활용해 주세요. 결과물은 텍스트로만 반환해 주세요.";
            
            const result = await model.generateContent([
              prompt,
              { inlineData: { data: imageBase64, mimeType } }
            ]);
            
            const text = result.response.text();
            if (text) {
              ocrResult += text + "\n\n";
            }
          }
        } catch (ocrErr) {
          console.error(`[OCR/Image Error] Detail:`, ocrErr);
          ocrResult += `[이미지 분석 실패]\n\n`;
        }
      }
    }

    // 문서 생성용 텍스트 준비 (HTML 태그 제거)
    const cleanContent = question.content.replace(/<[^>]*>/g, '').trim();
    const cleanExplanation = (question.explanation || '').replace(/<[^>]*>/g, '').trim();

    // DOCX 문서 구성
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: "문항 추출 데이터 (한글 HWP 호환용)", bold: true, size: 32 })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 }
          }),
          
          // 문제 섹션
          new Paragraph({
            text: "[문제]",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 }
          }),

          // 원본 이미지 삽입 섹션
          ...imageParagraphs,

          // 원본 텍스트 추가
          ...(cleanContent ? [
            new Paragraph({
              children: [new TextRun({ text: " (원본 텍스트) ", size: 16, color: "888888", italic: true })],
              spacing: { after: 100 }
            }),
            new Paragraph({
              children: [new TextRun(cleanContent)],
              spacing: { after: 200 }
            })
          ] : []),

          // OCR 분석 결과 추가
          ...(ocrResult ? [
            new Paragraph({
              children: [new TextRun({ text: " (이미지 분석 결과) ", size: 16, color: "1890FF", bold: true })],
              spacing: { before: 200, after: 100 }
            }),
            ...ocrResult.split('\n').map(line => 
              new Paragraph({
                children: [new TextRun(line.trim())],
                spacing: { after: 120 }
              })
            )
          ] : []),

          // 정답 섹션
          new Paragraph({
            text: "[정답]",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 100 }
          }),
          new Paragraph({
            children: [new TextRun({ text: question.answer || '미입력', bold: true, color: "0000FF" })],
            spacing: { after: 120 }
          }),

          // 해설 섹션
          new Paragraph({
            text: "[해설]",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 100 }
          }),
          new Paragraph({
            children: [new TextRun(cleanExplanation || '해설이 없습니다.')],
            spacing: { after: 120 }
          }),

          new Paragraph({
            children: [
              new TextRun({ 
                text: "\n* 본 문서는 시스템에서 자동으로 추출된 결과입니다. 수식이나 일부 오타가 있을 수 있으니 한글(HWP) 프로그램에서 확인 후 수정해 주세요.", 
                size: 18, 
                color: "888888" 
              })
            ],
            spacing: { before: 1000 }
          })
        ],
      }],
    });

    // 파일 내보내기
    const buffer = await Packer.toBuffer(doc);
    
    // 파일명 인코딩 처리
    const filename = `Question_Export_${req.params.id}.docx`;
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(buffer);

  } catch (err) {
    console.error('Export Error:', err);
    res.status(500).json({ error: '문서 생성 중 오류가 발생했습니다.', details: err.message });
  }
});

module.exports = router;
