// 积分中心页
import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Typography, Table, Button, Space, Modal, InputNumber, message, Tag, Descriptions } from 'antd';
import { WalletOutlined, ReloadOutlined, GiftOutlined, TeamOutlined, HistoryOutlined } from '@ant-design/icons';
import api from '../services/api';

const { Title, Text } = Typography;

export default function PointsCenter() {
  const [pointsInfo, setPointsInfo] = useState<any>(null);
  const [rechargeLoading, setRechargeLoading] = useState(false);
  const [rechargeModalOpen, setRechargeModalOpen] = useState(false);
  const [amount, setAmount] = useState<number>(10);
  const [records, setRecords] = useState<any[]>([]);
  const [recharges, setRecharges] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'points' | 'recharges'>('points');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [infoRes, recordsRes, rechargesRes]: any[] = await Promise.all([
        api.get('/points/info'), api.get('/points/records?page=1&pageSize=20'),
        api.get('/points/recharges?page=1&pageSize=20'),
      ]);
      setPointsInfo(infoRes.data);
      setRecords(recordsRes.data?.list || []);
      setRecharges(rechargesRes.data?.list || []);
    } catch {}
  };

  const handleRecharge = async () => {
    if (amount < 1) { message.error('金额需大于0'); return; }
    setRechargeLoading(true);
    try {
      const res: any = await api.post('/points/recharge', { amount, payment_method: 'mock' });
      message.success(`充值成功！获得 ${res.data.points_granted} 积分`);
      setRechargeModalOpen(false);
      fetchData();
    } catch (err: any) { message.error(err.response?.data?.message || '充值失败'); }
    finally { setRechargeLoading(false); }
  };

  return (
    <div>
      <Title level={4}>积分中心</Title>

      {/* 概览卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card><Statistic title="积分余额" value={pointsInfo?.balance ?? 0}
            prefix={<WalletOutlined style={{ color: '#1677ff' }} />} suffix="分" /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card><Statistic title="每日免费次数" value={pointsInfo?.freeAuditRemaining ?? 0}
            prefix={<GiftOutlined style={{ color: '#52c41a' }} />}
            suffix={`/ ${pointsInfo?.freeAuditDaily ?? '-'}`} /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card><Statistic title="今日已使用" value={pointsInfo?.freeAuditUsed ?? 0}
            prefix={<HistoryOutlined style={{ color: '#999' }} />} suffix="次" /></Card>
        </Col>
        <Col xs={12} sm={6}>
          <Button type="primary" size="large" icon={<ReloadOutlined />}
                    onClick={() => setRechargeModalOpen(true)} block
                    style={{ height: '100%', borderRadius: 8 }}>立即充值</Button>
        </Col>
      </Row>

      {/* 使用说明 */}
      <Card title="积分使用说明" style={{ marginBottom: 24 }}>
        <Descriptions column={1} size="small">
          <Descriptions.Item label="兑换审核次数">
            <Tag>1 积分 = 1 次审核</Tag>（免费次数用完后自动扣减）
          </Descriptions.Item>
          <Descriptions.Item label="充值比例">
            <Tag>1 元 = 1 积分</Tag>（支持模拟支付 / 支付宝 / 微信）
          </Descriptions.Item>
          <Descriptions.Item label="企业员工">
            <Tag color="green">不消耗积分</Tag>（无限次审核，仅限本企业文件）
          </Descriptions.Item>
          <Descriptions.Item label="每日重置">
            免费审核次数在每天凌晨 00:00 自动重置为 {pointsInfo?.freeAuditDaily ?? 5} 次
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* 记录表格 */}
      <Card>
        <Space style={{ marginBottom: 16 }}>
          <Button type={activeTab === 'points' ? 'primary' : 'default'}
                  onClick={() => setActiveTab('points')}>积分流水</Button>
          <Button type={activeTab === 'recharges' ? 'primary' : 'default'}
                  onClick={() => setActiveTab('recharges')}>充值记录</Button>
        </Space>

        {activeTab === 'points' && (
          <Table dataSource={records} rowKey="id" pagination={false} size="small"
                 columns={[
                   { title: '类型', dataIndex: 'type', key: 'type',
                     render: (t: string) => <Tag color={
                       t === 'recharge' ? 'blue' : t.includes('exchange') ? 'orange' :
                       t === 'refund' ? 'green' : t === 'admin_adjust' ? 'purple' : 'default'
                     }>{t}</Tag> },
                   { title: '变动', dataIndex: 'amount', key: 'amount',
                     render: (a: number) => a > 0 ? `+${a}` : `${a}`,
                     align: 'right' as const },
                   { title: '说明', dataIndex: 'description', key: 'description' },
                   { title: '余额', dataIndex: 'balance_after', key: 'balance_after', align: 'right' },
                   { title: '时间', dataIndex: 'created_at', key: 'created_at',
                     render: (t: string) => new Date(t).toLocaleString() },
                 ]} />
        )}

        {activeTab === 'recharges' && (
          <Table dataSource={recharges} rowKey="id" pagination={false} size="small"
                 columns={[
                   { title: '金额', dataIndex: 'amount', key: 'amount',
                     render: (a: number) => `¥${a.toFixed(2)}`, align: 'right' },
                   { title: '获得积分', dataIndex: 'points_granted', key: 'points_granted',
                     render: (p: number) => <Tag color="blue">{p}</Tag>, align: 'right' },
                   { title: '支付方式', dataIndex: 'payment_method', key: 'payment_method',
                     render: (m: string) => m.toUpperCase() },
                   { title: '状态', dataIndex: 'status', key: 'status',
                     render: (s: string) => <Tag color={s === 'paid' ? 'success' : s === 'failed' ? 'error' : 'default'}>{s}</Tag> },
                   { title: '时间', dataIndex: 'created_at', key: 'created_at',
                     render: (t: string) => new Date(t).toLocaleString() },
                 ]} />
        )}
      </Card>

      {/* 充值弹窗 */}
      <Modal open={rechargeModalOpen} onCancel={() => setRechargeModalOpen(false)}
             onOk={handleRecharge} confirmLoading={rechargeLoading}
             okText={`确认充值 ¥${amount}`} title="充值积分">
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <Statistic title="充值金额（元）" value={amount} suffix="元"
            prefix={<WalletOutlined />}
            valueStyle={{ color: '#1677ff', fontSize: 36 }}
          />
          <InputNumber min={1} max={10000} step={1} value={amount}
                      onChange={(v) => v && setAmount(v)} style={{ width: 200, marginTop: 16 }} />
          <div style={{ marginTop: 16 }}>
            <Space wrap>
              {[10, 50, 100, 500, 1000].map((v) => (
                <Button key={v} onClick={() => setAmount(v)}
                        shape={amount === v ? undefined : 'round'} type={amount === v ? 'primary' : 'default'}>
                  ¥{v}
                </Button>
              ))}
            </Space>
          </div>
          <Text type="secondary" style={{ display: 'block', marginTop: 12 }}>
            充值后立即到账，1元=1积分。当前为模拟支付模式。
          </Text>
        </div>
      </Modal>
    </div>
  );
}
