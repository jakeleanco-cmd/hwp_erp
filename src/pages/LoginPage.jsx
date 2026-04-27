import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, Typography, message, Tabs } from 'antd';
import { UserOutlined, LockOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const { Title, Text } = Typography;

/**
 * 로그인 및 최초 관리자 가입 페이지
 */
const LoginPage = () => {
  const [hasAdmin, setHasAdmin] = useState(true);
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((state) => state.setAuth);
  const navigate = useNavigate();
  const location = useLocation();

  // 로그인 후 리다이렉트할 경로 (기본값: '/')
  const from = location.state?.from?.pathname || '/';

  // 서버에 관리자가 등록되어 있는지 확인
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const res = await axios.get('/api/auth/has-admin');
        setHasAdmin(res.data.hasAdmin);
      } catch (err) {
        console.error('관리자 확인 실패:', err);
      }
    };
    checkAdmin();
  }, []);

  // 로그인 처리
  const onLogin = async (values) => {
    setLoading(true);
    try {
      const res = await axios.post('/api/auth/login', values);
      const { token, admin } = res.data;
      setAuth(token, admin);
      message.success(`${admin.name}님, 환영합니다!`);
      navigate(from, { replace: true });
    } catch (err) {
      message.error(err.response?.data?.message || '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 최초 관리자 등록 처리
  const onRegister = async (values) => {
    setLoading(true);
    try {
      const res = await axios.post('/api/auth/register-first', values);
      const { token, admin } = res.data;
      setAuth(token, admin);
      message.success('관리자 등록 및 로그인이 완료되었습니다!');
      navigate('/');
    } catch (err) {
      message.error(err.response?.data?.message || '등록에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh',
      background: '#f0f2f5'
    }}>
      <Card style={{ width: 400, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={2} style={{ marginBottom: 8 }}>HWP ERP</Title>
          <Text type="secondary">관리 시스템 로그인</Text>
        </div>

        {!hasAdmin ? (
          <div style={{ border: '1px solid #ffe58f', background: '#fffbe6', padding: '12px', marginBottom: 20, borderRadius: 4 }}>
            <Text type="warning" strong>⚠️ 등록된 관리자가 없습니다.</Text><br/>
            <Text type="secondary" size="small">최초 관리자를 등록해 주세요. (가입 코드 필요)</Text>
          </div>
        ) : null}

        <Tabs 
          activeKey={!hasAdmin ? 'register' : 'login'}
          items={[
            {
              key: 'login',
              label: '로그인',
              disabled: !hasAdmin,
              children: (
                <Form onFinish={onLogin} layout="vertical">
                  <Form.Item name="email" rules={[{ required: true, type: 'email', message: '이메일을 입력하세요.' }]}>
                    <Input prefix={<UserOutlined />} placeholder="이메일" size="large" />
                  </Form.Item>
                  <Form.Item name="password" rules={[{ required: true, message: '비밀번호를 입력하세요.' }]}>
                    <Input.Password prefix={<LockOutlined />} placeholder="비밀번호" size="large" />
                  </Form.Item>
                  <Form.Item>
                    <Button type="primary" htmlType="submit" block size="large" loading={loading}>
                      로그인
                    </Button>
                  </Form.Item>
                </Form>
              )
            },
            {
              key: 'register',
              label: '최초 등록',
              disabled: hasAdmin,
              children: (
                <Form onFinish={onRegister} layout="vertical">
                  <Form.Item name="name" rules={[{ required: true, message: '이름을 입력하세요.' }]}>
                    <Input placeholder="관리자 이름" size="large" />
                  </Form.Item>
                  <Form.Item name="email" rules={[{ required: true, type: 'email', message: '이메일을 입력하세요.' }]}>
                    <Input prefix={<UserOutlined />} placeholder="이메일" size="large" />
                  </Form.Item>
                  <Form.Item name="password" rules={[{ required: true, message: '비밀번호를 입력하세요.' }]}>
                    <Input.Password prefix={<LockOutlined />} placeholder="비밀번호" size="large" />
                  </Form.Item>
                  <Form.Item name="registrationCode" rules={[{ required: true, message: '가입 코드를 입력하세요.' }]}>
                    <Input prefix={<SafetyCertificateOutlined />} placeholder="가입 코드" size="large" />
                  </Form.Item>
                  <Form.Item>
                    <Button type="primary" htmlType="submit" block size="large" loading={loading} danger>
                      관리자 등록하기
                    </Button>
                  </Form.Item>
                </Form>
              )
            }
          ]}
        />
      </Card>
    </div>
  );
};

export default LoginPage;
