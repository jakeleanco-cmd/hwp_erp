import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Card, Typography, message, Popconfirm, Tag } from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined, FileTextOutlined, EyeOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Title } = Typography;

const ExamList = ({ onCreateNew, onEditExam, onViewExam }) => {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchExams = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/exams');
      setExams(response.data);
    } catch (error) {
      console.error('시험지 목록 조회 실패:', error.response?.data || error.message);
      message.error('시험지 목록을 불러오는 데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/api/exams/${id}`);
      message.success('시험지가 삭제되었습니다.');
      fetchExams();
    } catch (error) {
      message.error('삭제에 실패했습니다.');
    }
  };

  const columns = [
    {
      title: '시험지 이름',
      dataIndex: 'examName',
      key: 'examName',
      render: (text) => <span style={{ fontWeight: 500 }}>{text}</span>,
    },
    {
      title: '문항 수',
      dataIndex: 'questionCount',
      key: 'questionCount',
      render: (count) => <Tag color="blue">{count}문항</Tag>,
    },
    {
      title: '생성일',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => new Date(date).toLocaleDateString(),
    },
    {
      title: '관리',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button 
            icon={<EyeOutlined />} 
            onClick={() => onViewExam(record)}
          >
            보기
          </Button>
          <Button 
            icon={<EditOutlined />} 
            onClick={() => onEditExam(record)}
          >
            수정
          </Button>
          <Popconfirm
            title="정말 삭제하시겠습니까?"
            onConfirm={() => handleDelete(record._id)}
            okText="예"
            cancelText="아니오"
          >
            <Button icon={<DeleteOutlined />} danger>
              삭제
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card 
      title={
        <div className="flex justify-between items-center">
          <Space>
            <FileTextOutlined />
            <span>등록된 시험지 목록</span>
          </Space>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={onCreateNew}
          >
            새 시험지 등록
          </Button>
        </div>
      }
      className="shadow-md"
    >
      <Table 
        columns={columns} 
        dataSource={exams} 
        rowKey="_id" 
        loading={loading}
        pagination={{ pageSize: 10 }}
      />
    </Card>
  );
};

export default ExamList;
