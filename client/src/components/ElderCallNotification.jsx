// client/src/components/ElderCallNotification.jsx
import React, { useState, useEffect } from 'react';

export default function ElderCallNotification({ elderId = 'elder-001' }) {
  const [pendingCalls, setPendingCalls] = useState([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Poll for pending calls
    const pollCalls = async () => {
      try {
        const response = await fetch(`/api/calls/elder/pending-calls/${elderId}`);
        if (response.ok) {
          const calls = await response.json();
          setPendingCalls(calls);
          setIsVisible(calls.length > 0);
        }
      } catch (error) {
        console.error('Failed to fetch pending calls:', error);
      }
    };

    // Poll every 2 seconds
    const interval = setInterval(pollCalls, 2000);
    pollCalls(); // Initial poll

    return () => clearInterval(interval);
  }, [elderId]);

  const handleAnswerCall = async (roomId) => {
    try {
      await fetch('/api/calls/answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          room_id: roomId,
          user_id: elderId,
          action: 'accept',
        }),
      });
      
      // Remove from pending calls
      setPendingCalls(prev => prev.filter(call => call.room_id !== roomId));
      setIsVisible(false);
    } catch (error) {
      console.error('Failed to answer call:', error);
    }
  };

  const handleDeclineCall = async (roomId) => {
    try {
      await fetch('/api/calls/answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          room_id: roomId,
          user_id: elderId,
          action: 'decline',
        }),
      });
      
      // Remove from pending calls
      setPendingCalls(prev => prev.filter(call => call.room_id !== roomId));
      setIsVisible(false);
    } catch (error) {
      console.error('Failed to decline call:', error);
    }
  };

  if (!isVisible || pendingCalls.length === 0) {
    return null;
  }

  const currentCall = pendingCalls[0]; // Show the first pending call

  const getCallTypeInfo = (callType) => {
    switch (callType) {
      case 'emergency':
        return { label: '紧急联系', color: 'bg-red-500', icon: '🚨' };
      case 'checkup':
        return { label: '健康检查', color: 'bg-green-500', icon: '🏥' };
      default:
        return { label: '日常问候', color: 'bg-blue-500', icon: '👋' };
    }
  };

  const callInfo = getCallTypeInfo(currentCall.call_type);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-[90vw] max-w-[600px] text-center">
        {/* Call Icon */}
        <div className={`w-20 h-20 ${callInfo.color} rounded-full flex items-center justify-center mx-auto mb-6 text-4xl`}>
          {callInfo.icon}
        </div>

        {/* Call Info */}
        <h2 className="text-3xl font-bold text-gray-800 mb-4">
          管理员呼叫
        </h2>
        
        <div className="text-xl text-gray-600 mb-2">
          {callInfo.label}
        </div>

        {currentCall.message && (
          <div className="text-lg text-gray-700 mb-6 p-4 bg-gray-50 rounded-lg">
            "{currentCall.message}"
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => handleAnswerCall(currentCall.room_id)}
            className="px-8 py-4 bg-green-500 text-white text-xl font-bold rounded-xl hover:bg-green-600 transition-colors"
          >
            ✓ 接听
          </button>
          
          <button
            onClick={() => handleDeclineCall(currentCall.room_id)}
            className="px-8 py-4 bg-red-500 text-white text-xl font-bold rounded-xl hover:bg-red-600 transition-colors"
          >
            ✗ 拒绝
          </button>
        </div>

        {/* Auto-decline timer (optional) */}
        <div className="mt-4 text-sm text-gray-500">
          30秒后自动拒绝
        </div>
      </div>
    </div>
  );
}