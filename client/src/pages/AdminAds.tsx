// 超级管理员 - 广告管理
import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Space, Modal, Form, Input, Select, DatePicker, Upload, Image, Tag, message, Popconfirm, Row, Col, Typography } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, PictureOutlined } from '@ant-design/icons';
import api from '../services/api';
import type { AdInfo } from '../types';

const { TextArea } = Input;

export default function AdminAds() {
  const [ads, setAds] = useState<AdInfo[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form] = Form.useForm();
  const [previewImage, setPreviewImage] = useState<string>('');

  useEffect(() => { fetchAds(); }, []);

  const fetchAds = async () => {
    setLoading(true);
    try {
      const res: any = await api.get('/admin/ads', { params: pagination });
      setAds(res.data?.list || []); setTotal(res.data?.total || 0);
    } catch {} finally { setLoading(false); }
  };

  const openCreate = () => {
    setEditingId(null); form.resetFields();
    form.setFieldsValue({ position: 'homepage_banner', sort_order: 0 });
    setModalOpen(true);
  };

  const openEdit = (ad: AdInfo) => {
    setEditingId(ad.id); form.setFieldsValue({ ...ad }); setModalOpen(true);
  };

  const handleSubmit = async (values: any) => {
    try {
      if (editingId) {
        await api.put(`/admin/ads/${editingId}`, values);
        message.success('广告更新成功！');
      } else {
        // 图片已通过上传接口处理，这里用 URL
        await api.post('/admin/ads', values);
        message.success('广告创建成功！');
      }
      setModalOpen(false); fetchAds();
    } catch (err: any) { message.error(err.response?.data?.message || '操作失败'); }
  };

  const handleDelete = async (id: number) => {
    try { await api.delete(`/admin/ads/${id}`); message.success('广告已删除'); fetchAds(); }
    catch {}
  };

  // 处理图片上传
  const handleImageUpload = async (file: File) => {
    const formData = new FormData(); formData.append('image', file);
    try {
      const res: any = await api.post('/admin/ads', formData, { headers: { 'Content-Type': 'multipart/form-data' }});
      form.setFieldValue('image_url', res.data?.image_url || '');
      message.success('图片上传成功');
    } catch { message.error('图片上传失败'); }
    return false; // 阻止自动上传
  };

  const positionOptions = [
    { value: 'homepage_banner', label: '首页横幅' },
    { value: 'sidebar', label: '侧边栏' },
    { value: 'dashboard_top', label: '仪表盘顶部' },
    { value: 'interstitial', label: '插屏' },
  ];

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 50 },
    { title: '标题', dataIndex: 'title', key: 'title', ellipsis: true },
    { title: '预览', dataIndex: 'image_url', key: 'img', width: 100,
      render: (url: string) => url ? <Image src={url} width={60} height={40} style={{ objectFit: 'cover', borderRadius: 4 }} /> : '-' },
    { title: '位置', dataIndex: 'position', key: 'pos', width: 120,
      render: (p: string) => <Tag>{positionOptions.find(o => o.value === p)?.label || p}</Tag> },
    { title: '排序', dataIndex: 'sort_order', key: 'sort', width: 60, align: 'center' },
    { title: '点击数', dataIndex: 'click_count', key: 'clicks', width: 70, align: 'right' as const },
    { title: '操作', key: 'action', width: 180,
      render: (_: any, r: AdInfo) => (
        <Space size="small">
          <Button icon={<EditOutlined />} size="small" onClick={() => openEdit(r)} />
          <Popconfirm title="确定删除？" onConfirm={() => handleDelete(r.id)}>
            <Button danger icon={<DeleteOutlined />} size="small" />
          </Popconfirm>
        </Space>) },
  ];

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>添加广告</Button>
          <Text type="secondary">共 {total} 条广告</Text>
        </Space>
      </Card>

      <Card>
        <Table columns={columns} dataSource={ads} rowKey="id" loading={loading}
               pagination={{
                 ...pagination, total,
                 onChange: (page, ps) => { setPagination({ current: page, pageSize: ps }); },
               }} />
      </Card>

      {/* 创建/编辑弹窗 */}
      <Modal title={editingId ? '编辑广告' : '添加广告'} open={modalOpen}
             onCancel={() => setModalOpen(false)}
             onOk={() => form.submit()} okText="保存" width={560}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="title" label="广告标题" rules={[{ required: true }]}>
            <Input placeholder="输入广告标题" />
          </Form.Item>

          <Form.Item name="image_url" label="图片地址" rules={[{ required: true }]}
                    extra={<Upload beforeUpload={handleImageUpload} showUploadList={false}>
                      <Button icon={<PictureOutlined />}>上传新图片</Button>
                    </Upload>}>
            <Input placeholder="输入图片URL或上方上传" />
          </Form.Item>

          {form.getFieldValue('image_url') && (
            <div style={{ marginBottom: 16 }}>
              <Image src={form.getFieldValue('image_url')} style={{ maxHeight: 120 }} />
            </div>
          )}

          <Form.Item name="link_url" label="跳转链接">
            <Input placeholder="https://..." />
          </Form.Item>

          <Space style={{ width: '100%' }} size="middle">
            <Form.Item name="position" label="展示位置" rules={[{ required: true }]} style={{ flex: 1, marginBottom: 0 }}>
              <Select options={positionOptions} />
            </Form.Item>
            <Form.Item name="sort_order" label="排序(越小越前)" initialValue={0} style={{ width: 140, marginBottom: 0 }}>
              <InputNumber min={0} max={9999} style={{ width: '100%' }} />
            </Form.Item>
          </Space>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="start_time" label="开始时间" rules={[{ required: true }]}>
                <DatePicker showTime format="YYYY-MM-DD HH:mm:ss" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="end_time" label="结束时间" rules={[{ required: true }]}>
                <DatePicker showTime format="YYYY-MM-DD HH:mm:ss" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}
