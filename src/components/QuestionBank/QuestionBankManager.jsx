import React, { useState, useEffect } from 'react';
import { Card, Input, Button, Form, InputNumber, Space, Typography, Divider, Empty, message, Spin } from 'antd';
import { PlusOutlined, SaveOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import axios from 'axios';
import RichTextEditor from './RichTextEditor';
import ExamList from './ExamList';
import ExamViewer from './ExamViewer';

const { Title, Text } = Typography;

/**
 * 문제 은행 관리 통합 컴포넌트
 */
const QuestionBankManager = () => {
  const [form] = Form.useForm();
  const [view, setView] = useState('list'); // 'list' | 'create' | 'edit' | 'viewer'
  const [currentExamId, setCurrentExamId] = useState(null);
  const [examInfo, setExamInfo] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);

  // 새 시험지 작성 화면으로 이동
  const handleCreateNew = () => {
    setView('create');
    setExamInfo(null);
    setQuestions([]);
    form.resetFields();
  };

  // 시험지 뷰어 화면으로 이동
  const handleViewExam = (exam) => {
    setView('viewer');
    setCurrentExamId(exam._id);
    setExamInfo({ examName: exam.examName, questionCount: exam.questionCount });
    setQuestions(exam.questions);
  };

  // 기존 시험지 수정 화면으로 이동
  const handleEditExam = (exam) => {
    setView('edit');
    setCurrentExamId(exam._id);
    setExamInfo({ examName: exam.examName, questionCount: exam.questionCount });
    setQuestions(exam.questions);
    form.setFieldsValue({ 
      examName: exam.examName, 
      questionCount: exam.questionCount 
    });
  };

  // 시험지 생성/초기화 (문항 수만큼 필드 생성)
  const handleGenerateFields = (values) => {
    const { examName, questionCount } = values;
    
    // 수정 모드인 경우, 문항 수가 늘어나면 기존 데이터 유지하고 추가, 줄어들면 자름
    let newQuestions = [];
    if (view === 'edit') {
      newQuestions = [...questions];
      if (questionCount > questions.length) {
        for (let i = questions.length; i < questionCount; i++) {
          newQuestions.push({ id: i + 1, content: '', explanation: '', answer: '' });
        }
      } else {
        newQuestions = newQuestions.slice(0, questionCount);
      }
    } else {
      newQuestions = Array.from({ length: questionCount }, (_, index) => ({
        id: index + 1,
        content: '',
        explanation: '',
        answer: ''
      }));
    }

    setExamInfo({ examName, questionCount });
    setQuestions(newQuestions);
    message.success(`${questionCount}개의 문항 필드가 준비되었습니다.`);
  };

  // 문항 데이터 변경
  const handleQuestionChange = (id, field, value) => {
    setQuestions(prev => prev.map(q => 
      q.id === id ? { ...q, [field]: value } : q
    ));
  };

  // DB에 저장 (Create or Update)
  const handleSaveToDb = async () => {
    if (!examInfo) return;
    
    setLoading(true);
    const payload = {
      ...examInfo,
      questions
    };

    try {
      if (view === 'edit') {
        await axios.put(`/api/exams/${currentExamId}`, payload);
        message.success('시험지가 수정되었습니다.');
      } else {
        await axios.post('/api/exams', payload);
        message.success('새 시험지가 등록되었습니다.');
      }
      setView('list');
    } catch (error) {
      console.error('[저장 실패 상세]:', error.response?.data || error.message);
      message.error(`저장에 실패했습니다: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (view === 'list') {
    return <ExamList onCreateNew={handleCreateNew} onEditExam={handleEditExam} onViewExam={handleViewExam} />;
  }

  if (view === 'viewer') {
    return (
      <ExamViewer 
        exam={{ ...examInfo, questions }} 
        onBack={() => setView('list')} 
      />
    );
  }

  return (
    <div className="question-bank-manager">
      <div className="mb-4">
        <Button icon={<ArrowLeftOutlined />} onClick={() => setView('list')}>
          목록으로 돌아가기
        </Button>
      </div>

      <Card title={view === 'edit' ? "시험지 정보 수정" : "새 시험지 정보 입력"} className="shadow-sm mb-6">
        <Form
          form={form}
          layout="inline"
          onFinish={handleGenerateFields}
        >
          <Form.Item
            name="examName"
            label="시험지 이름"
            rules={[{ required: true, message: '시험지 이름을 입력하세요!' }]}
          >
            <Input placeholder="예: 2024년 1학기 중간고사" style={{ width: 300 }} />
          </Form.Item>
          
          <Form.Item
            name="questionCount"
            label="문항 수"
            rules={[{ required: true, message: '문항 수를 입력하세요!' }]}
          >
            <InputNumber min={1} max={50} />
          </Form.Item>

          <Form.Item>
            <Button type="primary" ghost icon={<PlusOutlined />} htmlType="submit">
              필드 생성/조정
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {questions.length > 0 ? (
        <Space orientation="vertical" size="large" className="w-full">
          <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-blue-100">
            <div>
              <Title level={4} style={{ margin: 0, color: '#1e293b' }}>{examInfo.examName}</Title>
              <Text type="secondary">총 {examInfo.questionCount}문항 작성 중</Text>
            </div>
            <Button 
              type="primary" 
              size="large" 
              icon={<SaveOutlined />} 
              onClick={handleSaveToDb}
              loading={loading}
              style={{ height: '48px', padding: '0 32px' }}
            >
              {view === 'edit' ? '수정 내용 저장' : '시험지 등록하기'}
            </Button>
          </div>

          {questions.map((q) => (
            <Card 
              key={q.id} 
              title={<span className="text-blue-600">문항 {q.id}</span>} 
              className="shadow-sm border-gray-200"
            >
              <div className="mb-6">
                <Text strong className="block mb-2">문제 내용</Text>
                <RichTextEditor 
                  value={q.content} 
                  onChange={(val) => handleQuestionChange(q.id, 'content', val)}
                  placeholder="문제 내용을 입력하세요 (수식 및 이미지 지원)"
                />
              </div>

              <div className="mb-6">
                <Text strong className="block mb-2">해설</Text>
                <RichTextEditor 
                  value={q.explanation} 
                  onChange={(val) => handleQuestionChange(q.id, 'explanation', val)}
                  placeholder="해설을 입력하세요"
                />
              </div>

              <div>
                <Text strong className="block mb-2">정답</Text>
                <Input 
                  value={q.answer} 
                  onChange={(e) => handleQuestionChange(q.id, 'answer', e.target.value)}
                  placeholder="정답을 입력하세요" 
                  size="large"
                />
              </div>
            </Card>
          ))}

          <Button 
            type="primary" 
            size="large" 
            block 
            icon={<SaveOutlined />} 
            onClick={handleSaveToDb} 
            loading={loading}
            style={{ height: '56px', fontSize: '18px', marginBottom: '40px' }}
          >
            {view === 'edit' ? '수정 완료 및 저장' : '모든 문제 저장 및 등록'}
          </Button>
        </Space>
      ) : (
        <div className="text-center py-20 bg-white rounded-lg border border-dashed border-gray-300">
          <Empty description="필드 생성 버튼을 눌러 문항 입력을 시작하세요." />
        </div>
      )}
    </div>
  );
};

export default QuestionBankManager;
