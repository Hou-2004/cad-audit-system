// 超级管理员 - 用户管理
import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Space, Modal, Form, Input, InputNumber, Select, Tag, message, Popconfirm, Typography } from 'antd';
import { UserOutlined, StopOutlined, CheckCircleOutlined, WalletOutlined } from '@ant-design/icons';
import api from '../services/api';

const { TextArea } = Input;

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 });
  const [filters, setFilters] = useState({ role: '', status: '', keyword: '' });
  const [pointsModalOpen, setPointsModalOpen] = useState(false);
  const [targetUserId, setTargetUserId] = useState<number | null>(null);
  const [pointsForm] = Form.useForm();

  useEffect(() => { fetchUsers(); }, [pagination.current, pagination.pageSize]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params: any = { page: pagination.current, pageSize: pagination.pageSize };
      if (filters.role) params.role = filters.role;
      if (filters.status) params.status = filters.status;
      if (filters.keyword) params.keyword = filters.keyword;
      const res: any = await api.get('/admin/users', { params });
      setUsers(res.data?.list || []); setTotal(res.data?.total || 0);
    } catch {} finally { setLoading(false); }
  };

  const toggleUserStatus = async (id: number, status: string) => {
    try {
      await api.patch(`/admin/users/${id}/status`, { status });
      message.success(`用户已${status === 'disabled' ? '禁用' : '启用'}`); fetchUsers();
    } catch {}
  };

  const openPointsAdjust = (userId: number) => {
    setTargetUserId(userId); pointsForm.resetFields(); setPointsModalOpen(true);
  };

  const handlePointsAdjust = async (values: any) => {
    try {
      await api.post(`/admin/users/${targetUserId}/points`, values);
      message.success('积分调整成功！'); setPointsModalOpen(false); fetchUsers();
    } catch (err: any) { message.error(err.response?.data?.message); }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
    { title: '用户名', dataIndex: 'username', key: 'username' },
    { title: '邮箱', dataIndex: 'email', key: 'email' },
    { title: '角色', dataIndex: 'role', key: 'role',
      render: (r: string) => <Tag color={r === 'super_admin' ? 'red' : r === 'enterprise_admin' ? 'gold' : 'default'}>{r}</Tag> },
    { title: '状态', dataIndex: 'status', key: 'status', width: 90,
      render: (s: string) => <Tag color={s === 'active' ? 'green' : 'red'}>{s}</Tag> },
    { title: '积分', dataIndex: 'points', key: 'points', width: 80,
      render: (p: number) => <Text strong>{p}</Text> },
    { title: '注册时间', dataIndex: 'created_at', key: 'created', width: 170,
      render: (t: string) => new Date(t).toLocaleString() },
    { title: '操作', key: 'action', width: 240,
      render: (_: any, r: any) => (
        <Space size="small">
          {r.role !== 'super_admin' && (
            <>
              <Popconfirm title={r.status === 'active' ? '确定禁用？' : '确定启用？'}
                          onConfirm={() => toggleUserStatus(r.id, r.status === 'active' ? 'disabled' : 'active')}>
                <Button size="small" icon={r.status === 'active' ? <StopOutlined /> : <CheckCircleOutlined />} />
              </Popconfirm>
              <Button size="small" icon={<WalletOutlined />} onClick={() => openPointsAdjust(r.id)}>积分</Button>
            </>
          )}
        </Space>
      ) },
  ];

  return (
    <div>
      {/* 标题和筛选 */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Select placeholder="角色筛选" value={filters.role || undefined}
                  onChange={(v) => setFilters(f => ({ ...f, role: v || '' }))}
                  allowClear style={{ width: 140 }}
                  options={[{ value: 'worker' }, { value: 'enterprise_admin' }, { value: 'super_admin' }]} />
          <Input placeholder="搜索用户..." value={filters.keyword} allowClear style={{ width: 200 }}
                 prefix={<UserOutlined />}
                 onChange={(e) => setFilters(f => ({ ...f, keyword: e.target.value }))} />
          <Button type="primary" onClick={fetchUsers}>查询</Button>
        </Space>
      </Card>

      <Card>
        <Table columns={columns} dataSource={users} rowKey="id" loading={loading}
               pagination={{
                 current: pagination.current, pageSize: pagination.pageSize, total,
                 showSizeChanger: true, showTotal: (t) => `共 ${t} 名用户`,
                 onChange: (page, ps) => setPagination({ current: page, pageSize: ps }),
               }} />
      </Card>

      {/* 积分调整弹窗 */}
      <Modal title={`调整用户积分 (ID: ${targetUserId})`} open={pointsModalOpen}
             onCancel={() => setPointsModalOpen(false)} onOk={() => pointsForm.submit()} okText="确认">
        <Form form={pointsForm} onFinish={handlePointsAdjust}>
          <Form.Item name="amount" label="积分数额（正=增加，负=扣减）"
                    rules={[{ required: true }]}>
            <InputNumber min={-99999} max={99999} style={{ width: '100%' }} placeholder="如: +100 或 -50" />
          </Form.Item>
          <Form.Item name="reason" label="调整原因">
            <TextArea rows={2} placeholder="请填写调整原因..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
