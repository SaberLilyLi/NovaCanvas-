import type { NovaCanvasConnectionStatus } from '@novacanvas/sdk';

export interface ConnectionStatusBannerProps {
  status: NovaCanvasConnectionStatus;
  visible: boolean;
}

const LABELS: Record<NovaCanvasConnectionStatus, string> = {
  connecting: '正在连接实时通道…',
  connected: '实时连接已恢复',
  disconnected: '实时连接已断开，正在使用轮询同步',
  error: '实时连接异常，正在自动重试',
};

export function ConnectionStatusBanner(props: ConnectionStatusBannerProps) {
  if (!props.visible) return null;

  const isHealthy = props.status === 'connected';
  const isRecovering = props.status === 'connecting';

  return (
    <div
      className={[
        'nova-connection-banner',
        isHealthy ? 'is-healthy' : '',
        isRecovering ? 'is-recovering' : '',
        props.status === 'error' ? 'is-error' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      role="status"
      aria-live="polite"
    >
      <span className="nova-connection-banner__dot" aria-hidden />
      <span>{LABELS[props.status]}</span>
    </div>
  );
}
