// 错误边界 —— 捕获 React 渲染错误，防止白屏
import React, { Component, type ReactNode } from 'react';
import { Result, Button } from 'antd';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}
interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    // 尝试重新加载页面
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: 20,
        }}>
          <Result
            status="error"
            title="页面加载出错"
            subTitle={this.state.error?.message || '未知错误，请刷新页面重试'}
            extra={[
              <Button type="primary" key="retry" onClick={this.handleReset}>
                刷新页面
              </Button>,
              <Button key="login" onClick={() => (window.location.href = '/login')}>
                返回登录
              </Button>,
            ]}
            style={{
              background: '#fff',
              borderRadius: 12,
              padding: '40px 24px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
            }}
          />
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
