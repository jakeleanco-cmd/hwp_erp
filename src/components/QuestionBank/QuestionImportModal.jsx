import React, { useState, useEffect } from 'react';
import { Modal, Input, Table, Tag, Button, message } from 'antd';
import axios from 'axios';
import { getDifficultyColor } from '../../constants';

/**
 * 기존 문항 가져오기 모달 컴포넌트
 */
const QuestionImportModal = ({ visible, onCancel, onSelect }) => {
  const [existingQuestions, setExistingQuestions] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchExistingQuestions = async (searchVal = '') => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/questions?search=${encodeURIComponent(searchVal)}`);
      setExistingQuestions(res.data);
    } catch (err) {
      message.error('문항 목록을 불러오는 데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      fetchExistingQuestions('');
    }
  }, [visible]);

  const columns = [
    {
      title: '문항 내용',
      dataIndex: 'content',
      key: 'content',
      width: '50%',
      render: (content) => (
        <div 
          style={{ maxHeight: '60px', overflow: 'hidden', textOverflow: 'ellipsis' }}
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
      title: '태그',
      dataIndex: 'tags',
      key: 'tags',
      render: (tags) => tags?.slice(0, 2).map(t => <Tag key={t} color="blue">{t}</Tag>)
    },
    {
      title: '선택',
      key: 'select',
      render: (_, record) => (
        <Button type="link" onClick={() => onSelect(record)}>
          가져오기
        </Button>
      )
    }
  ];

  return (
    <Modal
      title="기존 문항에서 가져오기"
      open={visible}
      onCancel={onCancel}
      width={800}
      footer={null}
    >
      <div style={{ marginBottom: '16px' }}>
        <Input.Search
          placeholder="문항 내용이나 태그로 검색"
          onSearch={fetchExistingQuestions}
          enterButton
          loading={loading}
        />
      </div>
      <Table
        dataSource={existingQuestions}
        rowKey="_id"
        loading={loading}
        pagination={{ pageSize: 5 }}
        columns={columns}
      />
    </Modal>
  );
};

export default QuestionImportModal;
