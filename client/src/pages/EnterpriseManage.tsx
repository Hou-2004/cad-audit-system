// 企业管理页
import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Typography, Space, Modal, Form, Input, Tag, message, Descriptions, Popconfirm, Tabs, Alert, Row, Col, Statistic } from 'antd';
import { PlusOutlined, TeamOutlined, UserAddOutlined, UserDeleteOutlined, CrownOutlined, GiftOutlined, PayCircleOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../services/AuthContext';
import api from '../services/api';

const { Title, Text } = Typography;

export default function EnterpriseManage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [enterprise, setEnterprise] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [subStatus, setSubStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [bindModalOpen, setBindModalOpen] = useState(false);
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [exchangeModalOpen, setExchangeModalOpen] = useState(false);
  const [bindAccount, setBindAccount] = useState('');
  const [exchangeCount, setExchangeCount] = useState(1);

  useEffect(() => {
    if (user?.enterprise_id) { fetchEnterprise(); fetchSubStatus(); }
    else checkMyEnterprise();
  }, [user?.enterprise_id]);

  const checkMyEnterprise = async () => {
    try {
      const res: any = await api.get('/enterprise/my');
      if (res.data) { setEnterprise(res.data); fetchEmployees(res.data.id); }
    } catch {}
  };

  const fetchSubStatus = async () => {
    try {
      const res: any = await api.get('/subscription/status');
      setSubStatus(res.data);
    } catch {} // 404 when no enterprise
  };

  const fetchEnterprise = async () => {
    try {
      const res: any = await api.get(`/enterprise/${user!.enterprise_id}`);
      setEnterprise(res.data); fetchEmployees(res.data.id);
    } catch {}
  };

  const fetchEmployees = async (entId: number) => {
    try {
      const res: any = await api.get(`/enterprise/${entId}/employees`);
      setEmployees(res.data || []);
    } catch {}
  };

  const handleCreate = async (values: any) => {
    try {
      const res: any = await api.post('/enterprise', values);
      message.success('企业创建成功！');
      setEnterprise(res.data); setCreateModalOpen(false);
      fetchEmployees(res.data.id);
    } catch (err: any) { message.error(err.response?.data?.message || '创建失败'); }
  };

  const handleBind = async () => {
    if (!bindAccount) { message.error('请输入邮箱或手机号'); return; }
    try {
      await api.post(`/enterprise/${enterprise.id}/employees/bind`, { account: bindAccount });
      message.success('绑定成功！'); setBindModalOpen(false); fetchEmployees(enterprise.id);
    } catch (err: any) { message.error(err.response?.data?.message || '绑定失败'); }
  };

  const handleRemoveEmployee = async (userId: number) => {
    try {
      await api.delete(`/enterprise/${enterprise.id}/employees/${userId}`);
      message.success('已移除该员工'); fetchEmployees(enterprise.id);
    } catch (err: any) { message.error(err.response?.data?.message); }
  };

  const handlePromote = async (userId: number) => {
    try {
      await api.put(`/enterprise/${enterprise.id}/employees/${userId}/promote`);
      message.success('已提升为管理员'); fetchEmployees(enterprise.id);
    } catch {}
  };

  const handleDirectRegister = async (values: any) => {
    try {
      const res: any = await api.post(`/enterprise/${enterprise.id}/employees/register`, values);
      message.success(`员工 ${values.username} 注册成功！`); setRegisterModalOpen(false); fetchEmployees(enterprise.id);
    } catch (err: any) { message.error(err.response?.data?.message); }
  };

  const handleExchange = async () => {
    try {
      await api.post(`/enterprise/${enterprise.id}/exchange-slots`, { count: exchangeCount });
      message.success(`成功兑换 ${exchangeCount} 个名额！`);
      setExchangeModalOpen(false); fetchEnterprise();
    } catch (err: any) { message.error(err.response?.data?.message); }
  };

  // 尚未创建企业
  if (!enterprise && user?.role === 'worker') {
    return (
      <div>
        <Title level={4}>企业管理</Title>
        <Card>
          <Result icon={<TeamOutlined />} title="您还没有创建企业"
                  subTitle="创建企业后可以管理员工、下发审核任务">
            <Button type="primary" size="large" onClick={() => setCreateModalOpen(true)}><PlusOutlined /> 创建企业</Button>
          </Result>

          <Modal title="创建企业" open={createModalOpen} onCancel={() => setCreateModalOpen(false)}
                 onOk={(formRef: any) => formRef?.submit()}>
            <Form layout="vertical" onFinish={handleCreate}>
              <Form.Item name="name" label="企业名称" rules={[{ required: true }]}>
                <Input placeholder="输入您的企业/团队名称" />
              </Form.Item>
              <Form.Item name="description" label="描述（选填）">
                <Input.TextArea rows={3} placeholder="企业简介..." />
              </Form.Item>
            </Form>
          </Modal>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <Title level={4}>企业管理</Title>

      {/* 企业概览 */}
      <Card style={{ marginBottom: 16 }}>
        <Descriptions column={{ xs: 1, sm: 2 }} size="middle">
          <Descriptions.Item label="企业名称"><Text strong>{enterprise?.name}</Text></Descriptions.Item>
          <Descriptions.Item label="管理员">{user?.username}</Descriptions.Item>
          <Descriptions.Item label="总名额"><Tag>{enterprise?.total_employee_slots}</Tag></Descriptions.Item>
          <Descriptions.Item label="免费名额"><Tag color="green">{enterprise?.free_employee_slots}</Tag></Descriptions.Item>
          <Descriptions.Item label="员工数"><Tag color="blue">{employees.length}</Tag></Descriptions.Item>
          <Descriptions.Item label="状态"><Tag color={enterprise?.status === 'active' ? 'success' : 'default'}>{enterprise?.status}</Tag></Descriptions.Item>
        </Descriptions>
      </Card>

      {/* ===== 套餐状态（集成展示）===== */}
      {subStatus && (
        <Card
          style={{ marginBottom: 16 }}
          title={
            <Space>
              <PayCircleOutlined />
              套餐状态
              <Button type="link" size="small" onClick={() => navigate('/subscription')}>管理 →</Button>
            </Space>
          }
        >
          {subStatus.tier ? (
            <>
              <Row gutter={24} style={{ marginBottom: 12 }}>
                <Col span={4}>
                  <Statistic title="当前套餐" value={subStatus.tier.name} />
                </Col>
                <Col span={5}>
                  <Statistic
                    title="剩余天数"
                    value={subStatus.daysRemaining}
                    suffix="天"
                    valueStyle={{ color: subStatus.isExpiring ? '#cf1322' : '#3f8600' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="今日任务额度"
                    value={subStatus.tasksRemainingToday === -1 ? '无限制' : `${subStatus.tasksRemainingToday}/${(subStatus.enterprise?.daily_task_limit || 0)}`}
                  />
                </Col>
                <Col span={5}>
                  <Statistic title="累计消费" prefix="¥" value={subStatus.orderStats?.totalSpent?.toFixed(2) || 0} precision={2} />
                </Col>
                <Col span={4} style={{ display: 'flex', alignItems: 'center' }}>
                  {subStatus.isActive ? (
                    <Tag icon={<CheckCircleOutlined />} color="success">正常</Tag>
                  ) : (
                    <Tag color="error">已冻结</Tag>
                  )}
                </Col>
              </Row>

              {(subStatus.isExpiring || !subStatus.isActive) && (
                <Alert
                  type={subStatus.isActive ? 'warning' : 'error'}
                  showIcon
                  banner
                  message={subStatus.isActive
                    ? `套餐将在 ${subStatus.daysRemaining} 天后到期`
                    : '企业套餐已冻结，无法下发新任务或新增员工'
                  }
                  action={
                    <Button type={subStatus.isActive ? 'primary' : 'primary'} danger={!subStatus.isActive}
                      onClick={() => navigate('/subscription')}>
                      立即{subStatus.isActive ? '续费' : '购买'}
                    </Button>
                  }
                />
              )}

              {!subStatus.canIssueTasks && subStatus.isActive && (
                <Alert type="warning" showIcon message={`今日任务已达上限 (${subStatus.tasksRemainingToday}/${subStatus.enterprise?.daily_task_limit})`} style={{ marginTop: 8 }} />
              )}
            </>
          ) : (
            <Alert
              type="info"
              showIcon
              message="尚未开通付费套餐"
              description="请前往套餐订阅页面选择适合的方案"
              action={<Button type="primary" onClick={() => navigate('/subscription')}>选择套餐</Button>}
            />
          )}
        </Card>
      )}

      {/* 操作按钮 */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Button icon={<UserAddOutlined />} onClick={() => setBindModalOpen(true)}>绑定已有用户</Button>
          <Button icon={<PlusOutlined />} onClick={() => setRegisterModalOpen(true)}>直接注册员工</Button>
          <Button icon={<GiftOutlined />} onClick={() => setExchangeModalOpen(true)}>
            兑换名额 (10积分/个)
          </Button>
        </Space>
      </Card>

      {/* 员工列表 */}
      <Card title={`员工列表 (${employees.length})`}>
        <Table dataSource={employees} rowKey="user_id" pagination={false}
               columns={[
                 { title: '姓名', dataIndex: 'username', key: 'username' },
                 { title: '邮箱', dataIndex: 'email', key: 'email' },
                 { title: '角色', key: 'role',
                   render: (_: any, r: any) => (
                     <Space>
                       {r.is_admin ? <Tag color="gold">子管理员</Tag> : <Tag>员工</Tag>}
                       <Tag>{r.registration_method === 'direct_register' ? '直注' : '绑定'}</Tag>
                     </Space>) },
                 { title: '加入时间', dataIndex: 'joined_at', key: 'joined_at',
                   render: (t: string) => new Date(t).toLocaleDateString() },
                 { title: '操作', key: 'action', width: 200,
                   render: (_: any, r: any) => (
                     <Space>
                       {!r.is_admin && (
                         <Popconfirm title="确定提升为管理员？" onConfirm={() => handlePromote(r.user_id)}>
                           <Button size="small" type="link" icon={<CrownOutlined />}>提权</Button>
                         </Popconfirm>
                       )}
                       <Popconfirm title="确定移除该员工？" onConfirm={() => handleRemoveEmployee(r.user_id)}>
                         <Button size="small" danger type="link" icon={<UserDeleteOutlined />}>移除</Button>
                       </Popconfirm>
                     </Space>) },
               ]} />
      </Card>

      {/* 绑定弹窗 */}
      <Modal title="绑定已有用户为员工" open={bindModalOpen}
             onOk={handleBind} onCancel={() => setBindModalOpen(false)} okText="确认绑定">
        <Input placeholder="输入用户的邮箱或手机号" value={bindAccount}
               onChange={(e) => setBindAccount(e.target.value)} prefix={<TeamOutlined />} />
      </Modal>

      {/* 直接注册弹窗 */}
      <Modal title="直接注册新员工账号" open={registerModalOpen}
             onCancel={() => setRegisterModalOpen(false)} footer={null}>
        <Form layout="vertical" onFinish={handleDirectRegister}>
          <Form.Item name="email" label="员工邮箱" rules={[{ required: true, type: 'email' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="username" label="用户名" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="password" label="初始密码" rules={[{ required: true, min: 6 }]}>
            <Input.Password />
          </Form.Item>
          <Text type="secondary">将消耗 1 个免费注册名额，当前剩余：{enterprise?.free_employee_slots}</Text>
          <Form.Item style={{ marginTop: 16 }}>
            <Button type="primary" htmlType="submit" block>创建</Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* 兑换名额弹窗 */}
      <Modal title="兑换员工注册名额" open={exchangeModalOpen}
             onOk={handleExchange} onCancel={() => setExchangeModalOpen(false)} okText="确认兑换">
        <p>消耗 <strong>10 积分</strong> 兑换 <strong>1 个</strong> 员工注册名额</p>
        <InputNumber min={1} max={50} value={exchangeCount} onChange={(v) => v && setExchangeCount(v)}
                    style={{ width: 120 }} /> 个
        <p style={{ marginTop: 8 }}>总计需要：<Tag color="orange">{exchangeCount * 10} 积分</Tag></p>
      </Modal>
    </div>
  );
}
