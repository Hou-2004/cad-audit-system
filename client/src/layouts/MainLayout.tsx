// 主布局组件 - 侧边栏 + 顶栏 + 内容区
import React from 'react';
import { Layout, Menu, Avatar, Dropdown, Badge, Tag, Space, Typography } from 'antd';
import {
  DashboardOutlined,
  FileSearchOutlined,
  TeamOutlined,
  SettingOutlined,
  LogoutOutlined,
  UserOutlined,
  WalletOutlined,
  CheckSquareOutlined,
  BulbOutlined,
  CrownOutlined,
  PayCircleOutlined,
} from '@ant-design/icons';
import { useAuth } from '../services/AuthContext';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';

const { Header, Sider, Content, Footer } = Layout;
const { Text } = Typography;

const MainLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = React.useState(false);

  if (!user) return null;

  const isAdmin = user.role === 'enterprise_admin' || user.role === 'super_admin';
  const isSuperAdmin = user.role === 'super_admin';

  // 根据角色生成菜单
  const menuItems: any[] = [
    { key: '/', icon: <DashboardOutlined />, label: '工作台' },
    { key: '/audit', icon: <FileSearchOutlined />, label: 'CAD 审核' },
    { key: '/history', icon: <CheckSquareOutlined />, label: '审核历史' },
    { key: '/points', icon: <WalletOutlined />, label: '积分中心' },
  ];

  if (isAdmin) {
    menuItems.push(
      { key: '/enterprise', icon: <TeamOutlined />, label: '企业管理' },
      { key: '/tasks', icon: <BulbOutlined />, label: '任务管理' },
      { key: '/subscription', icon: <PayCircleOutlined />, label: '套餐订阅' },
    );
  }

  if (isSuperAdmin) {
    menuItems.push(
      { key: '/admin/users', icon: <CrownOutlined />, label: '系统管理' },
      { key: '/admin/ads', icon: <SettingOutlined />, label: '广告管理' },
    );
  }

  const userMenuItems = [
    { key: 'profile', icon: <UserOutlined />, label: '个人信息' },
    { type: 'divider' as const },
    { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', danger: true },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        style={{ overflow: 'auto', height: '100vh', position: 'fixed', left: 0, top: 0, bottom: 0 }}
        theme="light"
      >
        <div
          onClick={() => navigate('/')}
          style={{
            height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', borderBottom: '1px solid #f0f0f0',
          }}
        >
          {!collapsed && (
            <Text strong style={{ fontSize: 16, color: '#1677ff' }}>CAD 审核系统</Text>
          )}
          {collapsed && <Text strong style={{ fontSize: 18, color: '#1677ff' }}>C</Text>}
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ borderRight: 0 }}
        />
      </Sider>

      <Layout style={{ marginLeft: collapsed ? 80 : 200, transition: 'margin-left 0.2s' }}>
        <Header style={{
          background: '#fff', padding: '0 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)', zIndex: 10,
        }}>
          <Space size="middle">
            <Badge count={user.free_audit_remaining} size="small" offset={[-3, 3]}>
              <Tag color="blue" style={{ marginRight: 0 }}>免费次数</Tag>
            </Badge>
            <Tag color="green">{user.points || 0} 积分</Tag>
            <Dropdown menu={{
              items: userMenuItems,
              onClick: ({ key }) => {
                if (key === 'logout') logout();
                if (key === 'profile') navigate('/profile');
              },
            }} placement="bottomRight">
              <Space style={{ cursor: 'pointer' }}>
                <Avatar size="small" icon={<UserOutlined />} />
                <Text>{user.username}</Text>
                <Tag color={user.role === 'super_admin' ? 'red' : user.role === 'enterprise_admin' ? 'gold' : 'default'}>
                  {user.role === 'super_admin' ? '超管' : user.role === 'enterprise_admin' ? '管理员' : '工作者'}
                </Tag>
              </Space>
            </Dropdown>
          </Space>
        </Header>

        <Content style={{ margin: 16, minHeight: 'calc(100vh - 140px)' }}>
          <Outlet />
        </Content>

        <Footer style={{ textAlign: 'center', color: '#999' }}>
          CAD 文件规范审核系统 ©2026 | Powered by Senior Developer
        </Footer>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
