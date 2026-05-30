// CAD 文件审核上传页
import React, { useState } from 'react';
import { Card, Upload, Button, Select, Typography, Space, message, Alert, Result, Tag, Descriptions, Collapse, Spin } from 'antd';
import { UploadOutlined, FileSearchOutlined, CheckCircleOutlined, CloseCircleOutlined, WarningOutlined, DownloadOutlined } from '@ant-design/icons';
import api from '../services/api';
import type { AuditResult, AuditRule } from '../types';

const { Title, Text, Paragraph } = Typography;
const { Dragger } = Upload;

export default function AuditUpload() {
  const [fileList, setFileList] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [recordId, setRecordId] = useState<number | null>(null);
  const [selectedRules, setSelectedRules] = useState<number[]>([]);
  const [rules, setRules] = useState<AuditRule[]>([]);
  const [customSpec, setCustomSpec] = useState<string>('{}');

  // 加载规则库
  React.useEffect(() => {
    api.get('/rules/preset').then((res: any) => setRules(res.data || [])).catch(() => {});
  }, []);

  const handleUpload = async () => {
    if (fileList.length === 0) { message.warning('请先选择文件'); return; }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', fileList[0].originFileObj || fileList[0]);
      formData.append('spec_requirements', customSpec);
      if (selectedRules.length > 0) formData.append('rule_ids', JSON.stringify(selectedRules));

      const res: any = await api.post('/audit/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setAuditResult(res.data.auditResult);
      setRecordId(res.data.recordId);
      message.success('审核完成！');
    } catch (err: any) {
      message.error(err.response?.data?.message || '审核失败');
    } finally { setUploading(false); }
  };

  const statusIcon: Record<string, React.ReactNode> = {
    pass: <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 18 }} />,
    fail: <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 18 }} />,
    warning: <WarningOutlined style={{ color: '#faad14', fontSize: 18 }} />,
    skip: <WarningOutlined style={{ color: '#999', fontSize: 18 }} />,
    error: <CloseCircleOutlined style={{ color: '#999', fontSize: 18 }} />,
  };

  const statusColor: Record<string, string> = {
    pass: '#52c41a', fail: '#ff4d4f', warning: '#faad14', skip: '#999', error: '#999',
  };

  return (
    <div>
      <Title level={4}>CAD 文件审核</Title>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 上传区域 */}
        {!auditResult && (
          <>
            <Card title="1. 选择 CAD 文件">
              <Dragger
                accept=".dwg,.dxf,.dwf"
                maxCount={1}
                fileList={fileList}
                beforeUpload={(file) => {
                  if (file.size > 100 * 1024 * 1024) { message.error('文件大小不能超过 100MB'); return false; }
                  setFileList([file]); return false; }}
                onRemove={() => setFileList([])}
                multiple={false}
              >
                <p className="ant-upload-drag-icon"><UploadOutlined /></p>
                <p className="ant-upload-text">点击或拖拽上传 CAD 文件</p>
                <p className="ant-upload-hint">支持 .dwg / .dxf / .dwf 格式，单文件最大 100MB</p>
              </Dragger>
            </Card>

            {/* 规则选择 */}
            <Card title="2. 选择审核规则（可选）">
              <Select mode="multiple" placeholder="使用默认全部预设规则" style={{ width: '100%' }}
                      value={selectedRules} onChange={setSelectedRules}
                      options={rules.map((r) => ({ label: `${r.name} (${r.category})`, value: r.id }))} />
            </Card>

            <Button type="primary" size="large" icon={<FileSearchOutlined />}
                    onClick={handleUpload} loading={uploading} disabled={fileList.length === 0}
                    block>开始审核</Button>
          </>
        )}

        {/* 审核结果 */}
        {auditResult && (
          <Card title={`审核结果 - ${auditResult.overallStatus === 'passed' ? '✅ 通过' : auditResult.overall_status === 'failed' ? '❌ 不通过' : '⚠️ 警告'}`}
                extra={<Button onClick={() => { setAuditResult(null); setFileList([]); }}>重新审核</Button>}>
            {/* 总览 */}
            <Result
              status={auditResult.overall_status === 'passed' ? 'success' : auditResult.overall_status === 'failed' ? 'error' : 'warning'}
              title={
                <Space>
                  <Text strong>合规评分：{auditResult.score}/100</Text>
                  <Tag color={statusColor[auditResult.overall_status]}>
                    {auditResult.overall_status === 'passed' ? '通过' : auditResult.overall_status === 'failed' ? '不通过' : '警告'}
                  </Tag>
                </Space>
              }
              subTitle={`共检查 ${auditResult.summary.total} 项：通过 ${auditResult.summary.passed} | 不通过 ${auditResult.summary.failed} | 警告 ${auditResult.summary.warning}`}
            />

            {/* 详细结果列表 */}
            <Collapse defaultActiveKey={['0']}>
              {auditResult.items.map((item, idx) => (
                <Collapse.Panel header={
                  <Space>{statusIcon[item.status]}
                    <Text strong>{item.ruleName}</Text>
                    <Tag color={statusColor[item.status]}>{item.status === 'pass' ? '通过' : item.status === 'fail' ? '不通过' : item.status}</Tag>
                    <Text type="secondary">{item.category}</Text>
                  </Space>
                } key={idx}>
                  <Descriptions column={1} size="small" bordered>
                    <Descriptions.Item label="状态">
                      <Tag color={statusColor[item.status]}>{item.status.toUpperCase()}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="详情">{item.detail}</Descriptions.Item>
                    {item.actual && <Descriptions.Item label="实际值"><Text copyable>{String(item.actual)}</Text></Descriptions.Item>}
                    {item.suggestion && <Descriptions.Item label="建议" span={2}><Paragraph type="warning">{item.suggestion}</Paragraph></Descriptions.Item>}
                  </Descriptions>
                </Collapse.Panel>
              ))}
            </Collapse>

            {recordId && (
              <div style={{ textAlign: 'center', marginTop: 16 }}>
                <Button type="primary" ghost onClick={() => window.open(`/history?id=${recordId}`, '_blank')}>
                  <DownloadOutlined /> 查看完整报告
                </Button>
              </div>
            )}
          </Card>
        )}
      </Space>
    </div>
  );
}
