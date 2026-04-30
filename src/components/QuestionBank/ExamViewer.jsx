import React, { useState } from 'react';
import { Button, Space, Typography, Switch, Radio } from 'antd';
import { ArrowLeftOutlined, PrinterOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const ExamViewer = ({ exam, onBack }) => {
  const [showAnswers, setShowAnswers] = useState(false);
  const [columns, setColumns] = useState(1);

  const handlePrint = () => {
    window.print();
  };

  if (!exam) return null;

  return (
    <div className="exam-viewer-container">
      {/* 화면용 컨트롤 바 (인쇄 시 숨김 처리) */}
      <div className="print:hidden mb-6 flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={onBack}>
            목록으로 돌아가기
          </Button>
        </Space>
        <Space size="large">
          <div className="flex items-center gap-2 mr-4">
            <Text strong>레이아웃</Text>
            <Radio.Group 
              options={[
                { label: '1단', value: 1 },
                { label: '2단', value: 2 },
              ]} 
              onChange={({ target: { value } }) => setColumns(value)} 
              value={columns} 
              optionType="button"
              buttonStyle="solid"
            />
          </div>
          <div className="flex items-center gap-2">
            <Text strong>정답 및 해설 포함</Text>
            <Switch 
              checked={showAnswers} 
              onChange={setShowAnswers} 
            />
          </div>
          <Button type="primary" icon={<PrinterOutlined />} onClick={handlePrint}>
            시험지 출력하기
          </Button>
        </Space>
      </div>

      {/* 시험지 실제 영역 (인쇄 영역) */}
      <div className="exam-paper bg-white print:px-12 print:py-8 p-8 md:p-12 rounded-xl shadow-sm border border-gray-200 print:border-none print:shadow-none min-h-[800px]">
        
        {/* 시험지 헤더 */}
        <div className="exam-header border-b-2 border-black pb-4 mb-8">
          <div className="text-center mb-4">
            <Title level={2} style={{ margin: 0, fontFamily: "'Noto Sans KR', sans-serif" }}>
              {exam.examName}
            </Title>
          </div>
          <div className="flex justify-between items-end">
            <Text strong className="text-lg">반: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 이름:</Text>
            <Text>총 {exam.questions?.length || 0}문항</Text>
          </div>
        </div>

        {/* 문항 목록 */}
        <div className={`exam-questions ${columns === 2 ? 'columns-1 md:columns-2 gap-12' : ''}`}>
          {exam.questions?.map((q) => (
            <div key={q.id} className="question-item break-inside-avoid mb-10">
              <div className="flex gap-3">
                <div className="text-xl font-bold min-w-[30px]">{q.id}.</div>
                <div className="flex-1">
                  {/* 문제 내용 렌더링 */}
                  <div 
                    className="question-content text-lg leading-relaxed mb-4 ql-editor"
                    style={{ padding: 0 }}
                    dangerouslySetInnerHTML={{ __html: q.content }} 
                  />
                  
                  {/* 정답 및 해설 표시 영역 */}
                  {showAnswers && (q.answer || q.explanation) && (
                    <div className="answer-box mt-4 p-4 bg-gray-50 border border-red-200 rounded-md print:bg-transparent print:border-red-400 print:border-dashed">
                      {q.answer && (
                        <div className="mb-2">
                          <Text type="danger" strong>정답: </Text>
                          <Text>{q.answer}</Text>
                        </div>
                      )}
                      {q.explanation && (
                        <div>
                          <Text type="danger" strong>해설:</Text>
                          <div 
                            className="mt-1 text-gray-700 ql-editor" 
                            style={{ padding: 0 }}
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
        

      </div>
    </div>
  );
};

export default ExamViewer;
