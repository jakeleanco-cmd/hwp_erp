import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button, Space, Typography, Switch, Radio, message } from 'antd';
import { ArrowLeftOutlined, PrinterOutlined, FilePdfOutlined } from '@ant-design/icons';
import axios from 'axios';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { useAuthStore } from '../../store/authStore';

const { Title, Text } = Typography;

/**
 * 시험지 뷰어 컴포넌트
 * 
 * [인쇄 설계 원칙]
 * 화면(Screen)과 인쇄(Print)를 완전히 분리합니다.
 * - 화면: min-height로 A4 느낌을 시각적으로 재현
 * - 인쇄: 높이 제약 없이 page-break-after만으로 페이지 분리
 *         → 이렇게 해야 빈 페이지가 삽입되지 않음
 */
const ExamViewer = ({ exam, onBack }) => {
  const { admin, updateAdmin } = useAuthStore();
  const defaults = { showAnswers: false, columns: 2, questionSpacing: 50, itemsPerPage: 6 };
  const saved = admin?.examViewerSettings || defaults;

  const [showAnswers, setShowAnswers] = useState(saved.showAnswers);
  const [columns, setColumns] = useState(saved.columns);
  const [questionSpacing, setQuestionSpacing] = useState(saved.questionSpacing);
  const [itemsPerPage, setItemsPerPage] = useState(saved.itemsPerPage);
  const [pdfLoading, setPdfLoading] = useState(false);
  const pageRefs = useRef([]);

  // 설정 변경 시 Zustand → DB 동기화 (1초 디바운스)
  useEffect(() => {
    const s = { showAnswers, columns, questionSpacing, itemsPerPage };
    updateAdmin({ examViewerSettings: s });
    const t = setTimeout(() => {
      axios.put('/api/auth/settings', { settings: s }).catch(console.error);
    }, 1000);
    return () => clearTimeout(t);
  }, [showAnswers, columns, questionSpacing, itemsPerPage]);

  /**
   * PDF 생성: 화면에 보이는 각 페이지를 이미지로 캡처 → PDF로 조합
   * 브라우저 인쇄 엔진을 완전히 우회하므로 화면과 100% 동일한 결과물 보장
   */
  const handleExportPDF = useCallback(async () => {
    if (pageRefs.current.length === 0) return;
    setPdfLoading(true);
    message.loading({ content: 'PDF 생성 중...', key: 'pdf', duration: 0 });

    try {
      // A4 규격 PDF (mm 단위)
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = 210;
      const pdfHeight = 297;

      for (let i = 0; i < pageRefs.current.length; i++) {
        const el = pageRefs.current[i];
        if (!el) continue;

        // 화면의 페이지를 고해상도 캔버스로 캡처
        const canvas = await html2canvas(el, {
          scale: 2,              // 2배 해상도로 선명하게
          useCORS: true,         // 외부 이미지 허용
          backgroundColor: '#ffffff',
          logging: false,
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);

        // 첫 페이지 이후는 새 페이지 추가
        if (i > 0) pdf.addPage();

        // 캡처한 이미지를 A4 크기에 맞춰 삽입
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      }

      // PDF 다운로드
      pdf.save(`${exam.examName || '시험지'}.pdf`);
      message.success({ content: 'PDF 다운로드 완료!', key: 'pdf' });
    } catch (err) {
      console.error('PDF 생성 실패:', err);
      message.error({ content: 'PDF 생성에 실패했습니다.', key: 'pdf' });
    } finally {
      setPdfLoading(false);
    }
  }, [exam]);

  if (!exam) return null;

  const questions = exam.questions || [];

  // 페이지 분할
  const pages = [];
  for (let i = 0; i < questions.length; i += itemsPerPage) {
    pages.push(questions.slice(i, i + itemsPerPage));
  }

  // ref 배열 초기화
  pageRefs.current = [];

  return (
    <>
      {/* ── 인쇄 전용 스타일 (별도 style 태그) ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700&display=swap');

        /* ========== 인쇄 전용 ========== */
        @media print {
          @page { size: A4 portrait; margin: 0; }

          /* 전역 초기화 */
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }

          /* 인쇄 불필요 요소 완전 제거 */
          .no-print {
            display: none !important;
          }

          /* 외부 컨테이너 초기화 */
          .ev-root {
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
            min-height: 0 !important;
          }

          /*
           * [핵심 원칙] 인쇄 시 높이를 절대 고정하지 않음.
           * 고정 높이(height/min-height: 297mm)는 브라우저 반올림 오차로
           * 빈 페이지를 생성하는 근본 원인임.
           * page-break-before로 페이지를 분리하면 빈 페이지가 끼어들지 않음.
           */
          .ev-page {
            width: 210mm !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            margin: 0 !important;
            padding: 15mm !important;
            box-shadow: none !important;
            border: none !important;
            overflow: hidden !important; /* A4를 넘는 내용이 빈 페이지를 만들지 않도록 자름 */
            box-sizing: border-box !important;
          }
          /* 첫 페이지를 제외한 나머지: 앞에서 페이지 넘김 */
          .ev-page + .ev-page {
            page-break-before: always;
          }

          .ev-page-number {
            position: static !important;
            bottom: auto !important;
            text-align: center;
            padding-top: 30px;
            padding-bottom: 10px;
          }

          /* 구분선 인쇄 */
          .ev-divider {
            border-color: #ccc !important;
          }
        }
      `}</style>

      <div className="ev-root" style={{
        background: '#d1d5db',
        minHeight: '100vh',
        paddingBottom: '40px',
        fontFamily: "'Noto Sans KR', sans-serif",
      }}>

        {/* ── 컨트롤 바 (인쇄 시 숨김) ── */}
        <div className="no-print" style={{
          position: 'sticky', top: 0, zIndex: 40,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'white', padding: '12px 16px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          borderBottom: '1px solid #9ca3af',
        }}>
          <Space size="middle">
            <Button icon={<ArrowLeftOutlined />} onClick={onBack} size="small">뒤로</Button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderLeft: '1px solid #ddd', paddingLeft: 12 }}>
              <Text strong style={{ fontSize: 13 }}>단 설정</Text>
              <Radio.Group
                options={[{ label: '1단', value: 1 }, { label: '2단', value: 2 }]}
                onChange={({ target: { value } }) => setColumns(value)}
                value={columns}
                optionType="button"
                size="small"
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderLeft: '1px solid #ddd', paddingLeft: 12 }}>
              <Text strong style={{ fontSize: 13 }}>문항 간격</Text>
              <Button.Group size="small">
                <Button onClick={() => setQuestionSpacing(Math.max(0, questionSpacing - 5))}>-</Button>
                <Button disabled style={{ width: 45, color: '#000' }}>{questionSpacing}</Button>
                <Button onClick={() => setQuestionSpacing(Math.min(300, questionSpacing + 5))}>+</Button>
              </Button.Group>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderLeft: '1px solid #ddd', paddingLeft: 12 }}>
              <Text strong style={{ fontSize: 13 }}>쪽당 문항수</Text>
              <Button.Group size="small">
                <Button onClick={() => setItemsPerPage(Math.max(1, itemsPerPage - 1))}>-</Button>
                <Button disabled style={{ width: 35, color: '#000' }}>{itemsPerPage}</Button>
                <Button onClick={() => setItemsPerPage(itemsPerPage + 1)}>+</Button>
              </Button.Group>
            </div>
          </Space>

          <Space size="middle">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Text strong style={{ fontSize: 13 }}>정답</Text>
              <Switch checked={showAnswers} onChange={setShowAnswers} size="small" />
            </div>
            <Button
              type="primary"
              icon={<FilePdfOutlined />}
              onClick={handleExportPDF}
              loading={pdfLoading}
              size="middle"
              danger
            >
              PDF 출력
            </Button>
          </Space>
        </div>

        {/* ── 시험지 페이지 렌더링 ── */}
        {pages.map((pageQuestions, pageIndex) => (
          <div
            key={pageIndex}
            className="ev-page"
            ref={(el) => { if (el) pageRefs.current[pageIndex] = el; }}
            style={{
              width: '210mm',
              height: '297mm',       /* 고정 높이로 A4 경계 명확히 표시 */
              padding: '15mm 15mm 25mm 15mm',
              margin: '30px auto',
              background: 'white',
              boxShadow: '0 0 20px rgba(0,0,0,0.3)',
              overflow: 'hidden',    /* 넘치는 내용 잘림 → 사용자가 문항수 줄이도록 유도 */
              position: 'relative',
              boxSizing: 'border-box',
              fontFamily: "'Noto Sans KR', sans-serif",
              color: '#000',
            }}
          >
            {/* 2단 구분선 */}
            {columns === 2 && (
              <div className="ev-divider" style={{
                position: 'absolute',
                top: pageIndex === 0 ? '55mm' : '15mm',
                bottom: '25mm',
                left: '50%',
                borderLeft: '1px solid #ddd',
                transform: 'translateX(-50%)',
                zIndex: 1,
              }} />
            )}

            {/* 문항 영역 (flex:1 → 인쇄 시 페이지 번호를 하단으로 밀어냄) */}
            <div className="ev-content" style={{ flex: 1 }}>
              {/* 시험지 헤더 (첫 페이지만) */}
              {pageIndex === 0 && (
                <div style={{
                  borderBottom: '2px solid black',
                  paddingBottom: 8,
                  marginBottom: 24,
                }}>
                  <div style={{ textAlign: 'center', marginBottom: 12 }}>
                    <Title level={2} style={{ margin: 0, fontSize: '24pt', letterSpacing: '-1px' }}>
                      {exam.examName}
                    </Title>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <Text strong style={{ fontSize: '13pt' }}>
                      반: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 이름:
                    </Text>
                    <Text style={{ fontSize: '11pt' }}>총 {questions.length}문항</Text>
                  </div>
                </div>
              )}

              {/* 문항 그리드 */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: columns === 2 ? '1fr 1fr' : '1fr',
                gap: `0 40px`,
                position: 'relative',
                zIndex: 2,
              }}>
              {pageQuestions.map((q) => (
                <div
                  key={q.id}
                  style={{
                    marginBottom: questionSpacing,
                    breakInside: 'avoid',
                    pageBreakInside: 'avoid',
                  }}
                >
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ fontSize: '14pt', fontWeight: 'bold', minWidth: 28 }}>{q.id}.</div>
                    <div style={{ flex: 1 }}>
                      <div
                        className="ql-editor"
                        style={{ fontSize: '11.5pt', lineHeight: 1.6, padding: 0 }}
                        dangerouslySetInnerHTML={{ __html: q.content }}
                      />

                      {showAnswers && (q.answer || q.explanation) && (
                        <div style={{
                          marginTop: 8, padding: 8,
                          background: '#f9fafb',
                          border: '1px solid #fecaca',
                          borderRadius: 6,
                          fontSize: '10pt',
                        }}>
                          {q.answer && (
                            <div style={{ marginBottom: 4 }}>
                              <Text type="danger" strong>정답: </Text>
                              <Text>{q.answer}</Text>
                            </div>
                          )}
                          {q.explanation && (
                            <div style={{ color: '#4b5563' }}>
                              <Text type="danger" strong>해설:</Text>
                              <div
                                className="ql-editor"
                                style={{ fontSize: '10pt', padding: 0, marginTop: 4 }}
                                dangerouslySetInnerHTML={{ __html: q.explanation }}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {/* ev-content 닫기 */}
            </div>

            {/* 페이지 번호 (flex 하단에 고정) */}
            <div className="ev-page-number" style={{
              position: 'absolute',
              bottom: '10mm',
              left: 0,
              width: '100%',
              textAlign: 'center',
              fontSize: '12pt',
              flexShrink: 0,
            }}>
              - {pageIndex + 1} -
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default ExamViewer;
