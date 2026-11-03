import React from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

export function NetworkStatusToast() {
  const { isOnline, wasOffline } = useNetworkStatus();

  if (isOnline && !wasOffline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 max-w-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-3"
    >
      {!isOnline ? (
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-rose-950/90 border border-rose-800 text-rose-200 shadow-xl backdrop-blur-md">
          <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
            <WifiOff className="w-4 h-4 animate-pulse" />
          </div>
          <div className="text-xs">
            <p className="font-semibold text-rose-100">Connection Disrupted</p>
            <p className="text-rose-300/80">Voice check-in stream paused. Reconnecting automatically...</p>
          </div>
        </div>
      ) : wasOffline ? (
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-teal-950/90 border border-teal-800 text-teal-200 shadow-xl backdrop-blur-md">
          <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0">
            <Wifi className="w-4 h-4" />
          </div>
          <div className="text-xs">
            <p className="font-semibold text-teal-100">Back Online</p>
            <p className="text-teal-300/80">Connected to Companio clinical servers. Stream resumed.</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default NetworkStatusToast;
