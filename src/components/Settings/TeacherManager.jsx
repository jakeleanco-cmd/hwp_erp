import React, { useState, useEffect } from 'react';
import { Card, Button, Table, Space, Tag, Modal, Form, Input, message, Popconfirm, Checkbox, Divider } from 'antd';
import { UserAddOutlined, TeamOutlined, DeleteOutlined, StopOutlined, CheckCircleOutlined, SettingOutlined, EditOutlined } from '@ant-design/icons';
import axios from 'axios';

const TeacherManager = () => {
  const [teachersList, setTeachersList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isPermModalVisible, setIsPermModalVisible] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [permForm] = Form.useForm();

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/teachers');
      setTeachersList(response.data);
    } catch (error) {
      message.error('선생님 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTeacher = async (values) => {
    try {
      await axios.post('/api/teachers', values);
      message.success('선생님 계정이 생성되었습니다.');
      setIsModalVisible(false);
      form.resetFields();
      fetchTeachers();
    } catch (error) {
      message.error(error.response?.data?.message || '계정 생성에 실패했습니다.');
    }
  };

  const handleEditTeacher = async (values) => {
    try {
      await axios.patch(`/api/teachers/${selectedTeacher._id}`, values);
      message.success('선생님 정보가 수정되었습니다.');
      setIsEditModalVisible(false);
      editForm.resetFields();
      fetchTeachers();
    } catch (error) {
      message.error(error.response?.data?.message || '정보 수정에 실패했습니다.');
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      await axios.patch(`/api/teachers/${id}/toggle-status`);
      message.success('계정 상태가 변경되었습니다.');
      fetchTeachers();
    } catch (error) {
      message.error('상태 변경에 실패했습니다.');
    }
  };

  const handleOpenEdit = (record) => {
    setSelectedTeacher(record);
    editForm.setFieldsValue({
      name: record.name,
      teacherId: record.teacherId,
      subject: record.subject,
      password: '', // 비밀번호는 보안상 비워둠
    });
    setIsEditModalVisible(true);
  };

  const handleOpenPermissions = (record) => {
    setSelectedTeacher(record);
    permForm.setFieldsValue({
      canImportHwp: record.permissions?.canImportHwp || false,
      canUseMathEditor: record.permissions?.canUseMathEditor || false,
      canManageQuestionBank: record.permissions?.canManageQuestionBank !== false, // 기본값이 true
    });
    setIsPermModalVisible(true);
  };

  const handleUpdatePermissions = async (values) => {
    try {
      await axios.patch(`/api/teachers/${selectedTeacher._id}/permissions`, {
        permissions: values
      });
      message.success('권한이 수정되었습니다.');
      setIsPermModalVisible(false);
      fetchTeachers();
    } catch (error) {
      message.error('권한 수정에 실패했습니다.');
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/api/teachers/${id}`);
      message.success('계정이 삭제되었습니다.');
      fetchTeachers();
    } catch (error) {
      message.error('계정 삭제에 실패했습니다.');
    }
  };

  const columns = [
    {
      title: '이름',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <strong>{text}</strong>,
    },
    {
      title: '아이디',
      dataIndex: 'teacherId',
      key: 'teacherId',
    },
    {
      title: '과목',
      dataIndex: 'subject',
      key: 'subject',
    },
    {
      title: '상태',
      key: 'isActive',
      dataIndex: 'isActive',
      render: (isActive) => (
        isActive ? 
          <Tag color="success" icon={<CheckCircleOutlined />}>활성</Tag> : 
          <Tag color="error" icon={<StopOutlined />}>정지됨</Tag>
      ),
    },
    {
      title: '가입일',
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
          <Button 
            type="text" 
            size="small"
            icon={<SettingOutlined />}
            onClick={() => handleOpenPermissions(record)}
          >
            권한 설정
          </Button>
          <Button 
            type="text" 
            size="small"
            onClick={() => handleToggleStatus(record._id)}
            style={{ color: record.isActive ? '#cf1322' : '#52c41a' }}
          >
            {record.isActive ? '계정 정지' : '계정 활성'}
          </Button>
          <Popconfirm
            title="정말 삭제하시겠습니까?"
            description="삭제 후에는 복구할 수 없습니다."
            onConfirm={() => handleDelete(record._id)}
            okText="삭제"
            cancelText="취소"
            okButtonProps={{ danger: true }}
          >
            <Button type="text" danger size="small" icon={<DeleteOutlined />}>삭제</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card 
      title={
        <Space>
          <TeamOutlined style={{ color: '#1890ff' }} />
          <span>선생님 계정 관리</span>
        </Space>
      }
      extra={
        <Button 
          type="primary" 
          icon={<UserAddOutlined />} 
          onClick={() => setIsModalVisible(true)}
        >
          새 선생님 등록
        </Button>
      }
      className="shadow-md mt-6"
    >
      <Table 
        columns={columns} 
        dataSource={teachersList} 
        rowKey="_id"
        loading={loading}
        pagination={{ pageSize: 5 }}
      />

      <Modal
        title="새 선생님 등록"
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        okText="등록"
        cancelText="취소"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleAddTeacher}
        >
          <Form.Item
            name="name"
            label="이름"
            rules={[{ required: true, message: '선생님 이름을 입력해주세요.' }]}
          >
            <Input placeholder="홍길동" />
          </Form.Item>
          <Form.Item
            name="teacherId"
            label="접속 아이디"
            rules={[
              { required: true, message: '접속 아이디를 입력해주세요.' },
              { min: 4, message: '아이디는 4자 이상이어야 합니다.' }
            ]}
          >
            <Input placeholder="teacher01" />
          </Form.Item>
          <Form.Item
            name="password"
            label="비밀번호"
            rules={[
              { required: true, message: '비밀번호를 입력해주세요.' },
              { min: 4, message: '비밀번호는 4자 이상이어야 합니다.' }
            ]}
          >
            <Input.Password placeholder="임시 비밀번호를 설정해주세요" />
          </Form.Item>
          <Form.Item
            name="subject"
            label="담당 과목"
            initialValue="수학"
          >
            <Input />
          </Form.Item>
          
          <Divider orientation="left">기본 권한 설정</Divider>
          <Form.Item name={['permissions', 'canImportHwp']} valuePropName="checked" initialValue={false}>
            <Checkbox>문제 가져오기 (HWP)</Checkbox>
          </Form.Item>
          <Form.Item name={['permissions', 'canUseMathEditor']} valuePropName="checked" initialValue={false}>
            <Checkbox>수식 편집기</Checkbox>
          </Form.Item>
          <Form.Item name={['permissions', 'canManageQuestionBank']} valuePropName="checked" initialValue={true}>
            <Checkbox>시험지 관리</Checkbox>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="선생님 정보 수정"
        open={isEditModalVisible}
        onCancel={() => {
          setIsEditModalVisible(false);
          editForm.resetFields();
        }}
        onOk={() => editForm.submit()}
        okText="수정 완료"
        cancelText="취소"
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleEditTeacher}
        >
          <Form.Item
            name="name"
            label="이름"
            rules={[{ required: true, message: '선생님 이름을 입력해주세요.' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="teacherId"
            label="접속 아이디"
            extra="아이디 변경 시 선생님이 기존 아이디로 로그인할 수 없게 되므로 주의하세요."
            rules={[
              { required: true, message: '접속 아이디를 입력해주세요.' },
              { min: 4, message: '아이디는 4자 이상이어야 합니다.' }
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="password"
            label="비밀번호 변경"
            extra="변경 시에만 입력하세요. 비워두면 기존 비밀번호가 유지됩니다."
            rules={[{ min: 4, message: '비밀번호는 4자 이상이어야 합니다.' }]}
          >
            <Input.Password placeholder="새 비밀번호 (선택 사항)" />
          </Form.Item>
          <Form.Item
            name="subject"
            label="담당 과목"
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`${selectedTeacher?.name || ''} 선생님 권한 설정`}
        open={isPermModalVisible}
        onCancel={() => setIsPermModalVisible(false)}
        onOk={() => permForm.submit()}
        okText="저장"
        cancelText="취소"
      >
        <Form
          form={permForm}
          layout="vertical"
          onFinish={handleUpdatePermissions}
        >
          <Form.Item name="canImportHwp" valuePropName="checked">
            <Checkbox>문제 가져오기 (HWP) 접근 권한</Checkbox>
          </Form.Item>
          <Form.Item name="canUseMathEditor" valuePropName="checked">
            <Checkbox>수식 편집기 사용 권한</Checkbox>
          </Form.Item>
          <Form.Item name="canManageQuestionBank" valuePropName="checked">
            <Checkbox>시험지 관리 권한</Checkbox>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default TeacherManager;
