import React, { useState, useEffect } from 'react';
import { Card, Button, Table, Space, Modal, Form, Input, message, Popconfirm, Tag } from 'antd';
import { UserAddOutlined, TeamOutlined, DeleteOutlined, EditOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import axios from 'axios';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';

const AdminManager = () => {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/admins');
      setAdmins(response.data);
    } catch (error) {
      message.error('관리자 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAdmin = async (values) => {
    try {
      await axios.post('/api/admins', values);
      message.success('새 관리자가 등록되었습니다.');
      setIsModalVisible(false);
      form.resetFields();
      fetchAdmins();
    } catch (error) {
      message.error(error.response?.data?.message || '관리자 등록에 실패했습니다.');
    }
  };

  const handleEditAdmin = async (values) => {
    try {
      await axios.patch(`/api/admins/${selectedAdmin._id}`, values);
      message.success('관리자 정보가 수정되었습니다.');
      
      // 본인 정보가 변경된 경우 자동 로그아웃
      if (selectedAdmin._id === user.id) {
        message.info('본인 정보가 변경되어 보안을 위해 다시 로그인해야 합니다.', 3);
        setTimeout(() => {
          logout();
          navigate('/login');
        }, 1500);
      } else {
        setIsEditModalVisible(false);
        editForm.resetFields();
        fetchAdmins();
      }
    } catch (error) {
      message.error(error.response?.data?.message || '정보 수정에 실패했습니다.');
    }
  };

  const handleOpenEdit = (record) => {
    setSelectedAdmin(record);
    editForm.setFieldsValue({
      name: record.name,
      adminId: record.adminId,
      password: '',
    });
    setIsEditModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/api/admins/${id}`);
      message.success('관리자가 삭제되었습니다.');
      fetchAdmins();
    } catch (error) {
      message.error(error.response?.data?.message || '삭제에 실패했습니다.');
    }
  };

  const columns = [
    {
      title: '이름',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          <strong>{text}</strong>
          {record._id === user.id && <Tag color="blue">나</Tag>}
        </Space>
      ),
    },
    {
      title: '아이디',
      dataIndex: 'adminId',
      key: 'adminId',
    },
    {
      title: '등록일',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => new Date(date).toLocaleDateString('ko-KR'),
    },
    {
      title: '관리',
      key: 'action',
      render: (_, record) => (
        <Space size="small">
          <Button 
            type="text" 
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleOpenEdit(record)}
          >
            수정
          </Button>
          <Popconfirm
            title="정말 삭제하시겠습니까?"
            disabled={record._id === user.id}
            onConfirm={() => handleDelete(record._id)}
            okText="삭제"
            cancelText="취소"
            okButtonProps={{ danger: true }}
          >
            <Button 
              type="text" 
              danger 
              size="small" 
              icon={<DeleteOutlined />}
              disabled={record._id === user.id}
            >
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
        <Space>
          <SafetyCertificateOutlined style={{ color: '#52c41a' }} />
          <span>관리자 계정 관리</span>
        </Space>
      }
      extra={
        <Button 
          type="primary" 
          icon={<UserAddOutlined />} 
          onClick={() => setIsModalVisible(true)}
        >
          새 관리자 등록
        </Button>
      }
      className="shadow-md mt-6"
    >
      <Table 
        columns={columns} 
        dataSource={admins} 
        rowKey="_id"
        loading={loading}
        pagination={false}
      />

      {/* 등록 모달 */}
      <Modal
        title="새 관리자 등록"
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        okText="등록"
        cancelText="취소"
      >
        <Form form={form} layout="vertical" onFinish={handleAddAdmin}>
          <Form.Item name="name" label="이름" rules={[{ required: true, message: '이름을 입력하세요.' }]}>
            <Input placeholder="관리자 이름" />
          </Form.Item>
          <Form.Item name="adminId" label="아이디" rules={[{ required: true, message: '아이디를 입력하세요.' }]}>
            <Input placeholder="admin01" />
          </Form.Item>
          <Form.Item name="password" label="비밀번호" rules={[{ required: true, min: 4, message: '4자 이상 입력하세요.' }]}>
            <Input.Password placeholder="비밀번호" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 수정 모달 */}
      <Modal
        title="관리자 정보 수정"
        open={isEditModalVisible}
        onCancel={() => {
          setIsEditModalVisible(false);
          editForm.resetFields();
        }}
        onOk={() => editForm.submit()}
        okText="수정 완료"
        cancelText="취소"
      >
        <Form form={editForm} layout="vertical" onFinish={handleEditAdmin}>
          <Form.Item name="name" label="이름" rules={[{ required: true, message: '이름을 입력하세요.' }]}>
            <Input />
          </Form.Item>
          <Form.Item 
            name="adminId" 
            label="아이디" 
            rules={[{ required: true, message: '아이디를 입력하세요.' }]}
            extra={selectedAdmin?._id === user.id ? "아이디 변경 시 즉시 로그아웃됩니다." : ""}
          >
            <Input />
          </Form.Item>
          <Form.Item 
            name="password" 
            label="비밀번호 변경" 
            extra="변경 시에만 입력하세요. 본인 비밀번호 변경 시 즉시 로그아웃됩니다."
            rules={[{ min: 4, message: '4자 이상 입력하세요.' }]}
          >
            <Input.Password placeholder="새 비밀번호 (선택 사항)" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default AdminManager;
