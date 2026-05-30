// 任务管理页
import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Typography, Space, Modal, Form, Input, Select, DatePicker, Tag, message, Descriptions, Popconfirm, Row, Col } from 'antd';
import { PlusOutlined, EyeOutlined, EditOutlined, DeleteOutlined, CheckSquareOutlined } from '@ant-design/icons';
import api from '../services/api';
import type { Task } from '../types';

const { Title, Text } = Typography;
const { TextArea } = Input;

export default function TaskManage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<number | null>(null);
  const [form] = Form.useForm();

  useEffect(() => { fetchTasks(); }, []);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      // 尝试获取企业任务列表，如果没有企业则获取个人任务
      let res: any;
      try { res = await api.get('/enterprise/1/tasks?page=1&pageSize=100'); }
      catch { res = await api.get('/tasks/mine?page=1&pageSize=50'); }
      setTasks(res.data?.list || (Array.isArray(res.data) ? res.data : []));
    } catch {} finally { setLoading(false); }
  };

  const openCreate = () => {
    setEditingTask(null); form.resetFields();
    form.setFieldsValue({ priority: 'medium' });
    setModalOpen(true);
  };

  const openEdit = (task: Task) => {
    setEditingTask(task); form.setFieldsValue(task); setModalOpen(true);
  };

  const handleSubmit = async (values: any) => {
    try {
      if (editingTask) {
        await api.put(`/tasks/${editingTask.id}`, values);
        message.success('任务更新成功！');
      } else {
        await api.post('/tasks', values);
        message.success('任务创建成功！');
      }
      setModalOpen(false); fetchTasks();
    } catch (err: any) { message.error(err.response?.data?.message || '操作失败'); }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/tasks/${id}`);
      message.success('任务已删除'); fetchTasks();
    } catch {}
  };

  const columns: any[] = [
    { title: '标题', dataIndex: 'title', key: 'title', ellipsis: true,
      render: (t: string, r: Task) => (
        <Button link onClick={() => { setCurrentTaskId(r.id); setDetailVisible(true); }}>{t}</Button>
      ) },
    { title: '优先级', dataIndex: 'priority', key: 'priority', width: 90,
      render: (p: string) => <Tag color={p === 'urgent' ? 'red' : p === 'high' ? 'orange' : p === 'low' ? 'default' : 'blue'}>{p}</Tag> },
    { title: '状态', dataIndex: 'status', key: 'status', width: 100,
      render: (s: string) => <Tag color={s === 'active' ? 'blue' : s === 'completed' ? 'green' : s === 'cancelled' ? 'red' : 'default'}>{s}</Tag> },
    { title: '分配状态', dataIndex: 'assignment_status', key: 'assign', width: 100,
      render: (a: string | undefined) => a ? <Tag>{a}</Tag> : '-' },
    { title: '截止时间', dataIndex: 'deadline', key: 'deadline', width: 120,
      render: (d: string | null) => d ? new Date(d).toLocaleDateString() : '-',
    },
    { title: '创建时间', dataIndex: 'created_at', key: 'created', width: 160,
      render: (t: string) => new Date(t).toLocaleString() },
    { title: '操作', key: 'action', width: 180,
      render: (_: any, r: Task) => (
        <Space size="small">
          <Button icon={<EditOutlined />} size="small" onClick={() => openEdit(r)} />
          <Popconfirm title="确定删除？" onConfirm={() => handleDelete(r.id)}>
            <Button danger icon={<DeleteOutlined />} size="small" />
          </Popconfirm>
        </Space>) },
  ];

  return (
    <div>
      <Title level={4}>任务管理</Title>

      <Card style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新建任务</Button>
      </Card>

      <Card>
        <Table columns={columns} dataSource={tasks} rowKey="id" loading={loading}
               pagination={{ pageSize: 15, showTotal: (t) => `共 ${t} 个任务` }}
               locale={{ emptyText: '暂无任务，点击上方按钮创建' }} />
      </Card>

      {/* 创建/编辑弹窗 */}
      <Modal title={editingTask ? '编辑任务' : '创建新任务'} open={modalOpen}
             onCancel={() => setModalOpen(false)}
             onOk={() => form.submit()} okText="保存" width={600}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="title" label="任务标题" rules={[{ required: true }]}>
            <Input placeholder="如：审核机械零件CAD图纸" />
          </Form.Item>
          <Form.Item name="description" label="任务描述">
            <TextArea rows={3} placeholder="详细说明..." />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="priority" label="优先级">
                <Select options={[
                  { value: 'low', label: '低' }, { value: 'medium', label: '中' },
                  { value: 'high', label: '高' }, { value: 'urgent', label: '紧急' },
                ]} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="deadline" label="截止日期">
                <DatePicker showTime style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="spec_requirements" label="规范要求（JSON）">
            <TextArea rows={4} placeholder='{"layers": ["粗实线", "细实线"], "color": "按国标"}'
                     defaultValue={'{"check_layers": true, "check_colors": true, "check_dimensions": true}'} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

