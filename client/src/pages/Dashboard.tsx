// 工作台 / 仪表盘
import React, { useEffect } from 'react';
import { Card, Row, Col, Statistic, Typography, Tag, List, Avatar, Button, Space, message, Spin, Empty } from 'antd';
import {
  FileSearchOutlined, CheckCircleOutlined, CloseCircleOutlined,
  WarningOutlined, WalletOutlined, TeamOutlined, BulbOutlined,
  PayCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import type { AuditRecord, PointsInfo, Task, AdInfo } from '../types';

const { Title, Text } = Typography;

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(false);
  const [pointsInfo, setPointsInfo] = React.useState<PointsInfo | null>(null);
  const [recentAudits, setRecentAudits] = React.useState<AuditRecord[]>([]);
  const [myTasks, setMyTasks] = React.useState<Task[]>([]);
  const [ads, setAds] = React.useState<Record<string, AdInfo[]>>({});
  const [subStatus, setSubStatus] = React.useState<any>(null);  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pointsRes, historyRes, tasksRes, adsRes]: any[] = await Promise.all([
        api.get('/points/info').catch(() => null),
        api.get('/audit/history?page=1&pageSize=5').catch(() => null),
        api.get('/tasks/mine?page=1&pageSize=5').catch(() => null),
        api.get('/ads').catch(() => null),
      ]);
      if (pointsRes) setPointsInfo(pointsRes.data);
      if (historyRes?.data?.list) setRecentAudits(historyRes.data.list);
      if (tasksRes?.data) setMyTasks(tasksRes.data);
      if (adsRes?.data) setAds(adsRes.data);

      // 套餐状态（仅管理员）
      try {
        const subRes: any = await api.get('/subscription/status');
        if (subRes.data) setSubStatus(subRes.data);
      } catch {} // 404 = no enterprise, ignore
    } catch {} finally { setLoading(false); }
  };

  // 统计审核结果
  const stats = recentAudits.reduce((acc, r) => {
    acc[r.overall_status] = (acc[r.overall_status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div>
      <Title level={4}>工作台</Title>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="免费审核次数"
              value={pointsInfo?.freeAuditRemaining ?? '-'}
              suffix={`/ ${pointsInfo?.freeAuditDaily ?? '-'}`}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="积分余额"
              value={pointsInfo?.balance ?? 0}
              suffix="分"
              prefix={<WalletOutlined style={{ color: '#1677ff' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card onClick={() => navigate('/history')} style={{ cursor: 'pointer', transition: 'box-shadow 0.3s' }}
                onMouseEnter={(e: any) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(22,119,255,0.15)'}
                onMouseLeave={(e: any) => e.currentTarget.style.boxShadow = ''}>
            <Statistic title="总审核次数" value={recentAudits.length} prefix={<FileSearchOutlined />} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card onClick={() => myTasks.length > 0 && navigate('/tasks')} style={{ cursor: 'pointer' }}
                onMouseEnter={(e: any) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(22,119,255,0.15)'}
                onMouseLeave={(e: any) => e.currentTarget.style.boxShadow = ''}>
            <Statistic title="待处理任务" value={myTasks.filter((t: Task) => t.assignment_status !== 'completed').length}
                       prefix={<BulbOutlined />} />
          </Card>
        </Col>
      </Row>

      {/* ===== 企业套餐提醒（仅管理员）===== */}
      {subStatus && (subStatus.isExpiring || !subStatus.isActive || !subStatus.canIssueTasks) && (
        <Card bordered={false}
              style={{ marginBottom: 24, borderLeft: subStatus.isActive ? '4px solid #faad14' : '4px solid #ff4d4f' }}>
          <Space>
            <PayCircleOutlined style={{ fontSize: 22, color: subStatus.isActive ? '#faad14' : '#ff4d4f' }} />
            <div>
              <Text strong>{!subStatus.tier ? '企业尚未开通套餐'
                : !subStatus.isActive ? '企业套餐已冻结，部分功能不可用'
                : `套餐将在 ${subStatus.daysRemaining} 天后到期`}</Text>
              {subStatus.tier && (
                <div><Text type="secondary">
                  当前: {subStatus.tier.name} | 今日任务额度: {
                    subStatus.tasksRemainingToday === -1 ? '无限制' :
                    `${Math.max(0, subStatus.tasksRemainingToday)}/${subStatus.enterprise?.daily_task_limit || 0}`
                  }
                </Text></div>
              )}
            </div>
            <Button type="primary" onClick={() => navigate('/subscription')}>
              {!subStatus.tier ? '选择套餐' : '立即续费/升级'}
            </Button>
          </Space>
        </Card>
      )}

      {/* 首页广告位 */}
      {ads.homepage_banner && ads.homepage_banner.length > 0 && (
        <Card style={{ marginBottom: 24 }}>
          <Space wrap>
            {ads.homepage_banner.map((ad: AdInfo) => (
              <a key={ad.id} href={ad.link_url || '#'} target="_blank" rel="noopener noreferrer"
                 onClick={() => api.post(`/ads/${ad.id}/click`).catch(() => {})}>
                <img src={ad.image_url} alt={ad.title} style={{
                  height: 80, borderRadius: 8, objectFit: 'cover',
                  border: '1px solid #f0f0f0',
                }} />
              </a>
            ))}
          </Space>
        </Card>
      )}

      <Row gutter={[16, 16]}>
        {/* 最近审核记录 */}
        <Col xs={24} lg={14}>
          <Card title="最近审核记录" extra={<Button link onClick={() => navigate('/history')}>查看全部</Button>}>
            {loading ? <Spin /> : recentAudits.length === 0 ? (
              <Empty description="暂无审核记录">
                <Button type="primary" onClick={() => navigate('/audit')}>开始审核</Button>
              </Empty>
            ) : (
              <List dataSource={recentAudits} renderItem={(item: AuditRecord) => (
                <List.Item actions={[
                  <Button size="small" key="view" onClick={() => navigate(`/history?id=${item.id}`)}>查看</Button>,
                ]}>
                  <List.Item.Meta
                    avatar={<Avatar shape="square"
                      icon={
                        item.overall_status === 'passed' ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> :
                        item.overall_status === 'failed' ? <CloseCircleOutlined style={{ color: '#ff4d4f' }} /> :
                        item.overall_status === 'warning' ? <WarningOutlined style={{ color: '#faad14' }} /> :
                        <WarningOutlined style={{ color: '#999' }} />
                      }
                      style={{ backgroundColor: item.overall_status === 'passed' ? '#f6ffed' : item.overall_status === 'failed' ? '#fff2f0' : '#fffbe6' }}
                    />}
                    title={
                      <Space>
                        <Text strong>{item.file_name}</Text>
                        <Tag color={
                          item.overall_status === 'passed' ? 'success' :
                          item.overall_status === 'failed' ? 'error' :
                          item.overall_status === 'warning' ? 'warning' : 'default'
                        }>
                          {item.overall_status === 'passed' ? '通过' : item.overall_status === 'failed' ? '不通过' : item.overall_status === 'warning' ? '警告' : '错误'}
                        </Tag>
                      </Space>
                    }
                    description={`分数: ${item.score ?? '-'} | 消耗: ${item.points_cost > 0 ? '1积分' : '免费'} | ${new Date(item.created_at).toLocaleString()}`}
                  />
                </List.Item>
              )} />
            )}
          </Card>
        </Col>

        {/* 快捷操作 & 任务 */}
        <Col xs={24} lg={10}>
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            {/* 快捷操作 */}
            <Card title="快捷操作">
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <Button type="primary" block icon={<FileSearchOutlined />} size="large" onClick={() => navigate('/audit')}>
                  上传 CAD 文件审核
                </Button>
                <Button block icon={<WalletOutlined />} size="large" onClick={() => navigate('/points')}>
                  积分充值与查询
                </Button>
              </Space>
            </Card>

            {/* 我的任务 */}
            {myTasks.length > 0 && (
              <Card title="我的任务" extra={<Button link onClick={() => navigate('/tasks')}>全部任务</Button>}>
                <List dataSource={myTasks.slice(0, 5)} renderItem={(task: Task) => (
                  <List.Item>
                    <List.Item.Meta
                      title={task.title}
                      description={
                        <Space>
                          <Tag color={
                            task.status === 'active' ? 'blue' :
                            task.status === 'completed' ? 'green' :
                            task.status === 'cancelled' ? 'red' : 'default'
                          }>{task.status}</Tag>
                          <Tag>{task.priority}</Tag>
                          {task.deadline && <Text type="secondary">截止: {new Date(task.deadline).toLocaleDateString()}</Text>}
                        </Space>
                      }
                    />
                  </List.Item>
                )} />
              </Card>
            )}
          </Space>
        </Col>
      </Row>
    </div>
  );
}
