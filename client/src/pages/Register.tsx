// 注册页
import React from 'react';
import { Card, Form, Input, Button, Typography, Space, message } from 'antd';
import { UserOutlined, LockOutlined, PhoneOutlined, UserAddOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../services/AuthContext';

const { Title, Text } = Typography;

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(false);

  const onFinish = async (values: { email: string; username: string; password: string; confirm?: string; phone?: string }) => {
    if (values.password !== values.confirm) {
      message.error('两次输入的密码不一致'); return;
    }
    setLoading(true);
    try {
      await register({ email: values.email, username: values.username, password: values.password, phone: values.phone });
      message.success('注册成功！');
      navigate('/');
    } catch (err: any) {
      message.error(err.response?.data?.message || '注册失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    }}>
      <Card style={{ width: 420, boxShadow: '0 8px 32px rgba(0,0,0,0.15)', borderRadius: 12 }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }} align="center">
          <div style={{ textAlign: 'center' }}>
            <Title level={3} style={{ marginBottom: 4 }}>创建账号</Title>
            <Text type="secondary">注册成为 CAD 审核系统用户</Text>
          </div>

          <Form name="register" onFinish={onFinish} size="large">
            <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }, { min: 2, max: 30 }]}>
              <Input prefix={<UserOutlined />} placeholder="用户名" />
            </Form.Item>
            <Form.Item name="email" rules={[{ required: true, type: 'email', message: '请输入有效的邮箱' }]}>
              <Input prefix={<UserOutlined />} placeholder="邮箱地址（用于登录）" />
            </Form.Item>
            <Form.Item name="phone" rules={[{ pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号' }]}>
              <Input prefix={<PhoneOutlined />} placeholder="手机号（选填）" />
            </Form.Item>
            <Form.Item name="password" rules={[{ required: true, min: 6, message: '密码至少6位' }]}>
              <Input.Password prefix={<LockOutlined />} placeholder="设置密码" />
            </Form.Item>
            <Form.Item name="confirm" rules={[{ required: true, message: '请确认密码' }]}>
              <Input.Password prefix={<LockOutlined />} placeholder="确认密码" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block icon={<UserAddOutlined />}>
                注 册
              </Button>
            </Form.Item>
          </Form>

          <Text type="secondary">
            已有账号？<Link to="/login">返回登录</Link>
          </Text>
        </Space>
      </Card>
    </div>
  );
}
