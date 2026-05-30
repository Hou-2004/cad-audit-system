// 登录页
import React from 'react';
import { Card, Form, Input, Button, Typography, Space, message } from 'antd';
import { UserOutlined, LockOutlined, LoginOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../services/AuthContext';

const { Title, Text } = Typography;

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(false);

  const onFinish = async (values: { account: string; password: string }) => {
    setLoading(true);
    try {
      await login(values.account, values.password);
      message.success('登录成功！');
      navigate('/');
    } catch (err: any) {
      message.error(err.response?.data?.message || '登录失败');
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
            <Title level={2} style={{ marginBottom: 4 }}>CAD 文件规范审核系统</Title>
            <Text type="secondary">登录以继续使用</Text>
          </div>

          <Form name="login" onFinish={onFinish} size="large">
            <Form.Item name="account" rules={[{ required: true, message: '请输入邮箱或手机号' }]}>
              <Input prefix={<UserOutlined />} placeholder="邮箱或手机号" />
            </Form.Item>
            <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
              <Input.Password prefix={<LockOutlined />} placeholder="密码" onPressEnter={() => {}} />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block icon={<LoginOutlined />}>
                登 录
              </Button>
            </Form.Item>
          </Form>

          <Text type="secondary">
            还没有账号？<Link to="/register">立即注册</Link>
          </Text>

          <div style={{ textAlign: 'center', marginTop: 16, padding: '8px 12px', background: '#f6f8fa', borderRadius: 8 }}>
            <Text type="secondary" style={{ fontSize: 11 }}>管理员: admin@cad-audit.com</Text><br/>
            <Text type="secondary" style={{ fontSize: 11 }}>工作者: worker1@cad-audit.com</Text><br/>
            <Text strong style={{ fontSize: 11, color: '#1677ff' }}>统一密码: Cad@2026</Text>
          </div>
        </Space>
      </Card>
    </div>
  );
}
