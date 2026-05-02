import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Card, Typography, message, Popconfirm, Tag } from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined, FileTextOutlined, EyeOutlined, UserSwitchOutlined } from '@ant-design/icons';
import axios from 'axios';
import { useAuthStore } from '../../store/authStore';
import { Modal, Select } from 'antd';

const { Title } = Typography;

const ExamList = ({ onCreateNew, onEditExam, onViewExam }) => {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [isAuthorModalVisible, setIsAuthorModalVisible] = useState(false);
  const [selectedExam, setSelectedExam] = useState(null);
  const [newAuthor, setNewAuthor] = useState(null);
  
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

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

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/api/admins/all-users');
      setUsers(response.data);
    } catch (error) {
      console.error('사용자 목록 조회 실패:', error);
    }
  };

  const handleOpenAuthorModal = (exam) => {
    setSelectedExam(exam);
    setNewAuthor(exam.createdBy);
    fetchUsers();
    setIsAuthorModalVisible(true);
  };

  const handleChangeAuthor = async () => {
    if (!newAuthor) return;
    const authorUser = users.find(u => u.id === newAuthor);
    
    try {
      await axios.put(`/api/exams/${selectedExam._id}`, {
        createdBy: authorUser.id,
        authorName: authorUser.name
      });
      message.success('작성자가 변경되었습니다.');
      setIsAuthorModalVisible(false);
      fetchExams();
    } catch (error) {
      message.error('작성자 변경에 실패했습니다.');
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
      title: '작성자',
      dataIndex: 'authorName',
      key: 'authorName',
      render: (text) => text ? <Tag color="geekblue">{text}</Tag> : <Tag color="default">공용/관리자</Tag>,
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
          {isAdmin && (
            <Button 
              icon={<UserSwitchOutlined />} 
              onClick={() => handleOpenAuthorModal(record)}
            >
              작성자 변경
            </Button>
          )}
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

      <Modal
        title="시험지 작성자 변경"
        open={isAuthorModalVisible}
        onOk={handleChangeAuthor}
        onCancel={() => setIsAuthorModalVisible(false)}
        okText="변경"
        cancelText="취소"
      >
        <div className="py-4">
          <Typography.Paragraph>
            <strong>시험지:</strong> {selectedExam?.examName}
          </Typography.Paragraph>
          <Typography.Text>새 작성자 선택:</Typography.Text>
          <Select
            className="w-full mt-2"
            placeholder="사용자 선택"
            value={newAuthor}
            onChange={setNewAuthor}
            showSearch
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            options={users.map(u => ({
              value: u.id,
              label: `${u.name} (${u.role})`
            }))}
          />
        </div>
      </Modal>
    </Card>
  );
};

export default ExamList;
