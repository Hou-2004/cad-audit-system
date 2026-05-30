// 审核历史页
import React, { useEffect, useState } from 'react';
import { Card, Table, Typography, Tag, Space, Button, Input, Select, DatePicker, message, Modal, Descriptions, Collapse } from 'antd';
import { EyeOutlined, SearchOutlined, DownloadOutlined, FilterOutlined } from '@ant-design/icons';
import api from '../services/api';
import type { AuditRecord, AuditResultItem } from '../types';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

export default function AuditHistory() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AuditRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 });
  const [filters, setFilters] = useState({ keyword: '', status: '' });
  const [detailVisible, setDetailVisible] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<AuditRecord | null>(null);

  useEffect(() => { fetchHistory(); }, [pagination.current, pagination.pageSize]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const params: any = { page: pagination.current, pageSize: pagination.pageSize };
      if (filters.keyword) params.keyword = filters.keyword;
      if (filters.status) params.status = filters.status;
      const res: any = await api.get('/audit/history', { params });
      setData(res.data.list || []);
      setTotal(res.data.total || 0);
    } catch (err: any) { message.error('获取历史记录失败'); }
    finally { setLoading(false); }
  };

  const showDetail = (record: AuditRecord) => {
    setCurrentRecord(record);
    setDetailVisible(true);
  };

  const columns = [
    { title: '文件名', dataIndex: 'file_name', key: 'file_name', ellipsis: true,
      render: (t: string) => <Text copyable style={{ maxWidth: 200 }}>{t}</Text> },
    { title: '状态', dataIndex: 'overall_status', key: 'status', width: 100,
      render: (s: string) => <Tag color={s === 'passed' ? 'success' : s === 'failed' ? 'error' : s === 'warning' ? 'warning' : 'default'}>
        {s === 'passed' ? '通过' : s === 'failed' ? '不通过' : s === 'warning' ? '警告' : '错误'}
      </Tag> },
    { title: '评分', dataIndex: 'score', key: 'score', width: 80,
      render: (s: number | null) => s !== null ? (
        <Tag color={s >= 80 ? 'green' : s >= 60 ? 'orange' : 'red'}>{s}分</Tag>
      ) : '-' },
    { title: '消耗', dataIndex: 'points_cost', key: 'points_cost', width: 80,
      render: (c: number) => c > 0 ? <Tag>1积分</Tag> : <Tag color="green">免费</Tag> },
    { title: '大小', dataIndex: 'file_size', key: 'file_size', width: 90,
      render: (s: number) => `${(s / 1024).toFixed(1)} KB` },
    { title: '审核时间', dataIndex: 'created_at', key: 'created_at', width: 170,
      render: (t: string) => new Date(t).toLocaleString() },
    { title: '操作', key: 'action', width: 80,
      render: (_: any, record: AuditRecord) => (
        <Button size="small" icon={<EyeOutlined />} onClick={() => showDetail(record)}>查看</Button>
      ) },
  ];

  return (
    <div>
      <Title level={4}>审核历史</Title>

      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input placeholder="搜索文件名..." value={filters.keyword}
                 prefix={<SearchOutlined />}
                 onChange={(e) => setFilters(f => ({ ...f, keyword: e.target.value }))}
                 onPressEnter={fetchHistory} allowClear style={{ width: 220 }} />
          <Select placeholder="结果状态" value={filters.status || undefined}
                  onChange={(v) => setFilters(f => ({ ...f, status: v || '' }))}
                  options={[
                    { value: 'passed', label: '通过' }, { value: 'failed', label: '不通过' },
                    { value: 'warning', label: '警告' }, { value: 'error', label: '错误' },
                  ]} allowClear style={{ width: 120 }} />
          <Button type="primary" icon={<FilterOutlined />} onClick={fetchHistory}>筛选</Button>
        </Space>
      </Card>

      <Card>
        <Table columns={columns} dataSource={data} rowKey="id" loading={loading}
               pagination={{
                 current: pagination.current, pageSize: pagination.pageSize, total,
                 showSizeChanger: true, showQuickJumper: true,
                 showTotal: (t) => `共 ${t} 条记录`,
                 onChange: (page, ps) => setPagination({ current: page, pageSize: ps }),
               }} />
      </Card>

      {/* 详情弹窗 */}
      <Modal open={detailVisible} onCancel={() => setDetailVisible(false)}
             footer={<Button onClick={() => setDetailVisible(false)}>关闭</Button>}
             width={720} title={`审核详情 - ${currentRecord?.file_name || ''}`}>
        {currentRecord && (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="文件名">{currentRecord.file_name}</Descriptions.Item>
            <Descriptions.Item label="格式">{currentRecord.file_format.toUpperCase()}</Descriptions.Item>
            <Descriptions.Item label="大小">{(currentRecord.file_size / 1024).toFixed(1)} KB</Descriptions.Item>
            <Descriptions.Item label="状态"><Tag color={
              currentRecord.overall_status === 'passed' ? 'success' :
              currentRecord.overall_status === 'failed' ? 'error' : 'warning'
            }>{currentRecord.overall_status}</Tag></Descriptions.Item>
            <Descriptions.Item label="分数">{currentRecord.score ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="时间">{new Date(currentRecord.created_at).toLocaleString()}</Descriptions.Item>
          </Descriptions>
        )}
        {currentRecord?.audit_result && typeof currentRecord.audit_result !== 'string' && (
          <div style={{ marginTop: 16 }}>
            <Title level={5}>检查项详情</Title>
            <Collapse>
              {(currentRecord.audit_result as any).items?.map((item: AuditResultItem, idx: number) => (
                <Collapse.Panel header={`${item.ruleName} (${item.status})`} key={idx}>
                  <p><Text strong>分类：</Text>{item.category}</p>
                  <p><Text strong>详情：</Text>{item.detail}</p>
                  {item.actual && <p><Text strong>实际：</Text>{item.actual}</p>}
                  {item.suggestion && <p><Text strong>建议：</Text><Text type="warning">{item.suggestion}</Text></p>}
                </Collapse.Panel>
              ))}
            </Collapse>
          </div>
        )}
      </Modal>
    </div>
  );
}
