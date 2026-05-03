import React, { useState, useEffect } from 'react';
import { Table, Input, Button, Card, Typography, Tag, Space, message, Modal, Tooltip, Select } from 'antd';
import { SearchOutlined, EditOutlined, DeleteOutlined, TagOutlined, EyeOutlined, PlusOutlined, PrinterOutlined, FileOutlined } from '@ant-design/icons';
import axios from 'axios';
import RichTextEditor from './RichTextEditor';
import { GRADES, DIFFICULTIES, getDifficultyColor } from '../../constants';

const { Title, Text } = Typography;

/**
 * 개별 문항 관리 컴포넌트
 */
const QuestionManager = () => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterGrade, setFilterGrade] = useState('전체');
  const [filterDifficulty, setFilterDifficulty] = useState('전체');
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [isViewModalVisible, setIsViewModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isRenameModalVisible, setIsRenameModalVisible] = useState(false);
  const [editForm, setEditForm] = useState({ content: '', explanation: '', answer: '', tags: [], difficulty: '중', grade: '' });
  const [renameForm, setRenameForm] = useState({ oldTag: '', newTag: '' });

  const fetchQuestions = async (searchVal = '', grade = '전체', difficulty = '전체') => {
    setLoading(true);
    try {
      let url = `/api/questions?search=${encodeURIComponent(searchVal || '')}`;
      if (grade && grade !== '전체') url += `&grade=${encodeURIComponent(grade)}`;
      if (difficulty && difficulty !== '전체') url += `&difficulty=${encodeURIComponent(difficulty)}`;
      
      const res = await axios.get(url);
      setQuestions(res.data);
    } catch (err) {
      message.error('문항 목록을 불러오는 데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 실시간 검색 및 필터 변경 시 데이터 호출
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchQuestions(search, filterGrade, filterDifficulty);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, filterGrade, filterDifficulty]);

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/api/questions/${id}`);
      message.success('문항이 삭제되었습니다.');
      fetchQuestions(search);
    } catch (err) {
      message.error('삭제에 실패했습니다.');
    }
  };

  const handleEdit = (record) => {
    setSelectedQuestion(record);
    setEditForm({
      content: record.content,
      explanation: record.explanation,
      answer: record.answer,
      tags: record.tags || [],
      difficulty: record.difficulty || '중',
      grade: record.grade || ''
    });
    setIsEditModalVisible(true);
  };

  const handleCreateNew = () => {
    setSelectedQuestion(null);
    setEditForm({ content: '', explanation: '', answer: '', tags: [], difficulty: '중', grade: '' });
    setIsEditModalVisible(true);
  };

  const handleUpdate = async () => {
    try {
      if (selectedQuestion) {
        // 수정
        await axios.put(`/api/questions/${selectedQuestion._id}`, editForm);
        message.success('문항이 수정되었습니다.');
      } else {
        // 신규 등록
        await axios.post('/api/questions', editForm);
        message.success('새 문항이 등록되었습니다.');
      }
      setIsEditModalVisible(false);
      fetchQuestions(search);
    } catch (err) {
      message.error(selectedQuestion ? '수정에 실패했습니다.' : '등록에 실패했습니다.');
    }
  };

  const handleRenameTags = async () => {
    if (!renameForm.oldTag || !renameForm.newTag) {
      return message.warning('기존 태그와 새 태그를 모두 입력하세요.');
    }
    
    try {
      const res = await axios.patch('/api/questions/tags/rename', renameForm);
      message.success(res.data.message);
      setIsRenameModalVisible(false);
      setRenameForm({ oldTag: '', newTag: '' });
      fetchQuestions(search);
    } catch (err) {
      message.error('태그 변경에 실패했습니다.');
    }
  };

  const handlePrint = () => {
    if (!selectedQuestion) return;

    // 인쇄용 새 창 열기
    const printWindow = window.open('', '_blank');
    const content = selectedQuestion.content;
    const answer = selectedQuestion.answer;
    const explanation = selectedQuestion.explanation;

    printWindow.document.write(`
      <html>
        <head>
          <title>문항 인쇄</title>
          <style>
            body { font-family: 'Malgun Gothic', sans-serif; padding: 40px; line-height: 1.6; }
            .section { margin-bottom: 30px; border-bottom: 1px solid #eee; padding-bottom: 20px; }
            .label { font-weight: bold; font-size: 18px; color: #333; margin-bottom: 10px; display: block; }
            .content-box { padding: 15px; background: #fff; }
            .answer-box { font-weight: bold; font-size: 20px; color: #1890ff; }
            img { max-width: 100%; height: auto; }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="section">
            <span class="label">[문제]</span>
            <div class="content-box">${content}</div>
          </div>
          <div class="section">
            <span class="label">[정답]</span>
            <div class="content-box answer-box">${answer}</div>
          </div>
          <div class="section">
            <span class="label">[해설]</span>
            <div class="content-box">${explanation || '해설 없음'}</div>
          </div>
          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleExportHwp = async (id) => {
    try {
      message.loading({ content: '문항 이미지 분석 및 문서 생성 중...', key: 'export_hwp', duration: 0 });
      const response = await axios.get(`/api/export/questions/${id}/hwp`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `question_${id}.docx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      message.success({ content: '다운로드 완료! (한글에서 열어주세요)', key: 'export_hwp' });
    } catch (err) {
      console.error('Export error:', err);
      message.error({ content: '문서 생성에 실패했습니다. (Gemini API 키 확인 필요)', key: 'export_hwp' });
    }
  };

  const columns = [
    {
      title: '문항 내용 (일부)',
      dataIndex: 'content',
      key: 'content',
      width: '40%',
      render: (content) => (
        <div 
          style={{ 
            maxHeight: '60px', 
            overflow: 'hidden', 
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical'
          }}
          dangerouslySetInnerHTML={{ __html: content }}
        />
      )
    },
    {
      title: '학년',
      dataIndex: 'grade',
      key: 'grade',
      width: '80px',
      render: (grade) => grade ? <Tag color="cyan">{grade}</Tag> : '-'
    },
    {
      title: '난이도',
      dataIndex: 'difficulty',
      key: 'difficulty',
      width: '80px',
      render: (difficulty) => (
        <Tag color={getDifficultyColor(difficulty)}>{difficulty}</Tag>
      )
    },
    {
      title: '태그 (시험지)',
      dataIndex: 'tags',
      key: 'tags',
      render: (tags) => (
        <>
          {tags?.map(tag => (
            <Tag 
              color="blue" 
              key={tag} 
              icon={<TagOutlined />} 
              style={{ marginBottom: '4px', cursor: 'pointer' }}
              onClick={() => handleSearch(tag)}
            >
              {tag}
            </Tag>
          ))}
        </>
      )
    },
    {
      title: '작성자',
      dataIndex: 'authorName',
      key: 'authorName',
      render: (name) => <Tag color="geekblue">{name || '관리자'}</Tag>
    },
    {
      title: '관리',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Tooltip title="크게 보기">
            <Button 
              icon={<EyeOutlined />} 
              onClick={() => {
                setSelectedQuestion(record);
                setIsViewModalVisible(true);
              }} 
            />
          </Tooltip>
          <Tooltip title="수정">
            <Button 
              icon={<EditOutlined />} 
              onClick={() => handleEdit(record)} 
            />
          </Tooltip>
          <Tooltip title="한글(DOCX) 내보내기">
            <Button 
              icon={<FileOutlined />} 
              onClick={() => handleExportHwp(record._id)} 
            />
          </Tooltip>
          <Tooltip title="삭제">
            <Button 
              danger 
              icon={<DeleteOutlined />} 
              onClick={() => handleDelete(record._id)} 
            />
          </Tooltip>
        </Space>
      )
    }
  ];

  return (
    <Card 
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <TagOutlined />
            <span>개별 문항 관리 (총 {questions.length}개)</span>
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              size="small"
              onClick={handleCreateNew}
            >
              문항 추가
            </Button>
          </Space>
          <Space>
            <Select
              value={filterGrade}
              onChange={setFilterGrade}
              style={{ width: 100 }}
              options={[{ value: '전체', label: '모든 학년' }, ...GRADES]}
            />
            <Select
              value={filterDifficulty}
              onChange={setFilterDifficulty}
              style={{ width: 100 }}
              options={[{ value: '전체', label: '모든 난이도' }, ...DIFFICULTIES]}
            />
            <Input
              placeholder="문항 내용, 정답, 해설, 태그 검색"
              prefix={<SearchOutlined />}
              value={search}
              onChange={handleSearchChange}
              style={{ width: 250 }}
              allowClear
            />
            <Button 
              icon={<TagOutlined />} 
              onClick={() => setIsRenameModalVisible(true)}
            >
              태그 일괄 변경
            </Button>
          </Space>
        </div>
      }
      className="shadow-md"
    >
      <Table 
        columns={columns} 
        dataSource={questions} 
        rowKey="_id" 
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      {/* 문항 상세 보기 모달 */}
      <Modal
        title="문항 상세 정보"
        open={isViewModalVisible}
        onCancel={() => setIsViewModalVisible(false)}
        footer={[
          <Button 
            key="print" 
            icon={<PrinterOutlined />} 
            onClick={handlePrint}
          >
            인쇄하기
          </Button>,
          <Button 
            key="export" 
            icon={<FileOutlined />} 
            onClick={() => handleExportHwp(selectedQuestion._id)}
          >
            한글(DOCX) 추출
          </Button>,
          <Button key="close" type="primary" onClick={() => setIsViewModalVisible(false)}>
            닫기
          </Button>
        ]}
        width={800}
      >
        {selectedQuestion && (
          <div style={{ padding: '20px 0' }}>
            <div style={{ marginBottom: '24px' }}>
              <Text strong style={{ fontSize: '16px', display: 'block', marginBottom: '8px' }}>[문제 내용]</Text>
              <div 
                className="p-4 bg-gray-50 rounded-lg border"
                dangerouslySetInnerHTML={{ __html: selectedQuestion.content }} 
              />
            </div>
            
            <div style={{ marginBottom: '24px' }}>
              <Text strong style={{ fontSize: '16px', display: 'block', marginBottom: '8px' }}>[정답]</Text>
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                {selectedQuestion.answer}
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <Text strong style={{ fontSize: '16px', display: 'block', marginBottom: '8px' }}>[해설]</Text>
              <div 
                className="p-4 bg-gray-50 rounded-lg border"
                dangerouslySetInnerHTML={{ __html: selectedQuestion.explanation }} 
              />
            </div>

            <div>
              <Text strong style={{ fontSize: '16px', display: 'block', marginBottom: '8px' }}>[난이도]</Text>
              <Tag color={getDifficultyColor(selectedQuestion.difficulty)}>
                {selectedQuestion.difficulty || '중'}
              </Tag>
            </div>

            {selectedQuestion.grade && (
              <div>
                <Text strong style={{ fontSize: '16px', display: 'block', marginBottom: '8px' }}>[학년]</Text>
                <Tag color="cyan">{selectedQuestion.grade}</Tag>
              </div>
            )}

            <div>
              <Text strong style={{ fontSize: '16px', display: 'block', marginBottom: '8px' }}>[관련 태그]</Text>
              <Space wrap>
                {selectedQuestion.tags?.map(tag => (
                  <Tag color="blue" key={tag}>{tag}</Tag>
                ))}
              </Space>
            </div>
          </div>
        )}
      </Modal>

      {/* 문항 수정/추가 모달 */}
      <Modal
        title={selectedQuestion ? "문항 수정" : "새 문항 추가"}
        open={isEditModalVisible}
        onOk={handleUpdate}
        onCancel={() => setIsEditModalVisible(false)}
        okText="저장"
        cancelText="취소"
        width={800}
      >
        <div style={{ padding: '10px 0' }}>
          <div className="mb-6">
            <Text strong className="block mb-2">문제 내용</Text>
            <RichTextEditor 
              value={editForm.content} 
              onChange={(val) => setEditForm(prev => ({ ...prev, content: val }))}
              placeholder="문제 내용을 입력하세요"
            />
          </div>

          <div className="mb-6">
            <Text strong className="block mb-2">정답</Text>
            <Input 
              value={editForm.answer} 
              onChange={(e) => setEditForm(prev => ({ ...prev, answer: e.target.value }))}
              placeholder="정답을 입력하세요" 
            />
          </div>

          <div className="mb-4">
            <Text strong className="block mb-2">해설</Text>
            <RichTextEditor 
              value={editForm.explanation} 
              onChange={(val) => setEditForm(prev => ({ ...prev, explanation: val }))}
              placeholder="해설을 입력하세요"
            />
          </div>

          <div style={{ display: 'flex', gap: '20px' }} className="mb-4">
            <div style={{ flex: 1 }}>
              <Text strong className="block mb-2">학년</Text>
              <Select
                style={{ width: '100%' }}
                placeholder="학년 선택"
                value={editForm.grade}
                onChange={(val) => setEditForm(prev => ({ ...prev, grade: val }))}
                options={GRADES}
              />
            </div>
            <div style={{ width: 120 }}>
              <Text strong className="block mb-2">난이도</Text>
              <Select
                style={{ width: '100%' }}
                value={editForm.difficulty}
                onChange={(val) => setEditForm(prev => ({ ...prev, difficulty: val }))}
                options={DIFFICULTIES}
              />
            </div>
          </div>

          <div className="mb-2">
            <Text strong className="block mb-2">태그</Text>
            <Select
              mode="tags"
              style={{ width: '100%' }}
              placeholder="태그를 입력하고 엔터를 누르세요"
              value={editForm.tags}
              onChange={(tags) => setEditForm(prev => ({ ...prev, tags }))}
              tokenSeparators={[',']}
            />
          </div>
        </div>
      </Modal>

      {/* 태그 일괄 변경 모달 */}
      <Modal
        title="태그 일괄 명칭 변경"
        open={isRenameModalVisible}
        onOk={handleRenameTags}
        onCancel={() => setIsRenameModalVisible(false)}
        okText="일괄 변경"
        cancelText="취소"
        width={400}
      >
        <div style={{ padding: '10px 0' }}>
          <Typography.Paragraph type="secondary">
            특정 태그가 포함된 모든 문항의 태그 명칭을 한꺼번에 바꿉니다.
          </Typography.Paragraph>
          <div className="mb-4">
            <Text strong className="block mb-2">기존 태그 명칭</Text>
            <Input 
              value={renameForm.oldTag} 
              onChange={(e) => setRenameForm(prev => ({ ...prev, oldTag: e.target.value }))}
              placeholder="예: 중간고사" 
            />
          </div>
          <div className="mb-2">
            <Text strong className="block mb-2">변경할 새 명칭</Text>
            <Input 
              value={renameForm.newTag} 
              onChange={(e) => setRenameForm(prev => ({ ...prev, newTag: e.target.value }))}
              placeholder="예: 2024년 1학기 중간" 
            />
          </div>
        </div>
      </Modal>
    </Card>
  );
};

export default QuestionManager;
