import React, { useEffect, useState } from 'react';
import { Card, Button, Typography, Space, Tag, message, Modal, Descriptions, Alert, Statistic, Row, Col, Steps, Radio, InputNumber, Spin } from 'antd';
import { CheckCircleOutlined, CrownOutlined, ThunderboltOutlined, ShopOutlined, CreditCardOutlined } from '@ant-design/icons';
import api from '../services/api';

const { Title, Text, Paragraph } = Typography;

interface Tier {
  id: number;
  name: string;
  code: string;
  price_yearly: number;
  daily_task_limit: number;
  description: string | null;
  features: string[] | null;
}

interface SubStatus {
  enterprise: any;
  tier: Tier | null;
  isActive: boolean;
  isExpiring: boolean;
  daysRemaining: number;
  canIssueTasks: boolean;
  tasksRemainingToday: number;
  orderStats: { totalOrders: number; paidOrders: number; totalSpent: number };
}

interface Order {
  id: number;
  order_no: string;
  tier_id: number;
  tier_name: string;
  tier_code: string;
  order_type: 'new' | 'renew' | 'upgrade';
  final_price: number;
  points_used: number;
  cash_amount: number;
  payment_method: string;
  status: string;
  paid_at: string | null;
  created_at: string;
  period_end: string | null;
}

const SubscriptionPage: React.FC = () => {
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [subStatus, setSubStatus] = useState<SubStatus | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedTierId, setSelectedTierId] = useState<number | null>(null);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [orderDetailModalOpen, setOrderDetailModalOpen] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>('mock');
  const [pointsToUse, setPointsToUse] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);

  // 加载套餐列表
  const loadTiers = async () => {
    try {
      const res: any = await api.get('/subscription/tiers');
      setTiers(res.data || []);
    } catch (e: any) {
      message.error(e?.response?.data?.message || '加载套餐失败');
    }
  };

  // 加载企业套餐状态
  const loadSubStatus = async () => {
    try {
      const res: any = await api.get('/subscription/status');
      setSubStatus(res.data);
    } catch (e: any) {
      // 未创建企业时忽略错误
      if (e?.response?.status !== 404) console.error(e);
    }
  };

  // 加载订单
  const loadOrders = async () => {
    try {
      const res: any = await api.get('/subscription/orders');
      setOrders((res.data as any)?.list || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadTiers();
    loadSubStatus();
    loadOrders();
  }, []);

  // 创建订单
  const handleCreateOrder = async () => {
    if (!selectedTierId) {
      message.warning('请先选择一个套餐');
      return;
    }
    setLoading(true);
    try {
      const res: any = await api.post('/subscription/orders', {
        tierId: selectedTierId,
        paymentMethod,
        pointsToUse,
      });
      setCurrentOrder(res.data);
      setPayModalOpen(true);
    } catch (e: any) {
      message.error(e?.response?.data?.message || '创建订单失败');
    } finally {
      setLoading(false);
    }
  };

  // 模拟支付
  const handleMockPay = async () => {
    if (!currentOrder) return;
    setPaying(true);
    try {
      await api.post('/subscription/mock-pay', { orderNo: currentOrder.order_no });
      message.success('支付成功！套餐已激活', 3);
      setPayModalOpen(false);
      setSelectedTierId(null);
      loadSubStatus();
      loadOrders();
    } catch (e: any) {
      message.error(e?.response?.data?.message || '支付失败');
    } finally {
      setPaying(false);
    }
  };

  // 获取套餐图标
  const getTierIcon = (code: string) => {
    switch (code) {
      case 'small': return <ShopOutlined style={{ fontSize: 32, color: '#1890ff' }} />;
      case 'medium': return <ThunderboltOutlined style={{ fontSize: 32, color: '#faad14' }} />;
      case 'large': return <CrownOutlined style={{ fontSize: 32, color: '#eb2f96' }} />;
      default: return <CreditCardOutlined style={{ fontSize: 32 }} />;
    }
  };

  // 判断是否为当前套餐（用于显示"当前套餐"标签）
  const isCurrentTier = (tierId: number) => subStatus?.tier?.id === tierId;

  return (
    <div style={{ padding: '0 24px', maxWidth: 1200, margin: '0 auto' }}>
      {/* ===== 企业套餐状态概览 ===== */}
      {subStatus && subStatus.tier && (
        <Card style={{ marginBottom: 24 }} title={
          <Space>
            <CrownOutlined />
            当前企业套餐状态
          </Space>
        }>
          <Row gutter={24}>
            <Col span={6}>
              <Statistic title="当前套餐" value={subStatus.tier.name} />
            </Col>
            <Col span={6}>
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
                value={subStatus.tasksRemainingToday === -1 ? '无限制' : `${subStatus.tasksRemainingToday}/${(subStatus.enterprise.daily_task_limit || 0)}`}
              />
            </Col>
            <Col span={6}>
              <Statistic title="累计消费" prefix="¥" value={subStatus.orderStats.totalSpent.toFixed(2)} precision={2} />
            </Col>
          </Row>

          {subStatus.isExpiring && (
            <Alert
              type="warning"
              showIcon
              banner
              message={`您的套餐将在 ${subStatus.daysRemaining} 天后到期，请及时续费以免影响业务`}
              style={{ marginTop: 16 }}
              action={<Button type="primary" onClick={() => { setSelectedTierId(subStatus.tier!.id); }}>立即续费</Button>}
            />
          )}

          {!subStatus.isActive && (
            <Alert
              type="error"
              showIcon
              banner
              message="企业套餐已冻结，无法下发新任务或新增员工"
              description="请购买或续费套餐以恢复功能"
              style={{ marginTop: 16 }}
              action={<Button type="primary" danger onClick={() => loadTiers()}>立即购买</Button>}
            />
          )}
        </Card>
      )}

      {!subStatus?.tier && (
        <Alert
          type="info"
          showIcon
          banner
          message="您尚未为企业开通付费套餐"
          description="请选择下方套餐进行购买，开通后即可使用完整的任务管理和员工管理功能"
          style={{ marginBottom: 24 }}
        />
      )}

      {/* ===== 套餐选择卡片 ===== */}
      <Title level={4} style={{ marginBottom: 20 }}>
        <Space>{subStatus?.tier ? '续费 / 升级套餐' : '选择企业套餐'}</Space>
      </Title>

      <Row gutter={[24, 24]} style={{ marginBottom: 40 }}>
        {tiers.map((tier) => (
          <Col xs={24} sm={12} md={8} key={tier.id}>
            <Card
              hoverable
              className={`tier-card ${selectedTierId === tier.id ? 'selected-tier' : ''}`}
              style={{
                height: '100%',
                border: selectedTierId === tier.id ? '2px solid #1890ff' : '1px solid #d9d9d9',
                borderRadius: 12,
                position: 'relative',
                overflow: 'visible',
              }}
              onClick={() => setSelectedTierId(tier.id)}
            >
              {/* 当前套餐标签 */}
              {isCurrentTier(tier.id) && (
                <Tag color="green" style={{ position: 'absolute', top: -10, right: 16 }}>当前使用中</Tag>
              )}
              {/* 推荐标签 */}
              {tier.code === 'medium' && !isCurrentTier(tier.id) && (
                <Tag color="red" style={{ position: 'absolute', top: -10, right: 16 }}>推荐</Tag>
              )}

              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                {getTierIcon(tier.code)}
                <Title level={4} style={{ marginTop: 12 }}>{tier.name}</Title>
                <div style={{ margin: '12px 0' }}>
                  <Text style={{ fontSize: 36, fontWeight: 700, color: '#f5222d' }}>
                    ¥{tier.price_yearly}
                  </Text>
                  <Text type="secondary"> / 年</Text>
                </div>
                <Paragraph type="secondary" style={{ minHeight: 44 }}>{tier.description}</Paragraph>
              </div>

              <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 12 }}>
                <Text strong>每日任务限额：</Text>
                <Text>{tier.daily_task_limit === 0 ? '✅ 无限制' : `${tier.daily_task_limit} 次`}</Text>
              </div>

              {tier.features && (
                <ul style={{ paddingLeft: 20, marginTop: 12, marginBottom: 0 }}>
                  {(tier.features as string[]).map((f, i) => (
                    <li key={i}><CheckCircleOutlined style={{ color: '#52c41a', marginRight: 6 }} />{f}</li>
                  ))}
                </ul>
              )}

              <Button
                type={selectedTierId === tier.id ? 'primary' : 'default'}
                size="large"
                block
                style={{ marginTop: 16, borderRadius: 8 }}
                onClick={(e) => { e.stopPropagation(); setSelectedTierId(tier.id); }}
              >
                {isCurrentTier(tier.id) ? '续费此套餐' : '选择此套餐'}
              </Button>
            </Card>
          </Col>
        ))}
      </Row>

      {/* 支付操作区 */}
      {selectedTierId && (
        <Card title="确认订单" style={{ marginBottom: 24 }}>
          <Row gutter={24}>
            <Col span={14}>
              <Descriptions column={1} bordered size="small">
                <Descriptions.Item label="目标套餐">
                  {tiers.find(t => t.id === selectedTierId)?.name}
                </Descriptions.Item>
                <Descriptions.Item label="年费价格">
                  ¥{tiers.find(t => t.id === selectedTierId)?.price_yearly}
                </Descriptions.Item>
                <Descriptions.Item label="订单类型">
                  {subStatus?.tier ? (subStatus.tier.id === selectedTierId ? '续费' : '升级') : '首次购买'}
                </Descriptions.Item>
              </Descriptions>
            </Col>
            <Col span={10}>
              <div style={{ background: '#fafafa', padding: 20, borderRadius: 8, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <Radio.Group
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  optionType="button"
                  buttonStyle="solid"
                  style={{ marginBottom: 16 }}
                >
                  <Radio.Button value="mock">模拟支付</Radio.Button>
                  <Radio.Button value="points_only">积分全额抵扣</Radio.Button>
                  <Radio.Button value="points_cash">积分+现金混合</Radio.Button>
                </Radio.Group>

                {(paymentMethod === 'points_cash' || paymentMethod === 'points_only') && (
                  <div>
                    <Space>
                      <Text>使用积分：</Text>
                      <InputNumber
                        min={0}
                        max={10000}
                        value={pointsToUse}
                        onChange={(v) => setPointsToUse(v || 0)}
                        placeholder="积分数量"
                      />
                      <Text type="secondary">(1积分=1元)</Text>
                    </Space>
                    {paymentMethod === 'points_cash' && tiers.find(t => t.id === selectedTierId) && (
                      <div style={{ marginTop: 8 }}>
                        <Text type="secondary">
                          现金需付: ¥{(Math.max(0, (tiers.find(t => t.id === selectedTierId)?.price_yearly || 0) - pointsToUse)).toFixed(2)}
                        </Text>
                      </div>
                    )}
                  </div>
                )}

                <Button
                  type="primary"
                  size="large"
                  loading={loading}
                  icon={<CreditCardOutlined />}
                  onClick={handleCreateOrder}
                  block
                  style={{ marginTop: 16, borderRadius: 8, height: 48 }}
                >
                  确认下单并支付
                </Button>
              </div>
            </Col>
          </Row>
        </Card>
      )}

      {/* ===== 订单记录 ===== */}
      <Card
        title="订购历史"
        extra={<a onClick={() => setOrderDetailModalOpen(true)}>查看全部</a>}
        style={{ marginBottom: 24 }}
      >
        {orders.length === 0 ? (
          <Text type="secondary">暂无订单记录</Text>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #f0f0f0' }}>
                <th style={{ padding: '8px', textAlign: 'left' }}>订单号</th>
                <th style={{ padding: '8px', textAlign: 'left' }}>套餐</th>
                <th style={{ padding: '8px', textAlign: 'left' }}>类型</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>金额</th>
                <th style={{ padding: '8px', textAlign: 'center' }}>状态</th>
                <th style={{ padding: '8px', textAlign: 'left' }}>时间</th>
              </tr>
            </thead>
            <tbody>
              {orders.slice(0, 5).map((o) => (
                <tr key={o.id} style={{ borderBottom: '1 solid #f5f5f5' }}>
                  <td style={{ padding: '8px 4px' }}><Text copyable style={{ fontFamily: 'monospace' }}>{o.order_no.substring(0, 18)}...</Text></td>
                  <td style={{ padding: '8px 4px' }}>{o.tier_name}</td>
                  <td style={{ padding: '8px 4px' }}>
                    <Tag color={o.order_type === 'new' ? 'blue' : o.order_type === 'renew' ? 'green' : 'orange'}>
                      {{ new: '首次', renew: '续费', upgrade: '升级' }[o.order_type]}
                    </Tag>
                  </td>
                  <td style={{ padding: '8px 4px', textAlign: 'right' }}>¥{o.final_price}</td>
                  <td style={{ padding: '8px 4px', textAlign: 'center' }}>
                    <Tag color={{
                      pending: 'default', paid: 'success',
                      failed: 'error', cancelled: 'warning', refunded: 'default',
                    }[o.status]}>{{ pending: '待支付', paid: '已支付', failed: '已取消', cancelled: '已关闭', refunded: '已退款' }[o.status]}</Tag>
                  </td>
                  <td style={{ padding: '8px 4px' }}><Text type="secondary">{new Date(o.created_at).toLocaleString()}</Text></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* 支付确认弹窗 */}
      <Modal
        title="确认支付"
        open={payModalOpen}
        onOk={handleMockPay}
        confirmLoading={paying}
        okText="模拟支付"
        cancelText="取消"
        onCancel={() => setPayModalOpen(false)}
        width={500}
      >
        {currentOrder && (
          <Descriptions column={1} size="small" style={{ marginTop: 16 }}>
            <Descriptions.Item label="订单号"><Text copyable style={{ fontFamily: 'monospace' }}>{currentOrder.order_no}</Text></Descriptions.Item>
            <Descriptions.Item label="套餐">{tiers.find(t => t.id === currentOrder.tier_id)?.name}</Descriptions.Item>
            <Descriptions.Item label="订单类型">
              {{ new: '首次购买', renew: '续费', upgrade: '升级' }[currentOrder.order_type]}
            </Descriptions.Item>
            <Descriptions.Item label="原价">¥{currentOrder.original_price}</Descriptions.Item>
            {currentOrder.discount_amount !== 0 && (
              <Descriptions.Item label="差价调整">
                <Text type={currentOrder.discount_amount > 0 ? 'success' : 'warning'}>
                  {currentOrder.discount_amount > 0 ? '-' : '+'}¥{Math.abs(currentOrder.discount_amount)}
                </Text>
              </Descriptions.Item>
            )}
            <Descriptions.Item label="应付总额" labelStyle={{ fontWeight: 700 }}>
              <Text strong style={{ fontSize: 18, color: '#f5222d' }}>¥{currentOrder.final_price}</Text>
            </Descriptions.Item>
            {currentOrder.period_end && (
              <Descriptions.Item label="有效期至">{new Date(currentOrder.period_end).toLocaleDateString()}</Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default SubscriptionPage;
